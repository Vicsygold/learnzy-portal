import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { NextResponse } from "next/server";

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();
const limiters = new Map<string, Ratelimit>();

function localRateLimit(request: Request, scope: string, limit: number, windowMs: number) {
  const forwarded = request.headers.get("x-forwarded-for");
  const address = forwarded?.split(",")[0]?.trim() ?? request.headers.get("x-real-ip") ?? "local";
  const key = `${scope}:${address}`;
  const now = Date.now();
  const current = buckets.get(key);
  if (!current || current.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return null;
  }
  current.count += 1;
  if (current.count > limit) {
    return NextResponse.json({ error: "Too many requests. Please try again later." }, {
      status: 429,
      headers: { "Retry-After": String(Math.ceil((current.resetAt - now) / 1000)) },
    });
  }
  return null;
}

function getLimiter(scope: string, limit: number, windowMs: number) {
  const key = `${scope}:${limit}:${windowMs}`;
  const existing = limiters.get(key);
  if (existing) return existing;
  const url = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;
  if (!url || !token) throw new Error("UPSTASH_REDIS_NOT_CONFIGURED");
  const redis = new Redis({ url, token });
  const limiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(limit, `${Math.ceil(windowMs / 1000)} s`),
    prefix: "learnzy-hub:rate-limit",
  });
  limiters.set(key, limiter);
  return limiter;
}

export async function rateLimit(request: Request, scope: string, limit: number, windowMs: number) {
  if (process.env.NODE_ENV !== "production") return localRateLimit(request, scope, limit, windowMs);
  const hasRedisConfiguration = (
    (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN)
    || (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN)
  );
  if (!hasRedisConfiguration) {
    console.error("Production rate limiting is not configured.");
    return NextResponse.json({ error: "Rate limiting is not configured." }, { status: 503 });
  }
  const forwarded = request.headers.get("x-forwarded-for");
  const address = forwarded?.split(",")[0]?.trim() ?? request.headers.get("x-real-ip") ?? "unknown";
  try {
    const result = await getLimiter(scope, limit, windowMs).limit(`${scope}:${address}`);
    if (!result.success) {
      return NextResponse.json({ error: "Too many requests. Please try again later." }, {
        status: 429,
        headers: { "Retry-After": String(Math.max(1, Math.ceil((result.reset - Date.now()) / 1000))) },
      });
    }
    return null;
  } catch (error) {
    console.error("Shared rate limiter request failed", error);
    return NextResponse.json({ error: "Rate limiting is temporarily unavailable." }, { status: 503 });
  }
}

export function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    const expected = new URL(process.env.NEXTAUTH_URL ?? "http://localhost:3000").origin;
    const received = new URL(origin);
    if (received.origin === expected) return true;
    if (process.env.NODE_ENV !== "production") {
      const loopbackHosts = new Set(["localhost", "127.0.0.1", "::1"]);
      const configured = new URL(expected);
      return received.protocol === configured.protocol
        && received.port === configured.port
        && loopbackHosts.has(received.hostname)
        && loopbackHosts.has(configured.hostname);
    }
    return false;
  } catch {
    return false;
  }
}

export function rejectCrossOrigin(request: Request) {
  return sameOrigin(request) ? null : NextResponse.json({ error: "Cross-origin request rejected." }, { status: 403 });
}

export function isAllowedUploadUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && (url.hostname === "res.cloudinary.com" || url.hostname.endsWith(".cloudinary.com"));
  } catch {
    return false;
  }
}

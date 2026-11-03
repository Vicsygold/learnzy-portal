import { compare } from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";
import { createSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { rateLimit, rejectCrossOrigin } from "@/lib/security";

const loginSchema = z.object({
  email: z.string().email().max(254),
  password: z.string().min(8).max(128),
});

export async function POST(request: Request) {
  const csrf = rejectCrossOrigin(request);
  if (csrf) return csrf;
  const limited = await rateLimit(request, "login", 10, 15 * 60 * 1000);
  if (limited) return limited;
  const body: unknown = await request.json().catch(() => null);
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter a valid email and password." }, { status: 400 });
  }

  try {
    const user = await prisma.user.findFirst({
      where: { email: parsed.data.email.toLowerCase(), status: "ACTIVE" },
    });
    const validPassword = user ? await compare(parsed.data.password, user.passwordHash) : false;
    if (!user || !validPassword) {
      return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
    }

    await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    await createSession(user.id);
    return NextResponse.json({ ok: true, redirectTo: "/dashboard" });
  } catch (error) {
    console.error("Login database request failed", error);
    return NextResponse.json(
      { error: "The school database is not configured or is unavailable. Set DATABASE_URL and run the database migration." },
      { status: 503 },
    );
  }
}

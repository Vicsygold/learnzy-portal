import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { cloudinarySignature } from "@/lib/cloudinary";
import { verifyPaystackSignature } from "@/lib/paystack";
import { isAllowedUploadUrl, sameOrigin } from "@/lib/security";

describe("security helpers", () => {
  it("accepts only HTTPS Cloudinary upload URLs", () => {
    expect(isAllowedUploadUrl("https://res.cloudinary.com/demo/image/upload/file.jpg")).toBe(true);
    expect(isAllowedUploadUrl("http://res.cloudinary.com/demo/image/upload/file.jpg")).toBe(false);
    expect(isAllowedUploadUrl("https://example.com/file.jpg")).toBe(false);
  });

  it("creates deterministic Cloudinary signatures", () => {
    process.env.CLOUDINARY_API_SECRET = "test-secret";
    expect(cloudinarySignature({ timestamp: "123", folder: "educare/demo" })).toBe(
      cloudinarySignature({ folder: "educare/demo", timestamp: "123" }),
    );
  });

  it("verifies valid Paystack signatures and rejects tampering", () => {
    process.env.PAYSTACK_SECRET_KEY = "test-secret";
    const payload = JSON.stringify({ event: "charge.success", data: { reference: "EDU-1" } });
    const signature = createHmac("sha512", "test-secret").update(payload).digest("hex");
    expect(verifyPaystackSignature(payload, signature)).toBe(true);
    expect(verifyPaystackSignature(`${payload}x`, signature)).toBe(false);
    expect(verifyPaystackSignature(payload, null)).toBe(false);
  });

  it("accepts local loopback aliases during development", () => {
    const previousUrl = process.env.NEXTAUTH_URL;
    process.env.NEXTAUTH_URL = "http://localhost:3000";
    expect(sameOrigin(new Request("http://127.0.0.1:3000/api/auth/login", { headers: { origin: "http://127.0.0.1:3000" } }))).toBe(true);
    process.env.NEXTAUTH_URL = previousUrl;
  });
});

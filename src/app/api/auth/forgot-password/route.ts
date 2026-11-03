import { createHash, randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { sendPasswordResetEmail } from "@/lib/email";
import { rateLimit, rejectCrossOrigin } from "@/lib/security";

const schema = z.object({ email: z.string().email().max(254) });

export async function POST(request: Request) {
  const csrf = rejectCrossOrigin(request);
  if (csrf) return csrf;
  const limited = await rateLimit(request, "forgot-password", 5, 15 * 60 * 1000);
  if (limited) return limited;
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  const generic = { message: "If an account exists for that email, a reset link has been sent." };
  try {
    const user = await prisma.user.findFirst({ where: { email: parsed.data.email.toLowerCase(), status: "ACTIVE" } });
    if (!user) return NextResponse.json(generic);
    const token = randomBytes(32).toString("hex");
    await prisma.user.update({ where: { id: user.id }, data: { passwordResetToken: createHash("sha256").update(token).digest("hex"), passwordResetExpiresAt: new Date(Date.now() + 60 * 60 * 1000) } });
    try {
      await sendPasswordResetEmail({ to: user.email, name: user.firstName, token });
    } catch (error) {
      await prisma.user.update({ where: { id: user.id }, data: { passwordResetToken: null, passwordResetExpiresAt: null } });
      if (error instanceof Error && error.message === "EMAIL_NOT_CONFIGURED") return NextResponse.json({ error: "Password reset email is not configured. Add RESEND_API_KEY and EMAIL_FROM." }, { status: 503 });
      throw error;
    }
    return NextResponse.json(generic);
  } catch (error) {
    console.error("Password reset request failed", error);
    return NextResponse.json({ error: "Unable to process the password reset request." }, { status: 503 });
  }
}

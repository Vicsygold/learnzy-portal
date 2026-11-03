import { createHash } from "node:crypto";
import { hash } from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { rateLimit, rejectCrossOrigin } from "@/lib/security";

const schema = z.object({ token: z.string().min(32).max(128), password: z.string().min(8).max(128) });

export async function POST(request: Request) {
  const csrf = rejectCrossOrigin(request);
  if (csrf) return csrf;
  const limited = await rateLimit(request, "reset-password", 5, 15 * 60 * 1000);
  if (limited) return limited;
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Use a valid reset link and a password of at least 8 characters." }, { status: 400 });
  try {
    const tokenHash = createHash("sha256").update(parsed.data.token).digest("hex");
    const user = await prisma.user.findFirst({ where: { passwordResetToken: tokenHash, passwordResetExpiresAt: { gt: new Date() }, status: "ACTIVE" }, select: { id: true } });
    if (!user) return NextResponse.json({ error: "This reset link is invalid or has expired." }, { status: 400 });
    await prisma.$transaction([
      prisma.user.update({ where: { id: user.id }, data: { passwordHash: await hash(parsed.data.password, 12), passwordResetToken: null, passwordResetExpiresAt: null } }),
      prisma.session.deleteMany({ where: { userId: user.id } }),
    ]);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Password reset failed", error);
    return NextResponse.json({ error: "Unable to reset your password." }, { status: 500 });
  }
}

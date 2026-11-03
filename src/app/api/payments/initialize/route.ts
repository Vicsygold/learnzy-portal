import { NextResponse } from "next/server";
import { UserRole } from "@prisma/client";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { initializePaystackPayment } from "@/lib/paystack";
import { randomUUID } from "node:crypto";
import { rejectCrossOrigin } from "@/lib/security";

const schema = z.object({ feeId: z.string().cuid(), studentId: z.string().cuid(), email: z.string().email() });

export async function POST(request: Request) {
  const csrf = rejectCrossOrigin(request);
  if (csrf) return csrf;
  try {
    const user = await requireRole([UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.BURSAR, UserRole.PARENT]);
    const parsed = schema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: "Enter a valid fee, student and email." }, { status: 400 });
    const fee = await prisma.feeStructure.findFirst({ where: { id: parsed.data.feeId, schoolId: user.schoolId } });
    const student = await prisma.student.findFirst({ where: { id: parsed.data.studentId, schoolId: user.schoolId } });
    if (!fee || !student) return NextResponse.json({ error: "Fee or student not found." }, { status: 404 });
    if (user.role === UserRole.PARENT) {
      const link = await prisma.studentGuardian.findFirst({ where: { studentId: student.id, guardian: { userId: user.id } } });
      if (!link || student.armId === null) return NextResponse.json({ error: "You can only pay fees for your linked children." }, { status: 403 });
      const studentClass = await prisma.classArm.findUnique({ where: { id: student.armId }, select: { classId: true } });
      if (!studentClass || studentClass.classId !== fee.classId) return NextResponse.json({ error: "This fee is not assigned to the selected child." }, { status: 403 });
    }
    const reference = `EDU-${Date.now()}-${randomUUID().slice(0, 8).toUpperCase()}`;
    const payment = await prisma.payment.create({ data: { schoolId: user.schoolId, studentId: student.id, feeId: fee.id, reference, amount: fee.amount, method: "PAYSTACK", status: "PENDING" } });
    try {
      const checkout = await initializePaystackPayment({ email: parsed.data.email, amountNaira: Number(fee.amount), reference, callbackUrl: `${process.env.NEXTAUTH_URL}/payments/callback`, metadata: { paymentId: payment.id, studentId: student.id, feeId: fee.id } });
      return NextResponse.json({ authorizationUrl: checkout.authorization_url, reference });
    } catch (error) {
      await prisma.payment.update({ where: { id: payment.id }, data: { status: "FAILED" } });
      throw error;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const errorMessage = message === "PAYSTACK_NOT_CONFIGURED" ? "Paystack is not configured. Add PAYSTACK_SECRET_KEY to .env." : "Unable to initialize payment.";
    return NextResponse.json({ error: errorMessage }, { status: message === "AUTHENTICATION_REQUIRED" ? 401 : message === "FORBIDDEN" ? 403 : 502 });
  }
}

import { NextResponse } from "next/server";
import { UserRole } from "@prisma/client";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createPdf } from "@/lib/pdf";

export async function GET(_: Request, context: { params: Promise<{ paymentId: string }> }) {
  try {
    const user = await requireRole([UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.BURSAR, UserRole.STUDENT, UserRole.PARENT]);
    const { paymentId } = await context.params;
    const payment = await prisma.payment.findFirst({ where: { id: paymentId, schoolId: user.schoolId }, include: { school: true, student: true, fee: true } });
    if (!payment) return NextResponse.json({ error: "Payment not found." }, { status: 404 });
    if (user.role === UserRole.STUDENT && payment.student.userId !== user.id) return NextResponse.json({ error: "You cannot access this receipt." }, { status: 403 });
    if (user.role === UserRole.PARENT) {
      const link = await prisma.studentGuardian.findFirst({ where: { studentId: payment.studentId, guardian: { userId: user.id } } });
      if (!link) return NextResponse.json({ error: "You cannot access this receipt." }, { status: 403 });
    }
    const pdf = await createPdf(`${payment.school.name} - Payment Receipt`, [
      { label: "Payer / student", value: `${payment.student.firstName} ${payment.student.lastName}` },
      { label: "Admission number", value: payment.student.admissionNo },
      { label: "Fee", value: payment.fee.name },
      { label: "Reference", value: payment.reference },
      { label: "Amount", value: `₦${Number(payment.amount).toLocaleString("en-NG")}` },
      { label: "Status", value: payment.status },
      { label: "Payment method", value: payment.method },
      { label: "Paid on", value: payment.paidAt ? payment.paidAt.toLocaleString("en-NG") : "Not paid" },
    ]);
    return new Response(new Uint8Array(pdf), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="${payment.reference}-receipt.pdf"` } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    return NextResponse.json({ error: "Unable to generate receipt." }, { status: message === "AUTHENTICATION_REQUIRED" ? 401 : message === "FORBIDDEN" ? 403 : 500 });
  }
}

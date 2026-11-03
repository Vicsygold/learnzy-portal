import { NextResponse } from "next/server";
import { UserRole } from "@prisma/client";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const financeRoles = [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.BURSAR];
const feeSchema = z.object({ sessionId: z.string().cuid(), termId: z.string().cuid(), classId: z.string().cuid(), name: z.string().trim().min(2).max(100), amount: z.number().positive().max(100000000), description: z.string().trim().max(300).optional() });

export async function GET() {
  try {
    const user = await requireRole([...financeRoles, UserRole.PARENT, UserRole.STUDENT]);
    let linkedStudentIds: string[] | null = null;
    if (user.role === UserRole.PARENT) {
      linkedStudentIds = (await prisma.guardian.findUnique({ where: { userId: user.id }, select: { students: { select: { studentId: true } } } }))?.students.map((item) => item.studentId) ?? [];
    } else if (user.role === UserRole.STUDENT) {
      linkedStudentIds = [];
    }
    if (user.role === UserRole.STUDENT) {
      const student = await prisma.student.findUnique({ where: { userId: user.id }, select: { id: true } });
      if (student) linkedStudentIds?.push(student.id);
    }
    const fees = await prisma.feeStructure.findMany({
      where: {
        schoolId: user.schoolId,
        ...(linkedStudentIds ? { class: { arms: { some: { students: { some: { id: { in: linkedStudentIds } } } } } } } : {}),
      },
      orderBy: { name: "asc" },
      include: { class: true, term: { include: { session: true } } },
    });
    const payments = await prisma.payment.findMany({
      where: { schoolId: user.schoolId, ...(linkedStudentIds ? { studentId: { in: linkedStudentIds } } : {}) },
      orderBy: { paidAt: "desc" },
      take: 500,
      select: { id: true, reference: true, amount: true, status: true, method: true, paidAt: true, student: { select: { admissionNo: true, firstName: true, lastName: true } } },
    });
    const students = linkedStudentIds
      ? await prisma.student.findMany({ where: { id: { in: linkedStudentIds }, schoolId: user.schoolId }, select: { id: true, firstName: true, lastName: true, admissionNo: true, arm: { select: { classId: true } } } })
      : [];
    return NextResponse.json({ fees, payments, students });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    return NextResponse.json({ error: "Unable to load fees." }, { status: message === "AUTHENTICATION_REQUIRED" ? 401 : message === "FORBIDDEN" ? 403 : 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireRole(financeRoles);
    const parsed = feeSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: "Enter valid fee details." }, { status: 400 });
    const fee = await prisma.feeStructure.create({ data: { ...parsed.data, schoolId: user.schoolId } });
    await prisma.auditLog.create({ data: { schoolId: user.schoolId, userId: user.id, action: "fee.created", entity: "FeeStructure", entityId: fee.id, metadata: { name: fee.name, amount: fee.amount.toString() } } });
    return NextResponse.json({ fee }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    return NextResponse.json({ error: "Unable to create fee." }, { status: message === "AUTHENTICATION_REQUIRED" ? 401 : message === "FORBIDDEN" ? 403 : 500 });
  }
}

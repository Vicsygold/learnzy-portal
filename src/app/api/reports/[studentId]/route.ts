import { NextResponse } from "next/server";
import { ResultStatus, UserRole } from "@prisma/client";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createPdf } from "@/lib/pdf";

export async function GET(request: Request, context: { params: Promise<{ studentId: string }> }) {
  try {
    const user = await requireRole([UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.TEACHER, UserRole.STUDENT, UserRole.PARENT]);
    const { studentId } = await context.params;
    const termId = new URL(request.url).searchParams.get("termId");
    const student = await prisma.student.findFirst({ where: { id: studentId, schoolId: user.schoolId }, include: { school: true, arm: { include: { class: true } } } });
    if (!student) return NextResponse.json({ error: "Student not found." }, { status: 404 });
    if (user.role === UserRole.STUDENT && student.userId !== user.id) return NextResponse.json({ error: "You cannot access this report." }, { status: 403 });
    if (user.role === UserRole.PARENT) {
      const link = await prisma.studentGuardian.findFirst({ where: { studentId, guardian: { userId: user.id } } });
      if (!link) return NextResponse.json({ error: "You cannot access this report." }, { status: 403 });
    }
    const results = await prisma.result.findMany({
      where: { studentId, schoolId: user.schoolId, ...(termId ? { termId } : {}), ...(user.role === UserRole.STUDENT || user.role === UserRole.PARENT ? { status: ResultStatus.PUBLISHED } : {}) },
      orderBy: { subject: { name: "asc" } },
      include: { subject: { select: { name: true, code: true } }, term: { select: { name: true } } },
    });
    const termName = results[0]?.term.name ?? "Academic report";
    const pdf = await createPdf(`${student.school.name} - Report Card`, [
      { label: "Student", value: `${student.firstName} ${student.lastName}` },
      { label: "Admission number", value: student.admissionNo },
      { label: "Class", value: student.arm ? `${student.arm.class.name}${student.arm.name}` : "Not assigned" },
      { label: "Term", value: termName },
    ], [["Subject", "CA1", "CA2", "Exam", "Total", "Grade"], ...results.map((result) => [result.subject.name, String(result.ca1), String(result.ca2), String(result.exam), String(result.total), result.grade ?? "—"])]);
    return new Response(new Uint8Array(pdf), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="${student.admissionNo}-report-card.pdf"` } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    return NextResponse.json({ error: "Unable to generate report card." }, { status: message === "AUTHENTICATION_REQUIRED" ? 401 : message === "FORBIDDEN" ? 403 : 500 });
  }
}

import { NextResponse } from "next/server";
import { ResultStatus, UserRole } from "@prisma/client";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calculateTotal, gradeForTotal } from "@/lib/results";

const resultRoles = [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.TEACHER];
const resultSchema = z.object({
  sessionId: z.string().cuid(),
  termId: z.string().cuid(),
  studentId: z.string().cuid(),
  subjectId: z.string().cuid(),
  ca1: z.number().min(0).max(100),
  ca2: z.number().min(0).max(100),
  exam: z.number().min(0).max(100),
  weights: z.object({ ca1: z.number().positive(), ca2: z.number().positive(), exam: z.number().positive() }).default({ ca1: 20, ca2: 20, exam: 60 }),
});

export async function GET(request: Request) {
  try {
    const user = await requireRole([...resultRoles, UserRole.STUDENT, UserRole.PARENT]);
    const url = new URL(request.url);
    const termId = url.searchParams.get("termId");
    const linkedStudent = user.role === UserRole.STUDENT
      ? await prisma.student.findUnique({ where: { userId: user.id }, select: { id: true } })
      : null;
    if (user.role === UserRole.STUDENT && !linkedStudent) return NextResponse.json({ results: [] });
    const results = await prisma.result.findMany({
      where: { schoolId: user.schoolId, ...(termId ? { termId } : {}), ...(linkedStudent ? { studentId: linkedStudent.id } : {}), ...(user.role === UserRole.STUDENT ? { status: ResultStatus.PUBLISHED } : user.role === UserRole.TEACHER ? { status: { in: [ResultStatus.SUBMITTED, ResultStatus.APPROVED, ResultStatus.PUBLISHED] } } : {}) },
      orderBy: [{ student: { lastName: "asc" } }, { subject: { name: "asc" } }],
      take: 1000,
      select: { id: true, studentId: true, ca1: true, ca2: true, exam: true, total: true, grade: true, remark: true, status: true, student: { select: { admissionNo: true, firstName: true, lastName: true } }, subject: { select: { name: true, code: true } } },
    });
    return NextResponse.json({ results });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    return NextResponse.json({ error: "Unable to load results." }, { status: message === "AUTHENTICATION_REQUIRED" ? 401 : message === "FORBIDDEN" ? 403 : 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireRole(resultRoles);
    const parsed = resultSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: "Enter valid scores from 0 to 100." }, { status: 400 });
    const { sessionId, termId, studentId, subjectId, ca1, ca2, exam, weights } = parsed.data;
    const student = await prisma.student.findFirst({ where: { id: studentId, schoolId: user.schoolId }, select: { armId: true } });
    const subject = await prisma.subject.findFirst({ where: { id: subjectId, schoolId: user.schoolId }, select: { id: true } });
    if (!student || !subject) return NextResponse.json({ error: "Student or subject not found." }, { status: 404 });
    const total = calculateTotal({ ca1, ca2, exam }, weights);
    const { grade, remark } = gradeForTotal(total);
    const staff = user.role === UserRole.TEACHER ? await prisma.staff.findUnique({ where: { userId: user.id }, select: { id: true } }) : null;
    if (user.role === UserRole.TEACHER) {
      const assignment = staff ? await prisma.teacherClass.findFirst({ where: { staffId: staff.id, armId: student.armId ?? "" } }) : null;
      const subjectAssignment = staff ? await prisma.teacherSubject.findFirst({ where: { staffId: staff.id, subjectId } }) : null;
      if (!assignment || !subjectAssignment) return NextResponse.json({ error: "You can only enter results for assigned classes and subjects." }, { status: 403 });
    }
    const result = await prisma.result.upsert({
      where: { studentId_termId_subjectId: { studentId, termId, subjectId } },
      update: { ca1, ca2, exam, total, grade, remark, staffId: staff?.id, status: ResultStatus.SUBMITTED },
      create: { schoolId: user.schoolId, sessionId, termId, studentId, subjectId, ca1, ca2, exam, total, grade, remark, staffId: staff?.id, status: ResultStatus.SUBMITTED },
    });
    return NextResponse.json({ result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    return NextResponse.json({ error: "Unable to save result." }, { status: message === "AUTHENTICATION_REQUIRED" ? 401 : message === "FORBIDDEN" ? 403 : 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await requireRole([UserRole.SUPER_ADMIN, UserRole.ADMIN]);
    const body = z.object({ id: z.string().cuid(), status: z.enum(["APPROVED", "PUBLISHED", "DRAFT"]) }).parse(await request.json());
    const result = await prisma.result.updateMany({ where: { id: body.id, schoolId: user.schoolId }, data: { status: body.status as ResultStatus, approvedAt: body.status === "APPROVED" ? new Date() : undefined } });
    if (!result.count) return NextResponse.json({ error: "Result not found." }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    return NextResponse.json({ error: "Unable to update result status." }, { status: message === "AUTHENTICATION_REQUIRED" ? 401 : message === "FORBIDDEN" ? 403 : 500 });
  }
}

import { NextResponse } from "next/server";
import { AttendanceStatus, UserRole } from "@prisma/client";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const attendanceRoles = [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.TEACHER];
const attendanceSchema = z.object({
  termId: z.string().cuid(),
  date: z.coerce.date(),
  records: z.array(z.object({ studentId: z.string().cuid(), status: z.nativeEnum(AttendanceStatus), note: z.string().max(300).optional() })).min(1).max(500),
});

export async function GET(request: Request) {
  try {
    const user = await requireRole([...attendanceRoles, UserRole.STUDENT, UserRole.PARENT]);
    const url = new URL(request.url);
    const termId = url.searchParams.get("termId");
    const studentId = url.searchParams.get("studentId");
    const linkedStudent = user.role === UserRole.STUDENT
      ? await prisma.student.findUnique({ where: { userId: user.id }, select: { id: true } })
      : null;
    if (user.role === UserRole.STUDENT && !linkedStudent) return NextResponse.json({ records: [] });
    const records = await prisma.attendanceRecord.findMany({
      where: { schoolId: user.schoolId, ...(termId ? { termId } : {}), ...(linkedStudent ? { studentId: linkedStudent.id } : studentId ? { studentId } : {}) },
      orderBy: { date: "desc" },
      take: 500,
      select: { id: true, date: true, status: true, note: true, student: { select: { id: true, admissionNo: true, firstName: true, lastName: true } } },
    });
    return NextResponse.json({ records });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    return NextResponse.json({ error: "Unable to load attendance." }, { status: message === "AUTHENTICATION_REQUIRED" ? 401 : message === "FORBIDDEN" ? 403 : 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireRole(attendanceRoles);
    const parsed = attendanceSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: "Enter valid attendance records." }, { status: 400 });
    const { termId, date, records } = parsed.data;
    const term = await prisma.term.findFirst({ where: { id: termId, schoolId: user.schoolId } });
    if (!term) return NextResponse.json({ error: "Term not found." }, { status: 404 });
    const staffId = user.role === UserRole.TEACHER
      ? (await prisma.staff.findUnique({ where: { userId: user.id }, select: { id: true } }))?.id
      : undefined;
    const students = await prisma.student.findMany({ where: { id: { in: records.map((record) => record.studentId) }, schoolId: user.schoolId }, select: { id: true, armId: true } });
    if (students.length !== records.length) return NextResponse.json({ error: "One or more students are invalid." }, { status: 400 });
    if (user.role === UserRole.TEACHER) {
      const assigned = await prisma.teacherClass.findMany({ where: { staffId, armId: { in: students.map((student) => student.armId).filter((armId): armId is string => Boolean(armId)) } }, select: { armId: true } });
      if (assigned.length === 0 || students.some((student) => student.armId && !assigned.some((item) => item.armId === student.armId))) return NextResponse.json({ error: "You can only mark attendance for assigned classes." }, { status: 403 });
    }
    await prisma.$transaction(records.map((record) => prisma.attendanceRecord.upsert({
      where: { studentId_date: { studentId: record.studentId, date } },
      update: { status: record.status, note: record.note, staffId, termId },
      create: { schoolId: user.schoolId, termId, studentId: record.studentId, status: record.status, note: record.note, date, staffId },
    })));
    return NextResponse.json({ ok: true, count: records.length });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    return NextResponse.json({ error: "Unable to save attendance." }, { status: message === "AUTHENTICATION_REQUIRED" ? 401 : message === "FORBIDDEN" ? 403 : 500 });
  }
}

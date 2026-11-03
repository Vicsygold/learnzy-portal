import { NextResponse } from "next/server";
import { UserRole } from "@prisma/client";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isAllowedUploadUrl, rejectCrossOrigin } from "@/lib/security";

const uploadUrl = z.string().url().max(2000).refine(isAllowedUploadUrl, "Attachment must be stored in Cloudinary.");
const assignmentSchema = z.object({ classId: z.string().cuid(), subjectId: z.string().cuid(), title: z.string().trim().min(3).max(160), instructions: z.string().trim().min(3).max(10000), dueAt: z.coerce.date().optional(), attachmentUrl: uploadUrl.optional() });

export async function GET() {
  try {
    const user = await requireRole([UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.TEACHER, UserRole.STUDENT, UserRole.PARENT]);
    const student = user.role === UserRole.STUDENT ? await prisma.student.findUnique({ where: { userId: user.id }, select: { id: true, arm: { select: { classId: true } } } }) : null;
    const guardian = user.role === UserRole.PARENT ? await prisma.guardian.findUnique({ where: { userId: user.id }, select: { students: { select: { student: { select: { arm: { select: { classId: true } } } } } } } }) : null;
    const staff = user.role === UserRole.TEACHER ? await prisma.staff.findUnique({ where: { userId: user.id }, select: { id: true, classes: { select: { arm: { select: { classId: true } } } }, subjects: { select: { subjectId: true } } } }) : null;
    const classIds = staff?.classes.map((item) => item.arm.classId);
    const subjectIds = staff?.subjects.map((item) => item.subjectId);
    const assignments = await prisma.assignment.findMany({
      where: { schoolId: user.schoolId, ...(student ? { classId: student.arm?.classId ?? "" } : {}), ...(guardian ? { classId: { in: guardian.students.map((item) => item.student.arm?.classId).filter((classId): classId is string => Boolean(classId)) } } : {}), ...(staff ? { classId: { in: classIds }, subjectId: { in: subjectIds } } : {}) },
      orderBy: [{ dueAt: "asc" }, { createdAt: "desc" }],
      take: 100,
      include: { class: { select: { name: true } }, subject: { select: { name: true, code: true } }, staff: { include: { user: { select: { firstName: true, lastName: true } } } }, submissions: student ? { where: { studentId: student.id }, select: { id: true, content: true, attachmentUrl: true, score: true, feedback: true, submittedAt: true } } : { select: { id: true, content: true, attachmentUrl: true, score: true, feedback: true, submittedAt: true, student: { select: { firstName: true, lastName: true, admissionNo: true } } } } },
    });
    return NextResponse.json({
      assignments,
      canGrade: new Set<UserRole>([UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.TEACHER]).has(user.role),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    return NextResponse.json({ error: "Unable to load assignments." }, { status: message === "AUTHENTICATION_REQUIRED" ? 401 : message === "FORBIDDEN" ? 403 : 500 });
  }
}

export async function POST(request: Request) {
  const csrf = rejectCrossOrigin(request);
  if (csrf) return csrf;
  try {
    const user = await requireRole([UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.TEACHER]);
    const parsed = assignmentSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: "Enter valid assignment details." }, { status: 400 });
    const staff = await prisma.staff.findUnique({ where: { userId: user.id }, select: { id: true, classes: { select: { arm: { select: { classId: true } } } }, subjects: { select: { subjectId: true } } } });
    const classExists = await prisma.schoolClass.findFirst({ where: { id: parsed.data.classId, schoolId: user.schoolId } });
    const subjectExists = await prisma.subject.findFirst({ where: { id: parsed.data.subjectId, schoolId: user.schoolId } });
    if (!classExists || !subjectExists) return NextResponse.json({ error: "Class or subject not found." }, { status: 404 });
    if (user.role === UserRole.TEACHER && (!staff?.classes.some((item) => item.arm.classId === parsed.data.classId) || !staff.subjects.some((item) => item.subjectId === parsed.data.subjectId))) return NextResponse.json({ error: "You can only create assignments for assigned classes and subjects." }, { status: 403 });
    if (!staff) return NextResponse.json({ error: "Staff profile not found." }, { status: 403 });
    const assignment = await prisma.assignment.create({ data: { ...parsed.data, schoolId: user.schoolId, staffId: staff.id } });
    return NextResponse.json({ assignment }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    return NextResponse.json({ error: "Unable to create assignment." }, { status: message === "AUTHENTICATION_REQUIRED" ? 401 : message === "FORBIDDEN" ? 403 : 500 });
  }
}

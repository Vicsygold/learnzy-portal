import { NextResponse } from "next/server";
import { UserRole } from "@prisma/client";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isAllowedUploadUrl, rejectCrossOrigin } from "@/lib/security";

const uploadUrl = z.string().url().max(2000).refine(isAllowedUploadUrl, "Attachment must be stored in Cloudinary.");
const submissionSchema = z.object({ content: z.string().trim().min(1).max(20000), attachmentUrl: uploadUrl.optional() });
const gradeSchema = z.object({ score: z.number().min(0).max(100), feedback: z.string().trim().max(2000).optional() });

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const csrf = rejectCrossOrigin(request);
  if (csrf) return csrf;
  try {
    const user = await requireRole([UserRole.STUDENT]);
    const { id } = await context.params;
    const parsed = submissionSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: "Enter your submission before sending." }, { status: 400 });
    const student = await prisma.student.findUnique({ where: { userId: user.id }, select: { id: true, arm: { select: { classId: true } } } });
    const assignment = await prisma.assignment.findFirst({ where: { id, schoolId: user.schoolId, classId: student?.arm?.classId ?? "" } });
    if (!student || !assignment) return NextResponse.json({ error: "Assignment not found." }, { status: 404 });
    const submission = await prisma.assignmentSubmission.upsert({ where: { assignmentId_studentId: { assignmentId: id, studentId: student.id } }, update: { content: parsed.data.content, attachmentUrl: parsed.data.attachmentUrl, userId: user.id, submittedAt: new Date() }, create: { assignmentId: id, studentId: student.id, userId: user.id, content: parsed.data.content, attachmentUrl: parsed.data.attachmentUrl } });
    return NextResponse.json({ submission }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    return NextResponse.json({ error: "Unable to submit assignment." }, { status: message === "AUTHENTICATION_REQUIRED" ? 401 : message === "FORBIDDEN" ? 403 : 500 });
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const csrf = rejectCrossOrigin(request);
  if (csrf) return csrf;
  try {
    const user = await requireRole([UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.TEACHER]);
    const { id } = await context.params;
    const parsed = gradeSchema.safeParse(await request.json().catch(() => null));
    const submissionId = new URL(request.url).searchParams.get("submissionId");
    if (!parsed.success || !submissionId) return NextResponse.json({ error: "Enter a valid grade." }, { status: 400 });
    const staff = await prisma.staff.findUnique({ where: { userId: user.id }, select: { id: true } });
    const submission = await prisma.assignmentSubmission.findFirst({ where: { id: submissionId, assignmentId: id, assignment: { schoolId: user.schoolId, ...(user.role === UserRole.TEACHER ? { staffId: staff?.id ?? "" } : {}) } } });
    if (!submission) return NextResponse.json({ error: "Submission not found." }, { status: 404 });
    const updated = await prisma.assignmentSubmission.update({ where: { id: submissionId }, data: { score: parsed.data.score, feedback: parsed.data.feedback } });
    return NextResponse.json({ submission: updated });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    return NextResponse.json({ error: "Unable to grade submission." }, { status: message === "AUTHENTICATION_REQUIRED" ? 401 : message === "FORBIDDEN" ? 403 : 500 });
  }
}

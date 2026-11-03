import { NextResponse } from "next/server";
import { UserRole } from "@prisma/client";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const user = await requireRole([UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.TEACHER]);
    const school = await prisma.school.findUnique({ where: { id: user.schoolId }, select: { currentSessionId: true, currentTermId: true } });
    const terms = await prisma.term.findMany({ where: { schoolId: user.schoolId }, orderBy: [{ isCurrent: "desc" }, { startsOn: "desc" }], take: 10, select: { id: true, name: true, sessionId: true, isCurrent: true } });
    const staff = user.role === UserRole.TEACHER ? await prisma.staff.findUnique({ where: { userId: user.id }, select: { id: true, classes: { select: { armId: true } }, subjects: { select: { subjectId: true } } } }) : null;
    const arms = await prisma.classArm.findMany({
      where: { schoolId: user.schoolId, ...(staff ? { id: { in: staff.classes.map((item) => item.armId) } } : {}) },
      orderBy: [{ class: { level: "asc" } }, { name: "asc" }],
      select: { id: true, name: true, class: { select: { id: true, name: true } }, students: { where: { status: "ACTIVE" }, orderBy: [{ lastName: "asc" }, { firstName: "asc" }], select: { id: true, firstName: true, lastName: true, admissionNo: true } } },
    });
    const subjects = await prisma.subject.findMany({ where: { schoolId: user.schoolId, ...(staff ? { id: { in: staff.subjects.map((item) => item.subjectId) } } : {}) }, orderBy: { name: "asc" }, select: { id: true, name: true, code: true } });
    return NextResponse.json({ currentSessionId: school?.currentSessionId, currentTermId: school?.currentTermId, canApprove: user.role === UserRole.SUPER_ADMIN || user.role === UserRole.ADMIN, terms, arms, subjects });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    return NextResponse.json({ error: "Unable to load teacher workspace." }, { status: message === "AUTHENTICATION_REQUIRED" ? 401 : message === "FORBIDDEN" ? 403 : 500 });
  }
}

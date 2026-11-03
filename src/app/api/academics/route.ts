import { NextResponse } from "next/server";
import { UserRole } from "@prisma/client";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const adminRoles = [UserRole.SUPER_ADMIN, UserRole.ADMIN];
const academicSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("class"), name: z.string().trim().min(2).max(40), level: z.number().int().min(1).max(20) }),
  z.object({ type: z.literal("arm"), classId: z.string().cuid(), name: z.string().trim().min(1).max(10) }),
  z.object({ type: z.literal("subject"), name: z.string().trim().min(2).max(80), code: z.string().trim().min(2).max(12).toUpperCase() }),
]);

export async function GET() {
  try {
    const user = await requireRole([...adminRoles, UserRole.TEACHER]);
    const [classes, subjects, staff] = await prisma.$transaction([
      prisma.schoolClass.findMany({ where: { schoolId: user.schoolId }, orderBy: { level: "asc" }, include: { arms: { orderBy: { name: "asc" } } } }),
      prisma.subject.findMany({ where: { schoolId: user.schoolId }, orderBy: { name: "asc" } }),
      prisma.staff.findMany({ where: { schoolId: user.schoolId }, orderBy: { staffNo: "asc" }, include: { user: { select: { firstName: true, lastName: true, email: true } }, subjects: { include: { subject: true } }, classes: { include: { arm: { include: { class: true } } } } } }),
    ]);
    return NextResponse.json({ classes, subjects, staff });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const status = message === "AUTHENTICATION_REQUIRED" ? 401 : message === "FORBIDDEN" ? 403 : 500;
    return NextResponse.json({ error: status === 403 ? "You do not have permission to view academics." : "Unable to load academics." }, { status });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireRole(adminRoles);
    const parsed = academicSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: "Enter valid academic details." }, { status: 400 });
    const data = parsed.data;
    if (data.type === "class") {
      const schoolClass = await prisma.schoolClass.create({ data: { schoolId: user.schoolId, name: data.name, level: data.level } });
      return NextResponse.json({ class: schoolClass }, { status: 201 });
    }
    if (data.type === "arm") {
      const schoolClass = await prisma.schoolClass.findFirst({ where: { id: data.classId, schoolId: user.schoolId } });
      if (!schoolClass) return NextResponse.json({ error: "Class not found." }, { status: 404 });
      const arm = await prisma.classArm.create({ data: { schoolId: user.schoolId, classId: data.classId, name: data.name } });
      return NextResponse.json({ arm }, { status: 201 });
    }
    const subject = await prisma.subject.create({ data: { schoolId: user.schoolId, name: data.name, code: data.code } });
    return NextResponse.json({ subject }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const status = message === "AUTHENTICATION_REQUIRED" ? 401 : message === "FORBIDDEN" ? 403 : 500;
    return NextResponse.json({ error: status === 403 ? "You do not have permission to change academics." : "Unable to save academic details." }, { status });
  }
}

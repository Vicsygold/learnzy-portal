import { NextResponse } from "next/server";
import { UserRole } from "@prisma/client";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hash } from "bcryptjs";

const staffRoles = [UserRole.SUPER_ADMIN, UserRole.ADMIN];
const staffSchema = z.object({
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  email: z.string().email().max(254),
  role: z.enum(["TEACHER", "BURSAR", "ADMIN"]),
  jobTitle: z.string().trim().max(80).optional(),
});

export async function GET() {
  try {
    const user = await requireRole([...staffRoles, UserRole.BURSAR]);
    const staff = await prisma.staff.findMany({ where: { schoolId: user.schoolId }, orderBy: { staffNo: "asc" }, include: { user: { select: { firstName: true, lastName: true, email: true, role: true, status: true } } } });
    return NextResponse.json({ staff });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const status = message === "AUTHENTICATION_REQUIRED" ? 401 : message === "FORBIDDEN" ? 403 : 500;
    return NextResponse.json({ error: "Unable to load staff." }, { status });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireRole(staffRoles);
    const parsed = staffSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: "Enter valid staff details." }, { status: 400 });
    const data = parsed.data;
    const email = data.email.toLowerCase();
    const existing = await prisma.user.findFirst({ where: { schoolId: user.schoolId, email } });
    if (existing) return NextResponse.json({ error: "A user with this email already exists." }, { status: 409 });
    const passwordHash = await hash("ChangeMe123!", 12);
    const count = await prisma.staff.count({ where: { schoolId: user.schoolId } });
    const created = await prisma.$transaction(async (tx) => {
      const createdUser = await tx.user.create({ data: { schoolId: user.schoolId, email, passwordHash, firstName: data.firstName, lastName: data.lastName, role: data.role } });
      return tx.staff.create({ data: { schoolId: user.schoolId, userId: createdUser.id, staffNo: `STF/${String(count + 1).padStart(3, "0")}`, jobTitle: data.jobTitle } });
    });
    return NextResponse.json({ staff: created, temporaryPassword: "ChangeMe123!" }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const status = message === "AUTHENTICATION_REQUIRED" ? 401 : message === "FORBIDDEN" ? 403 : 500;
    return NextResponse.json({ error: "Unable to create staff member." }, { status });
  }
}

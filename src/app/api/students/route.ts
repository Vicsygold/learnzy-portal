import { NextResponse } from "next/server";
import { UserRole } from "@prisma/client";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { nextAdmissionNumber } from "@/lib/students";

const createStudentSchema = z.object({
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  otherNames: z.string().trim().max(80).optional(),
  gender: z.string().trim().max(30).optional(),
  armId: z.string().cuid().optional(),
  sessionId: z.string().cuid().optional(),
});

const staffRoles = [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.BURSAR];

export async function GET(request: Request) {
  try {
    const user = await requireRole([...staffRoles, UserRole.TEACHER]);
    const url = new URL(request.url);
    const query = url.searchParams.get("q")?.trim() ?? "";
    const page = Math.max(Number(url.searchParams.get("page") ?? "1") || 1, 1);
    const pageSize = Math.min(Math.max(Number(url.searchParams.get("pageSize") ?? "20") || 20, 1), 100);
    const where = {
      schoolId: user.schoolId,
      ...(query
        ? {
            OR: [
              { firstName: { contains: query, mode: "insensitive" as const } },
              { lastName: { contains: query, mode: "insensitive" as const } },
              { admissionNo: { contains: query, mode: "insensitive" as const } },
            ],
          }
        : {}),
    };
    const [students, total] = await prisma.$transaction([
      prisma.student.findMany({
        where,
        orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          admissionNo: true,
          firstName: true,
          lastName: true,
          otherNames: true,
          status: true,
          arm: { select: { name: true, class: { select: { name: true } } } },
        },
      }),
      prisma.student.count({ where }),
    ]);
    return NextResponse.json({ students, pagination: { page, pageSize, total, pages: Math.ceil(total / pageSize) } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load students.";
    const status = message === "AUTHENTICATION_REQUIRED" ? 401 : message === "FORBIDDEN" ? 403 : 500;
    return NextResponse.json({ error: message === "FORBIDDEN" ? "You do not have permission to view students." : "Unable to load students." }, { status });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireRole(staffRoles);
    const parsed = createStudentSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: "Enter a valid first name and last name." }, { status: 400 });
    const admissionNo = await nextAdmissionNumber(user.schoolId);
    const student = await prisma.student.create({
      data: { ...parsed.data, schoolId: user.schoolId, admissionNo },
      select: { id: true, admissionNo: true, firstName: true, lastName: true, status: true },
    });
    await prisma.auditLog.create({
      data: { schoolId: user.schoolId, userId: user.id, action: "student.created", entity: "Student", entityId: student.id, metadata: { admissionNo } },
    });
    return NextResponse.json({ student }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const status = message === "AUTHENTICATION_REQUIRED" ? 401 : message === "FORBIDDEN" ? 403 : 500;
    return NextResponse.json({ error: status === 403 ? "You do not have permission to create students." : "Unable to create student." }, { status });
  }
}

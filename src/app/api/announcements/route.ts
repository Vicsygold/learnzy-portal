import { NextResponse } from "next/server";
import { UserRole } from "@prisma/client";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const publishRoles = [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.TEACHER];
const announcementSchema = z.object({ title: z.string().trim().min(3).max(160), body: z.string().trim().min(3).max(10000), audience: z.object({ roles: z.array(z.nativeEnum(UserRole)).max(6).default([]), classIds: z.array(z.string().cuid()).max(100).default([]) }) });

export async function GET() {
  try {
    const user = await requireRole([UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.TEACHER, UserRole.BURSAR, UserRole.STUDENT, UserRole.PARENT]);
    const announcements = await prisma.announcement.findMany({ where: { schoolId: user.schoolId, publishedAt: { not: null } }, orderBy: { publishedAt: "desc" }, take: 100, select: { id: true, title: true, body: true, audience: true, publishedAt: true, author: { select: { firstName: true, lastName: true } } } });
    return NextResponse.json({ announcements });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    return NextResponse.json({ error: "Unable to load announcements." }, { status: message === "AUTHENTICATION_REQUIRED" ? 401 : message === "FORBIDDEN" ? 403 : 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireRole(publishRoles);
    const parsed = announcementSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: "Enter a title, message and valid audience." }, { status: 400 });
    const announcement = await prisma.announcement.create({ data: { schoolId: user.schoolId, authorId: user.id, title: parsed.data.title, body: parsed.data.body, audience: parsed.data.audience, publishedAt: new Date() } });
    return NextResponse.json({ announcement }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    return NextResponse.json({ error: "Unable to publish announcement." }, { status: message === "AUTHENTICATION_REQUIRED" ? 401 : message === "FORBIDDEN" ? 403 : 500 });
  }
}

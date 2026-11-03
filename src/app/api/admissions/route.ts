import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { randomUUID } from "node:crypto";
import { rateLimit, rejectCrossOrigin } from "@/lib/security";

const admissionSchema = z.object({
  schoolSlug: z.string().trim().min(2).max(100).default("educare-demo-school"),
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  email: z.string().email().max(254),
  phone: z.string().trim().min(7).max(30),
  desiredClass: z.string().trim().min(1).max(50),
});

export async function POST(request: Request) {
  const csrf = rejectCrossOrigin(request);
  if (csrf) return csrf;
  const limited = await rateLimit(request, "admission", 10, 15 * 60 * 1000);
  if (limited) return limited;
  const parsed = admissionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Complete all required admission fields." }, { status: 400 });
  const school = await prisma.school.findUnique({ where: { slug: parsed.data.schoolSlug } });
  if (!school) return NextResponse.json({ error: "School not found." }, { status: 404 });
  const reference = `ADM-${new Date().getFullYear()}-${randomUUID().slice(0, 8).toUpperCase()}`;
  const application = await prisma.admissionApplication.create({ data: { schoolId: school.id, reference, firstName: parsed.data.firstName, lastName: parsed.data.lastName, email: parsed.data.email.toLowerCase(), phone: parsed.data.phone, desiredClass: parsed.data.desiredClass } });
  return NextResponse.json({ reference: application.reference, status: application.status }, { status: 201 });
}

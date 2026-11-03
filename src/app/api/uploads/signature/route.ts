import { NextResponse } from "next/server";
import { UserRole } from "@prisma/client";
import { requireRole } from "@/lib/auth";
import { cloudinaryConfigured, cloudinarySignature } from "@/lib/cloudinary";
import { rateLimit, rejectCrossOrigin } from "@/lib/security";

export async function POST(request: Request) {
  const csrf = rejectCrossOrigin(request);
  if (csrf) return csrf;
  const limited = await rateLimit(request, "upload-signature", 30, 15 * 60 * 1000);
  if (limited) return limited;
  try {
    const user = await requireRole([UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.TEACHER, UserRole.STUDENT]);
    if (!cloudinaryConfigured()) return NextResponse.json({ error: "File uploads are not configured. Add the Cloudinary credentials to .env." }, { status: 503 });
    const body = await request.json().catch(() => null) as { resourceType?: string } | null;
    const resourceType = body?.resourceType === "raw" ? "raw" : "auto";
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const folder = `educare/${user.schoolId}/assignments`;
    const params = { folder, timestamp };
    return NextResponse.json({ cloudName: process.env.CLOUDINARY_CLOUD_NAME, apiKey: process.env.CLOUDINARY_API_KEY, timestamp, folder, resourceType, signature: cloudinarySignature(params) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    return NextResponse.json({ error: "Unable to prepare file upload." }, { status: message === "AUTHENTICATION_REQUIRED" ? 401 : message === "FORBIDDEN" ? 403 : 500 });
  }
}

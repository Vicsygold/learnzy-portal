import { prisma } from "@/lib/prisma";

export async function nextAdmissionNumber(schoolId: string, year = new Date().getFullYear()) {
  const prefix = `EDU/${year}/`;
  const latest = await prisma.student.findFirst({
    where: { schoolId, admissionNo: { startsWith: prefix } },
    orderBy: { admissionNo: "desc" },
    select: { admissionNo: true },
  });
  const nextNumber = latest ? Number(latest.admissionNo.slice(prefix.length)) + 1 : 1;
  return `${prefix}${String(nextNumber).padStart(4, "0")}`;
}

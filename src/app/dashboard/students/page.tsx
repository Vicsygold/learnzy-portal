import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { UserRole } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function StudentsContent() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const allowedRoles: UserRole[] = [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.BURSAR, UserRole.TEACHER];
  if (!allowedRoles.includes(user.role)) redirect("/dashboard");

  const students = await prisma.student.findMany({
    where: { schoolId: user.schoolId },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    take: 50,
    select: { id: true, admissionNo: true, firstName: true, lastName: true, status: true, arm: { select: { name: true, class: { select: { name: true } } } } },
  });

  return (
    <main className="min-h-screen bg-[#f7f9fc] text-[#12233f]">
      <header className="border-b border-[#e5eaf1] bg-white px-5 py-5 sm:px-8">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-[#176b5b] text-lg font-bold text-white">L</span><span className="font-bold">Learnzy Hub</span></Link>
          <Link href="/dashboard" className="text-sm font-semibold text-[#176b5b]">Back to dashboard</Link>
        </div>
      </header>
      <section className="mx-auto max-w-7xl px-5 py-10 sm:px-8">
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div><p className="text-sm font-bold uppercase tracking-widest text-[#176b5b]">Student management</p><h1 className="mt-3 text-4xl font-bold tracking-tight">Students</h1><p className="mt-2 text-[#52627a]">Manage enrolled learners and their class placement.</p></div>
          <Link href="/dashboard/students/new" className="rounded-full bg-[#176b5b] px-5 py-3 text-center text-sm font-semibold text-white hover:bg-[#125646]">Add student</Link>
        </div>
        <div className="mt-8 overflow-hidden rounded-2xl border border-[#e5eaf1] bg-white">
          <div className="overflow-x-auto"><table className="w-full min-w-[680px] text-left text-sm"><thead className="border-b border-[#e5eaf1] bg-[#fbfcfe] text-xs uppercase tracking-wider text-[#8491a5]"><tr><th className="px-5 py-4">Student</th><th className="px-5 py-4">Admission no.</th><th className="px-5 py-4">Class</th><th className="px-5 py-4">Status</th></tr></thead><tbody className="divide-y divide-[#e5eaf1]">{students.map((student) => <tr key={student.id} className="hover:bg-[#fbfcfe]"><td className="px-5 py-4 font-semibold">{student.firstName} {student.lastName}</td><td className="px-5 py-4 text-[#52627a]">{student.admissionNo}</td><td className="px-5 py-4 text-[#52627a]">{student.arm ? `${student.arm.class.name}${student.arm.name}` : "Unassigned"}</td><td className="px-5 py-4"><span className="rounded-full bg-[#dff2e9] px-3 py-1 text-xs font-semibold text-[#176b5b]">{student.status}</span></td></tr>)}</tbody></table></div>
          {students.length === 0 && <p className="p-8 text-center text-sm text-[#52627a]">No students found.</p>}
        </div>
      </section>
    </main>
  );
}

function StudentsLoading() {
  return <main className="grid min-h-screen place-items-center bg-[#f7f9fc] text-sm text-[#52627a]">Loading students...</main>;
}

export default function StudentsPage() {
  return <Suspense fallback={<StudentsLoading />}><StudentsContent /></Suspense>;
}

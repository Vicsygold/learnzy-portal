import { Suspense } from "react";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ResultStatus, UserRole } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import TeacherSidebar from "./TeacherSidebar";

const naira = (amount: number) => `₦${amount.toLocaleString("en-NG")}`;

function Shell({ title, children }: { title: string; children: React.ReactNode }) {
  return <main className="min-h-screen bg-[#f7f8fc] p-6 text-[#17243b]"><div className="mx-auto max-w-6xl"><header className="flex items-center justify-between border-b border-[#e5eaf1] pb-5"><Link href="/dashboard" className="font-bold">Learnzy Hub</Link><form action="/api/auth/logout" method="post"><button className="rounded-full border border-[#d6deea] px-4 py-2 text-sm font-semibold">Sign out</button></form></header><h1 className="mt-8 text-3xl font-bold">{title}</h1>{children}</div></main>;
}

const adminNavigation = [
  ["⌂", "Dashboard", "/dashboard"],
  ["♙", "HR Manager", "/dashboard/staff"],
  ["⚙", "School Setup", "/dashboard/academics"],
  ["▦", "Pastoral", "/dashboard/attendance"],
  ["◆", "Staff Management", "/dashboard/staff"],
  ["⚒", "Admin Management", "/dashboard/academics"],
  ["♙", "Teachers", "/dashboard/staff"],
  ["☑", "Classes / Year Groups", "/dashboard/academics"],
  ["▤", "High School Report", "/dashboard/results"],
  ["▣", "eClassroom", "/dashboard/assignments"],
  ["▦", "EYFS Report", "/dashboard/results"],
  ["●", "Feedback", "/dashboard/announcements"],
  ["▤", "Assignments", "/dashboard/assignments"],
] as const;

const summaryCards = [
  { key: "students", label: "Active Students", color: "#4b9ada", icon: "♙" },
  { key: "male", label: "Male Students", color: "#5dcbb5", icon: "♂" },
  { key: "female", label: "Female Students", color: "#f0d15b", icon: "♀" },
  { key: "classes", label: "Classes", color: "#56bdc9", icon: "▦" },
  { key: "teachers", label: "Teachers", color: "#884bb0", icon: "♙" },
  { key: "attendance", label: "Total Attendance", color: "#55becd", icon: "✓" },
] as const;

async function AdminDashboard({ user }: { user: NonNullable<Awaited<ReturnType<typeof getCurrentUser>>> }) {
  const school = await prisma.school.findUnique({
    where: { id: user.schoolId },
    select: { name: true, currentSessionId: true, currentTermId: true },
  });
  if (!school) return <Shell title="School not found"><p className="mt-3 text-sm text-[#52627a]">Please contact your system administrator.</p></Shell>;

  const activeStudents = await prisma.student.findMany({
    where: { schoolId: user.schoolId, status: "ACTIVE" },
    select: { gender: true },
  });
  const classes = await prisma.schoolClass.findMany({
    where: { schoolId: user.schoolId },
    orderBy: { level: "asc" },
    select: { id: true, name: true, arms: { select: { name: true, _count: { select: { students: true } } } } },
  });
  const teachers = await prisma.staff.count({ where: { schoolId: user.schoolId, user: { role: UserRole.TEACHER } } });
  const attendance = await prisma.attendanceRecord.count({
    where: { schoolId: user.schoolId, ...(school.currentTermId ? { termId: school.currentTermId } : {}) },
  });
  const session = school.currentSessionId ? await prisma.academicSession.findUnique({ where: { id: school.currentSessionId }, select: { name: true } }) : null;
  const totalByClass = classes.map((item) => ({
    label: item.name,
    total: item.arms.reduce((sum, arm) => sum + arm._count.students, 0),
  }));
  const maxClassTotal = Math.max(...totalByClass.map((item) => item.total), 1);
  const cardValues: Record<string, string> = {
    students: String(activeStudents.length),
    male: String(activeStudents.filter((student) => student.gender?.toLowerCase() === "male").length),
    female: String(activeStudents.filter((student) => student.gender?.toLowerCase() === "female").length),
    classes: String(classes.length),
    teachers: String(teachers),
    attendance: String(attendance),
  };

  return (
    <div className="min-h-screen bg-[#f4f6f9] text-[#263746]">
      <header className="fixed inset-x-0 top-0 z-30 flex h-[68px] items-center justify-between border-b border-[#e2e8ee] bg-white px-4 shadow-sm lg:pl-[272px] lg:pr-8">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="text-xl font-bold tracking-tight text-[#2786bf] lg:hidden">Learnzy Hub</Link>
          <button type="button" className="rounded-md border border-[#dce4eb] px-3 py-2 text-xs text-[#5b6b7b] lg:hidden" aria-label="Open navigation">☰</button>
          <span className="hidden text-sm font-semibold text-[#293a4a] lg:block">Dashboard</span>
        </div>
        <div className="flex items-center gap-4 text-sm text-[#6b7c8b]">
          <span className="hidden md:inline">⚙</span><span className="hidden md:inline">□</span><span className="hidden md:inline">♧</span>
          <span className="flex items-center gap-2 font-medium text-[#3d4d5b]"><span className="grid h-7 w-7 place-items-center rounded-full bg-[#1f557b] text-xs text-white">{user.firstName.charAt(0)}</span>{user.firstName} {user.lastName}</span>
          <form action="/api/auth/logout" method="post"><button className="text-xs font-semibold text-[#2786bf] hover:underline">Sign out</button></form>
        </div>
      </header>

      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[252px] bg-[#173e5d] text-white shadow-xl lg:block">
        <div className="flex h-[68px] items-center gap-3 border-b border-white/10 px-6">
          <span className="grid h-8 w-8 place-items-center rounded-full bg-[#4ba5d5] text-sm">✥</span>
          <span className="text-xl font-semibold tracking-tight">Learnzy Hub</span>
          <span className="ml-auto text-lg text-white/60">☰</span>
        </div>
        <nav className="py-3">
          {adminNavigation.map(([icon, label, href], index) => (
            <Link key={label} href={href} className={`flex items-center gap-3 border-b border-white/10 px-5 py-3 text-[13px] transition hover:bg-[#225477] ${index === 0 ? "bg-[#3d91c8] font-semibold" : "text-white/80"}`}>
              <span className="w-5 text-center text-base">{icon}</span><span>{label}</span>{index > 0 && <span className="ml-auto text-xs text-white/50">‹</span>}
            </Link>
          ))}
        </nav>
      </aside>

      <main className="px-4 pb-10 pt-[92px] lg:ml-[252px] lg:px-8">
        <div className="mx-auto max-w-[1320px]">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div><h1 className="text-xl font-bold text-[#263746]">Welcome {user.firstName} {user.lastName}</h1><p className="mt-1 text-xs text-[#7b8b98]">{school.name} · {user.role}</p></div>
            <Link href="/dashboard/academics" className="rounded bg-[#5cb7d4] px-4 py-2 text-xs font-semibold text-white shadow-sm">ⓘ Quick Guide</Link>
          </div>
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
            {summaryCards.map((card) => <article key={card.key} className="relative min-h-[106px] overflow-hidden rounded-[3px] p-5 text-right text-white shadow-sm" style={{ backgroundColor: card.color }}>
              <span className="absolute -bottom-5 -left-2 text-7xl text-white/10">{card.icon}</span>
              <p className="relative text-3xl font-light">{cardValues[card.key]}</p><p className="relative mt-1 text-xs">{card.label}</p>
            </article>)}
          </section>
          <section className="mt-5 overflow-hidden rounded-[3px] border border-[#e1e6ea] bg-white shadow-sm">
            <div className="border-b border-[#e8edf1] px-5 py-4 text-center">
              <h2 className="text-2xl font-bold text-[#30343a]">School Class Distribution</h2>
              <p className="text-xs text-[#7b8791]">{session?.name ?? "Current session"} Session</p>
              <div className="mt-2 flex justify-center gap-2"><button type="button" className="rounded border border-[#cfd7dd] px-3 py-1 text-[11px] text-[#4c5860]">▥ All Sessions Distribution Chart</button><button type="button" className="rounded border border-[#cfd7dd] px-3 py-1 text-[11px] text-[#4c5860]">▥ Summer School Type A Statistics</button></div>
            </div>
            <div className="overflow-x-auto px-5 pb-6 pt-6">
              <div className="flex min-w-[680px] items-end gap-3 border-b border-[#cfd7df] bg-[repeating-linear-gradient(to_bottom,#fff_0,#fff_44px,#e6ebef_45px)] px-4 pt-4" style={{ height: 280 }}>
                {totalByClass.map((item, index) => <div key={item.label} className="flex h-full min-w-[54px] flex-1 flex-col items-center justify-end gap-2">
                  <span className="text-xs font-semibold text-[#64727d]">{item.total}</span>
                  <div className="w-8 rounded-t-sm" style={{ height: `${Math.max((item.total / maxClassTotal) * 78, item.total ? 8 : 0)}%`, backgroundColor: ["#e76b7e", "#7d80df", "#efa25d", "#55b7ca"][index % 4] }} />
                  <span className="max-w-[72px] -rotate-45 origin-top text-[10px] text-[#52616d]">{item.label}</span>
                </div>)}
                {!totalByClass.length && <p className="m-auto text-sm text-[#8a98a4]">No classes have been configured yet.</p>}
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

async function TeacherDashboard({ user }: { user: NonNullable<Awaited<ReturnType<typeof getCurrentUser>>> }) {
  const staff = await prisma.staff.findUnique({
    where: { userId: user.id },
    include: {
      classes: { include: { arm: { include: { class: true, students: { where: { status: "ACTIVE" }, select: { id: true } } } } } },
      subjects: { include: { subject: true } },
    },
  });
  if (!staff) return <Shell title="Teacher profile not linked"><p className="mt-3 text-sm text-[#52627a]">Please contact your school administrator.</p></Shell>;

  const school = await prisma.school.findUnique({
    where: { id: user.schoolId },
    select: { name: true, currentTermId: true },
  });
  const assignments = await prisma.assignment.findMany({
    where: { staffId: staff.id },
    orderBy: { createdAt: "desc" },
    take: 5,
    select: { id: true, title: true, class: { select: { name: true } }, subject: { select: { name: true } }, dueAt: true },
  });
  const timetable = await prisma.timetableEntry.findMany({
    where: { staffId: staff.id },
    orderBy: [{ dayOfWeek: "asc" }, { startsAt: "asc" }],
    take: 5,
    select: { id: true, dayOfWeek: true, startsAt: true, endsAt: true, room: true, arm: { select: { name: true, class: { select: { name: true } } } }, subject: { select: { name: true } } },
  });
  const announcements = await prisma.announcement.findMany({
    where: { schoolId: user.schoolId },
    orderBy: { createdAt: "desc" },
    take: 3,
    select: { id: true, title: true, body: true },
  });
  const studentIds = staff.classes.flatMap((item) => item.arm.students.map((student) => student.id));
  const attendance = await prisma.attendanceRecord.count({
    where: { schoolId: user.schoolId, staffId: staff.id, ...(school?.currentTermId ? { termId: school.currentTermId } : {}) },
  });
  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const quickActions = [
    { label: "eClassroom", detail: "Access your classroom", href: "/dashboard/assignments", color: "#d94b3a", icon: "▶" },
    { label: "Assignments", detail: `${assignments.length} recent`, href: "/dashboard/assignments", color: "#55b996", icon: "▤" },
    { label: "CBT", detail: "Online assessments", href: "/dashboard/results", color: "#d94b3a", icon: "A+" },
    { label: "Check Schedules", detail: `${timetable.length} scheduled`, href: "/dashboard/academics", color: "#74c982", icon: "▦" },
  ];

  return (
    <div className="min-h-screen bg-[#f7f8fb] text-[#263746]">
      <header className="fixed inset-x-0 top-0 z-30 flex h-[68px] items-center justify-between border-b border-[#e2e8ee] bg-white px-4 shadow-sm lg:pl-[252px] lg:pr-8">
        <div className="flex items-center gap-3"><Link href="/dashboard" className="text-xl font-bold tracking-tight text-[#2786bf] lg:hidden">Learnzy Hub</Link><button type="button" className="rounded-md border border-[#dce4eb] px-3 py-2 text-xs text-[#5b6b7b] lg:hidden" aria-label="Open navigation">☰</button><span className="hidden text-sm font-semibold lg:block">Dashboard</span></div>
        <div className="flex items-center gap-4 text-sm text-[#6b7c8b]"><span className="hidden md:inline">□</span><span className="hidden md:inline">♧</span><span className="flex items-center gap-2 font-medium text-[#3d4d5b]"><span className="grid h-7 w-7 place-items-center rounded-full bg-[#6f7781] text-xs text-white">{user.firstName.charAt(0)}</span>{user.firstName} {user.lastName}</span><form action="/api/auth/logout" method="post"><button className="text-xs font-semibold text-[#2786bf] hover:underline">Sign out</button></form></div>
      </header>
      <TeacherSidebar />
      <main className="px-4 pb-10 pt-[92px] lg:ml-[252px] lg:px-7">
        <div className="mx-auto max-w-[1330px]">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-lg font-bold text-[#263746]">Welcome {user.firstName} {user.lastName}</h1><p className="mt-1 text-xs text-[#7b8b98]">{school?.name ?? "School portal"} · Teacher</p></div><Link href="/dashboard/attendance" className="rounded bg-[#d95a5a] px-4 py-2 text-xs font-semibold text-white shadow-sm">◉ Take Class Attendance</Link></div>
          <section className="grid gap-4 border border-[#e5e9ed] bg-white p-5 sm:grid-cols-2 lg:grid-cols-4">{quickActions.map((action) => <Link key={action.label} href={action.href} className="group flex flex-col items-center justify-center rounded px-4 py-3 text-center transition hover:bg-[#f5f8fa]"><span className="grid h-20 w-20 place-items-center rounded-full text-2xl font-bold text-white shadow-sm" style={{ backgroundColor: action.color }}>{action.icon}</span><span className="mt-2 text-xs font-semibold text-[#334657]">{action.label}</span><span className="mt-1 text-[10px] text-[#8a98a4]">{action.detail}</span></Link>)}</section>
          <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
            <section className="overflow-hidden border border-[#e2e7eb] bg-white">
              <div className="flex flex-wrap gap-6 border-b border-[#e2e7eb] px-5"><button type="button" className="border-b-2 border-[#4e9bd0] px-1 py-3 text-xs font-semibold text-[#4e9bd0]">Overview</button><Link href="/dashboard/academics" className="px-1 py-3 text-xs font-semibold text-[#45627c]">My Subjects</Link><Link href="/dashboard/assignments" className="px-1 py-3 text-xs font-semibold text-[#45627c]">Weekly Reflection</Link><Link href="/dashboard/students" className="px-1 py-3 text-xs font-semibold text-[#45627c]">My Students</Link></div>
              <div className="p-5">
                <div className="grid gap-4 sm:grid-cols-3">{[["My classes", String(staff.classes.length)], ["My students", String(new Set(studentIds).size)], ["Attendance records", String(attendance)]].map(([label, value]) => <article key={label} className="border border-[#e4e9ed] bg-[#fbfcfd] p-4"><p className="text-xs text-[#8491a5]">{label}</p><p className="mt-2 text-2xl font-bold text-[#273b4d]">{value}</p></article>)}</div>
                <div className="mt-5 border border-[#e4e9ed]"><div className="border-b border-[#e4e9ed] bg-[#f6f7f8] px-4 py-3 text-sm font-semibold">My assigned classes and subjects</div>{staff.classes.length ? staff.classes.map((item) => <div key={item.armId} className="flex flex-wrap items-center justify-between gap-2 border-b border-[#edf0f2] px-4 py-3 text-xs last:border-0"><span className="font-semibold">{item.arm.class.name}{item.arm.name}</span><span className="text-[#748391]">{item.arm.students.length} students</span></div>) : <p className="p-4 text-xs text-[#8a98a4]">No classes assigned yet.</p>}</div>
                <div className="mt-5 border border-[#e4e9ed]"><div className="border-b border-[#e4e9ed] bg-[#f6f7f8] px-4 py-3 text-sm font-semibold">Recent assignments</div>{assignments.length ? assignments.map((item) => <Link href="/dashboard/assignments" key={item.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-[#edf0f2] px-4 py-3 text-xs last:border-0"><span>{item.title}</span><span className="text-[#748391]">{item.class.name} · {item.subject.name}</span></Link>) : <p className="p-4 text-xs text-[#8a98a4]">No assignments created yet.</p>}</div>
              </div>
            </section>
            <aside className="space-y-4">
              <section className="border border-[#e2e7eb] bg-white"><h2 className="border-b border-[#e2e7eb] bg-[#f6f7f8] px-4 py-3 text-sm font-semibold">▦ Upcoming Lessons</h2>{timetable.length ? timetable.slice(0, 3).map((item) => <div key={item.id} className="border-b border-[#edf0f2] p-4 text-xs last:border-0"><p className="font-semibold text-[#385a78]">{item.subject.name} · {item.arm.class.name}{item.arm.name}</p><p className="mt-1 text-[#7d8b96]">{dayNames[item.dayOfWeek] ?? "Lesson"} · {item.startsAt}–{item.endsAt}</p></div>) : <p className="p-5 text-xs text-[#8a98a4]">No lessons scheduled.</p>}</section>
              <section className="border border-[#e2e7eb] bg-white"><h2 className="border-b border-[#e2e7eb] bg-[#f6f7f8] px-4 py-3 text-sm font-semibold">▣ My Subjects</h2>{staff.subjects.length ? staff.subjects.map((item) => <p key={item.subjectId} className="border-b border-[#edf0f2] p-4 text-xs last:border-0">{item.subject.name}</p>) : <p className="p-5 text-xs text-[#8a98a4]">No subjects assigned.</p>}</section>
              <section className="border border-[#e2e7eb] bg-white"><h2 className="border-b border-[#e2e7eb] bg-[#f6f7f8] px-4 py-3 text-sm font-semibold">● Announcements</h2>{announcements.length ? announcements.map((item) => <div key={item.id} className="border-b border-[#edf0f2] p-4 last:border-0"><p className="text-xs font-semibold text-[#385a78]">{item.title}</p><p className="mt-1 line-clamp-2 text-[11px] text-[#7d8b96]">{item.body}</p></div>) : <p className="p-5 text-xs text-[#8a98a4]">No recent announcements.</p>}</section>
            </aside>
          </div>
        </div>
      </main>
    </div>
  );
}

async function StudentDashboard({ user }: { user: NonNullable<Awaited<ReturnType<typeof getCurrentUser>>> }) {
  const student = await prisma.student.findUnique({ where: { userId: user.id }, include: { arm: { include: { class: true } }, school: true } });
  if (!student) return <Shell title="Student profile not linked"><p className="mt-3 text-sm text-[#52627a]">Please contact your school administrator.</p></Shell>;
  const term = student.school.currentTermId ? await prisma.term.findUnique({ where: { id: student.school.currentTermId } }) : null;
  const attendance = term ? await prisma.attendanceRecord.findMany({ where: { studentId: student.id, termId: term.id }, select: { status: true } }) : [];
  const results = term ? await prisma.result.findMany({ where: { studentId: student.id, termId: term.id, status: ResultStatus.PUBLISHED }, select: { total: true, subject: { select: { name: true } } } }) : [];
  const assignments = await prisma.assignment.count({ where: { schoolId: user.schoolId, ...(student.armId ? { classId: student.arm?.class.id } : {}) } });
  const announcements = await prisma.announcement.findMany({ where: { schoolId: user.schoolId }, orderBy: { createdAt: "desc" }, take: 3, select: { id: true, title: true, body: true, createdAt: true } });
  const average = results.length ? results.reduce((sum, item) => sum + Number(item.total), 0) / results.length : 0;
  const rate = attendance.length ? Math.round((attendance.filter((item) => item.status === "PRESENT" || item.status === "LATE").length / attendance.length) * 100) : 0;
  const studentNavigation = [
    ["⌂", "Dashboard", "/dashboard"],
    ["♙", "My HRM Info", "/dashboard"],
    ["▦", "Pastoral", "/dashboard/attendance"],
    ["●", "Feedback", "/dashboard/announcements"],
    ["▣", "eClassroom", "/dashboard/assignments"],
    ["▤", "Assignments", "/dashboard/assignments"],
    ["▥", "Subjects", "/dashboard/results"],
    ["▤", "Library", "/dashboard/academics"],
    ["☑", "Lesson Planner", "/dashboard/academics"],
    ["⚒", "Co-curricular", "/dashboard/announcements"],
    ["◷", "TimeTable", "/dashboard/academics"],
    ["◉", "Class Attendance", "/dashboard/attendance"],
    ["▣", "Calendar", "/dashboard/announcements"],
    ["♙", "Staff Attendance", "/dashboard/attendance"],
  ] as const;
  const quickActions = [
    { label: "eClassroom", href: "/dashboard/assignments", color: "#c94d3b", icon: "▶", detail: "Access your classroom" },
    { label: "Assignments", href: "/dashboard/assignments", color: "#5eb89d", icon: "▤", detail: `${assignments} available` },
    { label: "CBT", href: "/dashboard/results", color: "#c94d3b", icon: "A+", detail: "Online assessments" },
  ];
  return (
    <div className="min-h-screen bg-[#f7f8fb] text-[#263746]">
      <header className="fixed inset-x-0 top-0 z-30 flex h-[68px] items-center justify-between border-b border-[#e2e8ee] bg-white px-4 shadow-sm lg:pl-[252px] lg:pr-8">
        <div className="flex items-center gap-3"><Link href="/dashboard" className="text-xl font-bold tracking-tight text-[#2786bf] lg:hidden">Learnzy Hub</Link><button type="button" className="rounded-md border border-[#dce4eb] px-3 py-2 text-xs text-[#5b6b7b] lg:hidden" aria-label="Open navigation">☰</button><span className="hidden text-sm font-semibold lg:block">Dashboard</span></div>
        <div className="flex items-center gap-4 text-sm text-[#6b7c8b]"><span className="hidden md:inline">⑬</span><span className="hidden md:inline">♧</span><span className="flex items-center gap-2 font-medium text-[#3d4d5b]"><span className="grid h-7 w-7 place-items-center rounded-full bg-[#6f7781] text-xs text-white">{student.firstName.charAt(0)}</span>{student.firstName} {student.lastName}</span><form action="/api/auth/logout" method="post"><button className="text-xs font-semibold text-[#2786bf] hover:underline">Sign out</button></form></div>
      </header>
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[252px] bg-[#173e5d] text-white shadow-xl lg:block">
        <div className="flex h-[68px] items-center gap-3 border-b border-white/10 px-6"><span className="grid h-8 w-8 place-items-center rounded-full bg-[#4ba5d5] text-sm">✥</span><span className="text-xl font-semibold tracking-tight">Learnzy Hub</span><span className="ml-auto text-lg text-white/60">☰</span></div>
        <nav className="py-3">{studentNavigation.map(([icon, label, href], index) => <Link key={label} href={href} className={`flex items-center gap-3 border-b border-white/10 px-5 py-3 text-[13px] transition hover:bg-[#225477] ${index === 0 ? "bg-[#3d91c8] font-semibold" : "text-white/80"}`}><span className="w-5 text-center text-base">{icon}</span><span>{label}</span>{index > 0 && <span className="ml-auto text-xs text-white/50">‹</span>}</Link>)}</nav>
      </aside>
      <main className="px-4 pb-10 pt-[92px] lg:ml-[252px] lg:px-7">
        <div className="mx-auto max-w-[1250px]">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-lg font-bold text-[#263746]">Welcome {student.firstName} {student.lastName}</h1><p className="mt-1 text-xs text-[#7b8b98]">{student.arm ? `${student.arm.class.name}${student.arm.name}` : "Class not assigned"} · {term?.name ?? "No active term"}</p></div><Link href="/dashboard/attendance" className="rounded bg-[#d95a5a] px-4 py-2 text-xs font-semibold text-white shadow-sm">◉ Take Class Attendance</Link></div>
          <section className="grid gap-4 border border-[#e5e9ed] bg-white p-5 sm:grid-cols-3">
            {quickActions.map((action) => <Link key={action.label} href={action.href} className="group flex flex-col items-center justify-center rounded px-4 py-3 text-center transition hover:bg-[#f5f8fa]"><span className="grid h-16 w-16 place-items-center rounded-full text-xl font-bold text-white shadow-sm" style={{ backgroundColor: action.color }}>{action.icon}</span><span className="mt-2 text-xs font-semibold text-[#334657]">{action.label}</span><span className="mt-1 text-[10px] text-[#8a98a4]">{action.detail}</span></Link>)}
          </section>
          <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
            <section className="overflow-hidden border border-[#e2e7eb] bg-white">
              <div className="flex gap-6 border-b border-[#e2e7eb] px-5"><button type="button" className="border-b-2 border-[#4e9bd0] px-1 py-3 text-xs font-semibold text-[#4e9bd0]">Overview</button><Link href="/dashboard/results" className="px-1 py-3 text-xs font-semibold text-[#45627c]">My Subjects</Link><Link href="/dashboard/assignments" className="px-1 py-3 text-xs font-semibold text-[#45627c]">Weekly Reflection</Link></div>
              <div className="p-5">
                <div className="grid gap-4 sm:grid-cols-3">{[["Attendance", `${rate}%`], ["Average score", `${average.toFixed(1)}%`], ["Published subjects", String(results.length)]].map(([label, value]) => <article key={label} className="border border-[#e4e9ed] bg-[#fbfcfd] p-4"><p className="text-xs text-[#8491a5]">{label}</p><p className="mt-2 text-2xl font-bold text-[#273b4d]">{value}</p></article>)}</div>
                <div className="mt-5 border border-[#e4e9ed]"><div className="border-b border-[#e4e9ed] bg-[#f6f7f8] px-4 py-3 text-sm font-semibold">Latest published results</div>{results.length ? results.slice(0, 5).map((result) => <div key={result.subject.name} className="flex justify-between border-b border-[#edf0f2] px-4 py-3 text-xs last:border-0"><span>{result.subject.name}</span><strong>{Number(result.total).toFixed(1)}%</strong></div>) : <p className="p-4 text-xs text-[#8a98a4]">No published results yet.</p>}</div>
              </div>
            </section>
            <aside className="space-y-4">
              <section className="border border-[#e2e7eb] bg-white"><h2 className="border-b border-[#e2e7eb] bg-[#f6f7f8] px-4 py-3 text-sm font-semibold">▦ Upcoming Lessons</h2><p className="p-5 text-xs text-[#8a98a4]">No lessons scheduled.</p></section>
              <section className="border border-[#e2e7eb] bg-white"><h2 className="border-b border-[#e2e7eb] bg-[#f6f7f8] px-4 py-3 text-sm font-semibold">● Announcements</h2>{announcements.length ? announcements.map((item) => <div key={item.id} className="border-b border-[#edf0f2] p-4 last:border-0"><p className="text-xs font-semibold text-[#385a78]">{item.title}</p><p className="mt-1 line-clamp-2 text-[11px] text-[#7d8b96]">{item.body}</p></div>) : <p className="p-5 text-xs text-[#8a98a4]">No recent announcements.</p>}</section>
              <section className="border border-[#e2e7eb] bg-white"><h2 className="border-b border-[#e2e7eb] bg-[#f6f7f8] px-4 py-3 text-sm font-semibold">◷ Class information</h2><p className="p-4 text-xs text-[#7d8b96]">{student.arm ? `${student.arm.class.name}${student.arm.name}` : "Class not assigned"} · {student.admissionNo}</p></section>
            </aside>
          </div>
        </div>
      </main>
    </div>
  );
}

async function ParentDashboard({ user }: { user: NonNullable<Awaited<ReturnType<typeof getCurrentUser>>> }) {
  const guardian = await prisma.guardian.findUnique({ where: { userId: user.id }, include: { students: { include: { student: { include: { arm: { include: { class: true } } } } } } } });
  if (!guardian) return <Shell title="Parent profile not linked"><p className="mt-3 text-sm text-[#52627a]">Please contact your school administrator.</p></Shell>;
  const children = guardian.students.map((link) => link.student);
  const ids = children.map((child) => child.id);
  const [results, attendance, payments] = await Promise.all([
    prisma.result.findMany({ where: { schoolId: user.schoolId, studentId: { in: ids }, status: ResultStatus.PUBLISHED }, take: 20, select: { studentId: true, total: true, grade: true, subject: { select: { name: true } } } }),
    prisma.attendanceRecord.findMany({ where: { studentId: { in: ids } }, select: { status: true } }),
    prisma.payment.findMany({ where: { schoolId: user.schoolId, studentId: { in: ids }, status: "PAID" }, take: 10, select: { amount: true } }),
  ]);
  const paid = payments.reduce((sum, item) => sum + Number(item.amount), 0);
  const rate = attendance.length ? Math.round((attendance.filter((item) => item.status === "PRESENT" || item.status === "LATE").length / attendance.length) * 100) : 0;
  return <Shell title={`Good morning, ${guardian.firstName}`}><p className="mt-2 text-sm text-[#52627a]">Parent portal · monitor linked children and school activity.</p><nav className="mt-6 flex flex-wrap gap-3">{[["Assignments", "/dashboard/assignments"], ["Fees & payments", "/dashboard/fees"], ["Announcements", "/dashboard/announcements"]].map(([label, href]) => <Link key={href} href={href} className="rounded-full border border-[#d6deea] bg-white px-4 py-2 text-sm font-semibold">{label}</Link>)}</nav><div className="mt-8 grid gap-4 sm:grid-cols-3">{[["Children", String(children.length)], ["Attendance", `${rate}%`], ["Paid fees", naira(paid)]].map(([label, value]) => <article key={label} className="rounded-2xl border border-[#e5eaf1] bg-white p-5"><p className="text-sm text-[#8491a5]">{label}</p><p className="mt-3 text-3xl font-bold">{value}</p></article>)}</div><div className="mt-8 grid gap-6 lg:grid-cols-2"><section className="rounded-2xl border border-[#e5eaf1] bg-white p-6"><h2 className="text-lg font-bold">My children</h2><div className="mt-4 space-y-3">{children.map((child) => <div key={child.id} className="rounded-xl bg-[#f7f9fc] p-4"><p className="font-semibold">{child.firstName} {child.lastName}</p><p className="mt-1 text-xs text-[#52627a]">{child.arm ? child.arm.class.name + child.arm.name : "Class not assigned"} · {child.admissionNo}</p></div>)}</div></section><section className="rounded-2xl border border-[#e5eaf1] bg-white p-6"><h2 className="text-lg font-bold">Latest results</h2><div className="mt-4 space-y-3">{results.slice(0, 6).map((result, index) => <div key={result.studentId + index} className="flex justify-between rounded-xl bg-[#f7f9fc] p-4"><span>{children.find((child) => child.id === result.studentId)?.firstName} · {result.subject.name}</span><strong>{Number(result.total).toFixed(1)}% · {result.grade}</strong></div>)}</div>{!results.length && <p className="mt-4 text-sm text-[#8491a5]">No published results yet.</p>}</section></div></Shell>;
}

async function DashboardContent() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role === UserRole.STUDENT) return <StudentDashboard user={user} />;
  if (user.role === UserRole.PARENT) return <ParentDashboard user={user} />;
  if (user.role === UserRole.TEACHER) return <TeacherDashboard user={user} />;
  return <AdminDashboard user={user} />;
}

export default function DashboardPage() {
  return <Suspense fallback={<main className="grid min-h-screen place-items-center">Loading dashboard...</main>}><DashboardContent /></Suspense>;
}

"use client";

import Link from "next/link";
import { useState } from "react";

type MenuItem = { label: string; href: string };
type MenuGroup = { icon: string; label: string; href?: string; items?: MenuItem[] };

const menu: MenuGroup[] = [
  { icon: "⌂", label: "Dashboard", href: "/dashboard" },
  { icon: "▦", label: "Pastoral", items: [{ label: "Attendance", href: "/dashboard/attendance" }, { label: "Announcements", href: "/dashboard/announcements" }] },
  { icon: "♙", label: "My HRM Info", href: "/dashboard" },
  { icon: "▣", label: "eClassroom", items: [{ label: "Assignments", href: "/dashboard/assignments" }, { label: "Resources", href: "/dashboard/assignments" }] },
  { icon: "●", label: "Feedback", href: "/dashboard/announcements" },
  { icon: "▤", label: "Secondary School Report", items: [{ label: "Results", href: "/dashboard/results" }, { label: "Report cards", href: "/dashboard/results" }] },
  { icon: "▥", label: "Subjects", href: "/dashboard/academics" },
  { icon: "☑", label: "Lesson Planner", href: "/dashboard/academics" },
  { icon: "⚑", label: "CBT", href: "/dashboard/results" },
  { icon: "◷", label: "TimeTable", href: "/dashboard/academics" },
  { icon: "◉", label: "Behaviour Tracker", items: [{ label: "Class behaviour", href: "/dashboard/announcements" }, { label: "Weekly remarks", href: "/dashboard/results" }] },
  { icon: "◎", label: "Class Attendance", href: "/dashboard/attendance" },
  { icon: "▤", label: "Photo Journals", href: "/dashboard/announcements" },
  { icon: "♧", label: "Weekly Remarks", href: "/dashboard/results" },
];

export default function TeacherSidebar() {
  const [open, setOpen] = useState<string[]>(["Pastoral", "eClassroom"]);
  const [search, setSearch] = useState("");

  function toggle(label: string) {
    setOpen((current) => current.includes(label) ? current.filter((item) => item !== label) : [...current, label]);
  }

  const filteredMenu = menu.filter((item) => item.label.toLowerCase().includes(search.toLowerCase()) || item.items?.some((child) => child.label.toLowerCase().includes(search.toLowerCase())));

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-[252px] overflow-y-auto bg-[#0d4264] text-white shadow-xl lg:block">
      <div className="flex h-[68px] items-center gap-3 border-b border-white/10 px-6">
        <span className="grid h-8 w-8 place-items-center rounded-full bg-white text-xs font-bold text-[#0d4264]">E</span>
        <span className="text-xl font-semibold tracking-tight">Learnzy Hub</span>
        <span className="ml-auto text-lg text-white/60">☰</span>
      </div>
      <div className="border-b border-white/10 p-3">
        <label className="sr-only" htmlFor="teacher-navigation-search">Search navigation</label>
        <input id="teacher-navigation-search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search..." className="h-8 w-full rounded border-0 px-3 text-xs text-[#263746] outline-none" />
      </div>
      <nav className="py-3" aria-label="Teacher navigation">
        {filteredMenu.map((item, index) => {
          const isOpen = open.includes(item.label);
          const hasChildren = Boolean(item.items?.length);
          return (
            <div key={item.label}>
              {hasChildren ? (
                <button type="button" aria-expanded={isOpen} onClick={() => toggle(item.label)} className={`flex w-full items-center gap-3 border-b border-white/10 px-3 py-3 text-left text-[13px] transition hover:bg-[#1d5a80] ${index === 0 ? "bg-[#3399d8] font-semibold" : "text-white/90"}`}>
                  <span className="w-4 text-center">{item.icon}</span><span>{item.label}</span><span className="ml-auto text-xs text-white/70">{isOpen ? "⌄" : "‹"}</span>
                </button>
              ) : (
                <Link href={item.href ?? "/dashboard"} className={`flex items-center gap-3 border-b border-white/10 px-3 py-3 text-[13px] transition hover:bg-[#1d5a80] ${index === 0 ? "bg-[#3399d8] font-semibold" : "text-white/90"}`}>
                  <span className="w-4 text-center">{item.icon}</span><span>{item.label}</span>
                </Link>
              )}
              {hasChildren && isOpen && <div className="bg-[#0a3654] py-1">{item.items?.map((child) => <Link key={child.label} href={child.href} className="block border-b border-white/5 px-10 py-2 text-xs text-white/75 transition hover:bg-[#1d5a80] hover:text-white">{child.label}</Link>)}</div>}
            </div>
          );
        })}
        {!filteredMenu.length && <p className="px-5 py-4 text-xs text-white/60">No menu items found.</p>}
      </nav>
    </aside>
  );
}

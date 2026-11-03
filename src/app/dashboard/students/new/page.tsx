"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function NewStudentPage() {
  const router = useRouter();
  const [form, setForm] = useState({ firstName: "", lastName: "", otherNames: "", gender: "" });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/students", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const data = await response.json() as { error?: string };
      if (!response.ok) { setError(data.error ?? "Unable to create student."); return; }
      router.push("/dashboard/students");
      router.refresh();
    } catch { setError("Unable to reach the portal."); } finally { setSaving(false); }
  }

  return <main className="min-h-screen bg-[#f7f9fc] px-5 py-10 text-[#12233f]"><div className="mx-auto max-w-2xl"><Link href="/dashboard/students" className="text-sm font-semibold text-[#176b5b]">← Back to students</Link><section className="mt-6 rounded-3xl border border-[#e5eaf1] bg-white p-7 shadow-xl shadow-[#12233f]/5 sm:p-9"><p className="text-sm font-bold uppercase tracking-widest text-[#176b5b]">Student management</p><h1 className="mt-3 text-3xl font-bold">Add student</h1><p className="mt-3 text-sm leading-6 text-[#52627a]">An admission number will be generated automatically.</p><form onSubmit={submit} className="mt-8 space-y-5"><div className="grid gap-5 sm:grid-cols-2"><label className="block text-sm font-semibold">First name<input required value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} className="mt-2 h-12 w-full rounded-xl border border-[#d6deea] px-4 outline-none focus:border-[#176b5b] focus:ring-4 focus:ring-[#176b5b]/10" /></label><label className="block text-sm font-semibold">Last name<input required value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} className="mt-2 h-12 w-full rounded-xl border border-[#d6deea] px-4 outline-none focus:border-[#176b5b] focus:ring-4 focus:ring-[#176b5b]/10" /></label></div><label className="block text-sm font-semibold">Other names<input value={form.otherNames} onChange={(e) => setForm({ ...form, otherNames: e.target.value })} className="mt-2 h-12 w-full rounded-xl border border-[#d6deea] px-4 outline-none focus:border-[#176b5b] focus:ring-4 focus:ring-[#176b5b]/10" /></label><label className="block text-sm font-semibold">Gender<select value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })} className="mt-2 h-12 w-full rounded-xl border border-[#d6deea] bg-white px-4 outline-none focus:border-[#176b5b]"><option value="">Select gender</option><option>Female</option><option>Male</option><option>Prefer not to say</option></select></label>{error && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}<button disabled={saving} className="h-12 w-full rounded-xl bg-[#176b5b] font-semibold text-white hover:bg-[#125646] disabled:opacity-60">{saving ? "Saving..." : "Create student"}</button></form></section></div></main>;
}

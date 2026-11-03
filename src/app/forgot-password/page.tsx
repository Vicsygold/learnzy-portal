"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setMessage("");
    const response = await fetch("/api/auth/forgot-password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) });
    const data = await response.json() as { message?: string; error?: string };
    if (!response.ok) setError(data.error ?? "Unable to send reset link.");
    else setMessage(data.message ?? "Check your email for a reset link.");
  }
  return <main className="flex min-h-screen items-center justify-center bg-[#f7f9fc] px-5 text-[#12233f]"><section className="w-full max-w-md rounded-3xl border border-[#e5eaf1] bg-white p-8 shadow-xl"><Link href="/login" className="text-sm font-semibold text-[#176b5b]">← Back to login</Link><h1 className="mt-8 text-3xl font-bold">Forgot password?</h1><p className="mt-3 text-sm text-[#52627a]">Enter your account email and we&apos;ll send a reset link.</p><form onSubmit={submit} className="mt-7 space-y-4"><label className="block text-sm font-semibold">Email address<input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="mt-2 h-12 w-full rounded-xl border border-[#d6deea] px-4" /></label>{error && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}{message && <p role="status" className="rounded-xl bg-[#e6f4ef] px-4 py-3 text-sm text-[#176b5b]">{message}</p>}<button className="h-12 w-full rounded-xl bg-[#176b5b] font-semibold text-white">Send reset link</button></form></section></main>;
}

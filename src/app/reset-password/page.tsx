"use client";

import { FormEvent, Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

function ResetPasswordForm() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    if (password !== confirmation) { setError("Passwords do not match."); return; }
    const response = await fetch("/api/auth/reset-password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, password }) });
    const data = await response.json() as { error?: string };
    if (!response.ok) { setError(data.error ?? "Unable to reset password."); return; }
    router.push("/login?reset=success");
  }

  return <main className="flex min-h-screen items-center justify-center bg-[#f7f9fc] px-5 text-[#12233f]"><section className="w-full max-w-md rounded-3xl border border-[#e5eaf1] bg-white p-8 shadow-xl"><Link href="/login" className="text-sm font-semibold text-[#176b5b]">← Back to login</Link><h1 className="mt-8 text-3xl font-bold">Set a new password</h1><form onSubmit={submit} className="mt-7 space-y-4"><label className="block text-sm font-semibold">New password<input required minLength={8} type="password" value={password} onChange={(event) => setPassword(event.target.value)} className="mt-2 h-12 w-full rounded-xl border border-[#d6deea] px-4" /></label><label className="block text-sm font-semibold">Confirm password<input required minLength={8} type="password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} className="mt-2 h-12 w-full rounded-xl border border-[#d6deea] px-4" /></label>{error && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}<button className="h-12 w-full rounded-xl bg-[#176b5b] font-semibold text-white">Reset password</button></form></section></main>;
}

export default function ResetPasswordPage() {
  return <Suspense fallback={<main className="grid min-h-screen place-items-center bg-[#f7f9fc]">Loading...</main>}><ResetPasswordForm /></Suspense>;
}

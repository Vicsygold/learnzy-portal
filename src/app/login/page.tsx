"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json() as { error?: string; redirectTo?: string };
      if (!response.ok) {
        setError(data.error ?? "Unable to sign in.");
        return;
      }
      router.push(data.redirectTo ?? "/dashboard");
      router.refresh();
    } catch {
      setError("Unable to reach the portal. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f7f9fc] px-5 py-12 text-[#12233f]">
      <div className="w-full max-w-md">
        <Link href="/" className="mb-8 flex items-center justify-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#176b5b] text-lg font-bold text-white">L</span>
          <span className="text-xl font-bold">Learnzy Hub</span>
        </Link>
        <section className="rounded-3xl border border-[#e5eaf1] bg-white p-7 shadow-xl shadow-[#12233f]/5 sm:p-9">
          <p className="text-sm font-bold uppercase tracking-widest text-[#176b5b]">Secure portal</p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight">Welcome back</h1>
          <p className="mt-3 text-sm leading-6 text-[#52627a]">Sign in to manage your school or view your learner&apos;s progress.</p>
          <form onSubmit={submit} className="mt-8 space-y-5">
            <label className="block text-sm font-semibold">Email address<input required type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} className="mt-2 h-12 w-full rounded-xl border border-[#d6deea] px-4 outline-none transition focus:border-[#176b5b] focus:ring-4 focus:ring-[#176b5b]/10" /></label>
            <label className="block text-sm font-semibold">Password<input required minLength={8} type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} className="mt-2 h-12 w-full rounded-xl border border-[#d6deea] px-4 outline-none transition focus:border-[#176b5b] focus:ring-4 focus:ring-[#176b5b]/10" /></label>
            {error && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
            <button disabled={loading} className="h-12 w-full rounded-xl bg-[#176b5b] font-semibold text-white transition hover:bg-[#125646] disabled:cursor-not-allowed disabled:opacity-60">{loading ? "Signing in..." : "Sign in"}</button>
          </form>
          <div className="mt-6 flex items-center justify-between text-xs text-[#8491a5]"><Link href="/forgot-password" className="font-semibold text-[#176b5b]">Forgot password?</Link><span>Need access? Contact your school administrator.</span></div>
        </section>
      </div>
    </main>
  );
}

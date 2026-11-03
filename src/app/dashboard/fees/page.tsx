"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Fee = { id: string; name: string; amount: string; classId: string; class: { name: string }; term: { name: string; session: { name: string } } };
type Student = { id: string; firstName: string; lastName: string; admissionNo: string; arm: { classId: string } | null };
type Payment = { id: string; reference: string; amount: string; status: string; method: string; student: { admissionNo: string; firstName: string; lastName: string } };
type FeeData = { fees: Fee[]; payments: Payment[]; students?: Student[]; error?: string };

export default function FeesPage() {
  const [data, setData] = useState<FeeData | null>(null);
  const [email, setEmail] = useState("");
  const [selectedStudents, setSelectedStudents] = useState<Record<string, string>>({});
  const [loadingFee, setLoadingFee] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch("/api/fees")
      .then(async (response) => {
        const result = (await response.json()) as FeeData;
        if (!response.ok) throw new Error(result.error ?? "Unable to load fees.");
        setData(result);
      })
      .catch((reason: Error) => setError(reason.message));
  }, []);

  async function startPayment(fee: Fee) {
    const studentId = selectedStudents[fee.id];
    if (!studentId || !email) {
      setError("Select a child and enter the parent email before paying.");
      return;
    }
    setError("");
    setMessage("");
    setLoadingFee(fee.id);
    try {
      const response = await fetch("/api/payments/initialize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ feeId: fee.id, studentId, email }),
      });
      const result = (await response.json()) as { authorizationUrl?: string; error?: string };
      if (!response.ok || !result.authorizationUrl) throw new Error(result.error ?? "Unable to start Paystack checkout.");
      window.location.assign(result.authorizationUrl);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to start payment.");
      setLoadingFee("");
    }
  }

  return <main className="min-h-screen bg-[#f7f9fc] text-[#12233f]"><header className="border-b border-[#e5eaf1] bg-white px-5 py-5"><div className="mx-auto flex max-w-7xl items-center justify-between"><Link href="/dashboard" className="font-bold">Learnzy Hub</Link><Link href="/dashboard" className="text-sm font-semibold text-[#176b5b]">Back to dashboard</Link></div></header><section className="mx-auto max-w-7xl px-5 py-10"><p className="text-sm font-bold uppercase tracking-widest text-[#176b5b]">Finance</p><h1 className="mt-3 text-4xl font-bold tracking-tight">Fees and payments</h1>{error && <p role="alert" className="mt-6 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}{message && <p role="status" className="mt-6 rounded-xl bg-[#e6f4ef] px-4 py-3 text-sm text-[#176b5b]">{message}</p>}{data?.students?.length ? <section className="mt-7 rounded-2xl border border-[#e5eaf1] bg-white p-6"><h2 className="text-lg font-bold">Pay school fees online</h2><p className="mt-1 text-sm text-[#52627a]">Pay securely through Paystack. Test mode does not move real money.</p><input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Parent email address" className="mt-4 h-11 w-full max-w-md rounded-xl border border-[#d6deea] px-3 text-sm" /></section> : null}{!data && !error && <p className="mt-8 text-sm text-[#52627a]">Loading financial records...</p>}{data && <div className="mt-8 grid gap-6 lg:grid-cols-2"><section className="rounded-2xl border border-[#e5eaf1] bg-white p-6"><h2 className="text-lg font-bold">Fee structures</h2><div className="mt-5 space-y-3">{data.fees.map((fee) => <div key={fee.id} className="rounded-xl bg-[#f7f9fc] p-4"><div className="flex items-start justify-between gap-4"><div><p className="font-semibold">{fee.name}</p><p className="mt-1 text-xs text-[#52627a]">{fee.class.name} · {fee.term.name} Term · {fee.term.session.name}</p></div><p className="font-bold">₦{Number(fee.amount).toLocaleString("en-NG")}</p></div>{data.students?.length ? <div className="mt-4 flex flex-wrap items-center gap-3"><select value={selectedStudents[fee.id] ?? ""} onChange={(event) => setSelectedStudents({ ...selectedStudents, [fee.id]: event.target.value })} className="h-10 min-w-48 rounded-lg border border-[#d6deea] bg-white px-3 text-sm"><option value="">Select child</option>{data.students.filter((student) => student.arm?.classId === fee.classId).map((student) => <option key={student.id} value={student.id}>{student.firstName} {student.lastName}</option>)}</select><button type="button" onClick={() => startPayment(fee)} disabled={loadingFee === fee.id} className="rounded-lg bg-[#176b5b] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">{loadingFee === fee.id ? "Opening checkout..." : "Pay with Paystack"}</button></div> : null}</div>)}</div></section><section className="rounded-2xl border border-[#e5eaf1] bg-white p-6"><h2 className="text-lg font-bold">Recent payments</h2><div className="mt-5 space-y-3">{data.payments.map((payment) => <div key={payment.id} className="flex items-center justify-between rounded-xl bg-[#f7f9fc] p-4"><div><p className="font-semibold">{payment.student.firstName} {payment.student.lastName}</p><p className="mt-1 text-xs text-[#52627a]">{payment.reference} · {payment.method}</p><a href={`/api/receipts/${payment.id}`} className="mt-2 inline-block text-xs font-semibold text-[#176b5b]">Download receipt</a></div><div className="text-right"><p className="font-bold">₦{Number(payment.amount).toLocaleString("en-NG")}</p><p className="mt-1 text-xs text-[#176b5b]">{payment.status}</p></div></div>)}</div>{!data.payments.length && <p className="mt-4 text-sm text-[#8491a5]">No payments recorded yet.</p>}</section></div>}</section></main>;
}

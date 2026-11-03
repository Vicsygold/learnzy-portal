"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";

type Submission = {
  id: string;
  content?: string | null;
  attachmentUrl?: string | null;
  score?: string | number | null;
  feedback?: string | null;
  submittedAt: string;
  student?: { firstName: string; lastName: string; admissionNo: string };
};

type Assignment = {
  id: string;
  title: string;
  instructions: string;
  dueAt: string | null;
  attachmentUrl?: string | null;
  class: { name: string };
  subject: { name: string; code: string };
  staff: { user: { firstName: string; lastName: string } };
  submissions: Submission[];
};

type Workspace = {
  canApprove?: boolean;
  subjects: { id: string; name: string; code: string }[];
  arms: {
    id: string;
    name: string;
    class: { id: string; name: string };
    students: { id: string; firstName: string; lastName: string }[];
  }[];
};

type AssignmentResponse = {
  assignments?: Assignment[];
  canGrade?: boolean;
  error?: string;
};

export default function AssignmentsPage() {
  const [items, setItems] = useState<Assignment[]>([]);
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [canGrade, setCanGrade] = useState(false);
  const [form, setForm] = useState({
    classId: "",
    subjectId: "",
    title: "",
    instructions: "",
    dueAt: "",
  });
  const [assignmentFile, setAssignmentFile] = useState<File | null>(null);
  const [submissionFiles, setSubmissionFiles] = useState<Record<string, File | null>>({});
  const [content, setContent] = useState<Record<string, string>>({});
  const [grades, setGrades] = useState<Record<string, { score: string; feedback: string }>>({});
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function load() {
    const response = await fetch("/api/assignments");
    const data = (await response.json()) as AssignmentResponse;
    if (!response.ok) throw new Error(data.error ?? "Unable to load assignments.");
    setItems(data.assignments ?? []);
    setCanGrade(Boolean(data.canGrade));
  }

  useEffect(() => {
    fetch("/api/assignments")
      .then(async (response) => {
        const data = (await response.json()) as AssignmentResponse;
        if (!response.ok) throw new Error(data.error ?? "Unable to load assignments.");
        setItems(data.assignments ?? []);
        setCanGrade(Boolean(data.canGrade));
      })
      .catch((reason: Error) => setError(reason.message));
    fetch("/api/teacher/workspace")
      .then(async (response) => (response.ok ? ((await response.json()) as Workspace) : null))
      .then((data) => {
        if (!data) return;
        setWorkspace(data);
        setForm((current) => ({
          ...current,
          classId: data.arms[0]?.class.id ?? "",
          subjectId: data.subjects[0]?.id ?? "",
        }));
      })
      .catch(() => undefined);
  }, []);

  async function upload(file: File) {
    if (file.size > 10 * 1024 * 1024) {
      throw new Error("Files must be 10 MB or smaller.");
    }

    const signatureResponse = await fetch("/api/uploads/signature", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resourceType: "auto" }),
    });
    const signature = (await signatureResponse.json()) as {
      error?: string;
      cloudName?: string;
      apiKey?: string;
      timestamp?: string;
      folder?: string;
      resourceType?: string;
      signature?: string;
    };
    if (
      !signatureResponse.ok ||
      !signature.cloudName ||
      !signature.apiKey ||
      !signature.timestamp ||
      !signature.folder ||
      !signature.signature
    ) {
      throw new Error(signature.error ?? "File uploads are not configured.");
    }

    const body = new FormData();
    body.append("file", file);
    body.append("api_key", signature.apiKey);
    body.append("timestamp", signature.timestamp);
    body.append("folder", signature.folder);
    body.append("signature", signature.signature);
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${signature.cloudName}/${signature.resourceType ?? "auto"}/upload`,
      { method: "POST", body },
    );
    const data = (await response.json()) as {
      secure_url?: string;
      error?: { message?: string };
    };
    if (!response.ok || !data.secure_url) {
      throw new Error(data.error?.message ?? "Unable to upload file.");
    }
    return data.secure_url;
  }

  async function create(event: FormEvent) {
    event.preventDefault();
    setError("");
    try {
      const attachmentUrl = assignmentFile ? await upload(assignmentFile) : undefined;
      const response = await fetch("/api/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          dueAt: form.dueAt || undefined,
          attachmentUrl,
        }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Unable to create assignment.");
      setMessage("Assignment created.");
      setAssignmentFile(null);
      setForm((current) => ({ ...current, title: "", instructions: "", dueAt: "" }));
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to create assignment.");
    }
  }

  async function submit(id: string) {
    setError("");
    try {
      const attachmentUrl = submissionFiles[id] ? await upload(submissionFiles[id] as File) : undefined;
      const response = await fetch(`/api/assignments/${id}/submissions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: content[id] ?? "", attachmentUrl }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Unable to submit.");
      setMessage("Assignment submitted.");
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to submit.");
    }
  }

  function gradeState(submission: Submission) {
    return grades[submission.id] ?? {
      score: submission.score == null ? "" : String(submission.score),
      feedback: submission.feedback ?? "",
    };
  }

  async function grade(assignmentId: string, submission: Submission) {
    setError("");
    const state = gradeState(submission);
    const score = Number(state.score);
    if (!Number.isFinite(score) || score < 0 || score > 100) {
      setError("Enter a score from 0 to 100.");
      return;
    }
    try {
      const response = await fetch(
        `/api/assignments/${assignmentId}/submissions?submissionId=${submission.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ score, feedback: state.feedback }),
        },
      );
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Unable to save grade.");
      setMessage("Grade saved.");
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to save grade.");
    }
  }

  return (
    <main className="min-h-screen bg-[#f7f9fc] px-5 py-10 text-[#12233f]">
      <div className="mx-auto max-w-5xl">
        <Link href="/dashboard" className="text-sm font-semibold text-[#176b5b]">
          ← Back to dashboard
        </Link>
        <div className="mt-7">
          <p className="text-sm font-bold uppercase tracking-widest text-[#176b5b]">Academic work</p>
          <h1 className="mt-3 text-3xl font-bold">Assignments</h1>
          <p className="mt-2 text-sm text-[#52627a]">Create, submit and review class assignments.</p>
        </div>
        {error && <p role="alert" className="mt-6 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
        {message && <p role="status" className="mt-6 rounded-xl bg-[#e6f4ef] px-4 py-3 text-sm text-[#176b5b]">{message}</p>}

        {workspace && (
          <form onSubmit={create} className="mt-7 rounded-2xl border border-[#e5eaf1] bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold">Create assignment</h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-semibold">
                Class
                <select required value={form.classId} onChange={(event) => setForm({ ...form, classId: event.target.value })} className="mt-2 h-11 w-full rounded-xl border border-[#d6deea] bg-white px-3">
                  {workspace.arms.map((arm) => <option key={arm.class.id} value={arm.class.id}>{arm.class.name}</option>)}
                </select>
              </label>
              <label className="text-sm font-semibold">
                Subject
                <select required value={form.subjectId} onChange={(event) => setForm({ ...form, subjectId: event.target.value })} className="mt-2 h-11 w-full rounded-xl border border-[#d6deea] bg-white px-3">
                  {workspace.subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}
                </select>
              </label>
              <label className="text-sm font-semibold sm:col-span-2">
                Title
                <input required value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} className="mt-2 h-11 w-full rounded-xl border border-[#d6deea] px-3" />
              </label>
              <label className="text-sm font-semibold sm:col-span-2">
                Instructions
                <textarea required value={form.instructions} onChange={(event) => setForm({ ...form, instructions: event.target.value })} className="mt-2 min-h-28 w-full rounded-xl border border-[#d6deea] p-3" />
              </label>
              <label className="text-sm font-semibold">
                Due date
                <input type="datetime-local" value={form.dueAt} onChange={(event) => setForm({ ...form, dueAt: event.target.value })} className="mt-2 h-11 w-full rounded-xl border border-[#d6deea] px-3" />
              </label>
              <label className="text-sm font-semibold">
                Attachment
                <input type="file" accept=".pdf,.doc,.docx,.png,.jpg,.jpeg" onChange={(event) => setAssignmentFile(event.target.files?.[0] ?? null)} className="mt-2 block w-full text-sm" />
                <span className="mt-1 block text-xs font-normal text-[#8491a5]">Optional, maximum 10 MB</span>
              </label>
            </div>
            <button className="mt-5 h-11 rounded-xl bg-[#176b5b] px-6 text-sm font-semibold text-white">Create assignment</button>
          </form>
        )}

        <section className="mt-7 space-y-4">
          {items.map((item) => (
            <article key={item.id} className="rounded-2xl border border-[#e5eaf1] bg-white p-6 shadow-sm">
              <div className="flex flex-col justify-between gap-3 sm:flex-row">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-[#176b5b]">{item.subject.name} · {item.class.name}</p>
                  <h2 className="mt-2 text-xl font-bold">{item.title}</h2>
                  <p className="mt-2 whitespace-pre-wrap text-sm text-[#52627a]">{item.instructions}</p>
                  <p className="mt-3 text-xs text-[#8491a5]">Teacher: {item.staff.user.firstName} {item.staff.user.lastName}{item.dueAt ? ` · Due ${new Date(item.dueAt).toLocaleString()}` : ""}</p>
                  {item.attachmentUrl && <a href={item.attachmentUrl} target="_blank" rel="noreferrer" className="mt-3 inline-block text-sm font-semibold text-[#176b5b]">Download assignment attachment</a>}
                </div>
              </div>

              {canGrade && item.submissions.length > 0 && (
                <div className="mt-6 border-t border-[#edf0f5] pt-5">
                  <h3 className="text-sm font-bold">Student submissions ({item.submissions.length})</h3>
                  <div className="mt-4 space-y-4">
                    {item.submissions.map((submission) => {
                      const state = gradeState(submission);
                      return (
                        <div key={submission.id} className="rounded-xl bg-[#f7f9fc] p-4">
                          <div className="flex flex-wrap justify-between gap-2">
                            <p className="text-sm font-semibold">{submission.student?.firstName} {submission.student?.lastName} <span className="font-normal text-[#8491a5]">({submission.student?.admissionNo})</span></p>
                            <p className="text-xs text-[#8491a5]">Submitted {new Date(submission.submittedAt).toLocaleString()}</p>
                          </div>
                          {submission.content && <p className="mt-3 whitespace-pre-wrap text-sm text-[#52627a]">{submission.content}</p>}
                          {submission.attachmentUrl && <a href={submission.attachmentUrl} target="_blank" rel="noreferrer" className="mt-3 inline-block text-sm font-semibold text-[#176b5b]">Download student submission</a>}
                          <div className="mt-4 grid gap-3 sm:grid-cols-[120px_1fr_auto]">
                            <label className="text-xs font-semibold">Score<input type="number" min="0" max="100" value={state.score} onChange={(event) => setGrades({ ...grades, [submission.id]: { ...state, score: event.target.value } })} className="mt-1 h-10 w-full rounded-lg border border-[#d6deea] bg-white px-3 text-sm" /></label>
                            <label className="text-xs font-semibold">Feedback<textarea value={state.feedback} onChange={(event) => setGrades({ ...grades, [submission.id]: { ...state, feedback: event.target.value } })} className="mt-1 min-h-10 w-full rounded-lg border border-[#d6deea] bg-white p-2 text-sm" /></label>
                            <button type="button" onClick={() => grade(item.id, submission)} className="self-end rounded-lg bg-[#176b5b] px-4 py-2 text-sm font-semibold text-white">Save grade</button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {!canGrade && (
                <div className="mt-5 border-t border-[#edf0f5] pt-5">
                  {item.submissions[0]?.score != null ? (
                    <p className="text-sm font-semibold text-[#176b5b]">Score: {item.submissions[0].score}/100{item.submissions[0].feedback ? ` · ${item.submissions[0].feedback}` : ""}</p>
                  ) : (
                    <>
                      <textarea value={content[item.id] ?? ""} onChange={(event) => setContent({ ...content, [item.id]: event.target.value })} placeholder="Write your submission..." className="min-h-24 w-full rounded-xl border border-[#d6deea] p-3 text-sm" />
                      <div className="mt-3 flex flex-wrap items-center gap-3">
                        <input type="file" accept=".pdf,.doc,.docx,.png,.jpg,.jpeg" onChange={(event) => setSubmissionFiles({ ...submissionFiles, [item.id]: event.target.files?.[0] ?? null })} className="block text-sm" />
                        <button type="button" onClick={() => submit(item.id)} className="rounded-xl bg-[#176b5b] px-5 py-2.5 text-sm font-semibold text-white">Submit work</button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </article>
          ))}
          {items.length === 0 && <p className="rounded-2xl border border-dashed border-[#d6deea] bg-white p-8 text-center text-sm text-[#52627a]">No assignments found.</p>}
        </section>
      </div>
    </main>
  );
}

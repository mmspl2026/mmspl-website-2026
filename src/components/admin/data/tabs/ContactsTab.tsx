"use client";

import { useEffect, useMemo, useState } from "react";
import { RotateCw, Trash2 } from "lucide-react";
import type { ContactStatus, ContactSubmission } from "@/lib/types";
import { Card, CardHeader, Pill, Select, StatusBadge, DangerButton, Spinner, EmptyState } from "../ui";
import { useToasts } from "@/components/admin/useToasts";
import ToastStack from "@/components/admin/ToastStack";

const FILTERS = [
  { id: "all", label: "All" },
  { id: "new", label: "New" },
  { id: "read", label: "Read" },
  { id: "replied", label: "Replied" },
  { id: "email-failed", label: "Email Failed" },
] as const;

const STATUS_TONE: Record<ContactStatus, "blue" | "gray" | "green" | "red"> = {
  new: "blue",
  read: "gray",
  replied: "green",
  "email-failed": "red",
};

export default function ContactsTab() {
  const [submissions, setSubmissions] = useState<ContactSubmission[]>([]);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["id"]>("all");
  const [loading, setLoading] = useState(true);
  const [resendingId, setResendingId] = useState<string | null>(null);
  const { toasts, push, dismiss } = useToasts();

  async function load() {
    setLoading(true);
    const res = await fetch("/api/admin/contacts");
    const data = await res.json();
    setSubmissions(data.submissions ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(
    () => (filter === "all" ? submissions : submissions.filter((s) => s.status === filter)),
    [submissions, filter]
  );

  async function updateStatus(id: string, status: ContactStatus) {
    setSubmissions((prev) => prev.map((s) => (s._id === id ? { ...s, status } : s)));
    await fetch(`/api/admin/contacts/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
  }

  async function handleResend(id: string) {
    setResendingId(id);
    try {
      const res = await fetch(`/api/admin/contacts/${id}/resend`, { method: "POST" });
      if (!res.ok) throw new Error("Resend failed.");
      push({ tone: "success", message: "Notification resent." });
      load();
    } catch (err) {
      push({ tone: "error", message: err instanceof Error ? err.message : "Resend failed." });
    } finally {
      setResendingId(null);
    }
  }

  async function handleDelete(id: string) {
    setSubmissions((prev) => prev.filter((s) => s._id !== id));
    const res = await fetch(`/api/admin/contacts/${id}`, { method: "DELETE" });
    if (!res.ok) {
      push({ tone: "error", message: "Delete failed." });
      load();
    }
  }

  if (loading) return <Spinner />;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader title="Contact Submissions" subtitle={`${filtered.length} of ${submissions.length}`} />
        <div className="flex flex-wrap gap-2 border-b border-gray-100 px-5 py-3">
          {FILTERS.map((f) => (
            <Pill key={f.id} active={filter === f.id} onClick={() => setFilter(f.id)}>
              {f.label}
            </Pill>
          ))}
        </div>

        {filtered.length === 0 ? (
          <EmptyState>No submissions match this filter.</EmptyState>
        ) : (
          <div className="divide-y divide-gray-100">
            {filtered.map((s) => (
              <div key={s._id} className="flex flex-col gap-2 p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-black">{s.name}</p>
                    <p className="text-sm text-gray-500">{s.email}</p>
                    {s.subject && <p className="mt-1 text-sm font-semibold text-gray-700">{s.subject}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono-brand text-xs text-gray-400">
                      {new Date(s.submittedAt).toLocaleDateString()}
                    </span>
                    <StatusBadge tone={STATUS_TONE[s.status]}>{s.status}</StatusBadge>
                  </div>
                </div>
                <p className="whitespace-pre-wrap text-sm text-gray-700">{s.message}</p>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <Select value={s.status} onChange={(e) => updateStatus(s._id, e.target.value as ContactStatus)} className="h-8 text-xs">
                    <option value="new">New</option>
                    <option value="read">Read</option>
                    <option value="replied">Replied</option>
                    <option value="email-failed">Email Failed</option>
                  </Select>
                  <button
                    type="button"
                    onClick={() => handleResend(s._id)}
                    disabled={resendingId === s._id}
                    className="inline-flex h-8 items-center gap-1.5 rounded-[3px] border-2 border-gray-300 px-2.5 text-xs font-semibold text-gray-700 hover:border-brand hover:text-brand disabled:opacity-50"
                  >
                    <RotateCw size={12} aria-hidden="true" />
                    {resendingId === s._id ? "Resending…" : "Resend"}
                  </button>
                  <DangerButton onClick={() => handleDelete(s._id)}>
                    <Trash2 size={12} aria-hidden="true" />
                    Delete
                  </DangerButton>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <ToastStack toasts={toasts} onDismiss={dismiss} />
    </div>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import { Download, Send, Trash2, Flag } from "lucide-react";
import clsx from "clsx";
import type { AdminSettings, Registration, RegistrationStatus } from "@/lib/types";
import {
  Card,
  CardHeader,
  Pill,
  PrimaryButton,
  SecondaryButton,
  DangerButton,
  Select,
  StatusBadge,
  TextArea,
  Modal,
  Spinner,
  EmptyState,
} from "../ui";
import { useToasts } from "@/components/admin/useToasts";
import ToastStack from "@/components/admin/ToastStack";

const FILTERS = [
  { id: "all", label: "All" },
  { id: "unpaid", label: "Unpaid" },
  { id: "call-up", label: "Call-Up" },
  { id: "completed", label: "Completed" },
  { id: "email-failed", label: "Email Failed" },
  { id: "spam", label: "Spam" },
] as const;

const STATUS_TONE: Record<RegistrationStatus, "yellow" | "blue" | "green" | "gray"> = {
  unpaid: "yellow",
  "call-up": "blue",
  completed: "green",
  spam: "gray",
};

export default function RegistrationsTab() {
  const [settings, setSettings] = useState<AdminSettings | null>(null);
  const [closedMessage, setClosedMessage] = useState("");
  const [savingSettings, setSavingSettings] = useState(false);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["id"]>("all");
  const [seasonYear, setSeasonYear] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [sendingDigest, setSendingDigest] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleteTarget, setDeleteTarget] = useState<Registration | null>(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const { toasts, push, dismiss } = useToasts();

  async function load() {
    setLoading(true);
    const [settingsRes, regRes] = await Promise.all([
      fetch("/api/admin/settings"),
      fetch("/api/admin/registrations"),
    ]);
    const settingsData = await settingsRes.json();
    const regData = await regRes.json();
    setSettings(settingsData.settings ?? {});
    setClosedMessage(settingsData.settings?.registrationClosedMessage ?? "");
    setRegistrations(regData.registrations ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const seasonYears = useMemo(
    () => Array.from(new Set(registrations.map((r) => r.season?.year).filter(Boolean))).sort((a, b) => (b as number) - (a as number)),
    [registrations]
  );

  const filtered = useMemo(() => {
    return registrations.filter((r) => {
      if (seasonYear !== "all" && String(r.season?.year) !== seasonYear) return false;
      if (filter === "all") return r.status !== "spam";
      if (filter === "email-failed") return r.emailStatus === "failed";
      if (filter === "spam") return r.status === "spam";
      return r.status === filter;
    });
  }, [registrations, filter, seasonYear]);

  // Selection only tracks IDs currently visible under the active filter, so
  // switching filters can't silently carry over a stale selection.
  useEffect(() => {
    setSelectedIds((prev) => {
      const visible = new Set(filtered.map((r) => r._id));
      const next = new Set([...prev].filter((id) => visible.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [filtered]);

  function toggleSelected(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    setSelectedIds((prev) =>
      prev.size === filtered.length ? new Set() : new Set(filtered.map((r) => r._id))
    );
  }

  async function toggleRegistrationOpen() {
    if (!settings) return;
    const next = !settings.registrationOpen;
    setSettings({ ...settings, registrationOpen: next });
    await fetch("/api/admin/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ registrationOpen: next }),
    });
    push({ tone: "success", message: `Registration is now ${next ? "open" : "closed"}.` });
  }

  async function saveClosedMessage() {
    setSavingSettings(true);
    try {
      await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ registrationClosedMessage: closedMessage }),
      });
      push({ tone: "success", message: "Closed message saved." });
    } finally {
      setSavingSettings(false);
    }
  }

  async function updateStatus(id: string, status: RegistrationStatus) {
    setRegistrations((prev) => prev.map((r) => (r._id === id ? { ...r, status } : r)));
    const res = await fetch(`/api/admin/registrations/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) push({ tone: "error", message: "Failed to update status." });
  }

  function markAsSpam(r: Registration) {
    updateStatus(r._id, "spam");
    push({ tone: "success", message: `Marked ${r.firstName} ${r.lastName} as spam.` });
  }

  async function confirmDeleteOne() {
    if (!deleteTarget) return;
    const target = deleteTarget;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/registrations/${target._id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed.");
      setRegistrations((prev) => prev.filter((r) => r._id !== target._id));
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(target._id);
        return next;
      });
      push({ tone: "success", message: "Registration deleted" });
      setDeleteTarget(null);
    } catch {
      push({ tone: "error", message: "Failed to delete registration." });
    } finally {
      setDeleting(false);
    }
  }

  async function confirmBulkDelete() {
    const ids = Array.from(selectedIds);
    setDeleting(true);
    try {
      const results = await Promise.all(
        ids.map((id) => fetch(`/api/admin/registrations/${id}`, { method: "DELETE" }))
      );
      const failedCount = results.filter((res) => !res.ok).length;
      const deletedIds = new Set(ids.filter((_, i) => results[i].ok));
      setRegistrations((prev) => prev.filter((r) => !deletedIds.has(r._id)));
      setSelectedIds(new Set());
      setBulkDeleteOpen(false);
      if (failedCount > 0) {
        push({ tone: "error", message: `${failedCount} registration(s) failed to delete.` });
      } else {
        push({ tone: "success", message: `${deletedIds.size} registration(s) deleted.` });
      }
    } finally {
      setDeleting(false);
    }
  }

  async function sendDigestNow() {
    setSendingDigest(true);
    try {
      const res = await fetch("/api/admin/registrations/digest", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send digest.");
      push({
        tone: "success",
        message: data.count > 0 ? `Digest sent — ${data.count} new registrations.` : "No new registrations to report.",
      });
    } catch (err) {
      push({ tone: "error", message: err instanceof Error ? err.message : "Failed to send digest." });
    } finally {
      setSendingDigest(false);
    }
  }

  if (loading) return <Spinner />;

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-bold text-black">Registration Status</p>
            <p className="text-sm text-gray-500">Controls whether the public Register page accepts submissions.</p>
          </div>
          <div className="flex items-center gap-3">
            <StatusBadge tone={settings?.registrationOpen ? "green" : "red"}>
              {settings?.registrationOpen ? "Open" : "Closed"}
            </StatusBadge>
            <button
              type="button"
              onClick={toggleRegistrationOpen}
              className={clsx(
                "relative h-6 w-11 rounded-full transition-colors",
                settings?.registrationOpen ? "bg-brand" : "bg-gray-300"
              )}
              role="switch"
              aria-checked={settings?.registrationOpen ?? false}
              aria-label="Toggle registration open"
            >
              <span
                className={clsx(
                  "absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform",
                  settings?.registrationOpen ? "translate-x-[22px]" : "translate-x-0.5"
                )}
              />
            </button>
          </div>
        </div>

        <div className="mt-4">
          <label className="mb-1 block text-sm font-semibold text-black">Closed Message</label>
          <TextArea rows={2} value={closedMessage} onChange={(e) => setClosedMessage(e.target.value)} />
          <div className="mt-2 flex justify-end">
            <SecondaryButton onClick={saveClosedMessage} disabled={savingSettings}>
              {savingSettings ? "Saving…" : "Save Message"}
            </SecondaryButton>
          </div>
        </div>
      </Card>

      <Card className="flex flex-wrap items-center justify-between gap-3 p-5">
        <div>
          <p className="text-sm font-bold text-black">Weekly Digest</p>
          <p className="text-sm text-gray-500">
            Emails a summary of the last 7 days of registrations to your contact recipients.
          </p>
        </div>
        <PrimaryButton onClick={sendDigestNow} disabled={sendingDigest}>
          <Send size={14} aria-hidden="true" />
          {sendingDigest ? "Sending…" : "Send Digest Now"}
        </PrimaryButton>
      </Card>

      <Card>
        <CardHeader
          title="Registrations"
          subtitle={`${filtered.length} of ${registrations.length}`}
          action={
            <div className="flex items-center gap-3">
              {selectedIds.size > 0 && (
                <DangerButton className="h-9 px-3 text-sm" onClick={() => setBulkDeleteOpen(true)}>
                  <Trash2 size={14} aria-hidden="true" />
                  Delete Selected ({selectedIds.size})
                </DangerButton>
              )}
              <Select value={seasonYear} onChange={(e) => setSeasonYear(e.target.value)}>
                <option value="all">All Seasons</option>
                {seasonYears.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </Select>
              <a href="/api/admin/registrations/export">
                <SecondaryButton>
                  <Download size={14} aria-hidden="true" />
                  Export CSV
                </SecondaryButton>
              </a>
            </div>
          }
        />
        <div className="flex flex-wrap gap-2 border-b border-gray-100 px-5 py-3">
          {FILTERS.map((f) => (
            <Pill key={f.id} active={filter === f.id} onClick={() => setFilter(f.id)}>
              {f.label}
            </Pill>
          ))}
        </div>

        {filtered.length === 0 ? (
          <EmptyState>No registrations match this filter.</EmptyState>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="w-10 px-4 py-2">
                    <input
                      type="checkbox"
                      checked={selectedIds.size === filtered.length}
                      onChange={toggleSelectAll}
                      aria-label="Select all visible registrations"
                      className="h-4 w-4 rounded border-gray-300 text-brand focus:ring-brand"
                    />
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-bold uppercase text-gray-500">Player</th>
                  <th className="px-4 py-2 text-left text-xs font-bold uppercase text-gray-500">Email</th>
                  <th className="px-4 py-2 text-left text-xs font-bold uppercase text-gray-500">Submitted</th>
                  <th className="px-4 py-2 text-left text-xs font-bold uppercase text-gray-500">Email</th>
                  <th className="px-4 py-2 text-left text-xs font-bold uppercase text-gray-500">Status</th>
                  <th className="px-4 py-2 text-right text-xs font-bold uppercase text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r._id} className="border-b border-gray-100">
                    <td className="px-4 py-2">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(r._id)}
                        onChange={() => toggleSelected(r._id)}
                        aria-label={`Select ${r.firstName} ${r.lastName}`}
                        className="h-4 w-4 rounded border-gray-300 text-brand focus:ring-brand"
                      />
                    </td>
                    <td className="px-4 py-2 text-sm font-semibold text-black">
                      {r.firstName} {r.lastName}
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-600">{r.email}</td>
                    <td className="px-4 py-2 font-mono-brand text-xs text-gray-500">
                      {new Date(r.submittedAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-2">
                      <StatusBadge tone={r.emailStatus === "sent" ? "green" : "red"}>{r.emailStatus}</StatusBadge>
                    </td>
                    <td className="px-4 py-2">
                      <Select
                        value={r.status}
                        onChange={(e) => updateStatus(r._id, e.target.value as RegistrationStatus)}
                        className={clsx(
                          "h-8 text-xs",
                          STATUS_TONE[r.status] === "green" && "border-green-300",
                          STATUS_TONE[r.status] === "yellow" && "border-yellow-300",
                          STATUS_TONE[r.status] === "blue" && "border-blue-300"
                        )}
                      >
                        <option value="unpaid">Unpaid</option>
                        <option value="call-up">Call-Up</option>
                        <option value="completed">Completed</option>
                        <option value="spam">Spam</option>
                      </Select>
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex justify-end gap-1.5">
                        {r.status !== "spam" && (
                          <SecondaryButton
                            className="h-8 px-2.5 text-xs"
                            onClick={() => markAsSpam(r)}
                            aria-label={`Mark ${r.firstName} ${r.lastName} as spam`}
                          >
                            <Flag size={12} aria-hidden="true" />
                          </SecondaryButton>
                        )}
                        <DangerButton onClick={() => setDeleteTarget(r)} aria-label={`Delete registration for ${r.firstName} ${r.lastName}`}>
                          <Trash2 size={12} aria-hidden="true" />
                        </DangerButton>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete registration?">
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Are you sure you want to delete this registration for{" "}
            <strong className="text-black">
              {deleteTarget?.firstName} {deleteTarget?.lastName}
            </strong>
            ? This cannot be undone.
          </p>
          <div className="flex justify-end gap-2">
            <SecondaryButton onClick={() => setDeleteTarget(null)} disabled={deleting}>
              Cancel
            </SecondaryButton>
            <DangerButton className="h-9 px-4 text-sm" onClick={confirmDeleteOne} disabled={deleting}>
              {deleting ? "Deleting…" : "Delete"}
            </DangerButton>
          </div>
        </div>
      </Modal>

      <Modal open={bulkDeleteOpen} onClose={() => setBulkDeleteOpen(false)} title="Delete selected registrations?">
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Are you sure you want to delete <strong className="text-black">{selectedIds.size}</strong> registration
            {selectedIds.size === 1 ? "" : "s"}? This cannot be undone.
          </p>
          <div className="flex justify-end gap-2">
            <SecondaryButton onClick={() => setBulkDeleteOpen(false)} disabled={deleting}>
              Cancel
            </SecondaryButton>
            <DangerButton className="h-9 px-4 text-sm" onClick={confirmBulkDelete} disabled={deleting}>
              {deleting ? "Deleting…" : "Delete"}
            </DangerButton>
          </div>
        </div>
      </Modal>

      <ToastStack toasts={toasts} onDismiss={dismiss} />
    </div>
  );
}

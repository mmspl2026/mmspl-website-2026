"use client";

import { useEffect, useState } from "react";
import { Plus, KeyRound, UserX, UserCheck, Trash2 } from "lucide-react";
import type { TeamCaptain, TeamLoginAttempt, Team } from "@/lib/types";
import {
  Card,
  CardHeader,
  PrimaryButton,
  SecondaryButton,
  DangerButton,
  StatusBadge,
  TextInput,
  Select,
  Modal,
  Spinner,
  EmptyState,
} from "../ui";
import { useToasts } from "@/components/admin/useToasts";
import ToastStack from "@/components/admin/ToastStack";

const EMPTY_FORM = { name: "", username: "", email: "", teamId: "" };

function formatDateTime(value?: string) {
  if (!value) return "Never";
  return new Date(value).toLocaleString("en-CA", { dateStyle: "medium", timeStyle: "short" });
}

type BusyAction = { id: string; kind: "reset" | "delete" | "toggle" };
type ConfirmTarget = { type: "delete" | "reset"; captain: TeamCaptain };

export default function TeamCaptainsTab() {
  const [captains, setCaptains] = useState<TeamCaptain[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [attempts, setAttempts] = useState<TeamLoginAttempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [confirmTarget, setConfirmTarget] = useState<ConfirmTarget | null>(null);
  const [busy, setBusy] = useState<BusyAction | null>(null);
  const { toasts, push, dismiss } = useToasts();

  async function load() {
    setLoading(true);
    const [captainsRes, attemptsRes] = await Promise.all([
      fetch("/api/admin/team-captains"),
      fetch("/api/admin/team-login-attempts"),
    ]);
    if (captainsRes.ok) {
      const data = await captainsRes.json();
      setCaptains(data.captains ?? []);
      setTeams(data.teams ?? []);
    }
    if (attemptsRes.ok) setAttempts((await attemptsRes.json()).attempts ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleAdd() {
    setFormError("");
    if (!form.name || !form.username || !form.email || !form.teamId) {
      setFormError("All fields are required.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/admin/team-captains", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add captain.");
      push({ tone: "success", message: `Captain added — credentials emailed to ${form.email}.` });
      setForm(EMPTY_FORM);
      setAdding(false);
      load();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to add captain.");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleActive(captain: TeamCaptain) {
    setBusy({ id: captain._id, kind: "toggle" });
    try {
      const res = await fetch(`/api/admin/team-captains/${captain._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !captain.active }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to update captain.");
      push({ tone: "success", message: captain.active ? "Captain deactivated." : "Captain reactivated." });
      load();
    } catch (err) {
      push({ tone: "error", message: err instanceof Error ? err.message : "Failed to update captain." });
    } finally {
      setBusy(null);
    }
  }

  async function performDelete(captain: TeamCaptain) {
    setBusy({ id: captain._id, kind: "delete" });
    try {
      const res = await fetch(`/api/admin/team-captains/${captain._id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to delete captain.");
      push({ tone: "success", message: "Captain deleted." });
      load();
    } catch (err) {
      push({ tone: "error", message: err instanceof Error ? err.message : "Failed to delete captain." });
    } finally {
      setBusy(null);
      setConfirmTarget(null);
    }
  }

  async function performReset(captain: TeamCaptain) {
    setBusy({ id: captain._id, kind: "reset" });
    try {
      const res = await fetch(`/api/admin/team-captains/${captain._id}/reset-password`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to reset password.");
      push({ tone: "success", message: `Temporary password emailed to ${captain.email}.` });
      load();
    } catch (err) {
      push({ tone: "error", message: err instanceof Error ? err.message : "Failed to reset password." });
    } finally {
      setBusy(null);
      setConfirmTarget(null);
    }
  }

  if (loading) return <Spinner />;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader
          title="Team Captains"
          subtitle="Manages login access only — roster, stats, and the beer list are the team's own private data, not visible here."
          action={
            <PrimaryButton onClick={() => setAdding(true)}>
              <Plus size={14} aria-hidden="true" />
              Add Captain
            </PrimaryButton>
          }
        />

        {captains.length === 0 ? (
          <EmptyState>No team captains yet.</EmptyState>
        ) : (
          <div className="divide-y divide-gray-100">
            {captains.map((c) => (
              <div key={c._id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-black">{c.name}</p>
                    <StatusBadge tone="gray">{c.team.name}</StatusBadge>
                    {!c.active && <StatusBadge tone="yellow">Deactivated</StatusBadge>}
                    {c.lockedUntil && new Date(c.lockedUntil) > new Date() && <StatusBadge tone="yellow">Locked</StatusBadge>}
                    {c.mustChangePassword && <StatusBadge tone="blue">Pending Password Change</StatusBadge>}
                  </div>
                  <p className="font-mono-brand text-xs text-gray-500">
                    {c.username} &middot; {c.email}
                  </p>
                  <p className="mt-0.5 text-xs text-gray-400">Last login: {formatDateTime(c.lastLogin)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <SecondaryButton
                    className="h-8 px-2.5 text-xs"
                    disabled={busy !== null}
                    onClick={() => setConfirmTarget({ type: "reset", captain: c })}
                  >
                    <KeyRound size={12} aria-hidden="true" />
                    {busy?.id === c._id && busy.kind === "reset" ? "Sending…" : "Reset PW"}
                  </SecondaryButton>
                  <SecondaryButton
                    className="h-8 px-2.5 text-xs"
                    disabled={busy !== null}
                    onClick={() => handleToggleActive(c)}
                  >
                    {c.active ? <UserX size={12} aria-hidden="true" /> : <UserCheck size={12} aria-hidden="true" />}
                    {busy?.id === c._id && busy.kind === "toggle" ? "Working…" : c.active ? "Deactivate" : "Reactivate"}
                  </SecondaryButton>
                  <DangerButton
                    className="h-8 px-2.5 text-xs"
                    disabled={busy !== null}
                    onClick={() => setConfirmTarget({ type: "delete", captain: c })}
                  >
                    <Trash2 size={12} aria-hidden="true" />
                    Delete
                  </DangerButton>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card>
        <CardHeader title="Recent Activity" subtitle="Login attempts across all team captain accounts" />
        {attempts.length === 0 ? (
          <EmptyState>No login activity yet.</EmptyState>
        ) : (
          <div className="max-h-96 overflow-y-auto">
            <div className="divide-y divide-gray-100">
              {attempts.map((a) => (
                <div key={a._id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 text-sm">
                  <div className="flex items-center gap-2">
                    <StatusBadge tone={a.success ? "green" : "red"}>{a.success ? "Success" : "Failed"}</StatusBadge>
                    <span className="font-mono-brand text-xs text-gray-700">{a.username || "(unknown)"}</span>
                    {a.reason && a.reason !== "success" && (
                      <span className="text-xs text-gray-400">{a.reason.replace(/_/g, " ")}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-400">
                    <span className="font-mono-brand">{a.ip || "unknown ip"}</span>
                    <span>{formatDateTime(a.createdAt)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>

      <Modal open={adding} onClose={() => setAdding(false)} title="Add Team Captain">
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-600">Full Name</label>
              <TextInput value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-600">Username</label>
              <TextInput
                className="font-mono-brand"
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value.toLowerCase() })}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-semibold text-gray-600">Email</label>
              <TextInput type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-semibold text-gray-600">Team</label>
              <Select value={form.teamId} onChange={(e) => setForm({ ...form, teamId: e.target.value })}>
                <option value="">Select a team…</option>
                {teams.map((t) => (
                  <option key={t._id} value={t._id}>
                    {t.name}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <p className="text-xs text-gray-500">
            A temporary password will be generated and emailed to the captain. They&rsquo;ll set their own password
            the first time they sign in.
          </p>

          {formError && <p className="text-sm text-brand">{formError}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <SecondaryButton
              onClick={() => {
                setAdding(false);
                setForm(EMPTY_FORM);
                setFormError("");
              }}
            >
              Cancel
            </SecondaryButton>
            <PrimaryButton onClick={handleAdd} disabled={saving}>
              {saving ? "Saving…" : "Add Captain"}
            </PrimaryButton>
          </div>
        </div>
      </Modal>

      <Modal
        open={confirmTarget !== null}
        onClose={() => {
          if (!busy) setConfirmTarget(null);
        }}
        title={confirmTarget?.type === "delete" ? "Delete Captain" : "Reset Password"}
      >
        {confirmTarget && (
          <div className="space-y-4">
            <p className="text-sm text-gray-700">
              {confirmTarget.type === "delete"
                ? `Permanently delete ${confirmTarget.captain.name} (@${confirmTarget.captain.username})? This cannot be undone. Their team's roster, stats, and beer list are not affected.`
                : `A temporary password will be generated and emailed to ${confirmTarget.captain.email}. They'll need to set a new password the next time they sign in.`}
            </p>
            <div className="flex justify-end gap-2">
              <SecondaryButton onClick={() => setConfirmTarget(null)} disabled={busy !== null}>
                Cancel
              </SecondaryButton>
              {confirmTarget.type === "delete" ? (
                <DangerButton onClick={() => performDelete(confirmTarget.captain)} disabled={busy !== null}>
                  {busy ? "Deleting…" : "Delete"}
                </DangerButton>
              ) : (
                <PrimaryButton onClick={() => performReset(confirmTarget.captain)} disabled={busy !== null}>
                  {busy ? "Sending…" : "Send Temporary Password"}
                </PrimaryButton>
              )}
            </div>
          </div>
        )}
      </Modal>

      <ToastStack toasts={toasts} onDismiss={dismiss} />
    </div>
  );
}

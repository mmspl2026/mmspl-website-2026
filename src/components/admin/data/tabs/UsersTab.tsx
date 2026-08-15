"use client";

import { useEffect, useState } from "react";
import { Plus, KeyRound, UserX, UserCheck, Trash2 } from "lucide-react";
import type { AdminRole, AdminUser, LoginAttempt } from "@/lib/types";
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
import { validatePasswordPolicy } from "@/lib/passwordPolicy";
import PasswordStrengthMeter from "@/components/admin/PasswordStrengthMeter";
import { useToasts } from "@/components/admin/useToasts";
import ToastStack from "@/components/admin/ToastStack";

const EMPTY_FORM = { name: "", username: "", email: "", password: "", confirmPassword: "", role: "exec" as AdminRole };

function formatDateTime(value?: string) {
  if (!value) return "Never";
  return new Date(value).toLocaleString("en-CA", { dateStyle: "medium", timeStyle: "short" });
}

export default function UsersTab({ role }: { role: AdminRole }) {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [attempts, setAttempts] = useState<LoginAttempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const { toasts, push, dismiss } = useToasts();

  async function load() {
    setLoading(true);
    const [usersRes, attemptsRes] = await Promise.all([
      fetch("/api/admin/users"),
      fetch("/api/admin/login-attempts"),
    ]);
    if (usersRes.ok) setUsers((await usersRes.json()).users ?? []);
    if (attemptsRes.ok) setAttempts((await attemptsRes.json()).attempts ?? []);
    setLoading(false);
  }

  useEffect(() => {
    if (role === "superadmin") load();
    else setLoading(false);
  }, [role]);

  if (role !== "superadmin") {
    return (
      <Card>
        <EmptyState>Only superadmins can manage users.</EmptyState>
      </Card>
    );
  }

  async function handleAdd() {
    setFormError("");
    if (!form.name || !form.username || !form.email || !form.password) {
      setFormError("All fields are required.");
      return;
    }
    const policy = validatePasswordPolicy(form.password);
    if (!policy.valid) {
      setFormError(policy.errors.join(" "));
      return;
    }
    if (form.password !== form.confirmPassword) {
      setFormError("Passwords do not match.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add user.");
      push({ tone: "success", message: "User added." });
      setForm(EMPTY_FORM);
      setAdding(false);
      load();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to add user.");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleActive(user: AdminUser) {
    const res = await fetch(`/api/admin/users/${user._id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !user.active }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      push({ tone: "error", message: data.error || "Failed to update user." });
      return;
    }
    push({ tone: "success", message: user.active ? "User deactivated." : "User reactivated." });
    load();
  }

  async function handleDelete(user: AdminUser) {
    if (!confirm(`Permanently delete ${user.name} (@${user.username})? This cannot be undone.`)) return;
    const res = await fetch(`/api/admin/users/${user._id}`, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      push({ tone: "error", message: data.error || "Failed to delete user." });
      return;
    }
    push({ tone: "success", message: "User deleted." });
    load();
  }

  async function handleResetPassword(user: AdminUser) {
    if (!confirm(`Reset the password for ${user.name}? A temporary password will be emailed to ${user.email}.`)) return;
    const res = await fetch(`/api/admin/users/${user._id}/reset-password`, { method: "POST" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      push({ tone: "error", message: data.error || "Failed to reset password." });
      return;
    }
    push({ tone: "success", message: `Temporary password emailed to ${user.email}.` });
    load();
  }

  if (loading) return <Spinner />;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader
          title="Users"
          action={
            <PrimaryButton onClick={() => setAdding(true)}>
              <Plus size={14} aria-hidden="true" />
              Add User
            </PrimaryButton>
          }
        />

        {users.length === 0 ? (
          <EmptyState>No users yet.</EmptyState>
        ) : (
          <div className="divide-y divide-gray-100">
            {users.map((u) => (
              <div key={u._id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-black">{u.name}</p>
                    <StatusBadge tone={u.role === "superadmin" ? "red" : "gray"}>{u.role}</StatusBadge>
                    {!u.active && <StatusBadge tone="yellow">Deactivated</StatusBadge>}
                    {u.lockedUntil && new Date(u.lockedUntil) > new Date() && (
                      <StatusBadge tone="yellow">Locked</StatusBadge>
                    )}
                    {u.mustChangePassword && <StatusBadge tone="blue">Pending Password Change</StatusBadge>}
                  </div>
                  <p className="font-mono-brand text-xs text-gray-500">
                    {u.username} &middot; {u.email}
                  </p>
                  <p className="mt-0.5 text-xs text-gray-400">Last login: {formatDateTime(u.lastLogin)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <SecondaryButton className="h-8 px-2.5 text-xs" onClick={() => handleResetPassword(u)}>
                    <KeyRound size={12} aria-hidden="true" />
                    Reset PW
                  </SecondaryButton>
                  <SecondaryButton className="h-8 px-2.5 text-xs" onClick={() => handleToggleActive(u)}>
                    {u.active ? <UserX size={12} aria-hidden="true" /> : <UserCheck size={12} aria-hidden="true" />}
                    {u.active ? "Deactivate" : "Reactivate"}
                  </SecondaryButton>
                  <DangerButton className="h-8 px-2.5 text-xs" onClick={() => handleDelete(u)}>
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
        <CardHeader title="Recent Activity" subtitle="Login attempts across all admin accounts" />
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

      <Modal open={adding} onClose={() => setAdding(false)} title="Add User">
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
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-600">Role</label>
              <Select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as AdminRole })}>
                <option value="exec">Exec</option>
                <option value="superadmin">Superadmin</option>
              </Select>
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-semibold text-gray-600">Password (min. 20 characters)</label>
              <TextInput
                type="password"
                className="font-mono-brand"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
              <PasswordStrengthMeter password={form.password} />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-semibold text-gray-600">Confirm Password</label>
              <TextInput
                type="password"
                className="font-mono-brand"
                value={form.confirmPassword}
                onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
              />
            </div>
          </div>

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
              {saving ? "Saving…" : "Add User"}
            </PrimaryButton>
          </div>
        </div>
      </Modal>

      <ToastStack toasts={toasts} onDismiss={dismiss} />
    </div>
  );
}

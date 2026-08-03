"use client";

import { useEffect, useState } from "react";
import { Plus, KeyRound, UserX, UserCheck } from "lucide-react";
import type { AdminRole, AdminUser } from "@/lib/types";
import { Card, CardHeader, PrimaryButton, SecondaryButton, StatusBadge, TextInput, Select, Spinner, EmptyState } from "../ui";
import { useToasts } from "@/components/admin/useToasts";
import ToastStack from "@/components/admin/ToastStack";

const EMPTY_FORM = { name: "", username: "", email: "", password: "", role: "exec" as AdminRole };

export default function UsersTab({ role }: { role: AdminRole }) {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const { toasts, push, dismiss } = useToasts();

  async function load() {
    setLoading(true);
    const res = await fetch("/api/admin/users");
    if (res.ok) {
      const data = await res.json();
      setUsers(data.users ?? []);
    }
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
    if (!form.name || !form.username || !form.email || !form.password) {
      push({ tone: "error", message: "All fields are required." });
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
      push({ tone: "error", message: err instanceof Error ? err.message : "Failed to add user." });
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

  async function handleResetPassword(user: AdminUser) {
    if (!confirm(`Reset the password for ${user.name}? A new temporary password will be generated.`)) return;
    const res = await fetch(`/api/admin/users/${user._id}/reset-password`, { method: "POST" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      push({ tone: "error", message: data.error || "Failed to reset password." });
      return;
    }
    push({ tone: "success", message: `New temporary password for ${user.name}: ${data.tempPassword}` });
  }

  if (loading) return <Spinner />;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader
          title="Users"
          action={
            <PrimaryButton onClick={() => setAdding((v) => !v)}>
              <Plus size={14} aria-hidden="true" />
              Add User
            </PrimaryButton>
          }
        />

        {adding && (
          <div className="space-y-3 border-b border-gray-100 bg-gray-50 p-5">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-600">Name</label>
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
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-600">Email</label>
                <TextInput type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-600">Temporary Password</label>
                <TextInput
                  className="font-mono-brand"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-600">Role</label>
                <Select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as AdminRole })}>
                  <option value="exec">Exec</option>
                  <option value="superadmin">Superadmin</option>
                </Select>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <SecondaryButton onClick={() => setAdding(false)}>Cancel</SecondaryButton>
              <PrimaryButton onClick={handleAdd} disabled={saving}>
                {saving ? "Saving…" : "Add User"}
              </PrimaryButton>
            </div>
          </div>
        )}

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
                  </div>
                  <p className="font-mono-brand text-xs text-gray-500">{u.username} &middot; {u.email}</p>
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

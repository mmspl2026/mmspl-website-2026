"use client";

import { useState } from "react";
import { Plus, Pencil, Trash2, X, Check } from "lucide-react";
import {
  Card,
  PrimaryButton,
  SecondaryButton,
  DangerButton,
  StatusBadge,
  TextInput,
  Select,
  EmptyState,
  Modal,
} from "@/components/admin/data/ui";
import ToastStack from "@/components/admin/ToastStack";
import { useToasts } from "@/components/admin/useToasts";
import type { RosterPlayer } from "@/lib/types";
import { POSITIONS } from "@/lib/positions";

interface PlayerForm {
  name: string;
  jerseyNumber: string;
  position: string;
  isPitcher: boolean;
  status: "active" | "injured";
  email: string;
}

const EMPTY_FORM: PlayerForm = { name: "", jerseyNumber: "", position: "", isPitcher: false, status: "active", email: "" };

function toForm(p: RosterPlayer): PlayerForm {
  return {
    name: p.name,
    jerseyNumber: p.jerseyNumber || "",
    position: p.position || "",
    isPitcher: Boolean(p.isPitcher),
    status: p.status,
    email: p.email || "",
  };
}

function PlayerFields({
  form,
  onChange,
}: {
  form: PlayerForm;
  onChange: (next: PlayerForm) => void;
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-6">
      <TextInput
        value={form.name}
        onChange={(e) => onChange({ ...form, name: e.target.value })}
        placeholder="Name"
        className="sm:col-span-2"
      />
      <TextInput
        value={form.jerseyNumber}
        onChange={(e) => onChange({ ...form, jerseyNumber: e.target.value })}
        placeholder="#"
      />
      <Select value={form.position} onChange={(e) => onChange({ ...form, position: e.target.value })}>
        <option value="">Position</option>
        {POSITIONS.map((p) => (
          <option key={p} value={p}>
            {p}
          </option>
        ))}
      </Select>
      <Select value={form.status} onChange={(e) => onChange({ ...form, status: e.target.value as "active" | "injured" })}>
        <option value="active">Active</option>
        <option value="injured">Injured</option>
      </Select>
      <label className="flex items-center gap-2 text-xs text-gray-600">
        <input
          type="checkbox"
          checked={form.isPitcher}
          onChange={(e) => onChange({ ...form, isPitcher: e.target.checked })}
          className="h-4 w-4 accent-brand"
        />
        Eligible Pitcher (P)
      </label>
      <TextInput
        value={form.email}
        onChange={(e) => onChange({ ...form, email: e.target.value })}
        placeholder="Email (for reminders)"
        type="email"
        className="sm:col-span-2"
      />
    </div>
  );
}

export default function RosterManager({ initialRoster }: { initialRoster: RosterPlayer[] }) {
  const { toasts, push, dismiss } = useToasts();
  const [roster, setRoster] = useState(initialRoster);
  const [adding, setAdding] = useState(false);
  const [addForm, setAddForm] = useState<PlayerForm>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<PlayerForm>(EMPTY_FORM);
  const [deleteTarget, setDeleteTarget] = useState<RosterPlayer | null>(null);
  const [working, setWorking] = useState(false);

  async function addPlayer() {
    if (!addForm.name.trim()) {
      push({ message: "Player name is required.", tone: "error" });
      return;
    }
    setWorking(true);
    try {
      const res = await fetch("/api/team/roster", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(addForm),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to add player.");
      setRoster((prev) =>
        [...prev, { _id: data.id, team: prev[0]?.team || { _id: "", name: "" }, ...addForm }].sort((a, b) =>
          a.name.localeCompare(b.name)
        )
      );
      setAddForm(EMPTY_FORM);
      setAdding(false);
      push({ message: `${addForm.name} added to roster.`, tone: "success" });
    } catch (err) {
      push({ message: err instanceof Error ? err.message : "Failed to add player.", tone: "error" });
    } finally {
      setWorking(false);
    }
  }

  function startEdit(player: RosterPlayer) {
    setEditingId(player._id);
    setEditForm(toForm(player));
  }

  async function saveEdit(id: string) {
    setWorking(true);
    try {
      const res = await fetch(`/api/team/roster/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to update player.");
      }
      setRoster((prev) => prev.map((p) => (p._id === id ? { ...p, ...editForm } : p)).sort((a, b) => a.name.localeCompare(b.name)));
      setEditingId(null);
      push({ message: "Player updated.", tone: "success" });
    } catch (err) {
      push({ message: err instanceof Error ? err.message : "Failed to update player.", tone: "error" });
    } finally {
      setWorking(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    const id = deleteTarget._id;
    const name = deleteTarget.name;
    setWorking(true);
    try {
      const res = await fetch(`/api/team/roster/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to remove player.");
      }
      setRoster((prev) => prev.filter((p) => p._id !== id));
      push({ message: `${name} removed from roster.`, tone: "success" });
    } catch (err) {
      push({ message: err instanceof Error ? err.message : "Failed to remove player.", tone: "error" });
    } finally {
      setWorking(false);
      setDeleteTarget(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-black">Roster</h1>
        <PrimaryButton onClick={() => setAdding((v) => !v)}>
          <Plus size={14} aria-hidden="true" />
          Add Player
        </PrimaryButton>
      </div>

      {adding && (
        <Card className="p-4">
          <PlayerFields form={addForm} onChange={setAddForm} />
          <div className="mt-3 flex gap-2">
            <PrimaryButton onClick={addPlayer} disabled={working}>
              Save Player
            </PrimaryButton>
            <SecondaryButton
              onClick={() => {
                setAdding(false);
                setAddForm(EMPTY_FORM);
              }}
            >
              Cancel
            </SecondaryButton>
          </div>
        </Card>
      )}

      {roster.length === 0 ? (
        <Card>
          <EmptyState>No players yet. Add your first player above.</EmptyState>
        </Card>
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
                <th className="px-3 py-2">Name</th>
                <th className="px-3 py-2">#</th>
                <th className="px-3 py-2">Position</th>
                <th className="px-3 py-2">P</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Email</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {roster.map((player) =>
                editingId === player._id ? (
                  <tr key={player._id} className="border-b border-gray-100">
                    <td colSpan={7} className="p-3">
                      <PlayerFields form={editForm} onChange={setEditForm} />
                      <div className="mt-3 flex gap-2">
                        <PrimaryButton onClick={() => saveEdit(player._id)} disabled={working}>
                          <Check size={14} aria-hidden="true" />
                          Save
                        </PrimaryButton>
                        <SecondaryButton onClick={() => setEditingId(null)}>
                          <X size={14} aria-hidden="true" />
                          Cancel
                        </SecondaryButton>
                      </div>
                    </td>
                  </tr>
                ) : (
                  <tr key={player._id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-3 py-2 font-medium text-black">{player.name}</td>
                    <td className="px-3 py-2 text-gray-500">{player.jerseyNumber || "—"}</td>
                    <td className="px-3 py-2 text-gray-500">{player.position || "—"}</td>
                    <td className="px-3 py-2 text-gray-500">{player.isPitcher ? "P" : ""}</td>
                    <td className="px-3 py-2">
                      <StatusBadge tone={player.status === "injured" ? "red" : "green"}>{player.status}</StatusBadge>
                    </td>
                    <td className="px-3 py-2 text-gray-500">{player.email || "—"}</td>
                    <td className="px-3 py-2">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => startEdit(player)}
                          aria-label={`Edit ${player.name}`}
                          className="text-gray-400 hover:text-black"
                        >
                          <Pencil size={16} aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(player)}
                          aria-label={`Remove ${player.name}`}
                          className="text-gray-400 hover:text-brand"
                        >
                          <Trash2 size={16} aria-hidden="true" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        </Card>
      )}

      <Modal open={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)} title="Remove Player">
        <div className="space-y-4">
          <p className="text-sm text-gray-700">
            Remove {deleteTarget?.name} from the roster? This cannot be undone.
          </p>
          <div className="flex justify-end gap-2">
            <SecondaryButton onClick={() => setDeleteTarget(null)} disabled={working}>
              Cancel
            </SecondaryButton>
            <DangerButton onClick={confirmDelete} disabled={working}>
              {working ? "Removing…" : "Remove"}
            </DangerButton>
          </div>
        </div>
      </Modal>
      <ToastStack toasts={toasts} onDismiss={dismiss} />
    </div>
  );
}

"use client";

import { useState } from "react";
import { Plus, Pencil, Trash2, X, Check } from "lucide-react";
import ToastStack from "@/components/admin/ToastStack";
import { useToasts } from "@/components/admin/useToasts";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import type { RosterPlayer } from "@/lib/types";

const POSITIONS = ["Pitcher", "Catcher", "1B", "2B", "3B", "SS", "LF", "CF", "RF", "Utility"];

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
      <input
        value={form.name}
        onChange={(e) => onChange({ ...form, name: e.target.value })}
        placeholder="Name"
        className="rounded border border-white/20 bg-black px-3 py-2 text-sm text-white placeholder:text-white/30 sm:col-span-2"
      />
      <input
        value={form.jerseyNumber}
        onChange={(e) => onChange({ ...form, jerseyNumber: e.target.value })}
        placeholder="#"
        className="rounded border border-white/20 bg-black px-3 py-2 text-sm text-white placeholder:text-white/30"
      />
      <select
        value={form.position}
        onChange={(e) => onChange({ ...form, position: e.target.value })}
        className="rounded border border-white/20 bg-black px-3 py-2 text-sm text-white"
      >
        <option value="">Position</option>
        {POSITIONS.map((p) => (
          <option key={p} value={p}>
            {p}
          </option>
        ))}
      </select>
      <select
        value={form.status}
        onChange={(e) => onChange({ ...form, status: e.target.value as "active" | "injured" })}
        className="rounded border border-white/20 bg-black px-3 py-2 text-sm text-white"
      >
        <option value="active">Active</option>
        <option value="injured">Injured</option>
      </select>
      <label className="flex items-center gap-2 text-xs text-white/70">
        <input
          type="checkbox"
          checked={form.isPitcher}
          onChange={(e) => onChange({ ...form, isPitcher: e.target.checked })}
          className="h-4 w-4 accent-brand"
        />
        Eligible Pitcher (P)
      </label>
      <input
        value={form.email}
        onChange={(e) => onChange({ ...form, email: e.target.value })}
        placeholder="Email (for reminders)"
        type="email"
        className="rounded border border-white/20 bg-black px-3 py-2 text-sm text-white placeholder:text-white/30 sm:col-span-2"
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
        <h1 className="text-2xl">Roster</h1>
        <button
          type="button"
          onClick={() => setAdding((v) => !v)}
          className="flex items-center gap-1 rounded bg-brand px-3 py-2 text-xs font-semibold uppercase tracking-wide text-white hover:bg-brand-700"
        >
          <Plus size={14} aria-hidden="true" />
          Add Player
        </button>
      </div>

      {adding && (
        <div className="rounded-lg border border-white/10 bg-[#1a1a1a] p-4">
          <PlayerFields form={addForm} onChange={setAddForm} />
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={addPlayer}
              disabled={working}
              className="rounded bg-brand px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white hover:bg-brand-700 disabled:opacity-50"
            >
              Save Player
            </button>
            <button
              type="button"
              onClick={() => {
                setAdding(false);
                setAddForm(EMPTY_FORM);
              }}
              className="rounded border border-white/20 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white/70 hover:text-white"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {roster.length === 0 ? (
        <p className="text-sm text-white/40">No players yet. Add your first player above.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-white/10">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 bg-[#1a1a1a] text-left text-xs uppercase tracking-wide text-white/50">
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
                  <tr key={player._id} className="border-b border-white/5">
                    <td colSpan={7} className="p-3">
                      <PlayerFields form={editForm} onChange={setEditForm} />
                      <div className="mt-3 flex gap-2">
                        <button
                          type="button"
                          onClick={() => saveEdit(player._id)}
                          disabled={working}
                          className="flex items-center gap-1 rounded bg-brand px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-white hover:bg-brand-700 disabled:opacity-50"
                        >
                          <Check size={14} aria-hidden="true" />
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingId(null)}
                          className="flex items-center gap-1 rounded border border-white/20 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-white/70 hover:text-white"
                        >
                          <X size={14} aria-hidden="true" />
                          Cancel
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  <tr key={player._id} className="border-b border-white/5 hover:bg-white/[0.03]">
                    <td className="px-3 py-2 font-medium">{player.name}</td>
                    <td className="px-3 py-2 text-white/60">{player.jerseyNumber || "—"}</td>
                    <td className="px-3 py-2 text-white/60">{player.position || "—"}</td>
                    <td className="px-3 py-2 text-white/60">{player.isPitcher ? "P" : ""}</td>
                    <td className="px-3 py-2">
                      <span
                        className={`rounded px-2 py-0.5 text-xs font-semibold uppercase ${
                          player.status === "injured" ? "bg-brand/20 text-brand-300" : "bg-green-900/40 text-green-400"
                        }`}
                      >
                        {player.status}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-white/60">{player.email || "—"}</td>
                    <td className="px-3 py-2">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => startEdit(player)}
                          aria-label={`Edit ${player.name}`}
                          className="text-white/50 hover:text-white"
                        >
                          <Pencil size={16} aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(player)}
                          aria-label={`Remove ${player.name}`}
                          className="text-white/50 hover:text-brand-300"
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
        </div>
      )}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Remove Player"
        description={`Remove ${deleteTarget?.name} from the roster? This cannot be undone.`}
        confirmLabel="Remove"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
      <ToastStack toasts={toasts} onDismiss={dismiss} />
    </div>
  );
}

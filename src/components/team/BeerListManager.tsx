"use client";

import { useState } from "react";
import { Beer, Check } from "lucide-react";
import ToastStack from "@/components/admin/ToastStack";
import { useToasts } from "@/components/admin/useToasts";
import type { RosterPlayer, Game, BeerAssignment } from "@/lib/types";

export default function BeerListManager({
  initialRoster,
  initialGames,
  initialAssignments,
}: {
  initialRoster: RosterPlayer[];
  initialGames: Game[];
  initialAssignments: BeerAssignment[];
}) {
  const { toasts, push, dismiss } = useToasts();
  const [assignments, setAssignments] = useState(initialAssignments);
  const [selection, setSelection] = useState<Record<string, string>>(
    Object.fromEntries(
      initialGames.map((g) => {
        const existing = initialAssignments.find((a) => a.game._id === g._id);
        return [g._id, existing?.player?._id || ""];
      })
    )
  );
  const [saving, setSaving] = useState<string | null>(null);

  async function assign(gameId: string) {
    const playerId = selection[gameId];
    if (!playerId) {
      push({ message: "Select a player first.", tone: "error" });
      return;
    }
    setSaving(gameId);
    try {
      const res = await fetch("/api/team/beer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gameId, playerId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to assign beer duty.");
      }
      const refreshed = await fetch("/api/team/beer").then((r) => r.json());
      setAssignments(refreshed.assignments || []);
      push({ message: "Beer duty assigned.", tone: "success" });
    } catch (err) {
      push({ message: err instanceof Error ? err.message : "Failed to assign beer duty.", tone: "error" });
    } finally {
      setSaving(null);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="flex items-center gap-2 text-2xl">
          <Beer className="text-brand" size={24} aria-hidden="true" />
          Beer List
        </h1>
        <p className="text-sm text-white/50">
          Assign a player to bring beer for each upcoming game. Reminder emails and push notifications go out
          automatically 7 days and 1 day before the game — no need to remind anyone yourself.
        </p>
      </div>

      {initialGames.length === 0 ? (
        <p className="text-sm text-white/40">No upcoming games scheduled.</p>
      ) : (
        <div className="space-y-3">
          {initialGames.map((g) => {
            const existing = assignments.find((a) => a.game._id === g._id);
            return (
              <div key={g._id} className="flex flex-col gap-3 rounded-lg border border-white/10 bg-[#1a1a1a] p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold">
                    {g.homeTeam.name} vs {g.awayTeam.name}
                  </p>
                  <p className="text-xs text-white/50">
                    {g.date} · {g.time}
                    {g.field ? ` · ${g.field}` : ""}
                  </p>
                  {existing?.player && (
                    <p className="mt-1 flex items-center gap-2 text-xs text-white/40">
                      {existing.sevenDayReminderSentAt && (
                        <span className="flex items-center gap-1 text-green-500">
                          <Check size={12} aria-hidden="true" /> 7-day reminder sent
                        </span>
                      )}
                      {existing.oneDayReminderSentAt && (
                        <span className="flex items-center gap-1 text-green-500">
                          <Check size={12} aria-hidden="true" /> 1-day reminder sent
                        </span>
                      )}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={selection[g._id] || ""}
                    onChange={(e) => setSelection((prev) => ({ ...prev, [g._id]: e.target.value }))}
                    className="rounded border border-white/20 bg-black px-3 py-2 text-sm text-white"
                  >
                    <option value="">Unassigned</option>
                    {initialRoster.map((p) => (
                      <option key={p._id} value={p._id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => assign(g._id)}
                    disabled={saving === g._id}
                    className="rounded bg-brand px-3 py-2 text-xs font-semibold uppercase tracking-wide text-white hover:bg-brand-700 disabled:opacity-50"
                  >
                    {saving === g._id ? "Saving…" : "Save"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ToastStack toasts={toasts} onDismiss={dismiss} />
    </div>
  );
}

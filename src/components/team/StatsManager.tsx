"use client";

import { useEffect, useMemo, useState } from "react";
import { Save, Trash2 } from "lucide-react";
import { Card, CardHeader, PrimaryButton, SecondaryButton, DangerButton, Select, EmptyState, Modal } from "@/components/admin/data/ui";
import ToastStack from "@/components/admin/ToastStack";
import { useToasts } from "@/components/admin/useToasts";
import type { RosterPlayer, Game } from "@/lib/types";

const STAT_KEYS = ["ab", "h", "r", "rbi", "hr", "e"] as const;
type StatKey = (typeof STAT_KEYS)[number];
type LineMap = Record<string, Record<StatKey, number>>;

interface SeasonTotal {
  player: RosterPlayer;
  gp: number;
  ab: number;
  h: number;
  r: number;
  rbi: number;
  hr: number;
  e: number;
  avg: number;
}

function emptyLines(roster: RosterPlayer[]): LineMap {
  const map: LineMap = {};
  for (const p of roster) map[p._id] = { ab: 0, h: 0, r: 0, rbi: 0, hr: 0, e: 0 };
  return map;
}

export default function StatsManager({ initialRoster, initialGames }: { initialRoster: RosterPlayer[]; initialGames: Game[] }) {
  const { toasts, push, dismiss } = useToasts();
  const [totals, setTotals] = useState<SeasonTotal[] | null>(null);
  const [gameId, setGameId] = useState<string>("");
  const [lines, setLines] = useState<LineMap>(emptyLines(initialRoster));
  const [loadingLines, setLoadingLines] = useState(false);
  const [saving, setSaving] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);

  const game = useMemo(() => initialGames.find((g) => g._id === gameId), [initialGames, gameId]);

  async function loadTotals() {
    const res = await fetch("/api/team/stats");
    const data = await res.json().catch(() => ({}));
    setTotals(data.totals || []);
  }

  useEffect(() => {
    loadTotals();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!gameId) {
      setLines(emptyLines(initialRoster));
      return;
    }
    setLoadingLines(true);
    fetch(`/api/team/stats?gameId=${gameId}`)
      .then((res) => res.json())
      .then((data) => {
        const next = emptyLines(initialRoster);
        for (const line of data.lines || []) {
          if (next[line.player]) {
            next[line.player] = { ab: line.ab, h: line.h, r: line.r, rbi: line.rbi, hr: line.hr, e: line.e };
          }
        }
        setLines(next);
      })
      .finally(() => setLoadingLines(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameId]);

  function updateLine(playerId: string, key: StatKey, value: string) {
    const num = Math.max(0, Number(value) || 0);
    setLines((prev) => ({ ...prev, [playerId]: { ...prev[playerId], [key]: num } }));
  }

  async function save() {
    if (!gameId) {
      push({ message: "Select a game first.", tone: "error" });
      return;
    }
    setSaving(true);
    try {
      const payload = {
        gameId,
        lines: initialRoster.map((p) => ({ playerId: p._id, ...lines[p._id] })),
      };
      const res = await fetch("/api/team/stats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to save stats.");
      }
      push({ message: "Game stats saved.", tone: "success" });
      loadTotals();
    } catch (err) {
      push({ message: err instanceof Error ? err.message : "Failed to save stats.", tone: "error" });
    } finally {
      setSaving(false);
    }
  }

  async function clearStats() {
    setClearing(true);
    try {
      const res = await fetch(`/api/team/stats?gameId=${gameId}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to clear stats.");
      }
      setLines(emptyLines(initialRoster));
      push({ message: "Game stats cleared.", tone: "success" });
      loadTotals();
    } catch (err) {
      push({ message: err instanceof Error ? err.message : "Failed to clear stats.", tone: "error" });
    } finally {
      setClearing(false);
      setConfirmClear(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-black">Stats</h1>
        <p className="text-sm text-gray-500">Season totals are calculated automatically from every game you&rsquo;ve entered this season.</p>
      </div>

      <Card>
        <CardHeader title="Enter Game Stats" />
        <div className="p-5 pt-0">
          {initialGames.length === 0 ? (
            <EmptyState>No completed games yet this season.</EmptyState>
          ) : (
            <>
              <Select value={gameId} onChange={(e) => setGameId(e.target.value)} className="w-full sm:max-w-sm">
                <option value="">Select a final game…</option>
                {initialGames.map((g) => (
                  <option key={g._id} value={g._id}>
                    {g.date} — {g.homeTeam.name} vs {g.awayTeam.name} ({g.homeScore}-{g.awayScore})
                  </option>
                ))}
              </Select>

              {gameId && (
                <div className="mt-4 overflow-x-auto">
                  {loadingLines ? (
                    <p className="text-sm text-gray-400">Loading…</p>
                  ) : (
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-100 text-left text-xs uppercase tracking-wide text-gray-500">
                          <th className="px-2 py-2">Player</th>
                          {STAT_KEYS.map((k) => (
                            <th key={k} className="px-2 py-2 text-center">
                              {k.toUpperCase()}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {initialRoster.map((p) => (
                          <tr key={p._id} className="border-b border-gray-100">
                            <td className="px-2 py-1.5 font-medium text-black">{p.name}</td>
                            {STAT_KEYS.map((k) => (
                              <td key={k} className="px-2 py-1.5">
                                <input
                                  type="number"
                                  min={0}
                                  value={lines[p._id]?.[k] ?? 0}
                                  onChange={(e) => updateLine(p._id, k, e.target.value)}
                                  className="w-14 rounded-md border-2 border-gray-300 bg-white px-1.5 py-1 text-center text-sm text-black focus:border-brand focus:outline-none"
                                />
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                  <div className="mt-4 flex gap-2">
                    <PrimaryButton onClick={save} disabled={saving || loadingLines || clearing}>
                      <Save size={14} aria-hidden="true" />
                      {saving ? "Saving…" : `Save Stats${game ? ` — ${game.date}` : ""}`}
                    </PrimaryButton>
                    <SecondaryButton onClick={() => setConfirmClear(true)} disabled={saving || loadingLines || clearing}>
                      <Trash2 size={14} aria-hidden="true" />
                      Clear
                    </SecondaryButton>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </Card>

      <Modal open={confirmClear} onClose={() => setConfirmClear(false)} title="Clear Game Stats">
        <div className="space-y-4">
          <p className="text-sm text-gray-700">
            Permanently delete every stat line saved for this game{game ? ` (${game.date})` : ""}? This cannot be undone.
          </p>
          <div className="flex justify-end gap-2">
            <SecondaryButton onClick={() => setConfirmClear(false)} disabled={clearing}>
              Cancel
            </SecondaryButton>
            <DangerButton onClick={clearStats} disabled={clearing}>
              {clearing ? "Clearing…" : "Clear Stats"}
            </DangerButton>
          </div>
        </div>
      </Modal>

      <Card>
        <CardHeader title="Season Totals" />
        <div className="p-5 pt-0">
          {totals === null ? (
            <p className="text-sm text-gray-400">Loading…</p>
          ) : totals.length === 0 ? (
            <EmptyState>No roster players yet.</EmptyState>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-left text-xs uppercase tracking-wide text-gray-500">
                    <th className="px-2 py-2">Player</th>
                    <th className="px-2 py-2 text-center">GP</th>
                    {STAT_KEYS.map((k) => (
                      <th key={k} className="px-2 py-2 text-center">
                        {k.toUpperCase()}
                      </th>
                    ))}
                    <th className="px-2 py-2 text-center">AVG</th>
                  </tr>
                </thead>
                <tbody>
                  {totals.map((t) => (
                    <tr key={t.player._id} className="border-b border-gray-100">
                      <td className="px-2 py-1.5 font-medium text-black">{t.player.name}</td>
                      <td className="px-2 py-1.5 text-center text-gray-500">{t.gp}</td>
                      <td className="px-2 py-1.5 text-center text-gray-500">{t.ab}</td>
                      <td className="px-2 py-1.5 text-center text-gray-500">{t.h}</td>
                      <td className="px-2 py-1.5 text-center text-gray-500">{t.r}</td>
                      <td className="px-2 py-1.5 text-center text-gray-500">{t.rbi}</td>
                      <td className="px-2 py-1.5 text-center text-gray-500">{t.hr}</td>
                      <td className="px-2 py-1.5 text-center text-gray-500">{t.e}</td>
                      <td className="px-2 py-1.5 text-center font-mono text-black">{t.avg.toFixed(3).replace(/^0/, "")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Card>

      <ToastStack toasts={toasts} onDismiss={dismiss} />
    </div>
  );
}

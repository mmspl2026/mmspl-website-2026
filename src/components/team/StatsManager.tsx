"use client";

import { useEffect, useMemo, useState } from "react";
import { Save, Trash2, ChevronUp, ChevronDown, Beer } from "lucide-react";
import { Card, CardHeader, PrimaryButton, SecondaryButton, DangerButton, Select, EmptyState, Modal } from "@/components/admin/data/ui";
import ToastStack from "@/components/admin/ToastStack";
import { useToasts } from "@/components/admin/useToasts";
import { POSITIONS } from "@/lib/positions";
import type { RosterPlayer, Game } from "@/lib/types";

const STAT_KEYS = ["ab", "h", "r", "rbi", "hr", "e"] as const;
type StatKey = (typeof STAT_KEYS)[number];

interface LineData {
  attended: boolean;
  positionPlayed: string;
  ab: number;
  h: number;
  r: number;
  rbi: number;
  hr: number;
  e: number;
}

type LineMap = Record<string, LineData>;

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

function defaultLine(): LineData {
  return { attended: true, positionPlayed: "", ab: 0, h: 0, r: 0, rbi: 0, hr: 0, e: 0 };
}

function defaultLines(roster: RosterPlayer[]): LineMap {
  const map: LineMap = {};
  for (const p of roster) map[p._id] = defaultLine();
  return map;
}

export default function StatsManager({ initialRoster, initialGames }: { initialRoster: RosterPlayer[]; initialGames: Game[] }) {
  const { toasts, push, dismiss } = useToasts();
  const rosterById = useMemo(() => Object.fromEntries(initialRoster.map((p) => [p._id, p])), [initialRoster]);

  const [totals, setTotals] = useState<SeasonTotal[] | null>(null);
  const [gameId, setGameId] = useState<string>("");
  const [order, setOrder] = useState<string[]>(initialRoster.map((p) => p._id));
  const [lines, setLines] = useState<LineMap>(defaultLines(initialRoster));
  const [beerPlayerName, setBeerPlayerName] = useState<string | null>(null);
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
      setOrder(initialRoster.map((p) => p._id));
      setLines(defaultLines(initialRoster));
      setBeerPlayerName(null);
      return;
    }
    setLoadingLines(true);
    fetch(`/api/team/stats?gameId=${gameId}`)
      .then((res) => res.json())
      .then((data) => {
        const savedLines: Array<{ player: string } & Partial<LineData>> = data.lines || [];
        const savedIds = savedLines.map((l) => l.player).filter((id) => rosterById[id]);
        const missingIds = initialRoster.map((p) => p._id).filter((id) => !savedIds.includes(id));
        setOrder([...savedIds, ...missingIds]);

        const next = defaultLines(initialRoster);
        for (const line of savedLines) {
          if (!rosterById[line.player]) continue;
          next[line.player] = {
            attended: line.attended ?? true,
            positionPlayed: line.positionPlayed || "",
            ab: line.ab ?? 0,
            h: line.h ?? 0,
            r: line.r ?? 0,
            rbi: line.rbi ?? 0,
            hr: line.hr ?? 0,
            e: line.e ?? 0,
          };
        }
        setLines(next);
        setBeerPlayerName(data.beerPlayerName || null);
      })
      .finally(() => setLoadingLines(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameId]);

  function updateLine(playerId: string, patch: Partial<LineData>) {
    setLines((prev) => ({ ...prev, [playerId]: { ...prev[playerId], ...patch } }));
  }

  function updateStat(playerId: string, key: StatKey, value: string) {
    updateLine(playerId, { [key]: Math.max(0, Number(value) || 0) });
  }

  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= order.length) return;
    setOrder((prev) => {
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
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
        lines: order.map((playerId) => ({ playerId, ...lines[playerId] })),
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
      setOrder(initialRoster.map((p) => p._id));
      setLines(defaultLines(initialRoster));
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
        <CardHeader title="Game Sheet" subtitle="Lineup order, attendance, position, and stats — all for one game." />
        <div className="p-5 pt-0">
          {initialGames.length === 0 ? (
            <EmptyState>No completed games yet this season.</EmptyState>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-3">
                <Select value={gameId} onChange={(e) => setGameId(e.target.value)} className="w-full sm:max-w-sm">
                  <option value="">Select a final game…</option>
                  {initialGames.map((g) => (
                    <option key={g._id} value={g._id}>
                      {g.date} — {g.homeTeam.name} vs {g.awayTeam.name} ({g.homeScore}-{g.awayScore})
                    </option>
                  ))}
                </Select>
                {gameId && !loadingLines && (
                  <span className="flex items-center gap-1.5 text-sm text-gray-600">
                    <Beer size={15} className="text-brand" aria-hidden="true" />
                    {beerPlayerName ? (
                      <>
                        Beer duty: <span className="font-semibold text-black">{beerPlayerName}</span>
                      </>
                    ) : (
                      <span className="text-gray-400">No beer assignment for this game</span>
                    )}
                  </span>
                )}
              </div>

              {gameId && (
                <div className="mt-4 overflow-x-auto">
                  {loadingLines ? (
                    <p className="text-sm text-gray-400">Loading…</p>
                  ) : (
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-100 text-left text-xs uppercase tracking-wide text-gray-500">
                          <th className="px-2 py-2"></th>
                          <th className="px-2 py-2">Attended</th>
                          <th className="px-2 py-2">Player</th>
                          <th className="px-2 py-2">Position</th>
                          {STAT_KEYS.map((k) => (
                            <th key={k} className="px-2 py-2 text-center">
                              {k.toUpperCase()}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {order.map((playerId, index) => {
                          const player = rosterById[playerId];
                          if (!player) return null;
                          const line = lines[playerId] ?? defaultLine();
                          return (
                            <tr key={playerId} className="border-b border-gray-100">
                              <td className="px-2 py-1.5">
                                <div className="flex flex-col">
                                  <button
                                    type="button"
                                    onClick={() => move(index, -1)}
                                    disabled={index === 0}
                                    aria-label={`Move ${player.name} up`}
                                    className="text-gray-400 hover:text-black disabled:opacity-30"
                                  >
                                    <ChevronUp size={14} aria-hidden="true" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => move(index, 1)}
                                    disabled={index === order.length - 1}
                                    aria-label={`Move ${player.name} down`}
                                    className="text-gray-400 hover:text-black disabled:opacity-30"
                                  >
                                    <ChevronDown size={14} aria-hidden="true" />
                                  </button>
                                </div>
                              </td>
                              <td className="px-2 py-1.5">
                                <input
                                  type="checkbox"
                                  checked={line.attended}
                                  onChange={(e) => updateLine(playerId, { attended: e.target.checked })}
                                  className="h-4 w-4 accent-brand"
                                  aria-label={`${player.name} attended`}
                                />
                              </td>
                              <td className="px-2 py-1.5 font-medium text-black">{player.name}</td>
                              <td className="px-2 py-1.5">
                                <Select
                                  value={line.positionPlayed}
                                  onChange={(e) => updateLine(playerId, { positionPlayed: e.target.value })}
                                  className="h-8 text-xs"
                                >
                                  <option value="">—</option>
                                  {POSITIONS.map((pos) => (
                                    <option key={pos} value={pos}>
                                      {pos}
                                    </option>
                                  ))}
                                </Select>
                              </td>
                              {STAT_KEYS.map((k) => (
                                <td key={k} className="px-2 py-1.5">
                                  <input
                                    type="number"
                                    min={0}
                                    value={line[k]}
                                    onChange={(e) => updateStat(playerId, k, e.target.value)}
                                    className="w-14 rounded-md border-2 border-gray-300 bg-white px-1.5 py-1 text-center text-sm text-black focus:border-brand focus:outline-none"
                                  />
                                </td>
                              ))}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                  <div className="mt-4 flex gap-2">
                    <PrimaryButton onClick={save} disabled={saving || loadingLines || clearing}>
                      <Save size={14} aria-hidden="true" />
                      {saving ? "Saving…" : `Save Game Sheet${game ? ` — ${game.date}` : ""}`}
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

      <Modal open={confirmClear} onClose={() => setConfirmClear(false)} title="Clear Game Sheet">
        <div className="space-y-4">
          <p className="text-sm text-gray-700">
            Permanently delete attendance, lineup, and stats saved for this game{game ? ` (${game.date})` : ""}? This cannot be
            undone.
          </p>
          <div className="flex justify-end gap-2">
            <SecondaryButton onClick={() => setConfirmClear(false)} disabled={clearing}>
              Cancel
            </SecondaryButton>
            <DangerButton onClick={clearStats} disabled={clearing}>
              {clearing ? "Clearing…" : "Clear Game Sheet"}
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

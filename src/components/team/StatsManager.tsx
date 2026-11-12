"use client";

import { useEffect, useMemo, useState } from "react";
import { Save } from "lucide-react";
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

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl">Stats</h1>
        <p className="text-sm text-white/50">Season totals are calculated automatically from every game you&rsquo;ve entered.</p>
      </div>

      <div className="rounded-lg border border-white/10 bg-[#1a1a1a] p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-white/70">Enter Game Stats</h2>
        <select
          value={gameId}
          onChange={(e) => setGameId(e.target.value)}
          className="mt-3 w-full rounded border border-white/20 bg-black px-3 py-2 text-sm text-white sm:max-w-sm"
        >
          <option value="">Select a final game…</option>
          {initialGames.map((g) => (
            <option key={g._id} value={g._id}>
              {g.date} — {g.homeTeam.name} vs {g.awayTeam.name} ({g.homeScore}-{g.awayScore})
            </option>
          ))}
        </select>

        {gameId && (
          <div className="mt-4 overflow-x-auto">
            {loadingLines ? (
              <p className="text-sm text-white/40">Loading…</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-left text-xs uppercase tracking-wide text-white/50">
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
                    <tr key={p._id} className="border-b border-white/5">
                      <td className="px-2 py-1.5 font-medium">{p.name}</td>
                      {STAT_KEYS.map((k) => (
                        <td key={k} className="px-2 py-1.5">
                          <input
                            type="number"
                            min={0}
                            value={lines[p._id]?.[k] ?? 0}
                            onChange={(e) => updateLine(p._id, k, e.target.value)}
                            className="w-14 rounded border border-white/20 bg-black px-1.5 py-1 text-center text-sm text-white"
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <button
              type="button"
              onClick={save}
              disabled={saving || loadingLines}
              className="mt-4 flex items-center gap-2 rounded bg-brand px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white hover:bg-brand-700 disabled:opacity-50"
            >
              <Save size={14} aria-hidden="true" />
              {saving ? "Saving…" : `Save Stats${game ? ` — ${game.date}` : ""}`}
            </button>
          </div>
        )}
      </div>

      <div className="rounded-lg border border-white/10 bg-[#1a1a1a] p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-white/70">Season Totals</h2>
        {totals === null ? (
          <p className="mt-2 text-sm text-white/40">Loading…</p>
        ) : totals.length === 0 ? (
          <p className="mt-2 text-sm text-white/40">No roster players yet.</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left text-xs uppercase tracking-wide text-white/50">
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
                  <tr key={t.player._id} className="border-b border-white/5">
                    <td className="px-2 py-1.5 font-medium">{t.player.name}</td>
                    <td className="px-2 py-1.5 text-center text-white/60">{t.gp}</td>
                    <td className="px-2 py-1.5 text-center text-white/60">{t.ab}</td>
                    <td className="px-2 py-1.5 text-center text-white/60">{t.h}</td>
                    <td className="px-2 py-1.5 text-center text-white/60">{t.r}</td>
                    <td className="px-2 py-1.5 text-center text-white/60">{t.rbi}</td>
                    <td className="px-2 py-1.5 text-center text-white/60">{t.hr}</td>
                    <td className="px-2 py-1.5 text-center text-white/60">{t.e}</td>
                    <td className="px-2 py-1.5 text-center font-mono text-white/80">{t.avg.toFixed(3).replace(/^0/, "")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ToastStack toasts={toasts} onDismiss={dismiss} />
    </div>
  );
}

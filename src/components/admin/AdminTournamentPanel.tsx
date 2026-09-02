"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import { Plus, Trash2, Loader2, X } from "lucide-react";
import type { TournamentGame, TournamentResult, TournamentRound, TournamentType } from "@/lib/types";
import ScoreStepper from "./ScoreStepper";
import AdminWildCardPanel from "./AdminWildCardPanel";
import { useToasts } from "./useToasts";
import ToastStack from "./ToastStack";

const TYPE_OPTIONS: { value: TournamentType; label: string }[] = [
  { value: "mcgregor", label: "Jim McGregor (Year-End)" },
  { value: "charity", label: "Kevan MacDonald (Charity)" },
];

const ROUND_OPTIONS: { value: TournamentRound; label: string }[] = [
  { value: "roundRobin", label: "Round Robin" },
  { value: "wildCard", label: "Wild Card" },
  { value: "quarterFinal", label: "Quarter Final" },
  { value: "semiFinal", label: "Semi Final" },
  { value: "final", label: "Final" },
];

const FIELD_OPTIONS = ["Centennial North", "Centennial South", "Mintleaf"];

function addDays(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

interface EditableTournamentGame extends TournamentGame {
  draftHomeScore: number;
  draftAwayScore: number;
  draftFinal: boolean;
  saving: boolean;
}

function toEditable(g: TournamentGame): EditableTournamentGame {
  return {
    ...g,
    draftHomeScore: g.homeScore ?? 0,
    draftAwayScore: g.awayScore ?? 0,
    draftFinal: typeof g.homeScore === "number" && typeof g.awayScore === "number",
    saving: false,
  };
}

function AddGameForm({
  defaultDate,
  onCancel,
  onCreate,
  creating,
}: {
  defaultDate: string;
  onCancel: () => void;
  onCreate: (values: {
    date: string;
    time: string;
    field: string;
    homeTeam: string;
    awayTeam: string;
    round: TournamentRound;
    pool: string;
  }) => void;
  creating: boolean;
}) {
  const [date, setDate] = useState(defaultDate);
  const [time, setTime] = useState("");
  const [field, setField] = useState(FIELD_OPTIONS[0]);
  const [homeTeam, setHomeTeam] = useState("");
  const [awayTeam, setAwayTeam] = useState("");
  const [round, setRound] = useState<TournamentRound>("wildCard");
  const [pool, setPool] = useState("");

  const canSubmit = date && homeTeam.trim() && awayTeam.trim();

  return (
    <div className="mb-4 rounded-2xl border-2 border-brand/60 bg-gray-900 p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-bold text-white">Add Game</p>
        <button type="button" onClick={onCancel} aria-label="Cancel">
          <X size={16} className="text-gray-500 hover:text-white" aria-hidden="true" />
        </button>
      </div>
      <div className="space-y-2.5">
        <div className="grid grid-cols-2 gap-2">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="h-9 rounded-lg border-2 border-gray-700 bg-gray-950 px-2 text-sm text-white focus:border-brand focus:outline-none"
          />
          <input
            type="text"
            placeholder="Time (e.g. 4:00 PM)"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className="h-9 rounded-lg border-2 border-gray-700 bg-gray-950 px-2 text-sm text-white placeholder:text-gray-600 focus:border-brand focus:outline-none"
          />
        </div>
        <select
          value={field}
          onChange={(e) => setField(e.target.value)}
          className="h-9 w-full rounded-lg border-2 border-gray-700 bg-gray-950 px-2 text-sm text-white focus:border-brand focus:outline-none"
        >
          {FIELD_OPTIONS.map((f) => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
        </select>
        <input
          type="text"
          placeholder="Home team"
          value={homeTeam}
          onChange={(e) => setHomeTeam(e.target.value)}
          className="h-9 w-full rounded-lg border-2 border-gray-700 bg-gray-950 px-2 text-sm text-white placeholder:text-gray-600 focus:border-brand focus:outline-none"
        />
        <input
          type="text"
          placeholder="Away team"
          value={awayTeam}
          onChange={(e) => setAwayTeam(e.target.value)}
          className="h-9 w-full rounded-lg border-2 border-gray-700 bg-gray-950 px-2 text-sm text-white placeholder:text-gray-600 focus:border-brand focus:outline-none"
        />
        <div className="grid grid-cols-2 gap-2">
          <select
            value={round}
            onChange={(e) => setRound(e.target.value as TournamentRound)}
            className="h-9 rounded-lg border-2 border-gray-700 bg-gray-950 px-2 text-sm text-white focus:border-brand focus:outline-none"
          >
            {ROUND_OPTIONS.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
          {round === "roundRobin" && (
            <input
              type="text"
              placeholder="Pool (e.g. A)"
              value={pool}
              onChange={(e) => setPool(e.target.value)}
              className="h-9 rounded-lg border-2 border-gray-700 bg-gray-950 px-2 text-sm text-white placeholder:text-gray-600 focus:border-brand focus:outline-none"
            />
          )}
        </div>
        <button
          type="button"
          disabled={!canSubmit || creating}
          onClick={() => onCreate({ date, time, field, homeTeam, awayTeam, round, pool })}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand py-2.5 text-sm font-bold text-white hover:bg-brand-700 disabled:opacity-40"
        >
          {creating && <Loader2 size={16} className="animate-spin" aria-hidden="true" />}
          {creating ? "Adding…" : "Add Game"}
        </button>
      </div>
    </div>
  );
}

export default function AdminTournamentPanel() {
  const currentYear = useMemo(() => new Date().getFullYear(), []);
  const [type, setType] = useState<TournamentType>("mcgregor");
  const [subView, setSubView] = useState<"games" | "wildcard">("games");
  const [result, setResult] = useState<TournamentResult | null>(null);
  const [games, setGames] = useState<EditableTournamentGame[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingProjected, setLoadingProjected] = useState(false);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const { toasts, push, dismiss } = useToasts();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/tournament?year=${currentYear}&type=${type}`);
      if (!res.ok) throw new Error("Failed to load tournament.");
      const data = await res.json();
      setResult(data.result);
      setGames((data.games as TournamentGame[]).map(toEditable));
    } catch (err) {
      push({ tone: "error", message: err instanceof Error ? err.message : "Failed to load tournament." });
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentYear, type]);

  useEffect(() => {
    load();
  }, [load]);

  const days = useMemo(() => {
    if (!result?.plannedStart) return [];
    const end = result.plannedEnd || result.plannedStart;
    const list: string[] = [];
    let d = result.plannedStart;
    let guard = 0;
    while (d <= end && guard < 14) {
      list.push(d);
      d = addDays(d, 1);
      guard++;
    }
    return list;
  }, [result]);

  useEffect(() => {
    if (days.length > 0 && (!selectedDay || !days.includes(selectedDay))) {
      setSelectedDay(days[0]);
    }
  }, [days, selectedDay]);

  const dayGames = useMemo(
    () => games.filter((g) => g.date === selectedDay).sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)),
    [games, selectedDay]
  );

  function updateGame(id: string, patch: Partial<EditableTournamentGame>) {
    setGames((prev) => prev.map((g) => (g._id === id ? { ...g, ...patch } : g)));
  }

  async function handleLoadProjected() {
    setLoadingProjected(true);
    try {
      const res = await fetch("/api/admin/tournament/load-projected", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ year: currentYear, type }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to load projected schedule.");
      const loadedGames = data.games as TournamentGame[];
      setGames(loadedGames.map(toEditable));
      setResult((r) => (r ? { ...r, hasDetailedResults: true } : r));
      push({ tone: "success", message: `Loaded ${loadedGames.length} games from the current projection.` });
    } catch (err) {
      push({ tone: "error", message: err instanceof Error ? err.message : "Failed to load projected schedule." });
    } finally {
      setLoadingProjected(false);
    }
  }

  async function handleSave(game: EditableTournamentGame) {
    updateGame(game._id, { saving: true });
    try {
      const res = await fetch("/api/admin/tournament/games/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gameId: game._id,
          homeScore: game.draftHomeScore,
          awayScore: game.draftAwayScore,
          final: game.draftFinal,
          year: currentYear,
          type,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to save.");
      setGames((data.games as TournamentGame[]).map(toEditable));
      push({ tone: "success", message: `Saved: ${game.homeTeam} vs ${game.awayTeam}` });
    } catch (err) {
      updateGame(game._id, { saving: false });
      push({ tone: "error", message: err instanceof Error ? err.message : "Failed to save." });
    }
  }

  async function handleDelete(game: EditableTournamentGame) {
    if (!window.confirm(`Delete ${game.homeTeam} vs ${game.awayTeam}? This can't be undone.`)) return;
    updateGame(game._id, { saving: true });
    try {
      const res = await fetch("/api/admin/tournament/games/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gameId: game._id, year: currentYear, type }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to delete.");
      setGames((data.games as TournamentGame[]).map(toEditable));
      push({ tone: "success", message: "Game deleted." });
    } catch (err) {
      updateGame(game._id, { saving: false });
      push({ tone: "error", message: err instanceof Error ? err.message : "Failed to delete." });
    }
  }

  async function handleCreate(values: {
    date: string;
    time: string;
    field: string;
    homeTeam: string;
    awayTeam: string;
    round: TournamentRound;
    pool: string;
  }) {
    setCreating(true);
    try {
      const res = await fetch("/api/admin/tournament/games/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...values, year: currentYear, type }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to add game.");
      setGames((data.games as TournamentGame[]).map(toEditable));
      setShowAddForm(false);
      setSelectedDay(values.date);
      push({ tone: "success", message: `Added: ${values.homeTeam} vs ${values.awayTeam}` });
    } catch (err) {
      push({ tone: "error", message: err instanceof Error ? err.message : "Failed to add game." });
    } finally {
      setCreating(false);
    }
  }

  const hasAnyGames = games.length > 0;

  return (
    <div>
      <div className="mb-4 flex gap-2">
        {TYPE_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => setType(opt.value)}
            className={clsx(
              "flex-1 rounded-lg border-2 py-2 text-xs font-bold uppercase tracking-wide transition-all",
              type === opt.value ? "border-brand bg-brand text-white" : "border-gray-800 bg-gray-900 text-gray-400"
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {type === "mcgregor" && (
        <div className="mb-4 flex gap-2">
          {(["games", "wildcard"] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setSubView(v)}
              className={clsx(
                "flex-1 rounded-lg border-2 py-1.5 text-xs font-semibold uppercase tracking-wide transition-all",
                subView === v ? "border-white bg-white text-gray-900" : "border-gray-800 bg-gray-900 text-gray-500"
              )}
            >
              {v === "games" ? "Games" : "Wild Card Seeding"}
            </button>
          ))}
        </div>
      )}

      {type === "mcgregor" && subView === "wildcard" ? (
        <AdminWildCardPanel year={currentYear} type={type} />
      ) : loading ? (
        <p className="py-16 text-center text-gray-500">Loading…</p>
      ) : !result ? (
        <p className="py-16 text-center text-gray-500">No tournament record found for {currentYear}.</p>
      ) : (
        <>
          {!hasAnyGames && type === "mcgregor" && (
            <div className="mb-4 rounded-xl border-2 border-amber-800 bg-amber-950/20 p-4">
              <p className="mb-3 text-sm text-amber-200">
                No games entered yet. Load the current projected schedule (based on today&apos;s standings) to get
                started instantly, or add games manually below.
              </p>
              <button
                type="button"
                onClick={handleLoadProjected}
                disabled={loadingProjected}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-amber-600 py-3 text-sm font-bold text-white transition-all hover:bg-amber-500 disabled:opacity-50"
              >
                {loadingProjected && <Loader2 size={16} className="animate-spin" aria-hidden="true" />}
                {loadingProjected ? "Loading…" : "Load Projected Schedule"}
              </button>
            </div>
          )}
          {!hasAnyGames && type === "charity" && (
            <div className="mb-4 rounded-xl border-2 border-gray-800 bg-gray-900 p-4">
              <p className="text-sm text-gray-400">
                No games entered yet. Add games manually below — projected-schedule loading isn&apos;t available for
                the Charity tournament yet.
              </p>
            </div>
          )}

          {days.length > 0 && (
            <div className="mb-4 flex gap-2 overflow-x-auto">
              {days.map((day) => (
                <button
                  key={day}
                  type="button"
                  onClick={() => setSelectedDay(day)}
                  className={clsx(
                    "shrink-0 rounded-full border-2 px-3 py-1.5 text-xs font-semibold transition-all",
                    selectedDay === day ? "border-brand bg-brand text-white" : "border-gray-800 bg-gray-900 text-gray-400"
                  )}
                >
                  {new Date(`${day}T00:00:00`).toLocaleDateString("en-CA", {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                  })}
                </button>
              ))}
            </div>
          )}

          {showAddForm && selectedDay && (
            <AddGameForm
              defaultDate={selectedDay}
              onCancel={() => setShowAddForm(false)}
              onCreate={handleCreate}
              creating={creating}
            />
          )}

          {dayGames.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-600">No games for this day yet.</p>
          ) : (
            dayGames.map((game) => {
              const dirty =
                game.draftHomeScore !== (game.homeScore ?? 0) ||
                game.draftAwayScore !== (game.awayScore ?? 0) ||
                game.draftFinal !== (typeof game.homeScore === "number");
              return (
                <article key={game._id} className="mb-3 rounded-2xl border-2 border-gray-800 bg-gray-900 p-4">
                  <div className="mb-3 flex items-center justify-between text-xs text-gray-400">
                    <span>
                      {game.time} &middot; {game.field}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleDelete(game)}
                      disabled={game.saving}
                      aria-label="Delete game"
                    >
                      <Trash2 size={14} className="text-gray-600 hover:text-red-500" aria-hidden="true" />
                    </button>
                  </div>
                  <div className="mb-3 flex items-center gap-2">
                    <div className="flex-1 text-center">
                      <p className="mb-2 truncate text-xs font-semibold text-white">
                        {game.homeSeed ? `${game.homeSeed} · ` : ""}
                        {game.homeTeam}
                      </p>
                      <ScoreStepper
                        label={game.homeTeam || "Home"}
                        value={game.draftHomeScore}
                        onChange={(v) => updateGame(game._id, { draftHomeScore: v, draftFinal: true })}
                        disabled={game.saving}
                      />
                    </div>
                    <div className="px-1 text-lg font-bold text-gray-600" aria-hidden="true">
                      &ndash;
                    </div>
                    <div className="flex-1 text-center">
                      <p className="mb-2 truncate text-xs font-semibold text-white">
                        {game.awaySeed ? `${game.awaySeed} · ` : ""}
                        {game.awayTeam}
                      </p>
                      <ScoreStepper
                        label={game.awayTeam || "Away"}
                        value={game.draftAwayScore}
                        onChange={(v) => updateGame(game._id, { draftAwayScore: v, draftFinal: true })}
                        disabled={game.saving}
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => updateGame(game._id, { draftFinal: !game.draftFinal })}
                    disabled={game.saving}
                    className={clsx(
                      "mb-3 w-full rounded-xl py-2 text-xs font-bold uppercase tracking-wide transition-all",
                      game.draftFinal ? "bg-green-700 text-white" : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                    )}
                  >
                    {game.draftFinal ? "✓ Final" : "Not played yet"}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSave(game)}
                    disabled={!dirty || game.saving}
                    className={clsx(
                      "flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold transition-all",
                      dirty && !game.saving
                        ? "bg-red-600 text-white hover:bg-red-500 active:scale-[0.98]"
                        : "cursor-not-allowed bg-gray-800 text-gray-600"
                    )}
                  >
                    {game.saving ? "Saving…" : "Save"}
                  </button>
                </article>
              );
            })
          )}

          {!showAddForm && (
            <button
              type="button"
              onClick={() => setShowAddForm(true)}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-700 py-3 text-sm font-semibold text-gray-400 transition-all hover:border-brand hover:text-white"
            >
              <Plus size={16} aria-hidden="true" /> Add Game
            </button>
          )}
        </>
      )}

      <ToastStack toasts={toasts} onDismiss={dismiss} />
    </div>
  );
}

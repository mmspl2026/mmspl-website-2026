"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Save, Loader2 } from "lucide-react";
import clsx from "clsx";
import type { AdminGame, Game } from "@/lib/types";
import { getTodayEastern } from "@/utils/timezone";
import { Card, EmptyState, Spinner } from "../ui";
import { useToasts } from "@/components/admin/useToasts";
import ToastStack from "@/components/admin/ToastStack";

const STATUS_OPTIONS: Array<{ value: Game["status"]; label: string }> = [
  { value: "scheduled", label: "Scheduled" },
  { value: "live", label: "Live" },
  { value: "final", label: "Final" },
];

interface EditableGame extends AdminGame {
  draftHomeScore: number;
  draftAwayScore: number;
  draftStatus: Game["status"];
  saving: boolean;
}

function findPrevDate(current: string, dates: string[]): string | null {
  let result: string | null = null;
  for (const d of dates) {
    if (d < current) result = d;
    else break;
  }
  return result;
}

function findNextDate(current: string, dates: string[]): string | null {
  for (const d of dates) if (d > current) return d;
  return null;
}

export default function ScoresTab() {
  const todayISO = useMemo(() => getTodayEastern(), []);
  const [selectedDate, setSelectedDate] = useState(todayISO);
  const [dates, setDates] = useState<string[]>([]);
  const [games, setGames] = useState<EditableGame[]>([]);
  const [loading, setLoading] = useState(true);
  const { toasts, push, dismiss } = useToasts();

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/admin/dates");
      const data = await res.json();
      setDates(data.dates ?? []);
    })();
  }, []);

  const loadGames = useCallback(async (date: string) => {
    setLoading(true);
    const res = await fetch(`/api/admin/games?date=${date}`);
    const data = await res.json();
    setGames(
      (data.games as AdminGame[]).map((g) => ({
        ...g,
        draftHomeScore: g.homeScore ?? 0,
        draftAwayScore: g.awayScore ?? 0,
        draftStatus: g.status,
        saving: false,
      }))
    );
    setLoading(false);
  }, []);

  useEffect(() => {
    loadGames(selectedDate);
  }, [selectedDate, loadGames]);

  function updateGame(id: string, patch: Partial<EditableGame>) {
    setGames((prev) => prev.map((g) => (g._id === id ? { ...g, ...patch } : g)));
  }

  async function handleSave(game: EditableGame) {
    updateGame(game._id, { saving: true });
    try {
      const res = await fetch("/api/admin/games/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gameId: game._id,
          homeScore: game.draftHomeScore,
          awayScore: game.draftAwayScore,
          status: game.draftStatus,
          seasonId: game.seasonId,
          seasonYear: game.seasonYear,
        }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Save failed.");
      const data = await res.json();
      const updated: AdminGame = data.game;
      updateGame(game._id, {
        homeScore: updated.homeScore,
        awayScore: updated.awayScore,
        status: updated.status,
        draftHomeScore: updated.homeScore ?? 0,
        draftAwayScore: updated.awayScore ?? 0,
        draftStatus: updated.status,
        saving: false,
      });
      push({ tone: "success", message: `Saved: ${game.homeTeam.name} vs ${game.awayTeam.name}` });
    } catch (err) {
      updateGame(game._id, { saving: false });
      push({ tone: "error", message: err instanceof Error ? err.message : "Save failed." });
    }
  }

  const canPrev = findPrevDate(selectedDate, dates) !== null;
  const canNext = findNextDate(selectedDate, dates) !== null;

  return (
    <div className="space-y-4">
      <Card className="flex flex-wrap items-center gap-3 p-4">
        <button
          type="button"
          disabled={!canPrev}
          onClick={() => {
            const d = findPrevDate(selectedDate, dates);
            if (d) setSelectedDate(d);
          }}
          className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-gray-300 text-gray-600 hover:border-brand hover:text-brand disabled:opacity-30"
          aria-label="Previous game night"
        >
          <ChevronLeft size={16} aria-hidden="true" />
        </button>

        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="h-9 rounded-md border-2 border-gray-300 px-3 text-sm font-semibold text-black focus:border-brand focus:outline-none"
        />

        <button
          type="button"
          disabled={!canNext}
          onClick={() => {
            const d = findNextDate(selectedDate, dates);
            if (d) setSelectedDate(d);
          }}
          className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-gray-300 text-gray-600 hover:border-brand hover:text-brand disabled:opacity-30"
          aria-label="Next game night"
        >
          <ChevronRight size={16} aria-hidden="true" />
        </button>

        {selectedDate !== todayISO && (
          <button
            type="button"
            onClick={() => setSelectedDate(todayISO)}
            className="rounded-[3px] border-2 border-gray-300 px-3 py-1.5 text-sm font-semibold text-gray-600 hover:border-brand hover:text-brand"
          >
            Today
          </button>
        )}
      </Card>

      {loading ? (
        <Spinner />
      ) : games.length === 0 ? (
        <EmptyState>No games scheduled for this date.</EmptyState>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {games.map((game) => {
            const dirty =
              game.draftHomeScore !== (game.homeScore ?? 0) ||
              game.draftAwayScore !== (game.awayScore ?? 0) ||
              game.draftStatus !== game.status;
            return (
              <Card
                key={game._id}
                className={clsx("p-5", dirty && "border-amber-400 ring-1 ring-amber-300")}
              >
                <div className="mb-3 flex items-center justify-between text-xs text-gray-500">
                  <span>
                    {game.time} &middot; {game.field}
                  </span>
                  {dirty && (
                    <span className="rounded bg-amber-100 px-2 py-0.5 font-semibold uppercase text-amber-700">
                      Unsaved
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-center gap-3">
                  <div className="flex-1 text-right">
                    <p className="mb-1 truncate text-sm font-semibold text-black">{game.homeTeam.name}</p>
                    <input
                      type="number"
                      min={0}
                      value={game.draftHomeScore}
                      onChange={(e) => updateGame(game._id, { draftHomeScore: Math.max(0, Number(e.target.value)) })}
                      disabled={game.saving}
                      className="ml-auto h-10 w-16 rounded border border-gray-300 text-center font-mono-brand text-lg font-bold focus:border-brand focus:outline-none"
                    />
                  </div>
                  <span className="mt-5 text-gray-400">&ndash;</span>
                  <div className="flex-1">
                    <p className="mb-1 truncate text-sm font-semibold text-black">{game.awayTeam.name}</p>
                    <input
                      type="number"
                      min={0}
                      value={game.draftAwayScore}
                      onChange={(e) => updateGame(game._id, { draftAwayScore: Math.max(0, Number(e.target.value)) })}
                      disabled={game.saving}
                      className="h-10 w-16 rounded border border-gray-300 text-center font-mono-brand text-lg font-bold focus:border-brand focus:outline-none"
                    />
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2">
                  {STATUS_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      disabled={game.saving}
                      onClick={() => updateGame(game._id, { draftStatus: opt.value })}
                      className={clsx(
                        "rounded-[3px] py-2 text-xs font-semibold uppercase tracking-wide transition-colors disabled:opacity-40",
                        game.draftStatus === opt.value
                          ? "bg-brand text-white"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => handleSave(game)}
                  disabled={!dirty || game.saving}
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-[3px] bg-brand py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-700 disabled:opacity-40"
                >
                  {game.saving ? (
                    <Loader2 size={16} className="animate-spin" aria-hidden="true" />
                  ) : (
                    <Save size={16} aria-hidden="true" />
                  )}
                  {game.saving ? "Saving…" : "Save"}
                </button>
              </Card>
            );
          })}
        </div>
      )}

      <ToastStack toasts={toasts} onDismiss={dismiss} />
    </div>
  );
}

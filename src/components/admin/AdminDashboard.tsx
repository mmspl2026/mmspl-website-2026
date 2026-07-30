"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import { RefreshCw } from "lucide-react";
import type { AdminGame, Game, Standing } from "@/lib/types";
import AdminHeader from "./AdminHeader";
import DateNav from "./DateNav";
import GameEntryCard, { type EditableGame } from "./GameEntryCard";
import AdminStandingsPanel from "./AdminStandingsPanel";
import ConfirmDialog from "./ConfirmDialog";
import ToastStack from "./ToastStack";
import { useToasts } from "./useToasts";

function findPrevDate(current: string, dates: string[]): string | null {
  let result: string | null = null;
  for (const d of dates) {
    if (d < current) result = d;
    else break;
  }
  return result;
}

function findNextDate(current: string, dates: string[]): string | null {
  for (const d of dates) {
    if (d > current) return d;
  }
  return null;
}

function toEditable(g: AdminGame): EditableGame {
  return {
    _id: g._id,
    time: g.time,
    field: g.field,
    homeTeam: g.homeTeam,
    awayTeam: g.awayTeam,
    seasonId: g.seasonId,
    seasonYear: g.seasonYear,
    savedHomeScore: g.homeScore ?? 0,
    savedAwayScore: g.awayScore ?? 0,
    savedStatus: g.status,
    draftHomeScore: g.homeScore ?? 0,
    draftAwayScore: g.awayScore ?? 0,
    draftStatus: g.status,
    saving: false,
  };
}

interface ConfirmState {
  title: string;
  description: string;
  confirmLabel: string;
  onConfirm: () => void;
}

export default function AdminDashboard() {
  const todayISO = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [selectedDate, setSelectedDate] = useState(todayISO);
  const [datesWithGames, setDatesWithGames] = useState<string[]>([]);
  const [games, setGames] = useState<EditableGame[]>([]);
  const [standings, setStandings] = useState<Standing[]>([]);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [loadingGames, setLoadingGames] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);
  const { toasts, push, dismiss } = useToasts();

  const loadDates = useCallback(async () => {
    const res = await fetch("/api/admin/dates");
    if (!res.ok) return;
    const data = await res.json();
    setDatesWithGames(data.dates ?? []);
  }, []);

  const loadStandings = useCallback(async () => {
    const res = await fetch("/api/admin/standings");
    if (!res.ok) return;
    const data = await res.json();
    setStandings(data.standings ?? []);
  }, []);

  const loadGames = useCallback(async (date: string) => {
    setLoadingGames(true);
    setErrorMessage("");
    try {
      const res = await fetch(`/api/admin/games?date=${date}`);
      if (!res.ok) throw new Error("Failed to load games for this date.");
      const data = await res.json();
      setGames((data.games as AdminGame[]).map(toEditable));
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to load games.");
      setGames([]);
    } finally {
      setLoadingGames(false);
    }
  }, []);

  useEffect(() => {
    (async () => {
      await Promise.all([loadDates(), loadStandings()]);
      setLoadingInitial(false);
    })();
  }, [loadDates, loadStandings]);

  useEffect(() => {
    loadGames(selectedDate);
  }, [selectedDate, loadGames]);

  function updateGame(gameId: string, updater: (g: EditableGame) => EditableGame) {
    setGames((prev) => prev.map((g) => (g._id === gameId ? updater(g) : g)));
  }

  function handleScoreChange(gameId: string, team: "home" | "away", value: number) {
    updateGame(gameId, (g) =>
      team === "home" ? { ...g, draftHomeScore: value } : { ...g, draftAwayScore: value }
    );
  }

  function handleStatusChange(gameId: string, status: Game["status"]) {
    updateGame(gameId, (g) => ({ ...g, draftStatus: status }));
  }

  const saveGame = useCallback(
    async (
      gameId: string,
      overrides?: Partial<{ homeScore: number; awayScore: number; status: Game["status"] }>
    ) => {
      let target: EditableGame | undefined;
      setGames((prev) => {
        target = prev.find((g) => g._id === gameId);
        return prev;
      });
      if (!target) throw new Error("Game not found.");

      const previousSnapshot = {
        homeScore: target.savedHomeScore,
        awayScore: target.savedAwayScore,
        status: target.savedStatus,
      };

      updateGame(gameId, (g) => ({ ...g, saving: true }));

      try {
        const res = await fetch("/api/admin/games/save", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            gameId,
            homeScore: overrides?.homeScore ?? target.draftHomeScore,
            awayScore: overrides?.awayScore ?? target.draftAwayScore,
            status: overrides?.status ?? target.draftStatus,
            seasonId: target.seasonId,
            seasonYear: target.seasonYear,
          }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "Failed to save score.");
        }
        const data = await res.json();
        const updated: AdminGame = data.game;
        updateGame(gameId, (g) => ({
          ...g,
          savedHomeScore: updated.homeScore ?? 0,
          savedAwayScore: updated.awayScore ?? 0,
          savedStatus: updated.status,
          draftHomeScore: updated.homeScore ?? 0,
          draftAwayScore: updated.awayScore ?? 0,
          draftStatus: updated.status,
          saving: false,
        }));
        setStandings(data.standings ?? []);
        return { previousSnapshot };
      } catch (err) {
        updateGame(gameId, (g) => ({ ...g, saving: false }));
        throw err;
      }
    },
    []
  );

  async function handleSave(gameId: string) {
    const game = games.find((g) => g._id === gameId);
    if (!game) return;
    try {
      const result = await saveGame(gameId);
      push({
        tone: "success",
        message: `Score saved: ${game.homeTeam.name} vs ${game.awayTeam.name}`,
        onUndo: () => {
          saveGame(gameId, result.previousSnapshot)
            .then(() => push({ tone: "info", message: "Save undone." }))
            .catch(() => push({ tone: "error", message: "Couldn't undo — edit and save manually." }));
        },
      });
    } catch (err) {
      push({ tone: "error", message: err instanceof Error ? err.message : "Failed to save score." });
    }
  }

  function openCancelConfirm(gameIds: string[]) {
    if (gameIds.length === 0) {
      push({ tone: "info", message: "No games to cancel." });
      return;
    }
    const isSingle = gameIds.length === 1;
    const label = isSingle
      ? (() => {
          const g = games.find((x) => x._id === gameIds[0]);
          return g ? `${g.homeTeam.name} vs ${g.awayTeam.name}` : "this game";
        })()
      : `${gameIds.length} games`;

    setConfirmState({
      title: isSingle ? "Cancel this game?" : "Cancel all remaining games?",
      description: `This marks ${label} as CANCELLED, sets the score to 1-1, and immediately emails and push-notifies subscribers. The score change can be undone within 30 seconds, but the notification can't be un-sent.`,
      confirmLabel: isSingle ? "Cancel Game" : "Cancel All",
      onConfirm: () => {
        setConfirmState(null);
        confirmCancel(gameIds);
      },
    });
  }

  async function confirmCancel(gameIds: string[]) {
    const previousSnapshots = new Map(
      gameIds.map((id) => {
        const g = games.find((x) => x._id === id)!;
        return [id, { homeScore: g.savedHomeScore, awayScore: g.savedAwayScore, status: g.savedStatus }] as const;
      })
    );

    gameIds.forEach((id) => updateGame(id, (g) => ({ ...g, saving: true })));

    try {
      const res = await fetch("/api/admin/games/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gameIds }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to cancel games.");
      }
      const data = await res.json();
      gameIds.forEach((id) =>
        updateGame(id, (g) => ({
          ...g,
          savedHomeScore: 1,
          savedAwayScore: 1,
          savedStatus: "cancelled",
          draftHomeScore: 1,
          draftAwayScore: 1,
          draftStatus: "cancelled",
          saving: false,
        }))
      );
      setStandings(data.standings ?? []);

      push({
        tone: "success",
        message:
          gameIds.length === 1
            ? "Game cancelled — subscribers notified."
            : `${gameIds.length} games cancelled — subscribers notified.`,
        onUndo: () => {
          Promise.all(
            gameIds.map((id) => {
              const snap = previousSnapshots.get(id)!;
              return saveGame(id, snap);
            })
          )
            .then(() => push({ tone: "info", message: "Cancellation undone (scores restored)." }))
            .catch(() => push({ tone: "error", message: "Couldn't fully undo — check games manually." }));
        },
      });
    } catch (err) {
      gameIds.forEach((id) => updateGame(id, (g) => ({ ...g, saving: false })));
      push({ tone: "error", message: err instanceof Error ? err.message : "Failed to cancel games." });
    }
  }

  async function handleSyncStandings() {
    setSyncing(true);
    try {
      const res = await fetch("/api/admin/standings/sync", { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to sync standings.");
      }
      const data = await res.json();
      setStandings(data.standings ?? []);
      push({ tone: "success", message: "Standings synced from Final games." });
    } catch (err) {
      push({ tone: "error", message: err instanceof Error ? err.message : "Failed to sync standings." });
    } finally {
      setSyncing(false);
    }
  }

  const canPrev = findPrevDate(selectedDate, datesWithGames) !== null;
  const canNext = findNextDate(selectedDate, datesWithGames) !== null;
  const remainingGameIds = games
    .filter((g) => g.savedStatus === "scheduled" || g.savedStatus === "live")
    .map((g) => g._id);

  return (
    <div className="min-h-screen bg-[#111111] text-white">
      <div className="sticky top-0 z-50">
        <AdminHeader />

        <div className="border-b border-white/10 bg-[#111111]/95 backdrop-blur">
          <div className="mx-auto max-w-3xl px-4 py-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-green-500/15 px-3 py-1 text-xs font-bold uppercase tracking-wide text-green-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-green-400" aria-hidden="true" />
                  Live Admin
                </span>
                <h1 className="hidden text-sm font-heading uppercase tracking-wide text-white/60 sm:inline">
                  Score Entry
                </h1>
              </div>
              <button
                type="button"
                onClick={handleSyncStandings}
                disabled={syncing}
                className="flex items-center gap-2 rounded bg-brand px-3 py-2 text-xs font-semibold uppercase tracking-wide text-white transition-colors hover:bg-brand-700 disabled:opacity-50"
              >
                <RefreshCw size={14} className={clsx(syncing && "animate-spin")} aria-hidden="true" />
                Sync Standings
              </button>
            </div>

            <div className="mt-3">
              <DateNav
                date={selectedDate}
                onChange={setSelectedDate}
                onPrev={() => {
                  const d = findPrevDate(selectedDate, datesWithGames);
                  if (d) setSelectedDate(d);
                }}
                onNext={() => {
                  const d = findNextDate(selectedDate, datesWithGames);
                  if (d) setSelectedDate(d);
                }}
                canPrev={canPrev}
                canNext={canNext}
                isToday={selectedDate === todayISO}
              />
            </div>
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-3xl px-4 py-6 pb-24">
        {loadingInitial || loadingGames ? (
          <p className="py-12 text-center text-white/50">Loading…</p>
        ) : errorMessage ? (
          <p className="py-12 text-center text-brand-300">{errorMessage}</p>
        ) : games.length === 0 ? (
          <p className="py-12 text-center text-white/50">No games scheduled for this date.</p>
        ) : (
          <>
            <div className="mb-4 flex justify-end">
              <button
                type="button"
                onClick={() => openCancelConfirm(remainingGameIds)}
                disabled={remainingGameIds.length === 0}
                className="rounded border border-brand-700 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-brand-200 transition-colors hover:bg-brand-950 disabled:opacity-30"
              >
                Mark All Remaining as Cancelled
              </button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {games.map((game) => (
                <GameEntryCard
                  key={game._id}
                  game={game}
                  onScoreChange={(team, value) => handleScoreChange(game._id, team, value)}
                  onStatusChange={(status) => handleStatusChange(game._id, status)}
                  onSave={() => handleSave(game._id)}
                  onRequestCancel={() => openCancelConfirm([game._id])}
                />
              ))}
            </div>
          </>
        )}

        <div className="mt-8">
          <AdminStandingsPanel standings={standings} />
        </div>
      </main>

      <ConfirmDialog
        open={confirmState !== null}
        title={confirmState?.title ?? ""}
        description={confirmState?.description ?? ""}
        confirmLabel={confirmState?.confirmLabel}
        onConfirm={() => confirmState?.onConfirm()}
        onCancel={() => setConfirmState(null)}
      />

      <ToastStack toasts={toasts} onDismiss={dismiss} />
    </div>
  );
}

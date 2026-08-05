"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import clsx from "clsx";
import { RefreshCw, Wifi } from "lucide-react";
import type { AdminGame, Game, Standing } from "@/lib/types";
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

export default function AdminDashboard({ displayName }: { displayName: string }) {
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

  // Takes the season info + values to save directly from the caller instead
  // of re-deriving them from `games` state internally. An earlier version
  // read the "current" game via a `setGames(prev => { target = ...; return
  // prev; })` side-channel, relying on React's setState-eager-bailout
  // optimization to run that updater synchronously. That optimization is
  // only a best-effort fast path — it doesn't fire once another state
  // update is already pending in the same batch — so `target` could stay
  // undefined and throw "Game not found" for a game that was genuinely on
  // screen. Passing the values in directly removes the race entirely.
  const saveGame = useCallback(
    async (
      gameId: string,
      seasonInfo: { seasonId: string; seasonYear: number },
      values: { homeScore: number; awayScore: number; status: Game["status"] }
    ) => {
      updateGame(gameId, (g) => ({ ...g, saving: true }));

      try {
        const payload = {
          gameId,
          homeScore: values.homeScore,
          awayScore: values.awayScore,
          status: values.status,
          seasonId: seasonInfo.seasonId,
          seasonYear: seasonInfo.seasonYear,
        };
        console.log("[admin] saving game", payload);
        const res = await fetch("/api/admin/games/save", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
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
    const seasonInfo = { seasonId: game.seasonId, seasonYear: game.seasonYear };
    const previousSnapshot = {
      homeScore: game.savedHomeScore,
      awayScore: game.savedAwayScore,
      status: game.savedStatus,
    };
    try {
      await saveGame(gameId, seasonInfo, {
        homeScore: game.draftHomeScore,
        awayScore: game.draftAwayScore,
        status: game.draftStatus,
      });
      push({
        tone: "success",
        message: `Score saved: ${game.homeTeam.name} vs ${game.awayTeam.name}`,
        onUndo: () => {
          saveGame(gameId, seasonInfo, previousSnapshot)
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
        return [
          id,
          {
            seasonInfo: { seasonId: g.seasonId, seasonYear: g.seasonYear },
            values: { homeScore: g.savedHomeScore, awayScore: g.savedAwayScore, status: g.savedStatus },
          },
        ] as const;
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
              return saveGame(id, snap.seasonInfo, snap.values);
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

  async function handleLogout() {
    await fetch("/api/admin/logout", { method: "POST" });
    window.location.href = "/admin/login";
  }

  const canPrev = findPrevDate(selectedDate, datesWithGames) !== null;
  const canNext = findNextDate(selectedDate, datesWithGames) !== null;
  const remainingGameIds = games
    .filter((g) => g.savedStatus === "scheduled" || g.savedStatus === "live")
    .map((g) => g._id);

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="sticky top-0 z-50 border-b border-gray-800 bg-gray-950 px-4 py-3">
        <div className="mx-auto flex max-w-lg flex-wrap items-center justify-between gap-x-3 gap-y-2">
          <Link href="/" aria-label="Back to main site" className="shrink-0">
            <Image src="/mmspl-logo.png" alt="MMSPL" width={64} height={37} className="h-8 w-auto object-contain" />
          </Link>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSyncStandings}
              disabled={syncing}
              className="rounded-lg border border-green-800 px-2 py-1 text-xs font-bold text-green-400 transition-all hover:bg-green-900/40 disabled:opacity-50"
            >
              <RefreshCw size={12} className={clsx("mr-1 inline", syncing && "animate-spin")} aria-hidden="true" />
              <span className="hidden sm:inline">Sync Standings</span>
              <span className="sm:hidden">Sync</span>
            </button>
            <div className="flex items-center gap-1">
              <Wifi size={16} className="text-green-400" aria-hidden="true" />
              <span className="hidden text-xs font-semibold text-green-400 sm:inline">LIVE ADMIN</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden text-xs text-gray-400 sm:inline">{displayName}</span>
            <button type="button" onClick={handleLogout} className="text-xs text-gray-500 transition-colors hover:text-gray-300">
              Sign Out
            </button>
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-lg px-4 py-4 pb-24">
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
        {loadingInitial || loadingGames ? (
          <p className="py-16 text-center text-gray-500">Loading games…</p>
        ) : errorMessage ? (
          <p className="py-16 text-center text-red-400">{errorMessage}</p>
        ) : games.length === 0 ? (
          <div className="py-16 text-center">
            <p className="mb-2 text-lg text-gray-600">No games scheduled</p>
            <p className="text-sm text-gray-700">Use the arrows to navigate to a game day</p>
          </div>
        ) : (
          <>
            <p className="mb-4 text-center text-xs text-gray-500">
              {games.length} game{games.length === 1 ? "" : "s"} &mdash; tap +/&minus; to update scores, then Save
            </p>

            <div className="mb-4 flex justify-end">
              <button
                type="button"
                onClick={() => openCancelConfirm(remainingGameIds)}
                disabled={remainingGameIds.length === 0}
                className="rounded-lg border border-amber-900 px-2 py-1 text-xs font-bold text-amber-400 transition-all hover:bg-amber-900/40 disabled:opacity-30"
              >
                Mark All Remaining as Cancelled
              </button>
            </div>

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

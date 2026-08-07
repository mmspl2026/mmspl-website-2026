"use client";

import { useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import clsx from "clsx";
import type { TournamentGame, WildCardRanking } from "@/lib/types";
import { formatDayTabLabel } from "@/lib/tournamentDisplay";
import TournamentGameCard from "./TournamentGameCard";

const RANKINGS_TAB_ID = "__rankings__";

function WildCardRankingsTable({ rankings }: { rankings: WildCardRanking[] }) {
  const advancing = rankings.filter((r) => r.advanced);
  const eliminated = rankings.filter((r) => !r.advanced);

  const row = (r: WildCardRanking) => (
    <tr key={r._id} className={r.advanced ? "bg-white" : "bg-gray-50"}>
      <td className="px-4 py-2.5 font-mono-brand text-sm text-gray-500">{r.rank}</td>
      <td className="px-4 py-2.5 text-sm font-medium text-black">{r.teamName}</td>
      <td className="px-4 py-2.5 text-sm text-gray-500">{r.pool || "–"}</td>
      <td className="px-4 py-2.5 text-right font-mono-brand text-sm text-gray-700">{r.points ?? "–"}</td>
      <td className="px-4 py-2.5 text-right font-mono-brand text-sm text-gray-700">{r.wins ?? "–"}</td>
      <td className="px-4 py-2.5 text-right font-mono-brand text-sm text-gray-700">{r.losses ?? "–"}</td>
      <td className="px-4 py-2.5 text-right font-mono-brand text-sm text-gray-700">
        {typeof r.runDifferential === "number" ? (r.runDifferential > 0 ? `+${r.runDifferential}` : r.runDifferential) : "–"}
      </td>
      <td className="px-4 py-2.5 text-right">
        {r.advanced ? (
          <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-green-700">
            Advance
          </span>
        ) : (
          <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Eliminated</span>
        )}
      </td>
    </tr>
  );

  return (
    <div className="overflow-hidden rounded-xl border shadow-sm">
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-[#0d0d0e] text-white">
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.1em]">Rank</th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.1em]">Team</th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.1em]">Pool</th>
            <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-[0.1em]">Pts</th>
            <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-[0.1em]">W</th>
            <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-[0.1em]">L</th>
            <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-[0.1em]">Diff</th>
            <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-[0.1em]"></th>
          </tr>
        </thead>
        <tbody>
          {advancing.map(row)}
          {eliminated.length > 0 && (
            <tr>
              <td colSpan={8} className="border-y border-dashed border-brand/40 bg-brand/5 px-4 py-1.5 text-center text-[10px] font-bold uppercase tracking-wide text-brand">
                Eliminated
              </td>
            </tr>
          )}
          {eliminated.map(row)}
        </tbody>
      </table>
    </div>
  );
}

function gamesForDay(games: TournamentGame[], day: string) {
  return games.filter((g) => g.date === day).sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
}

function DayGamesList({ dayGames }: { dayGames: TournamentGame[] }) {
  const setupNote = dayGames.find((g) => g.setupNote)?.setupNote;
  const teardownNote = [...dayGames].reverse().find((g) => g.teardownNote)?.teardownNote;

  return (
    <div className="space-y-3">
      {setupNote && (
        <p className="rounded-md bg-gray-100 px-3 py-2 text-xs text-gray-500">
          <span className="font-semibold uppercase tracking-wide">Setup:</span> {setupNote}
        </p>
      )}
      {dayGames.map((game) => (
        <TournamentGameCard key={game._id} game={game} />
      ))}
      {teardownNote && (
        <p className="rounded-md bg-gray-100 px-3 py-2 text-xs text-gray-500">
          <span className="font-semibold uppercase tracking-wide">Teardown:</span> {teardownNote}
        </p>
      )}
    </div>
  );
}

/**
 * `interactive` controls whether games are browsed via clickable day tabs
 * (useful for the current, in-progress season — jump straight to today) or
 * laid out as one continuous read-through with day headers (past/completed
 * seasons, where there's nothing to "pick" — the whole thing already
 * happened and reads better top to bottom).
 */
export default function TournamentDayTabs({
  games,
  wcRankings,
  interactive,
}: {
  games: TournamentGame[];
  wcRankings: WildCardRanking[];
  interactive: boolean;
}) {
  const days = useMemo(() => Array.from(new Set(games.map((g) => g.date))).sort(), [games]);
  const [activeDay, setActiveDay] = useState<string>(days[0] ?? RANKINGS_TAB_ID);
  const scrollerRef = useRef<HTMLDivElement>(null);

  function scrollTabs(direction: -1 | 1) {
    scrollerRef.current?.scrollBy({ left: direction * 240, behavior: "smooth" });
  }

  const dayGames = useMemo(() => gamesForDay(games, activeDay), [games, activeDay]);

  if (!interactive) {
    return (
      <div className="space-y-10">
        {days.map((day) => (
          <div key={day}>
            <h3 className="mb-4 rounded-md bg-[#0d0d0e] px-4 py-2 font-heading text-sm uppercase tracking-[0.08em] text-white">
              {formatDayTabLabel(day)}
            </h3>
            <DayGamesList dayGames={gamesForDay(games, day)} />
          </div>
        ))}
        {wcRankings.length > 0 && (
          <div>
            <h3 className="mb-4 rounded-md bg-[#0d0d0e] px-4 py-2 font-heading text-sm uppercase tracking-[0.08em] text-white">
              Wild Card Rankings
            </h3>
            <WildCardRankingsTable rankings={wcRankings} />
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => scrollTabs(-1)}
          aria-label="Scroll days left"
          className="hidden shrink-0 items-center justify-center rounded-full border border-gray-300 bg-white p-2 text-black transition-colors hover:border-gray-400 hover:bg-gray-50 sm:flex"
        >
          <ChevronLeft size={18} aria-hidden="true" />
        </button>

        <div
          ref={scrollerRef}
          role="tablist"
          aria-label="Tournament days"
          className="no-scrollbar -mx-5 flex flex-1 gap-2 overflow-x-auto px-5 pb-1 sm:mx-0 sm:justify-center sm:px-0"
        >
          {days.map((day) => (
            <button
              key={day}
              type="button"
              role="tab"
              aria-selected={activeDay === day}
              onClick={() => setActiveDay(day)}
              className={clsx(
                "shrink-0 whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition-colors",
                activeDay === day ? "bg-brand text-white" : "border border-gray-300 bg-white text-black hover:border-gray-400"
              )}
            >
              {formatDayTabLabel(day)}
            </button>
          ))}
          {wcRankings.length > 0 && (
            <button
              type="button"
              role="tab"
              aria-selected={activeDay === RANKINGS_TAB_ID}
              onClick={() => setActiveDay(RANKINGS_TAB_ID)}
              className={clsx(
                "shrink-0 whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition-colors",
                activeDay === RANKINGS_TAB_ID ? "bg-brand text-white" : "border border-gray-300 bg-white text-black hover:border-gray-400"
              )}
            >
              Rankings
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={() => scrollTabs(1)}
          aria-label="Scroll days right"
          className="hidden shrink-0 items-center justify-center rounded-full border border-gray-300 bg-white p-2 text-black transition-colors hover:border-gray-400 hover:bg-gray-50 sm:flex"
        >
          <ChevronRight size={18} aria-hidden="true" />
        </button>
      </div>

      <div className="mt-6">
        {activeDay === RANKINGS_TAB_ID ? <WildCardRankingsTable rankings={wcRankings} /> : <DayGamesList dayGames={dayGames} />}
      </div>
    </div>
  );
}

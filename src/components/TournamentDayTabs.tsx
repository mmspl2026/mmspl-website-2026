"use client";

import { useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import clsx from "clsx";
import type { TournamentGame, WildCardRanking } from "@/lib/types";
import { formatDayTabLabel } from "@/lib/tournamentDisplay";
import TournamentGameCard from "./TournamentGameCard";

const RANKINGS_TAB_ID = "__rankings__";

export function WildCardRankingsTable({ rankings }: { rankings: WildCardRanking[] }) {
  const advancing = rankings.filter((r) => r.advanced);
  const eliminated = rankings.filter((r) => !r.advanced);

  const diffText = (r: WildCardRanking) =>
    typeof r.runDifferential === "number" ? (r.runDifferential > 0 ? `+${r.runDifferential}` : String(r.runDifferential)) : "–";

  const row = (r: WildCardRanking) => (
    <tr key={r._id} className={r.advanced ? "bg-white" : "bg-gray-50"}>
      <td className="px-4 py-2.5 font-mono-brand text-sm text-gray-500">{r.rank}</td>
      <td className="px-4 py-2.5 text-sm font-medium text-black">{r.teamName}</td>
      <td className="px-4 py-2.5 text-sm text-gray-500">{r.pool || "–"}</td>
      <td className="px-4 py-2.5 text-right font-mono-brand text-sm text-gray-700">{r.points ?? "–"}</td>
      <td className="px-4 py-2.5 text-right font-mono-brand text-sm text-gray-700">{r.wins ?? "–"}</td>
      <td className="px-4 py-2.5 text-right font-mono-brand text-sm text-gray-700">{r.losses ?? "–"}</td>
      <td className="px-4 py-2.5 text-right font-mono-brand text-sm text-gray-700">{r.ties ?? "–"}</td>
      <td className="px-4 py-2.5 text-right font-mono-brand text-sm text-gray-700">{diffText(r)}</td>
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

  // Real grid columns (not a concatenated string) so digits actually line
  // up row to row, with solid high-contrast text throughout — advance vs.
  // eliminated reads from row tint + an explicit ADV/OUT tag, not from
  // fading the text, which was unreadable in bright outdoor light.
  const GRID_COLS = "grid-cols-[22px_minmax(0,1fr)_20px_26px_50px_32px_34px]";

  const compactRow = (r: WildCardRanking) => (
    <div
      key={r._id}
      className={clsx(
        "grid items-center gap-x-1.5 px-2.5 py-2",
        GRID_COLS,
        r.advanced ? "bg-white" : "bg-red-50"
      )}
    >
      <span className="text-center font-mono-brand text-sm font-bold text-black">{r.rank}</span>
      <span className="min-w-0 truncate text-sm font-semibold text-black">{r.teamName}</span>
      <span className="text-center text-xs font-semibold text-gray-600">{r.pool || "–"}</span>
      <span className="text-right font-mono-brand text-xs font-semibold tabular-nums text-gray-800">{r.points ?? "–"}</span>
      <span className="text-right font-mono-brand text-xs font-semibold tabular-nums text-gray-800">
        {r.wins ?? "–"}-{r.losses ?? "–"}-{r.ties ?? 0}
      </span>
      <span className="text-right font-mono-brand text-xs font-semibold tabular-nums text-gray-800">{diffText(r)}</span>
      <span
        className={clsx(
          "rounded px-1 py-0.5 text-center text-[9px] font-bold uppercase tracking-wide",
          r.advanced ? "bg-green-600 text-white" : "bg-red-600 text-white"
        )}
      >
        {r.advanced ? "Adv" : "Out"}
      </span>
    </div>
  );

  const eliminatedDivider = (
    <div className="border-y border-dashed border-brand/40 bg-brand/5 px-3 py-1.5 text-center text-[10px] font-bold uppercase tracking-wide text-brand">
      Eliminated
    </div>
  );

  return (
    <div className="overflow-hidden rounded-xl border shadow-sm">
      <div className="md:hidden">
        <div className={clsx("grid items-center gap-x-1.5 bg-[#0d0d0e] px-2.5 py-2 text-white", GRID_COLS)}>
          <span className="text-center text-[9px] font-semibold uppercase tracking-wide">#</span>
          <span className="text-[9px] font-semibold uppercase tracking-wide">Team</span>
          <span className="text-center text-[9px] font-semibold uppercase tracking-wide">Pl</span>
          <span className="text-right text-[9px] font-semibold uppercase tracking-wide">Pts</span>
          <span className="text-right text-[9px] font-semibold uppercase tracking-wide">W-L-T</span>
          <span className="text-right text-[9px] font-semibold uppercase tracking-wide">Diff</span>
          <span></span>
        </div>
        <div className="divide-y">
          {advancing.map(compactRow)}
          {eliminated.length > 0 && eliminatedDivider}
          {eliminated.map(compactRow)}
        </div>
      </div>

      <table className="hidden w-full border-collapse md:table">
        <thead>
          <tr className="bg-[#0d0d0e] text-white">
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.1em]">Rank</th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.1em]">Team</th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.1em]">Pool</th>
            <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-[0.1em]">Pts</th>
            <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-[0.1em]">W</th>
            <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-[0.1em]">L</th>
            <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-[0.1em]">T</th>
            <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-[0.1em]">Diff</th>
            <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-[0.1em]"></th>
          </tr>
        </thead>
        <tbody>
          {advancing.map(row)}
          {eliminated.length > 0 && (
            <tr>
              <td colSpan={9} className="border-y border-dashed border-brand/40 bg-brand/5 px-4 py-1.5 text-center text-[10px] font-bold uppercase tracking-wide text-brand">
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

function DayGamesList({ dayGames, selectedTeam }: { dayGames: TournamentGame[]; selectedTeam: string | null }) {
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
        <TournamentGameCard key={game._id} game={game} selectedTeam={selectedTeam} />
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
  selectedTeam = null,
  rankingsPlaceholder,
}: {
  games: TournamentGame[];
  wcRankings: WildCardRanking[];
  interactive: boolean;
  /** Owned by the parent bracket view and shared with the pool/box seeding
   * above it — clicking a team there highlights all of their games here,
   * regardless of which day tab is active. */
  selectedTeam?: string | null;
  /** Shown in the Rankings tab in place of the real table when there are no
   * wcRankings yet (e.g. the projected schedule, before any round-robin
   * games have been played) — keeps the tab present instead of hiding it. */
  rankingsPlaceholder?: React.ReactNode;
}) {
  const days = useMemo(() => Array.from(new Set(games.map((g) => g.date))).sort(), [games]);
  const [activeDay, setActiveDay] = useState<string>(days[0] ?? RANKINGS_TAB_ID);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const showRankingsTab = wcRankings.length > 0 || Boolean(rankingsPlaceholder);
  const rankingsContent = wcRankings.length > 0 ? <WildCardRankingsTable rankings={wcRankings} /> : rankingsPlaceholder;

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
            <DayGamesList dayGames={gamesForDay(games, day)} selectedTeam={selectedTeam} />
          </div>
        ))}
        {showRankingsTab && (
          <div>
            <h3 className="mb-4 rounded-md bg-[#0d0d0e] px-4 py-2 font-heading text-sm uppercase tracking-[0.08em] text-white">
              Wild Card Rankings
            </h3>
            {rankingsContent}
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
          {showRankingsTab && (
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
              WC Rank
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
        {activeDay === RANKINGS_TAB_ID ? rankingsContent : <DayGamesList dayGames={dayGames} selectedTeam={selectedTeam} />}
      </div>
    </div>
  );
}

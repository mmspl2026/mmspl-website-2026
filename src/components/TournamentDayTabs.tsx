"use client";

import { useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Info, Wrench, Boxes } from "lucide-react";
import clsx from "clsx";
import type { TournamentGame, WildCardRanking } from "@/lib/types";
import { formatDayTabLabel } from "@/lib/tournamentDisplay";
import TournamentGameCard from "./TournamentGameCard";

const RANKINGS_TAB_ID = "__rankings__";

export interface DivisionWinnerEntry {
  pool: string;
  teamName: string;
}

export function WildCardRankingsTable({
  rankings,
  divisionWinners,
  teamShortNames,
}: {
  rankings: WildCardRanking[];
  /** The 4 box winners — shown as their own distinct list above the 1-10
   * ranking, since they already have their bye and were never part of that
   * ranking to begin with. */
  divisionWinners?: DivisionWinnerEntry[];
  /** Team name -> curated short name, used only on mobile where the full
   * name doesn't fit a 2-up grid (e.g. "The Condo Kings Army" -> "TCK"). */
  teamShortNames?: Record<string, string>;
}) {
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

  const divisionWinnersBlock = divisionWinners && divisionWinners.length > 0 && (
    <div className="mb-4 overflow-hidden rounded-xl border shadow-sm">
      <div className="bg-brand px-4 py-2 text-center">
        <p className="font-heading text-sm uppercase tracking-[0.08em] text-white">Division Winners</p>
      </div>
      {/* 2-up on mobile (short name — "The Condo Kings Army" -> "TCK" —
          so it fits cleanly without truncating), 4-up with full names once
          there's room. */}
      <div className="grid grid-cols-2 divide-x divide-y bg-white sm:grid-cols-4 sm:divide-y-0">
        {divisionWinners.map((dw) => (
          <div key={dw.pool} className="px-3 py-2.5 text-center">
            <p className="font-mono-brand text-[10px] text-gray-400">Pool {dw.pool}</p>
            <p className="truncate text-sm font-bold text-black">
              <span className="sm:hidden">{teamShortNames?.[dw.teamName] || dw.teamName}</span>
              <span className="hidden sm:inline">{dw.teamName}</span>
            </p>
          </div>
        ))}
      </div>
      <div className="flex items-start gap-1.5 border-t bg-gray-50 px-3 py-2 text-xs text-gray-500">
        <Info size={13} className="mt-0.5 shrink-0" aria-hidden="true" />
        <p>
          Advance directly to the Quarter Finals — which QF slot each one lands in is set by a draw at the end of
          Phase 1, independent of who they&apos;ll actually face.
        </p>
      </div>
    </div>
  );

  return (
    <div>
      {divisionWinnersBlock}
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
    </div>
  );
}

function gamesForDay(games: TournamentGame[], day: string) {
  return games.filter((g) => g.date === day).sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
}

const FIELD_ABBREV: Record<string, string> = {
  "Centennial North": "CN",
  "Centennial South": "CS",
  Mintleaf: "ML",
};
function fieldAbbrev(field: string): string {
  return FIELD_ABBREV[field] ?? field.slice(0, 2).toUpperCase();
}

// Setup/teardown crews are assigned per park (each field's own first and
// last game of the day) — so with more than one diamond in play, a single
// day-level note would only ever surface one park's crew and silently drop
// the rest. Instead, collect one setup note per field (from that field's
// first game with one set) and one teardown note per field (from that
// field's last game with one set), so both diamonds show up in the same
// top/bottom banner style as before.
function DayGamesList({ dayGames, selectedTeam }: { dayGames: TournamentGame[]; selectedTeam: string | null }) {
  const fields = [...new Set(dayGames.map((g) => g.field).filter((f): f is string => Boolean(f)))];
  const setupNotes = fields
    .map((field) => dayGames.find((g) => g.field === field && g.setupNote))
    .filter((g): g is TournamentGame => Boolean(g));
  const teardownNotes = fields
    .map((field) => [...dayGames].reverse().find((g) => g.field === field && g.teardownNote))
    .filter((g): g is TournamentGame => Boolean(g));

  return (
    <div className="space-y-3">
      {setupNotes.length > 0 && (
        <div className="flex items-start gap-2 rounded-lg border border-brand/25 bg-brand-50 px-3.5 py-2.5">
          <Wrench size={15} className="mt-0.5 shrink-0 text-brand" aria-hidden="true" />
          <div className="space-y-0.5">
            {setupNotes.map((g) => (
              <p key={g._id} className="text-xs leading-snug">
                <span className="font-bold text-brand">SETUP ({fieldAbbrev(g.field as string)}):</span>{" "}
                <span className="font-bold text-black">{g.setupNote}</span>
              </p>
            ))}
          </div>
        </div>
      )}
      {dayGames.map((game) => (
        <TournamentGameCard key={game._id} game={game} selectedTeam={selectedTeam} />
      ))}
      {teardownNotes.length > 0 && (
        <div className="flex items-start gap-2 rounded-lg border border-brand/25 bg-brand-50 px-3.5 py-2.5">
          <Boxes size={15} className="mt-0.5 shrink-0 text-brand" aria-hidden="true" />
          <div className="space-y-0.5">
            {teardownNotes.map((g) => (
              <p key={g._id} className="text-xs leading-snug">
                <span className="font-bold text-brand">TEARDOWN ({fieldAbbrev(g.field as string)}):</span>{" "}
                <span className="font-bold text-black">{g.teardownNote}</span>
              </p>
            ))}
          </div>
        </div>
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
  divisionWinners,
  interactive,
  selectedTeam = null,
  rankingsPlaceholder,
  today,
  teamShortNames,
}: {
  games: TournamentGame[];
  wcRankings: WildCardRanking[];
  /** The 4 box winners, shown above the Wild Card 1-10 list on the same
   * Div & WC Rank tab — omit while they're not known yet. */
  divisionWinners?: DivisionWinnerEntry[];
  interactive: boolean;
  /** Owned by the parent bracket view and shared with the pool/box seeding
   * above it — clicking a team there highlights all of their games here,
   * regardless of which day tab is active. */
  selectedTeam?: string | null;
  /** Shown in the Rankings tab in place of the real table when there are no
   * wcRankings yet (e.g. the projected schedule, before any round-robin
   * games have been played) — keeps the tab present instead of hiding it. */
  rankingsPlaceholder?: React.ReactNode;
  /** Today's date (Eastern, "YYYY-MM-DD") — the default active tab is
   * whichever tournament day is current: the first day before it starts,
   * that day while it's on, and the last day once it's over (clamped, never
   * blank). Omit to just default to the first day. */
  today?: string;
  /** Team name -> curated short name, passed through to the Division
   * Winners grid for its mobile-only abbreviated labels. */
  teamShortNames?: Record<string, string>;
}) {
  const days = useMemo(() => Array.from(new Set(games.map((g) => g.date))).sort(), [games]);
  const [activeDay, setActiveDay] = useState<string>(() => {
    if (days.length === 0) return RANKINGS_TAB_ID;
    if (!today) return days[0];
    const upToToday = days.filter((d) => d <= today);
    return upToToday.length > 0 ? upToToday[upToToday.length - 1] : days[0];
  });
  const scrollerRef = useRef<HTMLDivElement>(null);
  const showRankingsTab = wcRankings.length > 0 || Boolean(rankingsPlaceholder);
  const rankingsContent =
    wcRankings.length > 0 ? (
      <WildCardRankingsTable rankings={wcRankings} divisionWinners={divisionWinners} teamShortNames={teamShortNames} />
    ) : (
      rankingsPlaceholder
    );

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
              Division &amp; Wild Card Rankings
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
              Div &amp; WC Rank
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

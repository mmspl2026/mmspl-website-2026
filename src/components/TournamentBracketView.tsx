"use client";

import { useState } from "react";
import { MousePointerClick, LayoutGrid, CalendarDays, ListOrdered } from "lucide-react";
import type { TournamentGame, TournamentPool, WildCardRanking } from "@/lib/types";
import type { ProjectedBox } from "@/lib/tournamentSeeding";
import TournamentPoolSeeding from "./TournamentPoolSeeding";
import ProjectedSeeding from "./ProjectedSeeding";
import TournamentDayTabs from "./TournamentDayTabs";

/**
 * Owns the single "which team is selected" state shared between the pool/box
 * seeding at the top of the page and the game schedule below it — clicking a
 * team in the boxes highlights every one of their games, same as the old
 * site's click-to-highlight. Exactly one of `pools` / `projectedBoxes` is
 * passed by the caller depending on whether real tournament data exists yet.
 */
export default function TournamentBracketView({
  pools,
  projectedBoxes,
  includesProjectedSchedule = false,
  trophyPhotoUrl,
  trophyAlt,
  games,
  wcRankings,
  interactive,
  rankingsPlaceholder,
  today,
  teamShortNames,
  showFunLinks = false,
}: {
  pools?: TournamentPool[];
  projectedBoxes?: ProjectedBox[] | null;
  includesProjectedSchedule?: boolean;
  trophyPhotoUrl?: string;
  trophyAlt?: string;
  games: TournamentGame[];
  wcRankings: WildCardRanking[];
  interactive: boolean;
  rankingsPlaceholder?: React.ReactNode;
  /** Today's date (Eastern) — picks which day tab is active by default. */
  today?: string;
  /** Team name -> curated short name (e.g. "The Condo Kings Army" -> "TCK"),
   * used for the mobile Division Winners grid where full names don't fit. */
  teamShortNames?: Record<string, string>;
  /** Simulate/Claude's Prediction links — the caller passes this explicitly
   * per year/type (only true for 2026 mcgregor today), not derived from
   * "current season," so it doesn't reappear on a future year once that
   * becomes current, and doesn't show on already-concluded past years. */
  showFunLinks?: boolean;
}) {
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);
  const [rankingsJumpSignal, setRankingsJumpSignal] = useState(0);
  const [scheduleJumpSignal, setScheduleJumpSignal] = useState(0);

  function handleTeamClick(name: string) {
    setSelectedTeam((current) => (current === name ? null : name));
  }

  // Derived straight from the real pools rather than threaded as a
  // separate prop — pools already carries `winner` once Wild Card
  // rankings have been saved.
  const divisionWinners = pools
    ?.filter((p) => p.winner)
    .map((p) => ({ pool: p.poolLetter, teamName: p.winner as string }));

  const showRankings = wcRankings.length > 0 || Boolean(rankingsPlaceholder);
  const jumpLinkClass =
    "flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-gray-300 bg-white px-3.5 py-1.5 text-xs font-semibold text-black transition-colors hover:border-brand hover:text-brand";

  return (
    <>
      {(pools || projectedBoxes) && games.length > 0 && (
        <nav aria-label="Jump to section" className="flex flex-wrap justify-center gap-2">
          <a href="#tournament-boxes" className={jumpLinkClass}>
            <LayoutGrid size={13} className="shrink-0" aria-hidden="true" />
            Boxes
          </a>
          <a
            href="#tournament-schedule"
            className={jumpLinkClass}
            onClick={() => setScheduleJumpSignal((n) => n + 1)}
          >
            <CalendarDays size={13} className="shrink-0" aria-hidden="true" />
            Schedule
          </a>
          {showRankings && (
            <a
              href="#tournament-schedule"
              className={jumpLinkClass}
              onClick={() => setRankingsJumpSignal((n) => n + 1)}
            >
              <ListOrdered size={13} className="shrink-0" aria-hidden="true" />
              Rankings
            </a>
          )}
        </nav>
      )}
      {pools && (
        <div id="tournament-boxes" className="scroll-mt-[76px]">
          <TournamentPoolSeeding
            pools={pools}
            selectedTeam={selectedTeam}
            onTeamClick={handleTeamClick}
            trophyPhotoUrl={trophyPhotoUrl}
            trophyAlt={trophyAlt}
            showFunLinks={showFunLinks}
          />
        </div>
      )}
      {projectedBoxes && (
        <div id="tournament-boxes" className="scroll-mt-[76px]">
          <ProjectedSeeding
            boxes={projectedBoxes}
            includesSchedule={includesProjectedSchedule}
            selectedTeam={selectedTeam}
            onTeamClick={handleTeamClick}
            trophyPhotoUrl={trophyPhotoUrl}
            trophyAlt={trophyAlt}
            showFunLinks={showFunLinks}
          />
        </div>
      )}
      {games.length > 0 && (
        <div id="tournament-schedule" className="scroll-mt-[76px]">
          <p className="mb-3 flex items-center justify-center gap-1.5 text-center text-xs text-gray-400">
            <MousePointerClick size={12} className="shrink-0" aria-hidden="true" />
            Tap a team above to highlight their games below
          </p>
          <TournamentDayTabs
            games={games}
            wcRankings={wcRankings}
            divisionWinners={divisionWinners}
            interactive={interactive}
            selectedTeam={selectedTeam}
            rankingsPlaceholder={rankingsPlaceholder}
            today={today}
            teamShortNames={teamShortNames}
            jumpToRankingsSignal={rankingsJumpSignal}
            jumpToScheduleSignal={scheduleJumpSignal}
          />
        </div>
      )}
    </>
  );
}

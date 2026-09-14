"use client";

import { useState } from "react";
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
}) {
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);

  function handleTeamClick(name: string) {
    setSelectedTeam((current) => (current === name ? null : name));
  }

  // Derived straight from the real pools rather than threaded as a
  // separate prop — pools already carries `winner` once Wild Card
  // rankings have been saved.
  const divisionWinners = pools
    ?.filter((p) => p.winner)
    .map((p) => ({ pool: p.poolLetter, teamName: p.winner as string }));

  return (
    <>
      {pools && (
        <TournamentPoolSeeding
          pools={pools}
          selectedTeam={selectedTeam}
          onTeamClick={handleTeamClick}
          trophyPhotoUrl={trophyPhotoUrl}
          trophyAlt={trophyAlt}
        />
      )}
      {projectedBoxes && (
        <ProjectedSeeding
          boxes={projectedBoxes}
          includesSchedule={includesProjectedSchedule}
          selectedTeam={selectedTeam}
          onTeamClick={handleTeamClick}
          trophyPhotoUrl={trophyPhotoUrl}
          trophyAlt={trophyAlt}
        />
      )}
      {games.length > 0 && (
        <TournamentDayTabs
          games={games}
          wcRankings={wcRankings}
          divisionWinners={divisionWinners}
          interactive={interactive}
          selectedTeam={selectedTeam}
          rankingsPlaceholder={rankingsPlaceholder}
          today={today}
          teamShortNames={teamShortNames}
        />
      )}
    </>
  );
}

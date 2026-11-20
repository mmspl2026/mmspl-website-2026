import type { Metadata } from "next";
import { requireTeamSession } from "@/lib/team-auth";
import { writeClient } from "@/lib/sanity/client";
import { teamCaptainByIdQuery, rosterByTeamQuery, teamUpcomingGamesQuery, beerAssignmentsByTeamQuery } from "@/lib/sanity/queries";
import { getTodayEastern } from "@/utils/timezone";
import type { TeamCaptain, RosterPlayer, Game, BeerAssignment } from "@/lib/types";
import TeamShell from "@/components/team/TeamShell";
import BeerListManager from "@/components/team/BeerListManager";
import { TEAM_APP_METADATA } from "@/lib/appMetadata";

export const metadata: Metadata = { ...TEAM_APP_METADATA, title: "Beer List" };

export default async function TeamBeerListPage() {
  const session = await requireTeamSession("/team/beer-list");
  const [captain, roster, games, assignments] = await Promise.all([
    writeClient.fetch<TeamCaptain | null>(teamCaptainByIdQuery, { id: session.captainId }),
    writeClient.fetch<RosterPlayer[]>(rosterByTeamQuery, { teamId: session.teamId }),
    writeClient.fetch<Game[]>(teamUpcomingGamesQuery, { teamId: session.teamId, today: getTodayEastern() }),
    writeClient.fetch<BeerAssignment[]>(beerAssignmentsByTeamQuery, { teamId: session.teamId }),
  ]);

  return (
    <TeamShell active="/team/beer-list" teamName={captain?.team.name || "Your Team"}>
      <BeerListManager initialRoster={roster} initialGames={games} initialAssignments={assignments} />
    </TeamShell>
  );
}

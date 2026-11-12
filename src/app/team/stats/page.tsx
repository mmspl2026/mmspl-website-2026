import type { Metadata } from "next";
import { requireTeamSession } from "@/lib/team-auth";
import { writeClient } from "@/lib/sanity/client";
import { teamCaptainByIdQuery, rosterByTeamQuery, teamGamesQuery } from "@/lib/sanity/queries";
import type { TeamCaptain, RosterPlayer, Game } from "@/lib/types";
import TeamShell from "@/components/team/TeamShell";
import StatsManager from "@/components/team/StatsManager";

export const metadata: Metadata = { title: "Stats" };

export default async function TeamStatsPage() {
  const session = await requireTeamSession("/team/stats");
  const [captain, roster, games] = await Promise.all([
    writeClient.fetch<TeamCaptain | null>(teamCaptainByIdQuery, { id: session.captainId }),
    writeClient.fetch<RosterPlayer[]>(rosterByTeamQuery, { teamId: session.teamId }),
    writeClient.fetch<Game[]>(teamGamesQuery, { teamId: session.teamId }),
  ]);

  return (
    <TeamShell active="/team/stats" teamName={captain?.team.name || "Your Team"}>
      <StatsManager initialRoster={roster} initialGames={games} />
    </TeamShell>
  );
}

import type { Metadata } from "next";
import { requireTeamSession } from "@/lib/team-auth";
import { writeClient } from "@/lib/sanity/client";
import { teamCaptainByIdQuery, rosterByTeamQuery } from "@/lib/sanity/queries";
import type { TeamCaptain, RosterPlayer } from "@/lib/types";
import TeamShell from "@/components/team/TeamShell";
import RosterManager from "@/components/team/RosterManager";

export const metadata: Metadata = { title: "Roster" };

export default async function TeamRosterPage() {
  const session = await requireTeamSession("/team/roster");
  const [captain, roster] = await Promise.all([
    writeClient.fetch<TeamCaptain | null>(teamCaptainByIdQuery, { id: session.captainId }),
    writeClient.fetch<RosterPlayer[]>(rosterByTeamQuery, { teamId: session.teamId }),
  ]);

  return (
    <TeamShell active="/team/roster" teamName={captain?.team.name || "Your Team"}>
      <RosterManager initialRoster={roster} />
    </TeamShell>
  );
}

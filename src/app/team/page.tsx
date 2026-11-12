import type { Metadata } from "next";
import { requireTeamSession } from "@/lib/team-auth";
import { writeClient } from "@/lib/sanity/client";
import { teamCaptainByIdQuery } from "@/lib/sanity/queries";
import type { TeamCaptain } from "@/lib/types";
import TeamShell from "@/components/team/TeamShell";
import DashboardClient from "@/components/team/DashboardClient";

export const metadata: Metadata = { title: "Team Dashboard" };

export default async function TeamDashboardPage() {
  const session = await requireTeamSession("/team");
  const captain = await writeClient.fetch<TeamCaptain | null>(teamCaptainByIdQuery, { id: session.captainId });

  return (
    <TeamShell active="/team" teamName={captain?.team.name || "Your Team"}>
      <DashboardClient
        captainName={captain?.name || "Captain"}
        teamName={captain?.team.name || "Your Team"}
        initialShareToken={captain?.shareToken}
      />
    </TeamShell>
  );
}

import type { Metadata } from "next";
import { requireTeamSession } from "@/lib/team-auth";
import TeamChangePasswordForm from "@/components/team/TeamChangePasswordForm";
import { TEAM_APP_METADATA } from "@/lib/appMetadata";

export const metadata: Metadata = { ...TEAM_APP_METADATA, title: "Change Password" };

export default async function TeamChangePasswordPage() {
  await requireTeamSession("/team/change-password");

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-16">
      <TeamChangePasswordForm />
    </div>
  );
}

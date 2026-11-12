import type { Metadata } from "next";
import { requireTeamSession } from "@/lib/team-auth";
import TeamChangePasswordForm from "@/components/team/TeamChangePasswordForm";

export const metadata: Metadata = { title: "Change Password" };

export default async function TeamChangePasswordPage() {
  await requireTeamSession("/team/change-password");

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#111111] px-4 py-16">
      <TeamChangePasswordForm />
    </div>
  );
}

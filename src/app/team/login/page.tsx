import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { TEAM_SESSION_COOKIE, verifyTeamSession } from "@/lib/team-auth";
import TeamLoginForm from "@/components/team/TeamLoginForm";
import { TEAM_APP_METADATA } from "@/lib/appMetadata";

export const metadata: Metadata = { ...TEAM_APP_METADATA, title: "Team Login" };

function safeNext(next: string | undefined): string {
  if (next && next.startsWith("/team/") && next !== "/team/login") return next;
  return "/team";
}

export default async function TeamLoginPage({ searchParams }: { searchParams: { next?: string } }) {
  const token = cookies().get(TEAM_SESSION_COOKIE)?.value;
  const next = safeNext(searchParams.next);
  const session = await verifyTeamSession(token);
  if (session) redirect(session.mustChangePassword ? "/team/change-password" : next);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-16">
      <TeamLoginForm next={next} />
    </div>
  );
}

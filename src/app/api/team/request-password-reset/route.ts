import { NextRequest, NextResponse } from "next/server";
import { writeClient } from "@/lib/sanity/client";
import { isSanityConfigured } from "@/lib/sanity/env";
import { sendTeamPasswordResetRequest } from "@/lib/resend";

/**
 * Public, unauthenticated by design — a captain who's locked out has no
 * session to prove who they are with. Always responds generically so this
 * can't be used to enumerate valid usernames; it only ever notifies the
 * admin, who verifies and resets via the Team Captains tab. Never resets
 * anything itself.
 */
export async function POST(req: NextRequest) {
  if (isSanityConfigured) {
    const body = await req.json().catch(() => null);
    const username = typeof body?.username === "string" ? body.username.trim().toLowerCase() : "";
    if (username) {
      const captain = await writeClient.fetch<{ name: string; active: boolean; team: { name: string } } | null>(
        `*[_type == "teamCaptain" && username == $username][0]{name, active, "team": team->{name}}`,
        { username }
      );
      if (captain?.active) {
        await sendTeamPasswordResetRequest(captain.name, captain.team.name, username).catch(() => {});
      }
    }
  }

  return NextResponse.json({ ok: true });
}

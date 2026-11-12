import { NextRequest, NextResponse } from "next/server";
import { requireTeamApiAuth, generateShareToken } from "@/lib/team-auth";
import { writeClient } from "@/lib/sanity/client";
import { teamCaptainByIdQuery, rosterByTeamQuery } from "@/lib/sanity/queries";
import { sendTeamShareLinkEmail } from "@/lib/resend";
import { sendPushToPlayers } from "@/lib/push";
import { SITE_URL } from "@/lib/emailTemplate";
import type { TeamCaptain, RosterPlayer } from "@/lib/types";

/**
 * The captain's dashboard "Share with Team" action — broadcasts the
 * read-only team page link by email and/or push to every roster player.
 * Generates a share token first if the captain hasn't created one yet.
 */
export async function POST(req: NextRequest) {
  const auth = await requireTeamApiAuth(req);
  if ("response" in auth) return auth.response;

  const body = await req.json().catch(() => null);
  const channels: string[] = Array.isArray(body?.channels) ? body.channels : ["email"];
  const sendEmail = channels.includes("email");
  const sendPush = channels.includes("push");
  if (!sendEmail && !sendPush) {
    return NextResponse.json({ error: "No channel selected." }, { status: 400 });
  }

  const captain = await writeClient.fetch<TeamCaptain | null>(teamCaptainByIdQuery, { id: auth.session.captainId });
  if (!captain) {
    return NextResponse.json({ error: "Captain account not found." }, { status: 404 });
  }

  let token = captain.shareToken;
  if (!token) {
    token = generateShareToken();
    await writeClient.patch(captain._id).set({ shareToken: token }).commit();
  }
  const shareUrl = `${SITE_URL}/team/view/${token}`;

  const roster = await writeClient.fetch<RosterPlayer[]>(rosterByTeamQuery, { teamId: auth.session.teamId });

  const results: { email?: Awaited<ReturnType<typeof sendTeamShareLinkEmail>>; push?: Awaited<ReturnType<typeof sendPushToPlayers>> } = {};

  if (sendEmail) {
    const emails = roster.map((p) => p.email).filter((e): e is string => Boolean(e));
    results.email = await sendTeamShareLinkEmail(emails, captain.team.name, shareUrl);
  }

  if (sendPush) {
    const playerIds = roster.map((p) => p._id);
    results.push = await sendPushToPlayers(playerIds, {
      title: `${captain.team.name} Roster & Stats`,
      body: "Your captain shared the team's roster, stats, and beer list.",
      url: `/team/view/${token}`,
    });
  }

  return NextResponse.json({ ok: true, shareUrl, results });
}

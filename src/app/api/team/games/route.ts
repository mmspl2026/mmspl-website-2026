import { NextRequest, NextResponse } from "next/server";
import { requireTeamApiAuth } from "@/lib/team-auth";
import { writeClient } from "@/lib/sanity/client";
import { teamGamesQuery, teamUpcomingGamesQuery } from "@/lib/sanity/queries";
import { getTodayEastern } from "@/utils/timezone";
import type { Game } from "@/lib/types";

export async function GET(req: NextRequest) {
  const auth = await requireTeamApiAuth(req);
  if ("response" in auth) return auth.response;

  if (req.nextUrl.searchParams.get("status") === "upcoming") {
    const games = await writeClient.fetch<Game[]>(teamUpcomingGamesQuery, {
      teamId: auth.session.teamId,
      today: getTodayEastern(),
    });
    return NextResponse.json({ games });
  }

  const games = await writeClient.fetch<Game[]>(teamGamesQuery, { teamId: auth.session.teamId });
  return NextResponse.json({ games });
}

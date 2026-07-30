import { NextRequest, NextResponse } from "next/server";
import { requireAdminApiAuth } from "@/lib/admin-auth";
import { writeClient } from "@/lib/sanity/client";
import { gameByIdQuery, standingsBySeasonQuery } from "@/lib/sanity/queries";
import { recalculateStandings } from "@/lib/standings";
import type { AdminGame, Standing } from "@/lib/types";

const VALID_STATUSES = ["scheduled", "live", "final", "forfeit", "cancelled", "postponed"];

export async function POST(req: NextRequest) {
  const unauthorized = requireAdminApiAuth(req);
  if (unauthorized) return unauthorized;

  const body = await req.json().catch(() => null);
  const gameId = typeof body?.gameId === "string" ? body.gameId : "";
  const homeScore = Number(body?.homeScore);
  const awayScore = Number(body?.awayScore);
  const status = typeof body?.status === "string" ? body.status : "";
  const seasonId = typeof body?.seasonId === "string" ? body.seasonId : "";
  const seasonYear = Number(body?.seasonYear);

  if (!gameId || !seasonId || !Number.isFinite(seasonYear)) {
    return NextResponse.json({ error: "Missing gameId or season info." }, { status: 400 });
  }
  if (!VALID_STATUSES.includes(status)) {
    return NextResponse.json({ error: "Invalid status." }, { status: 400 });
  }
  if (!Number.isFinite(homeScore) || !Number.isFinite(awayScore) || homeScore < 0 || awayScore < 0) {
    return NextResponse.json({ error: "Scores must be non-negative numbers." }, { status: 400 });
  }

  await writeClient
    .patch(gameId)
    .set({ homeScore, awayScore, status })
    .commit();

  await recalculateStandings(seasonId);

  const [game, standings] = await Promise.all([
    writeClient.fetch<AdminGame>(gameByIdQuery, { id: gameId }),
    writeClient.fetch<Standing[]>(standingsBySeasonQuery, { year: seasonYear }),
  ]);

  return NextResponse.json({ game, standings });
}

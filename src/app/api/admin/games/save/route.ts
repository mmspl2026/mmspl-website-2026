import { NextRequest, NextResponse } from "next/server";
import { requireAdminApiAuth } from "@/lib/admin-auth";
import { writeClient } from "@/lib/sanity/client";
import { gameByIdQuery, standingsBySeasonQuery } from "@/lib/sanity/queries";
import { recalculateStandings } from "@/lib/standings";
import type { AdminGame, Standing } from "@/lib/types";

const VALID_STATUSES = ["scheduled", "live", "final", "forfeit", "cancelled", "postponed"];

export async function POST(req: NextRequest) {
  const auth = await requireAdminApiAuth(req);
  if ("response" in auth) return auth.response;

  const body = await req.json().catch(() => null);
  const gameId = typeof body?.gameId === "string" ? body.gameId : "";
  const homeScore = Number(body?.homeScore);
  const awayScore = Number(body?.awayScore);
  const status = typeof body?.status === "string" ? body.status : "";
  const seasonId = typeof body?.seasonId === "string" ? body.seasonId : "";
  const seasonYear = Number(body?.seasonYear);
  const forfeitingTeam = body?.forfeitingTeam === "home" || body?.forfeitingTeam === "away" ? body.forfeitingTeam : null;

  if (!gameId || !seasonId || !Number.isFinite(seasonYear)) {
    return NextResponse.json({ error: "Missing gameId or season info." }, { status: 400 });
  }
  if (!VALID_STATUSES.includes(status)) {
    return NextResponse.json({ error: "Invalid status." }, { status: 400 });
  }
  if (!Number.isFinite(homeScore) || !Number.isFinite(awayScore) || homeScore < 0 || awayScore < 0) {
    return NextResponse.json({ error: "Scores must be non-negative numbers." }, { status: 400 });
  }
  if (status === "forfeit" && !forfeitingTeam) {
    return NextResponse.json({ error: "forfeitingTeam is required when status is forfeit." }, { status: 400 });
  }

  const patch = writeClient.patch(gameId).set({ homeScore, awayScore, status });
  if (status === "forfeit") {
    patch.set({ forfeitingTeam });
  } else {
    patch.unset(["forfeitingTeam"]);
  }
  await patch.commit();

  await recalculateStandings(seasonId);

  const [game, standings] = await Promise.all([
    writeClient.fetch<AdminGame>(gameByIdQuery, { id: gameId }),
    writeClient.fetch<Standing[]>(standingsBySeasonQuery, { year: seasonYear }),
  ]);

  return NextResponse.json({ game, standings });
}

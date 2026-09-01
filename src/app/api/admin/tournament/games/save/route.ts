import { NextRequest, NextResponse } from "next/server";
import { requireAdminApiAuth } from "@/lib/admin-auth";
import { writeClient } from "@/lib/sanity/client";
import { tournamentGamesQuery } from "@/lib/sanity/queries";
import type { TournamentGame } from "@/lib/types";

export async function POST(req: NextRequest) {
  const auth = await requireAdminApiAuth(req);
  if ("response" in auth) return auth.response;

  const body = await req.json().catch(() => null);
  const gameId = typeof body?.gameId === "string" ? body.gameId : "";
  const final = Boolean(body?.final);
  const homeScore = Number(body?.homeScore);
  const awayScore = Number(body?.awayScore);
  const year = Number(body?.year);
  const type = typeof body?.type === "string" ? body.type : "";

  if (!gameId || !Number.isInteger(year) || !type) {
    return NextResponse.json({ error: "Missing gameId or year/type." }, { status: 400 });
  }

  const patch = writeClient.patch(gameId);
  if (final) {
    if (!Number.isFinite(homeScore) || !Number.isFinite(awayScore) || homeScore < 0 || awayScore < 0) {
      return NextResponse.json({ error: "Scores must be non-negative numbers." }, { status: 400 });
    }
    patch.set({ homeScore, awayScore });
  } else {
    patch.unset(["homeScore", "awayScore"]);
  }
  await patch.commit();

  const games = await writeClient.fetch<TournamentGame[]>(tournamentGamesQuery, { year, type });
  return NextResponse.json({ games });
}

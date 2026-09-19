import { NextRequest, NextResponse } from "next/server";
import { requireAdminApiAuth } from "@/lib/admin-auth";
import { writeClient } from "@/lib/sanity/client";
import { tournamentGamesQuery } from "@/lib/sanity/queries";
import { advanceWinnerIfApplicable } from "@/lib/tournamentBracketAdvance";
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
  // Optional — lets the admin swap a placeholder name (e.g. "Wild Card #1
  // Winner") for the real team once it's known, without deleting/recreating
  // the game. Omit to leave the team names untouched.
  const homeTeam = typeof body?.homeTeam === "string" ? body.homeTeam.trim() : undefined;
  const awayTeam = typeof body?.awayTeam === "string" ? body.awayTeam.trim() : undefined;

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
  const teamPatch: Record<string, string> = {};
  if (homeTeam) teamPatch.homeTeam = homeTeam;
  if (awayTeam) teamPatch.awayTeam = awayTeam;
  if (Object.keys(teamPatch).length > 0) patch.set(teamPatch);
  await patch.commit();

  if (final) {
    const saved = await writeClient.fetch<{ sortOrder?: number; homeTeam?: string; awayTeam?: string }>(
      `*[_id == $gameId][0]{sortOrder, homeTeam, awayTeam}`,
      { gameId }
    );
    if (saved?.homeTeam && saved?.awayTeam) {
      await advanceWinnerIfApplicable(year, type, saved.sortOrder, saved.homeTeam, saved.awayTeam, homeScore, awayScore);
    }
  }

  const games = await writeClient.fetch<TournamentGame[]>(tournamentGamesQuery, { year, type });
  return NextResponse.json({ games });
}

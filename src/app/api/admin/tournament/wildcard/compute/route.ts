import { NextRequest, NextResponse } from "next/server";
import { requireAdminApiAuth } from "@/lib/admin-auth";
import { writeClient } from "@/lib/sanity/client";
import { standingsBySeasonQuery, tournamentGamesQuery } from "@/lib/sanity/queries";
import { computeWildCardStandings } from "@/lib/wildCardStandings";
import type { Standing, TournamentGame, TournamentType } from "@/lib/types";

function isTournamentType(value: unknown): value is TournamentType {
  return value === "charity" || value === "mcgregor";
}

// Preview-only — computes Phase 2 (Wild Card) seeding from whatever Thu-Sat
// round robin scores exist so far, per the league's house rules (see
// computeWildCardStandings). Doesn't write anything; the admin reviews the
// result — and resolves any flagged coin-flip ties by hand — before the
// separate /save route commits it as real wildCardRanking documents.
export async function POST(req: NextRequest) {
  const auth = await requireAdminApiAuth(req);
  if ("response" in auth) return auth.response;

  const body = await req.json().catch(() => null);
  const year = Number(body?.year);
  const type = body?.type;
  if (!Number.isInteger(year) || !isTournamentType(type)) {
    return NextResponse.json({ error: "Missing or invalid year/type." }, { status: 400 });
  }

  const [games, standings] = await Promise.all([
    writeClient.fetch<TournamentGame[]>(tournamentGamesQuery, { year, type }),
    writeClient.fetch<Standing[]>(standingsBySeasonQuery, { year }),
  ]);

  const result = computeWildCardStandings(games, standings);
  if (!result) {
    return NextResponse.json(
      { error: "No round robin games with scores entered yet — nothing to compute." },
      { status: 400 }
    );
  }

  return NextResponse.json(result);
}

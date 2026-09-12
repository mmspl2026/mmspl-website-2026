import { NextRequest, NextResponse } from "next/server";
import { requireAdminApiAuth } from "@/lib/admin-auth";
import { writeClient } from "@/lib/sanity/client";
import { standingsBySeasonQuery, tournamentGamesQuery, wildCardRankingsQuery } from "@/lib/sanity/queries";
import { computeWildCardStandings, type WildCardStandingsResult } from "@/lib/wildCardStandings";
import type { Standing, TournamentGame, TournamentType, WildCardRanking } from "@/lib/types";

function isTournamentType(value: unknown): value is TournamentType {
  return value === "charity" || value === "mcgregor";
}

async function compute(year: number, type: TournamentType): Promise<WildCardStandingsResult | null> {
  const [games, standings] = await Promise.all([
    writeClient.fetch<TournamentGame[]>(tournamentGamesQuery, { year, type }),
    writeClient.fetch<Standing[]>(standingsBySeasonQuery, { year }),
  ]);
  return computeWildCardStandings(games, standings);
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

  const result = await compute(year, type);
  if (!result) {
    return NextResponse.json(
      { error: "No round robin games with scores entered yet — nothing to compute." },
      { status: 400 }
    );
  }

  return NextResponse.json(result);
}

// Loads whatever was actually saved last time (if anything), instead of a
// throwaway fresh computation — so leaving this tab and coming back doesn't
// look like nothing was ever done. Division Winners are safe to recompute
// fresh (they're never hand-reordered), but the Wild Card 1-10 order is
// re-sorted to match the saved documents, since the admin may have manually
// resolved a coin-flip tie that a fresh recompute can't know about.
export async function GET(req: NextRequest) {
  const auth = await requireAdminApiAuth(req);
  if ("response" in auth) return auth.response;

  const year = Number(req.nextUrl.searchParams.get("year"));
  const type = req.nextUrl.searchParams.get("type");
  if (!Number.isInteger(year) || !isTournamentType(type)) {
    return NextResponse.json({ error: "Missing or invalid year/type." }, { status: 400 });
  }

  const [fresh, saved] = await Promise.all([
    compute(year, type),
    writeClient.fetch<WildCardRanking[]>(wildCardRankingsQuery, { year, type }),
  ]);

  if (!fresh) {
    return NextResponse.json({ result: null, saved: [] });
  }

  if (saved.length === 0) {
    return NextResponse.json({ result: fresh, saved: [] });
  }

  const savedRankByName = new Map(saved.map((s) => [s.teamName, s.rank]));
  const wildCard = [...fresh.wildCard]
    .sort((a, b) => (savedRankByName.get(a.teamName) ?? a.rank) - (savedRankByName.get(b.teamName) ?? b.rank))
    .map((entry, i) => ({ ...entry, rank: i + 1, advanced: i < 8 }));

  return NextResponse.json({ result: { ...fresh, wildCard }, saved });
}

import { NextRequest, NextResponse } from "next/server";
import { requireAdminApiAuth } from "@/lib/admin-auth";
import { writeClient } from "@/lib/sanity/client";
import { wildCardRankingsQuery, tournamentGamesQuery, standingsBySeasonQuery } from "@/lib/sanity/queries";
import { computeWildCardStandings } from "@/lib/wildCardStandings";
import type { Standing, TournamentGame, TournamentType, WildCardRanking } from "@/lib/types";

function isTournamentType(value: unknown): value is TournamentType {
  return value === "charity" || value === "mcgregor";
}

interface IncomingEntry {
  rank: number;
  teamName: string;
  pool?: string;
  wins: number;
  losses: number;
  ties: number;
  runDifferential: number;
  advanced: boolean;
}

function isValidEntry(e: unknown): e is IncomingEntry {
  if (!e || typeof e !== "object") return false;
  const r = e as Record<string, unknown>;
  return (
    typeof r.rank === "number" &&
    typeof r.teamName === "string" &&
    typeof r.wins === "number" &&
    typeof r.losses === "number" &&
    typeof r.ties === "number" &&
    typeof r.runDifferential === "number" &&
    typeof r.advanced === "boolean"
  );
}

// The 4 real Wild Card round games are created (with placeholder team names
// like "Wild Card #1") by Load Projected Schedule, at these fixed
// sortOrder values — see SUNDAY_TEMPLATE in projectedSchedule.ts, whose
// first 4 entries are exactly this seed pairing in this exact order.
// sortOrder is used to identify them (not the placeholder text) so this
// still works correctly on a re-save after the names have already been
// filled in once.
const WILD_CARD_ROUND_SORT_ORDER: Record<number, [number, number]> = {
  21: [1, 8],
  22: [2, 7],
  23: [4, 5],
  24: [3, 6],
};

// Commits a reviewed Wild Card ranking (from /wildcard/compute, possibly
// hand-reordered by the admin to resolve a coin-flip tie) as real
// wildCardRanking documents — replaces whatever was saved before for this
// year/type, since this can be re-run as Thu-Sat scores get corrected.
// Also fills in the real team names on the 4 actual Wild Card round games
// (Sunday 8:30/10:00 AM), which otherwise keep showing the "Wild Card #1"
// style placeholder from Load Projected Schedule forever. Quarter Final and
// beyond aren't touched here — which Division Winner faces which Wild Card
// game's winner is set by a real physical draw, not something to guess at,
// so those stay as placeholders until the admin fills them in by hand (see
// the per-game "Edit team names" pencil icon).
export async function POST(req: NextRequest) {
  const auth = await requireAdminApiAuth(req);
  if ("response" in auth) return auth.response;

  const body = await req.json().catch(() => null);
  const year = Number(body?.year);
  const type = body?.type;
  const entries = Array.isArray(body?.wildCard) ? body.wildCard : null;
  if (!Number.isInteger(year) || !isTournamentType(type) || !entries || entries.length === 0) {
    return NextResponse.json({ error: "Missing or invalid year/type/wildCard." }, { status: 400 });
  }
  if (!entries.every(isValidEntry)) {
    return NextResponse.json({ error: "Malformed ranking entry." }, { status: 400 });
  }

  const existing = await writeClient.fetch<{ _id: string }[]>(
    `*[_type == "wildCardRanking" && year == $year && type == $type]{_id}`,
    { year, type }
  );

  const tx = writeClient.transaction();
  for (const doc of existing) tx.delete(doc._id);
  for (const entry of entries as IncomingEntry[]) {
    tx.create({
      _type: "wildCardRanking",
      year,
      type,
      rank: entry.rank,
      teamName: entry.teamName,
      pool: entry.pool,
      points: entry.wins * 2 + entry.ties,
      wins: entry.wins,
      losses: entry.losses,
      ties: entry.ties,
      runDifferential: entry.runDifferential,
      advanced: entry.advanced,
    });
  }
  await tx.commit();

  const byRank = new Map((entries as IncomingEntry[]).map((e) => [e.rank, e.teamName]));
  const wcGames = await writeClient.fetch<{ _id: string; sortOrder?: number }[]>(
    `*[_type == "tournamentGame" && year == $year && type == $type && round == "wildCard"]{_id, sortOrder}`,
    { year, type }
  );
  const gameTx = writeClient.transaction();
  let gamesUpdated = 0;
  for (const g of wcGames) {
    const pair = typeof g.sortOrder === "number" ? WILD_CARD_ROUND_SORT_ORDER[g.sortOrder] : undefined;
    if (!pair) continue;
    const [homeRank, awayRank] = pair;
    const homeTeam = byRank.get(homeRank);
    const awayTeam = byRank.get(awayRank);
    if (!homeTeam || !awayTeam) continue;
    gameTx.patch(g._id, (p) => p.set({ homeTeam, awayTeam }));
    gamesUpdated += 1;
  }
  if (gamesUpdated > 0) await gameTx.commit();

  // Division Winners aren't hand-reordered anywhere in the UI (unlike the
  // Wild Card 1-10 list), so it's safe to recompute them fresh here rather
  // than trust anything the client sent — and stamp them onto the real
  // tournamentPool documents so the public Div & WC Rank tab can show them
  // without recomputing anything itself.
  const [allGames, standings] = await Promise.all([
    writeClient.fetch<TournamentGame[]>(tournamentGamesQuery, { year, type }),
    writeClient.fetch<Standing[]>(standingsBySeasonQuery, { year }),
  ]);
  const wcResult = computeWildCardStandings(allGames, standings);
  if (wcResult) {
    const pools = await writeClient.fetch<{ _id: string; poolLetter: string }[]>(
      `*[_type == "tournamentPool" && year == $year && type == $type]{_id, poolLetter}`,
      { year, type }
    );
    const winnerByPool = new Map(wcResult.divisionWinners.map((d) => [d.pool, d.teamName]));
    const poolTx = writeClient.transaction();
    for (const p of pools) {
      const winner = winnerByPool.get(p.poolLetter);
      if (winner) poolTx.patch(p._id, (patch) => patch.set({ winner }));
    }
    await poolTx.commit();
  }

  const saved = await writeClient.fetch<WildCardRanking[]>(wildCardRankingsQuery, { year, type });
  return NextResponse.json({ wildCardRankings: saved, wildCardGamesUpdated: gamesUpdated });
}

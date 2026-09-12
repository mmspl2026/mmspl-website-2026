import { NextRequest, NextResponse } from "next/server";
import { requireAdminApiAuth } from "@/lib/admin-auth";
import { writeClient } from "@/lib/sanity/client";
import { tournamentResultQuery } from "@/lib/sanity/queries";
import { getTodayEastern } from "@/utils/timezone";
import type { TournamentResult, TournamentType } from "@/lib/types";

function isTournamentType(value: unknown): value is TournamentType {
  return value === "charity" || value === "mcgregor";
}

// Wipes all tournamentGame/tournamentPool/wildCardRanking documents for a
// year+type and clears hasDetailedResults, so testing "Load Projected
// Schedule" and the Wild Card compute flow can be undone cleanly.
//
// Deliberately re-checks safety server-side rather than trusting the client
// — this deletes real data and a stale tab, a second admin, or a direct API
// call could otherwise bypass a client-only guard. Refuses once *either*:
//   - today is on or after the tournament's planned start date, or
//   - any existing game already has a recorded score
// since at that point this would be destroying real results, not test data.
export async function POST(req: NextRequest) {
  const auth = await requireAdminApiAuth(req);
  if ("response" in auth) return auth.response;

  const body = await req.json().catch(() => null);
  const year = Number(body?.year);
  const type = body?.type;
  const confirm = body?.confirm;
  if (!Number.isInteger(year) || !isTournamentType(type)) {
    return NextResponse.json({ error: "Missing or invalid year/type." }, { status: 400 });
  }

  const expectedConfirm = `DELETE ${year} ${type.toUpperCase()}`;
  if (confirm !== expectedConfirm) {
    return NextResponse.json({ error: "Confirmation text did not match." }, { status: 400 });
  }

  const result = await writeClient.fetch<TournamentResult | null>(tournamentResultQuery, { year, type });
  const today = getTodayEastern();
  if (result?.plannedStart && today >= result.plannedStart) {
    return NextResponse.json(
      { error: "This tournament has already started (or starts today) — reset is disabled to prevent destroying real results." },
      { status: 409 }
    );
  }

  const games = await writeClient.fetch<{ _id: string; homeScore?: number; awayScore?: number }[]>(
    `*[_type == "tournamentGame" && year == $year && type == $type]{_id, homeScore, awayScore}`,
    { year, type }
  );
  if (games.some((g) => typeof g.homeScore === "number" || typeof g.awayScore === "number")) {
    return NextResponse.json(
      { error: "Some games already have scores recorded — reset is disabled to prevent destroying real results." },
      { status: 409 }
    );
  }

  const [pools, wcRankings] = await Promise.all([
    writeClient.fetch<{ _id: string }[]>(`*[_type == "tournamentPool" && year == $year && type == $type]{_id}`, {
      year,
      type,
    }),
    writeClient.fetch<{ _id: string }[]>(`*[_type == "wildCardRanking" && year == $year && type == $type]{_id}`, {
      year,
      type,
    }),
  ]);

  const tx = writeClient.transaction();
  for (const g of games) tx.delete(g._id);
  for (const p of pools) tx.delete(p._id);
  for (const w of wcRankings) tx.delete(w._id);
  if (result?._id) tx.patch(result._id, (p) => p.set({ hasDetailedResults: false }));
  await tx.commit();

  return NextResponse.json({
    deleted: { games: games.length, pools: pools.length, wildCardRankings: wcRankings.length },
  });
}

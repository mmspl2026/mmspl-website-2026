import { NextRequest, NextResponse } from "next/server";
import { requireAdminApiAuth } from "@/lib/admin-auth";
import { writeClient } from "@/lib/sanity/client";
import { standingsBySeasonQuery, tournamentResultQuery, tournamentGamesQuery } from "@/lib/sanity/queries";
import { computeProjectedBoxes } from "@/lib/tournamentSeeding";
import { computeProjectedSchedule } from "@/lib/projectedSchedule";
import type { Standing, TournamentResult, TournamentGame, TournamentType } from "@/lib/types";

function isTournamentType(value: unknown): value is TournamentType {
  return value === "charity" || value === "mcgregor";
}

// Turns the same live "if the season ended today" projection shown on the
// public tournament page into real, editable tournamentPool/tournamentGame
// documents — a one-tap alternative to manually typing in ~20 games' worth
// of matchups the night before a tournament.
export async function POST(req: NextRequest) {
  const auth = await requireAdminApiAuth(req);
  if ("response" in auth) return auth.response;

  const body = await req.json().catch(() => null);
  const year = Number(body?.year);
  const type = body?.type;
  if (!Number.isInteger(year) || !isTournamentType(type)) {
    return NextResponse.json({ error: "Missing or invalid year/type." }, { status: 400 });
  }
  // The Thu-Sat slot template (computeProjectedSchedule) encodes the
  // McGregor tournament's specific box format (4 boxes, 3/3/4/4 split) —
  // Charity uses a different, not-yet-modeled pool structure, so applying
  // this template there would generate real but wrong matchups.
  if (type !== "mcgregor") {
    return NextResponse.json(
      { error: "Projected schedule loading is only available for the Jim McGregor tournament right now." },
      { status: 400 }
    );
  }

  const existing = await writeClient.fetch<{ _id: string }[]>(
    `*[_type == "tournamentGame" && year == $year && type == $type]{_id}`,
    { year, type }
  );
  if (existing.length > 0) {
    return NextResponse.json(
      { error: `${existing.length} game(s) already exist for this tournament — refusing to overwrite. Delete them first if you want to reload.` },
      { status: 409 }
    );
  }

  const result = await writeClient.fetch<TournamentResult | null>(tournamentResultQuery, { year, type });
  if (!result?.plannedStart) {
    return NextResponse.json({ error: "This tournament has no planned start date set." }, { status: 400 });
  }

  const standings = await writeClient.fetch<Standing[]>(standingsBySeasonQuery, { year });
  const boxes = computeProjectedBoxes(standings);
  if (!boxes) {
    return NextResponse.json(
      { error: `Need exactly 14 teams in the standings to project boxes (found ${standings.length}).` },
      { status: 400 }
    );
  }

  const games = computeProjectedSchedule(boxes, year, type, result.plannedStart);
  if (!games) {
    return NextResponse.json({ error: "Could not build the projected schedule for this tournament." }, { status: 400 });
  }

  const tx = writeClient.transaction();
  for (const box of boxes) {
    tx.createOrReplace({
      _id: `tournamentPool-${year}-${type}-${box.poolLetter}`,
      _type: "tournamentPool",
      year,
      type,
      poolLetter: box.poolLetter,
      teams: box.teams,
    });
  }
  for (const game of games) {
    // Drop the client-only synthetic _id/homeSeed/awaySeed — real Sanity
    // documents get their own generated _id, and homeSeed/awaySeed were only
    // ever meant for the unsaved preview, not stored data.
    const { _id, homeSeed, awaySeed, ...rest } = game;
    void _id;
    void homeSeed;
    void awaySeed;
    tx.create({ _type: "tournamentGame", ...rest });
  }
  tx.patch(result._id, (p) => p.set({ hasDetailedResults: true }));
  await tx.commit();

  const savedGames = await writeClient.fetch<TournamentGame[]>(tournamentGamesQuery, { year, type });
  return NextResponse.json({ games: savedGames });
}

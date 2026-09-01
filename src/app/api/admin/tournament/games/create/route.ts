import { NextRequest, NextResponse } from "next/server";
import { requireAdminApiAuth } from "@/lib/admin-auth";
import { writeClient } from "@/lib/sanity/client";
import { tournamentGamesQuery } from "@/lib/sanity/queries";
import type { TournamentGame, TournamentRound, TournamentType } from "@/lib/types";

const VALID_ROUNDS: TournamentRound[] = ["roundRobin", "wildCard", "quarterFinal", "semiFinal", "final"];

function isTournamentType(value: unknown): value is TournamentType {
  return value === "charity" || value === "mcgregor";
}

export async function POST(req: NextRequest) {
  const auth = await requireAdminApiAuth(req);
  if ("response" in auth) return auth.response;

  const body = await req.json().catch(() => null);
  const year = Number(body?.year);
  const type = body?.type;
  const date = typeof body?.date === "string" ? body.date : "";
  const time = typeof body?.time === "string" ? body.time.trim() : "";
  const field = typeof body?.field === "string" ? body.field.trim() : "";
  const homeTeam = typeof body?.homeTeam === "string" ? body.homeTeam.trim() : "";
  const awayTeam = typeof body?.awayTeam === "string" ? body.awayTeam.trim() : "";
  const round = body?.round;
  const pool = typeof body?.pool === "string" && body.pool.trim() ? body.pool.trim() : undefined;

  if (!Number.isInteger(year) || !isTournamentType(type) || !date || !homeTeam || !awayTeam) {
    return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
  }
  if (!VALID_ROUNDS.includes(round)) {
    return NextResponse.json({ error: "Invalid round." }, { status: 400 });
  }

  const existingForDay = await writeClient.fetch<{ sortOrder: number | null }[]>(
    `*[_type == "tournamentGame" && year == $year && type == $type && date == $date].sortOrder`,
    { year, type, date }
  );
  const nextSortOrder = existingForDay.length > 0 ? Math.max(...existingForDay.map((s) => Number(s) || 0)) + 1 : 0;

  await writeClient.create({
    _type: "tournamentGame",
    year,
    type,
    date,
    time: time || undefined,
    field: field || undefined,
    homeTeam,
    awayTeam,
    round,
    pool,
    sortOrder: nextSortOrder,
  });

  const games = await writeClient.fetch<TournamentGame[]>(tournamentGamesQuery, { year, type });
  return NextResponse.json({ games });
}

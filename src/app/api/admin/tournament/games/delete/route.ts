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
  const year = Number(body?.year);
  const type = typeof body?.type === "string" ? body.type : "";

  if (!gameId || !Number.isInteger(year) || !type) {
    return NextResponse.json({ error: "Missing gameId or year/type." }, { status: 400 });
  }

  await writeClient.delete(gameId);

  const games = await writeClient.fetch<TournamentGame[]>(tournamentGamesQuery, { year, type });
  return NextResponse.json({ games });
}

import { NextRequest, NextResponse } from "next/server";
import { requireAdminApiAuth } from "@/lib/admin-auth";
import { writeClient } from "@/lib/sanity/client";
import { tournamentResultQuery, tournamentGamesQuery } from "@/lib/sanity/queries";
import type { TournamentResult, TournamentGame, TournamentType } from "@/lib/types";

function isTournamentType(value: string | null): value is TournamentType {
  return value === "charity" || value === "mcgregor";
}

export async function GET(req: NextRequest) {
  const auth = await requireAdminApiAuth(req);
  if ("response" in auth) return auth.response;

  const year = Number(req.nextUrl.searchParams.get("year"));
  const type = req.nextUrl.searchParams.get("type");
  if (!Number.isInteger(year) || !isTournamentType(type)) {
    return NextResponse.json({ error: "Missing or invalid year/type." }, { status: 400 });
  }

  const [result, games] = await Promise.all([
    writeClient.fetch<TournamentResult | null>(tournamentResultQuery, { year, type }),
    writeClient.fetch<TournamentGame[]>(tournamentGamesQuery, { year, type }),
  ]);

  return NextResponse.json({ result, games });
}

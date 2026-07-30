import { NextRequest, NextResponse } from "next/server";
import { requireAdminApiAuth } from "@/lib/admin-auth";
import { writeClient } from "@/lib/sanity/client";
import { activeSeasonQuery, standingsBySeasonQuery } from "@/lib/sanity/queries";
import { recalculateStandings } from "@/lib/standings";
import type { Season, Standing } from "@/lib/types";

export async function POST(req: NextRequest) {
  const unauthorized = requireAdminApiAuth(req);
  if (unauthorized) return unauthorized;

  const season = await writeClient.fetch<Season | null>(activeSeasonQuery);
  if (!season) {
    return NextResponse.json({ error: "No active season is set in Studio." }, { status: 400 });
  }

  await recalculateStandings(season._id);
  const standings = await writeClient.fetch<Standing[]>(standingsBySeasonQuery, {
    year: season.year,
  });

  return NextResponse.json({ season, standings });
}

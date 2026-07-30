import { NextRequest, NextResponse } from "next/server";
import { requireAdminApiAuth } from "@/lib/admin-auth";
import { writeClient } from "@/lib/sanity/client";
import { activeSeasonQuery, standingsBySeasonQuery } from "@/lib/sanity/queries";
import type { Season, Standing } from "@/lib/types";

export async function GET(req: NextRequest) {
  const unauthorized = requireAdminApiAuth(req);
  if (unauthorized) return unauthorized;

  const season = await writeClient.fetch<Season | null>(activeSeasonQuery);
  if (!season) {
    return NextResponse.json({ season: null, standings: [] });
  }

  const standings = await writeClient.fetch<Standing[]>(standingsBySeasonQuery, {
    year: season.year,
  });
  return NextResponse.json({ season, standings });
}

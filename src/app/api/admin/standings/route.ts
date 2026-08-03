import { NextRequest, NextResponse } from "next/server";
import { requireAdminApiAuth } from "@/lib/admin-auth";
import { writeClient } from "@/lib/sanity/client";
import { activeSeasonQuery, standingsBySeasonQuery } from "@/lib/sanity/queries";
import type { Season, Standing } from "@/lib/types";

export async function GET(req: NextRequest) {
  const auth = requireAdminApiAuth(req);
  if ("response" in auth) return auth.response;

  const seasonId = req.nextUrl.searchParams.get("seasonId");

  const season = seasonId
    ? await writeClient.fetch<Season | null>(`*[_type == "season" && _id == $id][0]{_id, year, isActive}`, {
        id: seasonId,
      })
    : await writeClient.fetch<Season | null>(activeSeasonQuery);

  if (!season) {
    return NextResponse.json({ season: null, standings: [] });
  }

  const standings = await writeClient.fetch<Standing[]>(standingsBySeasonQuery, {
    year: season.year,
  });
  return NextResponse.json({ season, standings });
}

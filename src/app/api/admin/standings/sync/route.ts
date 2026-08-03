import { NextRequest, NextResponse } from "next/server";
import { requireAdminApiAuth } from "@/lib/admin-auth";
import { writeClient } from "@/lib/sanity/client";
import { activeSeasonQuery, standingsBySeasonQuery } from "@/lib/sanity/queries";
import { recalculateStandings } from "@/lib/standings";
import type { Season, Standing } from "@/lib/types";

export async function POST(req: NextRequest) {
  const auth = requireAdminApiAuth(req);
  if ("response" in auth) return auth.response;

  const body = await req.json().catch(() => ({}));
  const seasonId = typeof body?.seasonId === "string" ? body.seasonId : null;

  const season = seasonId
    ? await writeClient.fetch<Season | null>(`*[_type == "season" && _id == $id][0]{_id, year, isActive}`, {
        id: seasonId,
      })
    : await writeClient.fetch<Season | null>(activeSeasonQuery);
  if (!season) {
    return NextResponse.json({ error: "Season not found." }, { status: 400 });
  }

  await recalculateStandings(season._id);
  const standings = await writeClient.fetch<Standing[]>(standingsBySeasonQuery, {
    year: season.year,
  });

  return NextResponse.json({ season, standings });
}

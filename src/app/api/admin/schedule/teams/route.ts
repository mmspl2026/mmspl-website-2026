import { NextRequest, NextResponse } from "next/server";
import { requireAdminApiAuth } from "@/lib/admin-auth";
import { writeClient } from "@/lib/sanity/client";
import { allTeamsWithIdQuery, teamsBySeasonQuery } from "@/lib/sanity/queries";
import type { Team } from "@/lib/types";

// Defaults to whichever teams actually fielded a standing in `year` (e.g.
// next season's draw only offers this year's real 14 teams, not every team
// the league has had since 2005) — pass `?year=` from the generator UI.
// Omitting year falls back to every team ever, mostly for other admin
// tools that don't care about season scoping.
export async function GET(req: NextRequest) {
  const auth = await requireAdminApiAuth(req);
  if ("response" in auth) return auth.response;

  const yearParam = req.nextUrl.searchParams.get("year");
  const year = yearParam ? Number(yearParam) : null;

  const teams =
    year && Number.isInteger(year)
      ? await writeClient.fetch<Pick<Team, "_id" | "name" | "shortName">[]>(teamsBySeasonQuery, { year })
      : await writeClient.fetch<Pick<Team, "_id" | "name" | "shortName">[]>(allTeamsWithIdQuery);

  return NextResponse.json({ teams });
}

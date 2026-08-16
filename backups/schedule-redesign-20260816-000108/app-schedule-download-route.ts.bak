import { NextRequest, NextResponse } from "next/server";
import { sanityFetch } from "@/lib/sanity/client";
import { gamesBySeasonQuery } from "@/lib/sanity/queries";
import type { Game } from "@/lib/types";
import { buildIcs, buildCsv, slugifyTeamName } from "@/lib/scheduleExport";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const format = searchParams.get("format");
  const seasonParam = searchParams.get("season");
  const teamSlug = searchParams.get("team");

  const year = seasonParam ? Number(seasonParam) : NaN;
  if (!Number.isInteger(year)) {
    return NextResponse.json({ error: "A valid season year is required." }, { status: 400 });
  }
  if (format !== "ics" && format !== "csv") {
    return NextResponse.json({ error: "format must be 'ics' or 'csv'." }, { status: 400 });
  }

  const allGames = await sanityFetch<Game[]>(gamesBySeasonQuery, { year }, []);

  let games = allGames;
  let team: { name: string; slug: string } | undefined;
  if (teamSlug) {
    const match = allGames.find(
      (g) => slugifyTeamName(g.homeTeam.name) === teamSlug || slugifyTeamName(g.awayTeam.name) === teamSlug
    );
    const teamName = match
      ? slugifyTeamName(match.homeTeam.name) === teamSlug
        ? match.homeTeam.name
        : match.awayTeam.name
      : null;
    if (!teamName) {
      return NextResponse.json({ error: "No games found for that team." }, { status: 404 });
    }
    team = { name: teamName, slug: teamSlug };
    games = allGames.filter((g) => g.homeTeam.name === teamName || g.awayTeam.name === teamName);
  }

  const filenameBase = team ? `mmspl-${year}-${team.slug}` : `master-schedule-${year}`;

  if (format === "ics") {
    const body = buildIcs(games, { year, team });
    return new NextResponse(body, {
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filenameBase}.ics"`,
      },
    });
  }

  const body = buildCsv(games);
  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filenameBase}.csv"`,
    },
  });
}

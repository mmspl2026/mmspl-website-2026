import { NextRequest, NextResponse } from "next/server";
import { hasFreshStepUp, requireAdminApiAuth } from "@/lib/admin-auth";
import { writeClient } from "@/lib/sanity/client";
import { activeSeasonQuery, adminUserNameQuery, seasonByIdQuery, standingsBySeasonQuery } from "@/lib/sanity/queries";
import { recalculateStandings } from "@/lib/standings";
import { isStandingsLocked } from "@/lib/standingsLock";
import { getTodayEastern } from "@/utils/timezone";
import { logAdminAction, getClientIp } from "@/lib/auditLog";
import type { Season, Standing } from "@/lib/types";

export async function POST(req: NextRequest) {
  const auth = await requireAdminApiAuth(req);
  if ("response" in auth) return auth.response;
  const { session } = auth;

  const body = await req.json().catch(() => ({}));
  const seasonId = typeof body?.seasonId === "string" ? body.seasonId : null;

  const season = seasonId
    ? await writeClient.fetch<Season | null>(seasonByIdQuery, { id: seasonId })
    : await writeClient.fetch<Season | null>(activeSeasonQuery);
  if (!season) {
    return NextResponse.json({ error: "Season not found." }, { status: 400 });
  }

  if (isStandingsLocked(season, getTodayEastern()) && !hasFreshStepUp(session)) {
    return NextResponse.json(
      { error: `${season.year} standings are locked (season complete). Unlock to edit.`, locked: true },
      { status: 423 }
    );
  }

  await recalculateStandings(season._id);
  const standings = await writeClient.fetch<Standing[]>(standingsBySeasonQuery, {
    year: season.year,
  });

  const user = await writeClient.fetch<{ name: string } | null>(adminUserNameQuery, { id: session.uid });
  await logAdminAction({
    action: "standings.recalculate",
    performedByUid: session.uid,
    performedByName: user?.name || "(unknown)",
    seasonYear: season.year,
    summary: "Recalculated standings from Final games.",
    ip: getClientIp(req),
  });

  return NextResponse.json({ season, standings });
}

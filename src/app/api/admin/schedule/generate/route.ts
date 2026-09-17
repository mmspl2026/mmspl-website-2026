import { NextRequest, NextResponse } from "next/server";
import { requireAdminApiAuth } from "@/lib/admin-auth";
import { writeClient } from "@/lib/sanity/client";
import { allTeamsWithIdQuery } from "@/lib/sanity/queries";
import { generateSeasonSchedule, ScheduleGenerationError } from "@/lib/seasonScheduleGeneration";
import { getScheduleLockDate, isScheduleLocked } from "@/lib/seasonScheduleLock";
import { getTodayEastern } from "@/utils/timezone";
import type { Team } from "@/lib/types";

// Preview-only — computes a fresh randomized schedule from the submitted
// draw order and start date, resolves team ids to names for display, and
// returns it. Nothing is written; the admin reviews it (and can regenerate
// as many times as they like) before the separate /publish route commits
// it as real `game` documents.
export async function POST(req: NextRequest) {
  const auth = await requireAdminApiAuth(req);
  if ("response" in auth) return auth.response;

  const body = await req.json().catch(() => null);
  const year = Number(body?.year);
  const seasonStartDate = typeof body?.seasonStartDate === "string" ? body.seasonStartDate : null;
  const teamIds: unknown = body?.teamIds;
  const blackoutDatesRaw: unknown = body?.blackoutDates;

  if (!Number.isInteger(year) || !seasonStartDate || !Array.isArray(teamIds) || teamIds.some((t) => typeof t !== "string")) {
    return NextResponse.json({ error: "Missing year, seasonStartDate, or teamIds (14 team _ids in draw order)." }, { status: 400 });
  }
  if (blackoutDatesRaw !== undefined && (!Array.isArray(blackoutDatesRaw) || blackoutDatesRaw.some((d) => typeof d !== "string"))) {
    return NextResponse.json({ error: "blackoutDates must be an array of \"YYYY-MM-DD\" strings." }, { status: 400 });
  }
  if (isScheduleLocked(year, getTodayEastern())) {
    return NextResponse.json(
      { error: `${year} is locked — the schedule generator only works through ${getScheduleLockDate(year)} (two weeks into that season's May), to protect a season already under way.` },
      { status: 409 }
    );
  }

  let games;
  try {
    games = generateSeasonSchedule({
      teamIds: teamIds as string[],
      seasonStartDate,
      blackoutDates: blackoutDatesRaw as string[] | undefined,
    });
  } catch (err) {
    const message = err instanceof ScheduleGenerationError ? err.message : "Failed to generate schedule.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const teams = await writeClient.fetch<Pick<Team, "_id" | "name">[]>(allTeamsWithIdQuery);
  const nameById = new Map(teams.map((t) => [t._id, t.name]));

  const preview = games.map((g) => ({
    ...g,
    homeTeamName: nameById.get(g.homeTeamId) ?? "Unknown team",
    awayTeamName: nameById.get(g.awayTeamId) ?? "Unknown team",
  }));

  return NextResponse.json({ games: preview });
}

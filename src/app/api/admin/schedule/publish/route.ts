import { NextRequest, NextResponse } from "next/server";
import { requireAdminApiAuth } from "@/lib/admin-auth";
import { writeClient } from "@/lib/sanity/client";
import { recalculateStandings } from "@/lib/standings";
import { getScheduleLockDate, isScheduleLocked } from "@/lib/seasonScheduleLock";
import { getTodayEastern } from "@/utils/timezone";
import type { Season } from "@/lib/types";

interface IncomingGame {
  date: string;
  time: string;
  field: string;
  homeTeamId: string;
  awayTeamId: string;
}

function isValidGame(g: unknown): g is IncomingGame {
  if (!g || typeof g !== "object") return false;
  const r = g as Record<string, unknown>;
  return (
    typeof r.date === "string" &&
    typeof r.time === "string" &&
    typeof r.field === "string" &&
    typeof r.homeTeamId === "string" &&
    typeof r.awayTeamId === "string"
  );
}

// Commits a previously-previewed schedule (see /generate) as real `game`
// documents — creating the season doc first if it doesn't exist yet, same
// deterministic `season-{year}` id already used across the codebase.
// Refuses if any games already exist for the season, matching the
// tournament's load-projected safety pattern: this is a one-shot bulk
// import, not something that should silently double up a season's slate.
export async function POST(req: NextRequest) {
  const auth = await requireAdminApiAuth(req);
  if ("response" in auth) return auth.response;

  const body = await req.json().catch(() => null);
  const year = Number(body?.year);
  const games: unknown = body?.games;

  if (!Number.isInteger(year) || !Array.isArray(games) || games.length === 0 || !games.every(isValidGame)) {
    return NextResponse.json({ error: "Missing or invalid year/games." }, { status: 400 });
  }
  if (isScheduleLocked(year, getTodayEastern())) {
    return NextResponse.json(
      { error: `${year} is locked — publishing only works through ${getScheduleLockDate(year)} (two weeks into that season's May), to protect a season already under way. This applies even if no games exist for ${year} yet.` },
      { status: 409 }
    );
  }

  const existing = await writeClient.fetch<{ _id: string }[]>(
    `*[_type == "game" && season->year == $year]{_id}`,
    { year }
  );
  if (existing.length > 0) {
    return NextResponse.json(
      { error: `${existing.length} game(s) already exist for ${year} — refusing to publish another schedule on top of them.` },
      { status: 409 }
    );
  }

  const seasonId = `season-${year}`;
  const dates = (games as IncomingGame[]).map((g) => g.date).sort();
  const existingSeason = await writeClient.fetch<Season | null>(`*[_type == "season" && _id == $id][0]{_id, year}`, {
    id: seasonId,
  });

  const tx = writeClient.transaction();
  if (!existingSeason) {
    tx.createIfNotExists({
      _id: seasonId,
      _type: "season",
      year,
      isActive: false,
      regularSeasonStart: dates[0],
      regularSeasonEnd: dates[dates.length - 1],
      playoffCutoff: 8,
    });
  }
  for (const g of games as IncomingGame[]) {
    tx.create({
      _type: "game",
      season: { _type: "reference", _ref: seasonId },
      date: g.date,
      time: g.time,
      field: g.field,
      homeTeam: { _type: "reference", _ref: g.homeTeamId },
      awayTeam: { _type: "reference", _ref: g.awayTeamId },
      status: "scheduled",
    });
  }
  await tx.commit();

  // Seeds a 0-0-0 standing row for every team now that they have games —
  // reuses the same recalculation the admin's "Sync Standings" button
  // already calls, rather than duplicating that logic here.
  await recalculateStandings(seasonId);

  return NextResponse.json({ season: { _id: seasonId, year }, gamesCreated: games.length });
}

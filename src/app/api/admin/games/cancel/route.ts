import { NextRequest, NextResponse } from "next/server";
import { requireAdminApiAuth } from "@/lib/admin-auth";
import { client, writeClient } from "@/lib/sanity/client";
import { gamesByIdsQuery, standingsBySeasonQuery, subscriberEmailsQuery } from "@/lib/sanity/queries";
import { recalculateStandings } from "@/lib/standings";
import { sendGameCancellationAlert } from "@/lib/resend";
import { sendPushToAll } from "@/lib/push";
import type { Standing } from "@/lib/types";

interface GameForCancel {
  _id: string;
  date: string;
  time: string;
  field: string;
  status: string;
  homeTeam: { _id: string; name: string };
  awayTeam: { _id: string; name: string };
  seasonId: string;
  seasonYear: number;
}

export async function POST(req: NextRequest) {
  const auth = requireAdminApiAuth(req);
  if ("response" in auth) return auth.response;

  const body = await req.json().catch(() => null);
  const gameIds = Array.isArray(body?.gameIds) ? body.gameIds.filter((id: unknown) => typeof id === "string") : [];

  if (gameIds.length === 0) {
    return NextResponse.json({ error: "No games specified." }, { status: 400 });
  }

  const games = await writeClient.fetch<GameForCancel[]>(gamesByIdsQuery, { ids: gameIds });
  if (games.length === 0) {
    return NextResponse.json({ error: "Games not found." }, { status: 404 });
  }

  const tx = writeClient.transaction();
  for (const game of games) {
    tx.patch(game._id, (p) => p.set({ status: "cancelled", homeScore: 1, awayScore: 1 }).unset(["forfeitingTeam"]));
  }
  await tx.commit();

  const seasonIds = Array.from(new Set(games.map((g) => g.seasonId)));
  await Promise.all(seasonIds.map((id) => recalculateStandings(id)));

  const emails = await client.fetch<string[]>(subscriberEmailsQuery);
  const gameSummaries = games.map((g) => ({
    homeTeam: g.homeTeam.name,
    awayTeam: g.awayTeam.name,
    date: g.date,
    time: g.time,
    field: g.field,
    status: "cancelled",
  }));

  await Promise.all([
    sendGameCancellationAlert(emails, gameSummaries),
    sendPushToAll({
      title: games.length === 1 ? "Game Cancelled" : `${games.length} Games Cancelled`,
      body:
        games.length === 1
          ? `${gameSummaries[0].homeTeam} vs ${gameSummaries[0].awayTeam} — ${gameSummaries[0].time} at ${gameSummaries[0].field}`
          : `${games.length} games cancelled for tonight — check the schedule for details.`,
      url: "/schedule",
    }),
  ]);

  const primarySeasonYear = games[0].seasonYear;
  const standings = await writeClient.fetch<Standing[]>(standingsBySeasonQuery, {
    year: primarySeasonYear,
  });

  return NextResponse.json({ cancelledGameIds: games.map((g) => g._id), standings });
}

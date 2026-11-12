import { NextRequest, NextResponse } from "next/server";
import { requireTeamApiAuth } from "@/lib/team-auth";
import { writeClient } from "@/lib/sanity/client";
import { statLinesByGameQuery, statLinesByTeamQuery, rosterByTeamQuery } from "@/lib/sanity/queries";
import { computeSeasonTotals, type StatLine } from "@/lib/teamStats";
import type { RosterPlayer } from "@/lib/types";

type StoredLine = StatLine;

// Deterministic id so re-saving a game's stats updates the same docs
// instead of creating duplicates every time the captain hits Save.
function lineId(teamId: string, gameId: string, playerId: string) {
  return `statline-${teamId}-${gameId}-${playerId}`;
}

export async function GET(req: NextRequest) {
  const auth = await requireTeamApiAuth(req);
  if ("response" in auth) return auth.response;
  const { teamId } = auth.session;

  const gameId = req.nextUrl.searchParams.get("gameId");
  if (gameId) {
    const lines = await writeClient.fetch<StoredLine[]>(statLinesByGameQuery, { teamId, gameId });
    return NextResponse.json({ lines });
  }

  // Season totals: compute by summing every saved line per player.
  const [allLines, roster] = await Promise.all([
    writeClient.fetch<StoredLine[]>(statLinesByTeamQuery, { teamId }),
    writeClient.fetch<RosterPlayer[]>(rosterByTeamQuery, { teamId }),
  ]);

  return NextResponse.json({ totals: computeSeasonTotals(roster, allLines) });
}

export async function POST(req: NextRequest) {
  const auth = await requireTeamApiAuth(req);
  if ("response" in auth) return auth.response;
  const { teamId } = auth.session;

  const body = await req.json().catch(() => null);
  const gameId = typeof body?.gameId === "string" ? body.gameId : "";
  const lines = Array.isArray(body?.lines) ? body.lines : [];
  if (!gameId || lines.length === 0) {
    return NextResponse.json({ error: "gameId and lines are required." }, { status: 400 });
  }

  const tx = writeClient.transaction();
  for (const line of lines) {
    const playerId = typeof line?.playerId === "string" ? line.playerId : "";
    if (!playerId) continue;
    const num = (v: unknown) => Math.max(0, Number(v) || 0);
    tx.createOrReplace({
      _id: lineId(teamId, gameId, playerId),
      _type: "gameStatLine",
      team: { _type: "reference", _ref: teamId },
      game: { _type: "reference", _ref: gameId },
      player: { _type: "reference", _ref: playerId },
      ab: num(line.ab),
      h: num(line.h),
      r: num(line.r),
      rbi: num(line.rbi),
      hr: num(line.hr),
      e: num(line.e),
    });
  }
  await tx.commit();

  return NextResponse.json({ ok: true });
}

/** Clears every stat line this team saved for one game — e.g. to undo test data. */
export async function DELETE(req: NextRequest) {
  const auth = await requireTeamApiAuth(req);
  if ("response" in auth) return auth.response;
  const { teamId } = auth.session;

  const gameId = req.nextUrl.searchParams.get("gameId");
  if (!gameId) {
    return NextResponse.json({ error: "gameId is required." }, { status: 400 });
  }

  const ids = await writeClient.fetch<string[]>(
    `*[_type == "gameStatLine" && team._ref == $teamId && game._ref == $gameId]._id`,
    { teamId, gameId }
  );
  if (ids.length > 0) {
    const tx = writeClient.transaction();
    for (const id of ids) tx.delete(id);
    await tx.commit();
  }

  return NextResponse.json({ ok: true, deleted: ids.length });
}

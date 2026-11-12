import { NextRequest, NextResponse } from "next/server";
import { requireTeamApiAuth } from "@/lib/team-auth";
import { writeClient } from "@/lib/sanity/client";
import { beerAssignmentsByTeamQuery } from "@/lib/sanity/queries";
import type { BeerAssignment } from "@/lib/types";

function assignmentId(teamId: string, gameId: string) {
  return `beer-${teamId}-${gameId}`;
}

export async function GET(req: NextRequest) {
  const auth = await requireTeamApiAuth(req);
  if ("response" in auth) return auth.response;

  const assignments = await writeClient.fetch<BeerAssignment[]>(beerAssignmentsByTeamQuery, { teamId: auth.session.teamId });
  return NextResponse.json({ assignments });
}

/** Upsert — reassigning a game's beer duty just calls this again with a new playerId. */
export async function POST(req: NextRequest) {
  const auth = await requireTeamApiAuth(req);
  if ("response" in auth) return auth.response;
  const { teamId } = auth.session;

  const body = await req.json().catch(() => null);
  const gameId = typeof body?.gameId === "string" ? body.gameId : "";
  const playerId = typeof body?.playerId === "string" ? body.playerId : "";
  if (!gameId || !playerId) {
    return NextResponse.json({ error: "gameId and playerId are required." }, { status: 400 });
  }

  const id = assignmentId(teamId, gameId);
  const existing = await writeClient.fetch<{ player?: string; sevenDayReminderSentAt?: string; oneDayReminderSentAt?: string } | null>(
    `*[_type == "beerAssignment" && _id == $id][0]{"player": player._ref, sevenDayReminderSentAt, oneDayReminderSentAt}`,
    { id }
  );
  const reassigning = Boolean(existing && existing.player !== playerId);

  await writeClient.createOrReplace({
    _id: id,
    _type: "beerAssignment",
    team: { _type: "reference", _ref: teamId },
    game: { _type: "reference", _ref: gameId },
    player: { _type: "reference", _ref: playerId },
    // Reset reminder flags on reassignment so the new player still gets
    // their own 7-day/1-day notice, rather than either inheriting a
    // "already sent" state meant for whoever had it before, or (if we just
    // omitted these fields unconditionally) silently wiping a real sent
    // timestamp every time the captain re-saves the same assignment.
    ...(reassigning
      ? {}
      : {
          sevenDayReminderSentAt: existing?.sevenDayReminderSentAt,
          oneDayReminderSentAt: existing?.oneDayReminderSentAt,
        }),
  });

  return NextResponse.json({ ok: true });
}

/** Clears a game's beer assignment entirely — e.g. to undo test data. */
export async function DELETE(req: NextRequest) {
  const auth = await requireTeamApiAuth(req);
  if ("response" in auth) return auth.response;
  const { teamId } = auth.session;

  const gameId = req.nextUrl.searchParams.get("gameId");
  if (!gameId) {
    return NextResponse.json({ error: "gameId is required." }, { status: 400 });
  }

  await writeClient.delete(assignmentId(teamId, gameId));
  return NextResponse.json({ ok: true });
}

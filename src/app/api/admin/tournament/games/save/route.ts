import { NextRequest, NextResponse } from "next/server";
import { requireAdminApiAuth } from "@/lib/admin-auth";
import { writeClient } from "@/lib/sanity/client";
import { tournamentGamesQuery } from "@/lib/sanity/queries";
import type { TournamentGame } from "@/lib/types";

// Maps each Wild Card / Quarter Final / Semi Final game's sortOrder to the
// "<label> Winner" placeholder text that identifies it in the NEXT round —
// e.g. sortOrder 21 is the real game behind every "Wild Card #1 Winner"
// team slot. Matches the McGregor bracket's fixed sortOrder layout (see
// WILD_CARD_ROUND_SORT_ORDER in wildcard/save/route.ts for the equivalent
// rank->sortOrder mapping used to fill the Wild Card round itself) —
// sortOrder 23/24 are intentionally swapped here because that's the real
// game pairing (23 is the "Wild Card #4" game, 24 is "Wild Card #3").
const NEXT_ROUND_LABEL_BY_SORT_ORDER: Record<number, string> = {
  21: "Wild Card #1",
  22: "Wild Card #2",
  23: "Wild Card #4",
  24: "Wild Card #3",
  25: "Quarter Final #1",
  26: "Quarter Final #2",
  27: "Quarter Final #3",
  28: "Quarter Final #4",
  29: "Semi Final #1",
  30: "Semi Final #2",
};

/**
 * Once a Wild Card / Quarter Final / Semi Final game gets a final score,
 * automatically writes the winning team's real name into whichever later
 * game currently shows "<this game's label> Winner" as a placeholder — so
 * the admin never has to manually type the winner into the next round.
 * Re-saving a corrected score re-propagates the (possibly new) winner the
 * same way; it does not retroactively fix a downstream game that already
 * had its own score entered against the old, wrong winner — that's rare
 * enough (and risky enough to guess at automatically) to leave as a manual
 * fix via the existing "edit team names" pencil icon if it ever happens.
 */
export async function advanceWinnerIfApplicable(
  year: number,
  type: string,
  sortOrder: number | undefined,
  homeTeam: string,
  awayTeam: string,
  homeScore: number,
  awayScore: number
) {
  if (sortOrder === undefined || homeScore === awayScore) return;
  const label = NEXT_ROUND_LABEL_BY_SORT_ORDER[sortOrder];
  if (!label) return;

  const winner = homeScore > awayScore ? homeTeam : awayTeam;
  const placeholder = `${label} Winner`;

  const targets = await writeClient.fetch<{ _id: string; homeTeam?: string; awayTeam?: string }[]>(
    `*[_type == "tournamentGame" && year == $year && type == $type && (homeTeam == $placeholder || awayTeam == $placeholder)]{_id, homeTeam, awayTeam}`,
    { year, type, placeholder }
  );
  if (targets.length === 0) return;

  const tx = writeClient.transaction();
  for (const g of targets) {
    const patch: Record<string, string> = {};
    if (g.homeTeam === placeholder) patch.homeTeam = winner;
    if (g.awayTeam === placeholder) patch.awayTeam = winner;
    if (Object.keys(patch).length > 0) tx.patch(g._id, (p) => p.set(patch));
  }
  await tx.commit();
}

export async function POST(req: NextRequest) {
  const auth = await requireAdminApiAuth(req);
  if ("response" in auth) return auth.response;

  const body = await req.json().catch(() => null);
  const gameId = typeof body?.gameId === "string" ? body.gameId : "";
  const final = Boolean(body?.final);
  const homeScore = Number(body?.homeScore);
  const awayScore = Number(body?.awayScore);
  const year = Number(body?.year);
  const type = typeof body?.type === "string" ? body.type : "";
  // Optional — lets the admin swap a placeholder name (e.g. "Wild Card #1
  // Winner") for the real team once it's known, without deleting/recreating
  // the game. Omit to leave the team names untouched.
  const homeTeam = typeof body?.homeTeam === "string" ? body.homeTeam.trim() : undefined;
  const awayTeam = typeof body?.awayTeam === "string" ? body.awayTeam.trim() : undefined;

  if (!gameId || !Number.isInteger(year) || !type) {
    return NextResponse.json({ error: "Missing gameId or year/type." }, { status: 400 });
  }

  const patch = writeClient.patch(gameId);
  if (final) {
    if (!Number.isFinite(homeScore) || !Number.isFinite(awayScore) || homeScore < 0 || awayScore < 0) {
      return NextResponse.json({ error: "Scores must be non-negative numbers." }, { status: 400 });
    }
    patch.set({ homeScore, awayScore });
  } else {
    patch.unset(["homeScore", "awayScore"]);
  }
  const teamPatch: Record<string, string> = {};
  if (homeTeam) teamPatch.homeTeam = homeTeam;
  if (awayTeam) teamPatch.awayTeam = awayTeam;
  if (Object.keys(teamPatch).length > 0) patch.set(teamPatch);
  await patch.commit();

  if (final) {
    const saved = await writeClient.fetch<{ sortOrder?: number; homeTeam?: string; awayTeam?: string }>(
      `*[_id == $gameId][0]{sortOrder, homeTeam, awayTeam}`,
      { gameId }
    );
    if (saved?.homeTeam && saved?.awayTeam) {
      await advanceWinnerIfApplicable(year, type, saved.sortOrder, saved.homeTeam, saved.awayTeam, homeScore, awayScore);
    }
  }

  const games = await writeClient.fetch<TournamentGame[]>(tournamentGamesQuery, { year, type });
  return NextResponse.json({ games });
}

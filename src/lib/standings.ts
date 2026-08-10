import { writeClient } from "@/lib/sanity/client";

interface RawGame {
  status: string;
  homeScore?: number;
  awayScore?: number;
  homeTeam: string | null;
  awayTeam: string | null;
  forfeitingTeam?: "home" | "away";
}

interface RawStanding {
  _id: string;
  team: string;
}

interface TeamStat {
  teamId: string;
  wins: number;
  losses: number;
  ties: number;
  runsFor: number;
  runsAgainst: number;
  defaults: number;
}

/**
 * Recomputes W/L/T and run differential for every team in a season from its
 * `final` and `forfeit` games (per league rule — cancelled/scheduled/live
 * games don't count), then upserts one Standing document per team. Forfeits
 * count as a played game for both teams: the forfeiting team gets a loss
 * recorded as a 0-1 score (plus a "D" default tally), the other team a win
 * recorded as 1-0 — matching MMSPL's rule that a forfeit is scored
 * identically to a real 1-0 game. Teams that already have a standings row
 * for this season are kept even with zero counted games (shown at 0-0-0)
 * rather than disappearing.
 */
export async function recalculateStandings(seasonId: string) {
  const [games, existingStandings] = await Promise.all([
    writeClient.fetch<RawGame[]>(
      `*[_type == "game" && season._ref == $seasonId]{
        status,
        homeScore,
        awayScore,
        forfeitingTeam,
        "homeTeam": homeTeam._ref,
        "awayTeam": awayTeam._ref
      }`,
      { seasonId }
    ),
    writeClient.fetch<RawStanding[]>(
      `*[_type == "standing" && season._ref == $seasonId]{ _id, "team": team._ref }`,
      { seasonId }
    ),
  ]);

  const stats = new Map<string, TeamStat>();
  const ensure = (teamId: string) => {
    let stat = stats.get(teamId);
    if (!stat) {
      stat = { teamId, wins: 0, losses: 0, ties: 0, runsFor: 0, runsAgainst: 0, defaults: 0 };
      stats.set(teamId, stat);
    }
    return stat;
  };

  for (const standing of existingStandings) ensure(standing.team);
  for (const game of games) {
    if (game.homeTeam) ensure(game.homeTeam);
    if (game.awayTeam) ensure(game.awayTeam);
  }

  for (const game of games) {
    if (!game.homeTeam || !game.awayTeam) continue;

    let homeScore: number;
    let awayScore: number;

    if (game.status === "final") {
      if (typeof game.homeScore !== "number" || typeof game.awayScore !== "number") continue;
      homeScore = game.homeScore;
      awayScore = game.awayScore;
    } else if (game.status === "forfeit") {
      // Always scored as a 1-0 decision in favour of the non-forfeiting team.
      if (game.forfeitingTeam !== "home" && game.forfeitingTeam !== "away") continue;
      homeScore = game.forfeitingTeam === "home" ? 0 : 1;
      awayScore = game.forfeitingTeam === "away" ? 0 : 1;
    } else {
      continue;
    }

    const home = ensure(game.homeTeam);
    const away = ensure(game.awayTeam);

    if (game.status === "forfeit") {
      (game.forfeitingTeam === "home" ? home : away).defaults += 1;
    }

    home.runsFor += homeScore;
    home.runsAgainst += awayScore;
    away.runsFor += awayScore;
    away.runsAgainst += homeScore;

    if (homeScore > awayScore) {
      home.wins += 1;
      away.losses += 1;
    } else if (awayScore > homeScore) {
      away.wins += 1;
      home.losses += 1;
    } else {
      home.ties += 1;
      away.ties += 1;
    }
  }

  if (stats.size === 0) return [];

  const existingIdByTeam = new Map(existingStandings.map((s) => [s.team, s._id]));
  const tx = writeClient.transaction();

  for (const stat of stats.values()) {
    const patch = {
      wins: stat.wins,
      losses: stat.losses,
      ties: stat.ties,
      runDifferential: stat.runsFor - stat.runsAgainst,
      defaults: stat.defaults,
    };
    const existingId = existingIdByTeam.get(stat.teamId);
    if (existingId) {
      tx.patch(existingId, (p) => p.set(patch));
    } else {
      tx.create({
        _type: "standing",
        season: { _type: "reference", _ref: seasonId },
        team: { _type: "reference", _ref: stat.teamId },
        ...patch,
      });
    }
  }

  await tx.commit();

  return Array.from(stats.values());
}

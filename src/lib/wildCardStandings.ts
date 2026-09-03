import type { Standing, TournamentGame } from "./types";

export interface DivisionWinner {
  pool: string;
  teamName: string;
  /** Overall Phase 1 record (all 3 games, same basis as the Wild Card
   * table below) — not the in-box-only record that decided the bye, so a
   * tie from a cross-box friendly game doesn't vanish from view just
   * because this team is excluded from the Wild Card table. */
  wins: number;
  losses: number;
  ties: number;
  runDifferential: number;
}

export interface ComputedWildCardEntry {
  rank: number;
  teamName: string;
  pool?: string;
  wins: number;
  losses: number;
  ties: number;
  runDifferential: number;
  runsScored: number;
  regularSeasonPoints: number;
  advanced: boolean;
  /** Still level with a neighbour after every quantitative tie-break —
   * house rules call for a coin flip at this point, which a human has to
   * actually do and then reorder manually before saving. */
  tiedForCoinFlip: boolean;
}

export interface WildCardStandingsResult {
  divisionWinners: DivisionWinner[];
  wildCard: ComputedWildCardEntry[];
  gamesConsidered: number;
  totalRoundRobinGames: number;
}

interface TeamPhase1Stats {
  teamName: string;
  wins: number;
  losses: number;
  ties: number;
  runsScored: number;
  runsAllowed: number;
}

function emptyStats(teamName: string): TeamPhase1Stats {
  return { teamName, wins: 0, losses: 0, ties: 0, runsScored: 0, runsAllowed: 0 };
}

function applyGame(stats: TeamPhase1Stats, ownScore: number, oppScore: number) {
  stats.runsScored += ownScore;
  stats.runsAllowed += oppScore;
  if (ownScore > oppScore) stats.wins += 1;
  else if (ownScore < oppScore) stats.losses += 1;
  else stats.ties += 1;
}

function recordPoints(s: TeamPhase1Stats) {
  return s.wins * 2 + s.ties;
}

function runDiff(s: TeamPhase1Stats) {
  return s.runsScored - s.runsAllowed;
}

/**
 * Computes Phase 2 (Wild Card) seeding from actual Thu-Sat round robin
 * results, per the league's house rules:
 *  - The 4 Division Winners are the best record *within their own box*
 *    (pool games only) — they get the Phase 3 bye, opponent assigned by a
 *    physical draw once Phase 2 finishes (not something to compute here).
 *  - The other 10 teams are ranked 1-8 (advance to Wild Card round,
 *    matched 1v8/2v7/3v6/4v5) / 9-10 (eliminated) by their OVERALL Thu-Sat
 *    record — all 3 games each, including the cross A/B "friendly" games.
 *    Those friendlies exist specifically so every team plays exactly 3
 *    Thu-Sat games regardless of box size, making this comparison fair
 *    across boxes of different sizes.
 *  - Tie-break order, in this exact sequence: W-L record, run differential,
 *    runs scored, regular season points, coin flip. The first four are
 *    computed; a coin flip is a real physical tie-break a human has to
 *    perform, so ties that survive all four just get flagged.
 *
 * Only round robin games with both scores entered are counted, so this can
 * be run mid-tournament for a live look — `gamesConsidered` vs.
 * `totalRoundRobinGames` tells the caller how complete that picture is.
 */
export function computeWildCardStandings(
  games: TournamentGame[],
  regularSeasonStandings: Standing[]
): WildCardStandingsResult | null {
  const roundRobin = games.filter((g) => g.round === "roundRobin");
  const scored = roundRobin.filter((g) => typeof g.homeScore === "number" && typeof g.awayScore === "number");
  if (scored.length === 0) return null;

  const seasonPoints = new Map<string, number>();
  for (const s of regularSeasonStandings) {
    seasonPoints.set(s.team.name, s.wins * 2 + s.ties);
  }

  const overall = new Map<string, TeamPhase1Stats>();
  const inBox = new Map<string, TeamPhase1Stats>();
  const boxOfTeam = new Map<string, string>();

  for (const g of scored) {
    if (!g.homeTeam || !g.awayTeam) continue;
    const homeScore = g.homeScore as number;
    const awayScore = g.awayScore as number;

    const home = overall.get(g.homeTeam) ?? emptyStats(g.homeTeam);
    const away = overall.get(g.awayTeam) ?? emptyStats(g.awayTeam);
    applyGame(home, homeScore, awayScore);
    applyGame(away, awayScore, homeScore);
    overall.set(g.homeTeam, home);
    overall.set(g.awayTeam, away);

    if (g.pool) {
      boxOfTeam.set(g.homeTeam, g.pool);
      boxOfTeam.set(g.awayTeam, g.pool);
      const homeIn = inBox.get(g.homeTeam) ?? emptyStats(g.homeTeam);
      const awayIn = inBox.get(g.awayTeam) ?? emptyStats(g.awayTeam);
      applyGame(homeIn, homeScore, awayScore);
      applyGame(awayIn, awayScore, homeScore);
      inBox.set(g.homeTeam, homeIn);
      inBox.set(g.awayTeam, awayIn);
    }
  }

  const tieBreakCompare = (a: TeamPhase1Stats, b: TeamPhase1Stats) =>
    recordPoints(b) - recordPoints(a) ||
    runDiff(b) - runDiff(a) ||
    b.runsScored - a.runsScored ||
    (seasonPoints.get(b.teamName) ?? 0) - (seasonPoints.get(a.teamName) ?? 0);

  const byPool = new Map<string, TeamPhase1Stats[]>();
  for (const [teamName, pool] of boxOfTeam.entries()) {
    const stats = inBox.get(teamName);
    if (!stats) continue;
    const list = byPool.get(pool) ?? [];
    list.push(stats);
    byPool.set(pool, list);
  }

  const divisionWinners: DivisionWinner[] = [];
  const divisionWinnerNames = new Set<string>();
  for (const [pool, list] of [...byPool.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    const sorted = [...list].sort(tieBreakCompare);
    if (sorted.length === 0) continue;
    const winner = sorted[0];
    // Who wins the box is decided on in-box (pool games only) record, but
    // the record shown here is the OVERALL Phase 1 record (all 3 games,
    // including the cross A/B "friendly") — using the in-box-only record
    // here would silently drop any tie that happened specifically in a
    // cross-box friendly game, since those never touch inBox stats.
    const overallStats = overall.get(winner.teamName) ?? winner;
    divisionWinners.push({
      pool,
      teamName: winner.teamName,
      wins: overallStats.wins,
      losses: overallStats.losses,
      ties: overallStats.ties,
      runDifferential: runDiff(overallStats),
    });
    divisionWinnerNames.add(sorted[0].teamName);
  }

  const wildCardCandidates = [...overall.values()].filter((s) => !divisionWinnerNames.has(s.teamName));
  const sortedWc = [...wildCardCandidates].sort(tieBreakCompare);

  const wildCard: ComputedWildCardEntry[] = sortedWc.map((s, i) => {
    const tiedWithNext = i < sortedWc.length - 1 && tieBreakCompare(s, sortedWc[i + 1]) === 0;
    const tiedWithPrev = i > 0 && tieBreakCompare(sortedWc[i - 1], s) === 0;
    return {
      rank: i + 1,
      teamName: s.teamName,
      pool: boxOfTeam.get(s.teamName),
      wins: s.wins,
      losses: s.losses,
      ties: s.ties,
      runDifferential: runDiff(s),
      runsScored: s.runsScored,
      regularSeasonPoints: seasonPoints.get(s.teamName) ?? 0,
      advanced: i < 8,
      tiedForCoinFlip: tiedWithNext || tiedWithPrev,
    };
  });

  return {
    divisionWinners,
    wildCard,
    gamesConsidered: scored.length,
    totalRoundRobinGames: roundRobin.length,
  };
}

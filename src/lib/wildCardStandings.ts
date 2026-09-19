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
  /** Tied on points, in-box head-to-head, in-box run diff, AND in-box runs
   * scored — a real coin toss is required to decide this box, same as the
   * Wild Card table's tiedForCoinFlip. */
  coinTossNeeded: boolean;
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

const MAX_RUN_DIFF_PER_GAME = 7;

interface TeamPhase1Stats {
  teamName: string;
  wins: number;
  losses: number;
  ties: number;
  runsScored: number;
  runsAllowed: number;
  /** Sum of each game's run differential, each individually capped at
   * ±7 (the league's mercy-rule cap) before adding — NOT derived from
   * runsScored - runsAllowed, since that would let a single blowout game
   * (e.g. a 14-6 final, a real +8) contribute more than the capped +7 the
   * league actually counts. runsScored/runsAllowed themselves stay
   * uncapped — only the differential used for standings/tie-breaks is. */
  runDiffCapped: number;
}

function emptyStats(teamName: string): TeamPhase1Stats {
  return { teamName, wins: 0, losses: 0, ties: 0, runsScored: 0, runsAllowed: 0, runDiffCapped: 0 };
}

function applyGame(stats: TeamPhase1Stats, ownScore: number, oppScore: number) {
  stats.runsScored += ownScore;
  stats.runsAllowed += oppScore;
  const rawDiff = ownScore - oppScore;
  stats.runDiffCapped += Math.max(-MAX_RUN_DIFF_PER_GAME, Math.min(MAX_RUN_DIFF_PER_GAME, rawDiff));
  if (ownScore > oppScore) stats.wins += 1;
  else if (ownScore < oppScore) stats.losses += 1;
  else stats.ties += 1;
}

function recordPoints(s: TeamPhase1Stats) {
  return s.wins * 2 + s.ties;
}

function runDiff(s: TeamPhase1Stats) {
  return s.runDiffCapped;
}

// Division Winner tie-break is deliberately its own, shorter chain — NOT
// the same as the Wild Card ranking's chain below. Per house rules: winner
// of the specific head-to-head game between the tied teams (not overall
// record — with only one in-box meeting per pair, "who won that game" and
// "head-to-head record" are the same thing anyway); if that game was itself
// a tie, best in-box run differential (each game capped at ±7 runs — the
// league's mercy-rule cap, see MAX_RUN_DIFF_PER_GAME); then most in-box
// runs scored (uncapped — actual runs, not differential); then a real coin
// toss. No regular-season-points level here, unlike Wild Card.
const DIVISION_WINNER_LEVELS = ["headToHeadWins", "runDiff", "runsScored"] as const;

function headToHeadWins(teamName: string, opponentNames: Set<string>, poolGames: TournamentGame[]): number {
  let wins = 0;
  for (const g of poolGames) {
    if (!g.homeTeam || !g.awayTeam) continue;
    const isHome = g.homeTeam === teamName;
    const isAway = g.awayTeam === teamName;
    if (!isHome && !isAway) continue;
    const opponent = isHome ? g.awayTeam : g.homeTeam;
    if (!opponentNames.has(opponent)) continue;
    const own = (isHome ? g.homeScore : g.awayScore) as number;
    const opp = (isHome ? g.awayScore : g.homeScore) as number;
    if (own > opp) wins += 1;
  }
  return wins;
}

/** Narrows a group of teams tied on in-box points down through the
 * Division Winner tie-break levels, stopping as soon as one team is alone
 * in the lead. Whoever (or whichever group, if it never narrows to one) is
 * left after all levels are exhausted is the result — flagged if it's
 * still more than one team. */
function resolveDivisionWinner(
  tiedOnPoints: TeamPhase1Stats[],
  poolGames: TournamentGame[]
): { winner: TeamPhase1Stats; coinTossNeeded: boolean } {
  let group = tiedOnPoints;
  for (const level of DIVISION_WINNER_LEVELS) {
    if (group.length <= 1) break;
    const names = new Set(group.map((s) => s.teamName));
    const scored = group.map((s) => {
      const score =
        level === "headToHeadWins"
          ? headToHeadWins(s.teamName, names, poolGames)
          : level === "runDiff"
            ? runDiff(s)
            : s.runsScored;
      return { s, score };
    });
    const maxScore = Math.max(...scored.map((x) => x.score));
    group = scored.filter((x) => x.score === maxScore).map((x) => x.s);
  }
  return { winner: group[0], coinTossNeeded: group.length > 1 };
}

/**
 * Computes Phase 2 (Wild Card) seeding from actual Thu-Sat round robin
 * results, per the league's house rules — two DIFFERENT tie-break chains.
 * Every run differential used below (team totals AND any head-to-head
 * figure) is the sum of each individual game's differential capped at
 * ±7 runs — the league's mercy-rule cap — not the raw score gap, so a
 * blowout game can't swing a tie-break further than the league actually
 * counts it. Runs *scored* is never capped, only the differential.
 *  - The 4 Division Winners are the best record *within their own box*
 *    (pool games only) — they get the Phase 3 bye, opponent assigned by a
 *    physical draw once Phase 2 finishes (not something to compute here).
 *    Tied on in-box points? Break it by: winner of their head-to-head game
 *    (with one in-box meeting per pair, that's the same as head-to-head
 *    record), then best in-box run differential (capped), then most
 *    in-box runs scored, then a coin toss. No regular-season-points level
 *    here.
 *  - The other 10 teams are ranked 1-8 (advance to Wild Card round,
 *    matched 1v8/2v7/3v6/4v5) / 9-10 (eliminated) by their OVERALL Thu-Sat
 *    record — all 3 games each, including the cross A/B "friendly" games.
 *    Those friendlies exist specifically so every team plays exactly 3
 *    Thu-Sat games regardless of box size, making this comparison fair
 *    across boxes of different sizes. Tied on points? Break it by: best
 *    overall Phase 1 run differential (capped), then most Phase 1 runs
 *    scored, then regular season points, then a coin toss.
 * A coin toss is a real physical tie-break a human has to perform, so ties
 * that survive every computable level just get flagged, not guessed at.
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
  const poolGamesByLetter = new Map<string, TournamentGame[]>();

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

      const poolGames = poolGamesByLetter.get(g.pool) ?? [];
      poolGames.push(g);
      poolGamesByLetter.set(g.pool, poolGames);
    }
  }

  // Wild Card ranking's tie-break chain: points, then overall Phase 1 run
  // differential (capped ±7/game), then Phase 1 runs scored, then regular
  // season points, then a coin toss (flagged via tiedForCoinFlip below).
  // Division Winner selection has its own, separate, shorter chain (see
  // resolveDivisionWinner above), not this one.
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
    if (list.length === 0) continue;
    // "Tied for first place" is on in-box points — only that top group
    // goes through the Division Winner tie-break chain.
    const maxPoints = Math.max(...list.map(recordPoints));
    const tiedOnPoints = list.filter((s) => recordPoints(s) === maxPoints);
    const { winner, coinTossNeeded } = resolveDivisionWinner(tiedOnPoints, poolGamesByLetter.get(pool) ?? []);
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
      coinTossNeeded,
    });
    divisionWinnerNames.add(winner.teamName);
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

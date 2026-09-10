import type { Game, Standing } from "./types";

export type TiebreakLevel =
  | "points"
  | "headToHeadRecord"
  | "totalWins"
  | "headToHeadDiff"
  | "headToHeadRunsFor"
  | "seasonDiff"
  | "coinToss";

// Order matters — this is the league's official tie-break procedure, walked
// top to bottom until a level actually separates the tied teams.
export const TIE_BREAK_RULES: { level: TiebreakLevel; label: string }[] = [
  { level: "points", label: "Accumulated points during the regular season" },
  { level: "headToHeadRecord", label: "Head to head win/loss record" },
  { level: "totalWins", label: "Most total wins" },
  { level: "headToHeadDiff", label: "Best +/− in head-to-head games" },
  { level: "headToHeadRunsFor", label: "Most runs for in head-to-head games" },
  { level: "seasonDiff", label: "Best +/− in regular season games" },
  { level: "coinToss", label: "Coin toss" },
];

const LEVEL_ORDER: TiebreakLevel[] = [
  "headToHeadRecord",
  "totalWins",
  "headToHeadDiff",
  "headToHeadRunsFor",
  "seasonDiff",
];

export interface RankedStanding {
  standing: Standing;
  rank: number;
  /** Which criterion actually separated this team from whoever it was tied
   * with on points — "points" means no tie ever existed for this team. */
  decidedBy: TiebreakLevel;
  /** Every level was exhausted and this team is still tied with at least
   * one other — a real coin toss is required, not something code can
   * decide. Order among a coin-toss group is arbitrary (input order). */
  coinTossNeeded: boolean;
}

function h2hGames(teamIds: string[], games: Game[]): Game[] {
  const set = new Set(teamIds);
  return games.filter(
    (g) =>
      g.homeTeam &&
      g.awayTeam &&
      set.has(g.homeTeam._id) &&
      set.has(g.awayTeam._id) &&
      typeof g.homeScore === "number" &&
      typeof g.awayScore === "number"
  );
}

function h2hStatsFor(teamId: string, games: Game[]) {
  let wins = 0;
  let ties = 0;
  let runsFor = 0;
  let runsAgainst = 0;
  for (const g of games) {
    const isHome = g.homeTeam._id === teamId;
    const isAway = g.awayTeam._id === teamId;
    if (!isHome && !isAway) continue;
    const own = (isHome ? g.homeScore : g.awayScore) as number;
    const opp = (isHome ? g.awayScore : g.homeScore) as number;
    runsFor += own;
    runsAgainst += opp;
    if (own > opp) wins += 1;
    else if (own === opp) ties += 1;
  }
  return { points: wins * 2 + ties, diff: runsFor - runsAgainst, runsFor };
}

type Entry = { standing: Standing; decidedBy: TiebreakLevel; coinTossNeeded: boolean };

// `group` is always tied going in (length >= 2) — narrows as levels peel
// teams off. Head-to-head levels (record/diff/runsFor) are recomputed
// against whichever teams are STILL tied at that point, not the original
// full group — e.g. if 3 teams tie on points and head-to-head record splits
// it 1-vs-2, the remaining 2 get their head-to-head diff/runs-for computed
// from just their own mutual game(s), not the 3-team mini round robin.
function resolveGroup(group: Standing[], seasonGames: Game[], levelIndex: number): Entry[] {
  if (levelIndex >= LEVEL_ORDER.length) {
    return group.map((standing) => ({ standing, decidedBy: "coinToss", coinTossNeeded: true }));
  }

  const level = LEVEL_ORDER[levelIndex];
  const ids = group.map((s) => s.team._id);
  const needsH2H = level === "headToHeadRecord" || level === "headToHeadDiff" || level === "headToHeadRunsFor";
  const mutualGames = needsH2H ? h2hGames(ids, seasonGames) : [];

  const scoreOf = (standing: Standing): number => {
    switch (level) {
      case "headToHeadRecord":
        return h2hStatsFor(standing.team._id, mutualGames).points;
      case "totalWins":
        return standing.wins;
      case "headToHeadDiff":
        return h2hStatsFor(standing.team._id, mutualGames).diff;
      case "headToHeadRunsFor":
        return h2hStatsFor(standing.team._id, mutualGames).runsFor;
      case "seasonDiff":
        return standing.runDifferential;
      default:
        return 0;
    }
  };

  const byScore = new Map<number, Standing[]>();
  for (const standing of group) {
    const score = scoreOf(standing);
    const list = byScore.get(score) ?? [];
    list.push(standing);
    byScore.set(score, list);
  }

  const result: Entry[] = [];
  for (const score of [...byScore.keys()].sort((a, b) => b - a)) {
    const subgroup = byScore.get(score) as Standing[];
    if (subgroup.length === 1) {
      result.push({ standing: subgroup[0], decidedBy: level, coinTossNeeded: false });
    } else {
      result.push(...resolveGroup(subgroup, seasonGames, levelIndex + 1));
    }
  }
  return result;
}

/**
 * Ranks a season's standings per the league's official tie-break procedure
 * (see TIE_BREAK_RULES): points first, then — only for teams still tied —
 * head-to-head record, total wins, head-to-head +/-, head-to-head runs for,
 * season +/-, and finally a flagged-but-unresolved coin toss. Needs the
 * season's game log (not just the aggregate Standing rows) to compute the
 * head-to-head levels. Pure/stateless — recompute on every read rather than
 * storing a rank, same reasoning as the tournament seeding projection.
 */
export function computeSeasonRanking(standings: Standing[], seasonGames: Game[]): RankedStanding[] {
  const byPoints = new Map<number, Standing[]>();
  for (const s of standings) {
    const points = s.wins * 2 + s.ties;
    const list = byPoints.get(points) ?? [];
    list.push(s);
    byPoints.set(points, list);
  }

  const flat: Entry[] = [];
  for (const points of [...byPoints.keys()].sort((a, b) => b - a)) {
    const group = byPoints.get(points) as Standing[];
    if (group.length === 1) {
      flat.push({ standing: group[0], decidedBy: "points", coinTossNeeded: false });
    } else {
      flat.push(...resolveGroup(group, seasonGames, 0));
    }
  }

  return flat.map((entry, i) => ({ ...entry, rank: i + 1 }));
}

import type { Game, Standing, TournamentGame } from "./types";
import { computeProjectedBoxes, type ProjectedBox } from "./tournamentSeeding";
import { SLOT_TEMPLATE } from "./projectedSchedule";
import { computeWildCardStandings, type ComputedWildCardEntry, type DivisionWinner } from "./wildCardStandings";

// This is a for-fun toy, not a prediction tool — deliberately kept separate
// from the real projected-schedule/Wild Card logic used elsewhere on the
// tournament page. Every run is freshly randomized (never cached), so it's
// meant to be re-clicked, not treated as a forecast.

export interface SimulatedGame {
  label: string;
  round: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  winner: string | null;
}

export interface TournamentSimulationResult {
  boxes: ProjectedBox[];
  roundRobinGames: SimulatedGame[];
  divisionWinners: DivisionWinner[];
  wildCardRanking: ComputedWildCardEntry[];
  wildCardRoundGames: SimulatedGame[];
  quarterFinals: SimulatedGame[];
  semiFinals: SimulatedGame[];
  final: SimulatedGame;
  champion: string;
}

interface TeamPower {
  teamName: string;
  rating: number;
}

// Rank-tiered on purpose, not stat-magnitude-based: the league's own read
// is that regular season record alone overstates the gap at the top of the
// field — the top 7 teams by current standings are all live tournament
// threats regardless of exact regular season order, and the gap only really
// opens up further down the table. So every team ranked 1-7 gets the same
// baseline rating, then it steps down gradually below that. (A prior version
// of this hand-penalized one specific team based on a subjective read of
// their roster — that was a mistake; this rank-based approach doesn't single
// out any team, so there's nothing to re-litigate season to season.)
const TOP_TIER_SIZE = 7;
const RATING_STEP_BELOW_TOP_TIER = 6;

function rankBaseline(rank: number): number {
  if (rank <= TOP_TIER_SIZE) return 100;
  return 100 - (rank - TOP_TIER_SIZE) * RATING_STEP_BELOW_TOP_TIER;
}

function buildTeamPower(standings: Standing[]): Map<string, TeamPower> {
  const power = new Map<string, TeamPower>();
  // standingsBySeasonQuery is already ordered by (wins*2+ties) desc, then
  // run differential desc — so array position directly is the real rank.
  standings.forEach((s, i) => {
    power.set(s.team.name, { teamName: s.team.name, rating: rankBaseline(i + 1) });
  });
  return power;
}

// Small nudge from real regular-season head-to-head results between this
// exact pair, capped so it can shift a close game but never dominate it.
function headToHeadNudge(teamA: string, teamB: string, seasonGames: Game[]): number {
  let net = 0;
  for (const g of seasonGames) {
    if (typeof g.homeScore !== "number" || typeof g.awayScore !== "number") continue;
    const aHome = g.homeTeam.name === teamA && g.awayTeam.name === teamB;
    const bHome = g.homeTeam.name === teamB && g.awayTeam.name === teamA;
    if (!aHome && !bHome) continue;
    const aScore = aHome ? g.homeScore : g.awayScore;
    const bScore = aHome ? g.awayScore : g.homeScore;
    if (aScore > bScore) net += 1;
    else if (bScore > aScore) net -= 1;
  }
  return Math.max(-0.08, Math.min(0.08, net * 0.04));
}

function clamp(v: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, v));
}

function winProbability(ratingHome: number, ratingAway: number): number {
  const diff = ratingHome - ratingAway;
  return 1 / (1 + Math.exp(-diff / 12));
}

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function generateScore(outcome: "home" | "away" | "tie"): { home: number; away: number } {
  if (outcome === "tie") {
    const runs = 3 + Math.floor(Math.random() * 7);
    return { home: runs, away: runs };
  }
  const loserRuns = 3 + Math.floor(Math.random() * 7);
  let margin = 1 + Math.floor(Math.random() * 5);
  if (Math.random() < 0.12) margin += 2 + Math.floor(Math.random() * 6); // occasional blowout
  const winnerRuns = loserRuns + margin;
  return outcome === "home" ? { home: winnerRuns, away: loserRuns } : { home: loserRuns, away: winnerRuns };
}

function simulateGame(
  homeTeam: string,
  awayTeam: string,
  power: Map<string, TeamPower>,
  seasonGames: Game[],
  allowTie: boolean
): { homeScore: number; awayScore: number; winner: string | null } {
  const homeRating = power.get(homeTeam)?.rating ?? 50;
  const awayRating = power.get(awayTeam)?.rating ?? 50;
  let pHome = winProbability(homeRating, awayRating);
  pHome += headToHeadNudge(homeTeam, awayTeam, seasonGames);
  // Never a lock either way — the point is upsets stay possible.
  pHome = clamp(pHome, 0.18, 0.82);

  let outcome: "home" | "away" | "tie";
  if (allowTie && Math.random() < 0.1) {
    outcome = "tie";
  } else {
    outcome = Math.random() < pHome ? "home" : "away";
  }

  const { home, away } = generateScore(outcome);
  const winner = outcome === "tie" ? null : outcome === "home" ? homeTeam : awayTeam;
  return { homeScore: home, awayScore: away, winner };
}

function simulateBracketGame(
  label: string,
  round: string,
  homeTeam: string,
  awayTeam: string,
  power: Map<string, TeamPower>,
  seasonGames: Game[]
): SimulatedGame {
  const { homeScore, awayScore, winner } = simulateGame(homeTeam, awayTeam, power, seasonGames, false);
  return { label, round, homeTeam, awayTeam, homeScore, awayScore, winner };
}

const DAY_LABEL: Record<"thu" | "fri" | "sat", string> = { thu: "Thursday", fri: "Friday", sat: "Saturday" };

/**
 * Runs one full randomized playthrough of the McGregor bracket: boxes come
 * from the same live seeding used elsewhere (computeProjectedBoxes), Thu-Sat
 * results are randomly rolled per team "power" (the top 7 teams by current
 * standings are treated as equally live, with a gradual step down below
 * that, plus a small head-to-head nudge from any real regular-season
 * meeting), Division Winners/Wild Card ranking reuse the real house-rules
 * logic (computeWildCardStandings), Wild Card round is seeded 1v8/2v7/3v6/
 * 4v5, and Quarter Final pairings are randomly drawn (matching the real
 * "assigned by draw" rule) rather than fixed by seed.
 * Every call is freshly random — never memoize or cache this.
 */
export function simulateTournament(standings: Standing[], seasonGames: Game[]): TournamentSimulationResult | null {
  const boxes = computeProjectedBoxes(standings);
  if (!boxes) return null;

  const power = buildTeamPower(standings);
  const seedLookup = new Map<string, string>();
  for (const box of boxes) {
    box.teams.forEach((team, i) => seedLookup.set(`${box.poolLetter}${i + 1}`, team));
  }

  const roundRobinGames: SimulatedGame[] = [];
  const simulatedTournamentGames: TournamentGame[] = [];
  SLOT_TEMPLATE.forEach((slot, i) => {
    const homeTeam = seedLookup.get(slot.home);
    const awayTeam = seedLookup.get(slot.away);
    if (!homeTeam || !awayTeam) return;
    const { homeScore, awayScore, winner } = simulateGame(homeTeam, awayTeam, power, seasonGames, true);
    roundRobinGames.push({
      label: `${DAY_LABEL[slot.date]} · ${slot.time} · ${slot.field}`,
      round: "Round Robin",
      homeTeam,
      awayTeam,
      homeScore,
      awayScore,
      winner,
    });
    simulatedTournamentGames.push({
      _id: `sim-${i}`,
      year: 0,
      type: "mcgregor",
      date: slot.date,
      time: slot.time,
      field: slot.field,
      homeTeam,
      awayTeam,
      homeScore,
      awayScore,
      round: "roundRobin",
      pool: slot.pool,
      sortOrder: i,
    });
  });

  const wc = computeWildCardStandings(simulatedTournamentGames, standings);
  if (!wc) return null;

  const pairIndexes: [number, number][] = [
    [0, 7],
    [1, 6],
    [2, 5],
    [3, 4],
  ];
  const wildCardRoundGames: SimulatedGame[] = pairIndexes.map(([hi, li], idx) => {
    const home = wc.wildCard[hi].teamName;
    const away = wc.wildCard[li].teamName;
    return simulateBracketGame(`Wild Card ${idx + 1}`, "Wild Card", home, away, power, seasonGames);
  });

  // Division Winners' Quarter Final opponent is set by a draw once Phase 2
  // finishes — so this pairing is random, not seeded 1-1 with the WC games.
  const byeTeams = shuffle(wc.divisionWinners.map((d) => d.teamName));
  const wcWinners = shuffle(wildCardRoundGames.map((g) => g.winner as string));
  const quarterFinals: SimulatedGame[] = byeTeams.map((home, idx) =>
    simulateBracketGame(`Quarter Final ${idx + 1}`, "Quarter Final", home, wcWinners[idx], power, seasonGames)
  );

  const semiFinals: SimulatedGame[] = [
    simulateBracketGame(
      "Semi Final 1",
      "Semi Final",
      quarterFinals[0].winner as string,
      quarterFinals[1].winner as string,
      power,
      seasonGames
    ),
    simulateBracketGame(
      "Semi Final 2",
      "Semi Final",
      quarterFinals[2].winner as string,
      quarterFinals[3].winner as string,
      power,
      seasonGames
    ),
  ];

  const final = simulateBracketGame(
    "Final",
    "Final",
    semiFinals[0].winner as string,
    semiFinals[1].winner as string,
    power,
    seasonGames
  );

  return {
    boxes,
    roundRobinGames,
    divisionWinners: wc.divisionWinners,
    wildCardRanking: wc.wildCard,
    wildCardRoundGames,
    quarterFinals,
    semiFinals,
    final,
    champion: final.winner as string,
  };
}

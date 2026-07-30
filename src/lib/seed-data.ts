import { SEED_TEAM_NAMES } from "./seed-content";
import type { Standing, Game, NewsItem, Award, Team } from "./types";

/**
 * Static sample data rendered only when Sanity has no documents yet (or
 * isn't configured). Keeps Home/Standings/Schedule/Awards from looking
 * empty on first run. Replace by adding real documents in Studio — once
 * any documents exist for a type, Sanity's data takes over.
 */

function team(name: string, division: "A" | "B"): Team {
  return { _id: `seed-team-${name.toLowerCase().replace(/\s+/g, "-")}`, name, division };
}

export const SEED_TEAMS: Team[] = SEED_TEAM_NAMES.map((name, i) =>
  team(name, i % 2 === 0 ? "A" : "B")
);

export const SEED_STANDINGS: Standing[] = [
  { _id: "s1", team: SEED_TEAMS[0], wins: 18, losses: 4, ties: 0, runDifferential: 96 },
  { _id: "s2", team: SEED_TEAMS[1], wins: 16, losses: 6, ties: 0, runDifferential: 71 },
  { _id: "s3", team: SEED_TEAMS[2], wins: 15, losses: 6, ties: 1, runDifferential: 58 },
  { _id: "s4", team: SEED_TEAMS[3], wins: 14, losses: 8, ties: 0, runDifferential: 39 },
  { _id: "s5", team: SEED_TEAMS[4], wins: 13, losses: 9, ties: 0, runDifferential: 22 },
  { _id: "s6", team: SEED_TEAMS[5], wins: 12, losses: 9, ties: 1, runDifferential: 14 },
  { _id: "s7", team: SEED_TEAMS[6], wins: 11, losses: 10, ties: 1, runDifferential: 3 },
  { _id: "s8", team: SEED_TEAMS[7], wins: 10, losses: 11, ties: 1, runDifferential: -8 },
  { _id: "s9", team: SEED_TEAMS[8], wins: 9, losses: 12, ties: 1, runDifferential: -19 },
  { _id: "s10", team: SEED_TEAMS[9], wins: 8, losses: 13, ties: 1, runDifferential: -26 },
  { _id: "s11", team: SEED_TEAMS[10], wins: 7, losses: 14, ties: 1, runDifferential: -34 },
  { _id: "s12", team: SEED_TEAMS[11], wins: 6, losses: 15, ties: 1, runDifferential: -45 },
  { _id: "s13", team: SEED_TEAMS[12], wins: 5, losses: 16, ties: 1, runDifferential: -58 },
  { _id: "s14", team: SEED_TEAMS[13], wins: 3, losses: 18, ties: 1, runDifferential: -113 },
];

export const SEED_GAMES: Game[] = [
  { _id: "g1", date: "2026-08-04", time: "6:30 PM", field: "Centennial Park", status: "scheduled", homeTeam: SEED_TEAMS[0], awayTeam: SEED_TEAMS[3] },
  { _id: "g2", date: "2026-08-04", time: "8:15 PM", field: "Centennial Park", status: "scheduled", homeTeam: SEED_TEAMS[1], awayTeam: SEED_TEAMS[6] },
  { _id: "g3", date: "2026-08-04", time: "6:30 PM", field: "Mintleaf Park", status: "scheduled", homeTeam: SEED_TEAMS[2], awayTeam: SEED_TEAMS[5] },
  { _id: "g4", date: "2026-08-06", time: "7:00 PM", field: "Mintleaf Park", status: "scheduled", homeTeam: SEED_TEAMS[4], awayTeam: SEED_TEAMS[9] },
  { _id: "g5", date: "2026-07-28", time: "6:30 PM", field: "Centennial Park", status: "final", homeTeam: SEED_TEAMS[0], awayTeam: SEED_TEAMS[7], homeScore: 14, awayScore: 6 },
  { _id: "g6", date: "2026-07-28", time: "8:15 PM", field: "Mintleaf Park", status: "final", homeTeam: SEED_TEAMS[2], awayTeam: SEED_TEAMS[10], homeScore: 9, awayScore: 8 },
  { _id: "g7", date: "2026-07-30", time: "7:00 PM", field: "Centennial Park", status: "cancelled", homeTeam: SEED_TEAMS[3], awayTeam: SEED_TEAMS[8] },
  { _id: "g8", date: "2026-08-11", time: "6:30 PM", field: "Mintleaf Park", status: "scheduled", homeTeam: SEED_TEAMS[1], awayTeam: SEED_TEAMS[12] },
];

export const SEED_NEWS: NewsItem[] = [
  {
    _id: "n1",
    title: "Registration Opens for the 2027 Season",
    slug: { current: "registration-opens-2027" },
    body: [],
    date: "2026-10-20",
    tag: "registration",
  },
  {
    _id: "n2",
    title: "Ace Pools Moose Win the 2026 Charity Tournament",
    slug: { current: "ace-pools-moose-charity-champs-2026" },
    body: [],
    date: "2026-05-31",
    tag: "results",
  },
  {
    _id: "n3",
    title: "Charity Tournament Raises Funds for Markham Food Bank",
    slug: { current: "charity-tournament-2026-donations" },
    body: [],
    date: "2026-06-05",
    tag: "charity",
  },
];

export const SEED_AWARDS: Award[] = [
  { _id: "a1", year: 2025, category: "Most Valuable Player", winner: "R. Chen", description: "Led the league in batting average and RBIs across the regular season." },
  { _id: "a2", year: 2025, category: "Home Run Champion", winner: "D. Osei", description: "Set a new single-season franchise record with 22 home runs." },
  { _id: "a3", year: 2025, category: "Rookie of the Year", winner: "J. Park", description: "First-year draft pick who started every game of his rookie campaign." },
  { _id: "a4", year: 2024, category: "Most Valuable Player", winner: "M. Singh", description: "" },
  { _id: "a5", year: 2024, category: "Home Run Champion", winner: "T. Nguyen", description: "" },
];

export const SEED_AWARD_YEARS = Array.from(new Set(SEED_AWARDS.map((a) => a.year))).sort(
  (a, b) => b - a
);

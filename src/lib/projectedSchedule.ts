import type { ProjectedBox } from "./tournamentSeeding";
import type { TournamentGame, TournamentRound, TournamentType } from "./types";

export interface SlotTemplateEntry {
  date: "thu" | "fri" | "sat";
  time: string;
  field: string;
  home: string; // seed-slot code, e.g. "A1" = Box A's #1 seed
  away: string;
  /** Set only for genuine within-box games — omitted for the cross A/B
   * "friendly" games (Box A and B have 3 teams each, so they fill out to a
   * 3-game round robin per team with a cross-box matchup, same as 2010/2011). */
  pool?: string;
}

interface SundaySlotEntry {
  time: string;
  field: string;
  home: string;
  away: string;
  round: TournamentRound;
}

// Thu-Sat round-robin schedule, transcribed from the league's tournament
// template spreadsheet (matchups are seed-slot codes, not team names — those
// get filled in from live-projected box seeding). Sunday's Wild Card/QF/SF/
// Final bracket depends on actual Thu-Sat results, so it isn't projectable
// the same way and is intentionally left out.
export const SLOT_TEMPLATE: SlotTemplateEntry[] = [
  // Thursday (weekday — evening, always PM)
  { date: "thu", time: "6:30 PM", field: "Centennial North", home: "A1", away: "A3", pool: "A" },
  { date: "thu", time: "6:30 PM", field: "Mintleaf", home: "D3", away: "D4", pool: "D" },
  { date: "thu", time: "8:00 PM", field: "Centennial North", home: "B1", away: "B3", pool: "B" },
  { date: "thu", time: "8:00 PM", field: "Mintleaf", home: "C3", away: "C4", pool: "C" },
  { date: "thu", time: "9:30 PM", field: "Centennial North", home: "A2", away: "B2" },
  // Friday (weekday — evening, always PM)
  { date: "fri", time: "7:00 PM", field: "Centennial North", home: "C1", away: "C3", pool: "C" },
  { date: "fri", time: "7:00 PM", field: "Centennial South", home: "C2", away: "C4", pool: "C" },
  { date: "fri", time: "8:30 PM", field: "Centennial North", home: "D2", away: "D4", pool: "D" },
  { date: "fri", time: "8:30 PM", field: "Centennial South", home: "D1", away: "D3", pool: "D" },
  // Saturday (weekend — spans noon, AM before 12pm and PM after)
  { date: "sat", time: "8:30 AM", field: "Centennial North", home: "B2", away: "B3", pool: "B" },
  { date: "sat", time: "8:30 AM", field: "Centennial South", home: "A2", away: "A3", pool: "A" },
  { date: "sat", time: "10:00 AM", field: "Centennial North", home: "D1", away: "D2", pool: "D" },
  { date: "sat", time: "10:00 AM", field: "Centennial South", home: "C1", away: "C2", pool: "C" },
  { date: "sat", time: "11:30 AM", field: "Centennial North", home: "B1", away: "A3" },
  { date: "sat", time: "11:30 AM", field: "Centennial South", home: "A1", away: "B3" },
  { date: "sat", time: "1:00 PM", field: "Centennial North", home: "C2", away: "C3", pool: "C" },
  { date: "sat", time: "1:00 PM", field: "Centennial South", home: "D2", away: "D3", pool: "D" },
  { date: "sat", time: "2:30 PM", field: "Centennial North", home: "A1", away: "A2", pool: "A" },
  { date: "sat", time: "2:30 PM", field: "Centennial South", home: "B1", away: "B2", pool: "B" },
  { date: "sat", time: "4:00 PM", field: "Centennial North", home: "D1", away: "D4", pool: "D" },
  { date: "sat", time: "4:00 PM", field: "Centennial South", home: "C1", away: "C4", pool: "C" },
];

// Sunday's bracket, transcribed from the same template spreadsheet. Unlike
// Thu-Sat, these slots can't be filled with real team names from standings —
// Wild Card seeding (1-8) and Division Winner seeding (1-4) both depend on
// the actual round-robin results, not the regular season. So this is a
// structural preview only: who plays whom is fixed by the bracket, but which
// real teams land in each slot isn't knowable until Saturday's games finish.
const SUNDAY_TEMPLATE: SundaySlotEntry[] = [
  { time: "8:30 AM", field: "Centennial North", home: "Wild Card #1", away: "Wild Card #8", round: "wildCard" },
  { time: "8:30 AM", field: "Centennial South", home: "Wild Card #2", away: "Wild Card #7", round: "wildCard" },
  { time: "10:00 AM", field: "Centennial North", home: "Wild Card #4", away: "Wild Card #5", round: "wildCard" },
  { time: "10:00 AM", field: "Centennial South", home: "Wild Card #3", away: "Wild Card #6", round: "wildCard" },
  { time: "11:30 AM", field: "Centennial North", home: "Division Winner #1", away: "Wild Card #1 Winner", round: "quarterFinal" },
  { time: "11:30 AM", field: "Centennial South", home: "Division Winner #2", away: "Wild Card #2 Winner", round: "quarterFinal" },
  { time: "1:00 PM", field: "Centennial North", home: "Division Winner #3", away: "Wild Card #3 Winner", round: "quarterFinal" },
  { time: "1:00 PM", field: "Centennial South", home: "Division Winner #4", away: "Wild Card #4 Winner", round: "quarterFinal" },
  { time: "2:30 PM", field: "Centennial North", home: "Quarter Final #1 Winner", away: "Quarter Final #2 Winner", round: "semiFinal" },
  { time: "2:30 PM", field: "Centennial South", home: "Quarter Final #3 Winner", away: "Quarter Final #4 Winner", round: "semiFinal" },
  { time: "4:00 PM", field: "Centennial North", home: "Semi Final #1 Winner", away: "Semi Final #2 Winner", round: "final" },
];

function addDays(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/**
 * Fills the Thu-Sat slot template with real team names from the live-
 * projected box seeding, for a specific tournament year. Computed fresh
 * every render — never stored — so it always reflects the latest standings
 * along with computeProjectedBoxes(). `plannedStart` is expected to be the
 * Thursday the tournament opens (Fri/Sat are derived as +1/+2 days).
 */
export function computeProjectedSchedule(
  boxes: ProjectedBox[],
  year: number,
  type: TournamentType,
  plannedStart: string
): TournamentGame[] | null {
  const dates = {
    thu: plannedStart,
    fri: addDays(plannedStart, 1),
    sat: addDays(plannedStart, 2),
    sun: addDays(plannedStart, 3),
  };
  const seedLookup = new Map<string, string>();
  for (const box of boxes) {
    box.teams.forEach((team, i) => seedLookup.set(`${box.poolLetter}${i + 1}`, team));
  }

  const games: TournamentGame[] = [];
  for (let i = 0; i < SLOT_TEMPLATE.length; i++) {
    const slot = SLOT_TEMPLATE[i];
    const homeTeam = seedLookup.get(slot.home);
    const awayTeam = seedLookup.get(slot.away);
    if (!homeTeam || !awayTeam) return null;

    games.push({
      _id: `projected-${i}`,
      year,
      type,
      date: dates[slot.date],
      time: slot.time,
      field: slot.field,
      homeTeam,
      homeSeed: slot.home,
      awayTeam,
      awaySeed: slot.away,
      round: "roundRobin",
      pool: slot.pool,
      sortOrder: i,
    });
  }

  // Sunday's bracket, appended as a structural preview — see SUNDAY_TEMPLATE
  // for why these can't be resolved to real team names the way Thu-Sat can.
  SUNDAY_TEMPLATE.forEach((slot, i) => {
    games.push({
      _id: `projected-sun-${i}`,
      year,
      type,
      date: dates.sun,
      time: slot.time,
      field: slot.field,
      homeTeam: slot.home,
      awayTeam: slot.away,
      round: slot.round,
      sortOrder: SLOT_TEMPLATE.length + i,
    });
  });

  // Setup/teardown crews aren't decided this far out — flag that plainly on
  // the first and last game of each day rather than leaving the section
  // blank, so the page still shows the same structure the real schedule
  // will have once crews are assigned.
  const placeholder = "TBD — crews haven't been assigned yet.";
  for (const day of ["thu", "fri", "sat"] as const) {
    const dayGames = games.filter((g) => g.date === dates[day]);
    if (dayGames.length === 0) continue;
    dayGames[0].setupNote = placeholder;
    dayGames[dayGames.length - 1].teardownNote = placeholder;
  }

  const sundayGames = games.filter((g) => g.date === dates.sun);
  if (sundayGames.length > 0) {
    sundayGames[0].setupNote =
      "Format preview only — these are bracket positions, not projected teams. Wild Card and Division Winner seeding depends on Thursday-Saturday results and won't be known until Saturday's games are complete.";
    sundayGames[sundayGames.length - 1].teardownNote = placeholder;
  }

  return games;
}

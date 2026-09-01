import type { ProjectedBox } from "./tournamentSeeding";
import type { TournamentGame, TournamentType } from "./types";

interface SlotTemplateEntry {
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

// Thu-Sat round-robin schedule, transcribed from the league's tournament
// template spreadsheet (matchups are seed-slot codes, not team names — those
// get filled in from live-projected box seeding). Sunday's Wild Card/QF/SF/
// Final bracket depends on actual Thu-Sat results, so it isn't projectable
// the same way and is intentionally left out.
const SLOT_TEMPLATE: SlotTemplateEntry[] = [
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
  const dates = { thu: plannedStart, fri: addDays(plannedStart, 1), sat: addDays(plannedStart, 2) };
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

  return games;
}

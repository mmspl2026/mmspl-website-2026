/**
 * Generates a full 14-team regular-season schedule matching the shape of
 * the league's real 2026 schedule (reverse-engineered from that season's
 * spreadsheet, confirmed with the league): a double round-robin (every team
 * plays every other team twice, home-and-away) plus 4 random "bonus" games
 * per team to stretch the season from 26 to 30 games, spread across two
 * fields, three time slots, and two games days per week (Tue/Thu).
 *
 * Deliberately hardcoded to this exact shape (14 teams, 2 fields, Tue/Thu,
 * 3 time slots) rather than built as a general N-team/M-field scheduler —
 * the league confirmed this format is fixed and any future change would be
 * a new, explicit request rather than a config option.
 */

export interface ScheduleGeneratorOptions {
  /** Team identifiers in random-draw order — index 0 is "Team 1"/"Team A",
   * index 13 is "Team 14", matching the league's draw convention. Must be
   * exactly 14 entries; can be Sanity team `_id`s or plain names, the
   * generator treats them as opaque tokens. */
  teamIds: string[];
  /** First game date, "YYYY-MM-DD" — must fall on one of `weekdays` or the
   * generator rolls forward to the next one. */
  seasonStartDate: string;
  /** 0 = Sunday .. 6 = Saturday. Exactly 2 values, matching Tue/Thu. */
  weekdays?: [number, number];
  fields?: [string, string];
  times?: [string, string, string];
  /** Dates ("YYYY-MM-DD") to skip entirely — e.g. long weekends or the week
   * the Charity tournament runs. The real 2026 season had two such skipped
   * weeks; rather than guess the reason or assume it repeats, the admin
   * enters them explicitly each year. The season simply runs one calendar
   * week later for each blackout date to make up the game date. */
  blackoutDates?: string[];
  /** Injectable for deterministic tests; omit for real randomness. */
  randomSeed?: number;
}

export interface GeneratedGame {
  date: string;
  time: string;
  field: string;
  homeTeamId: string;
  awayTeamId: string;
}

interface Pairing {
  home: string;
  away: string;
}

const DEFAULT_WEEKDAYS: [number, number] = [2, 4]; // Tue, Thu
const DEFAULT_FIELDS: [string, string] = ["Centennial Park", "Mintleaf Park"];
const DEFAULT_TIMES: [string, string, string] = ["6:30 PM", "8:00 PM", "9:30 PM"];
const GAMES_PER_TEAM = 30;
const MAX_SLOTTING_ATTEMPTS = 4000;

// mulberry32 — small, fast, seedable PRNG (Math.random isn't seedable,
// which we need for reproducible tests and for retrying the slotting step
// with a fresh shuffle on failure).
function makeRng(seed: number): () => number {
  let a = seed >>> 0;
  return function rng() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(arr: T[], rng: () => number): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * Standard "circle method" round-robin: fix team 0, rotate the other 13
 * around it for 13 rounds, 7 pairs/round, covering all C(14,2)=91 pairs
 * exactly once. Running it twice (second time with home/away swapped)
 * gives every team exactly 13 home + 13 away games — the "double" in
 * double round-robin — which is what makes the later 4 bonus games/team
 * land on a clean 15/15 home/away split.
 */
function buildDoubleRoundRobin(teamIds: string[]): Pairing[] {
  const n = teamIds.length;
  const fixed = teamIds[0];
  let rotating = teamIds.slice(1);
  const legOnePairs: Pairing[] = [];

  for (let round = 0; round < n - 1; round++) {
    legOnePairs.push({ home: fixed, away: rotating[0] });
    for (let i = 1; i < n / 2; i++) {
      const a = rotating[i];
      const b = rotating[n - 1 - i];
      // Alternate which side is "home" round to round so a single leg
      // doesn't lopsidedly favour the fixed team's opponents.
      legOnePairs.push(round % 2 === 0 ? { home: a, away: b } : { home: b, away: a });
    }
    rotating = [rotating[rotating.length - 1], ...rotating.slice(0, -1)];
  }

  const legTwoPairs: Pairing[] = legOnePairs.map((p) => ({ home: p.away, away: p.home }));
  return [...legOnePairs, ...legTwoPairs];
}

/**
 * 28 bonus games (4 per team: 2 home, 2 away) via a shuffled circulant
 * graph — shuffle the team order, then connect each team to its neighbours
 * at distance 1 and distance 2 in that shuffled cycle. That's guaranteed
 * 4-regular and simple (no repeated pairs, no self-pairs) for any team
 * count > 4, and orienting every edge "earlier index -> later index around
 * the cycle" as home -> away gives each team exactly 2 home + 2 away from
 * this step, same as the real 2026 season's split.
 */
function buildBonusGames(teamIds: string[], rng: () => number): Pairing[] {
  const order = shuffle(teamIds, rng);
  const n = order.length;
  const pairs: Pairing[] = [];
  for (let i = 0; i < n; i++) {
    pairs.push({ home: order[i], away: order[(i + 1) % n] });
    pairs.push({ home: order[i], away: order[(i + 2) % n] });
  }
  return pairs;
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function weekdayOf(dateStr: string): number {
  return new Date(`${dateStr}T00:00:00Z`).getUTCDay();
}

/** All game dates (Tue/Thu) from the season start through enough weeks to
 * cover every game, rolling the start forward to the first matching
 * weekday if it doesn't already land on one, and skipping any blackout
 * dates entirely (the season just runs a week later for each one). */
function buildDates(startDate: string, weekdays: [number, number], count: number, blackoutDates: Set<string>): string[] {
  const dates: string[] = [];
  let cursor = startDate;
  while (!weekdays.includes(weekdayOf(cursor))) {
    cursor = addDays(cursor, 1);
  }
  while (dates.length < count) {
    if (weekdays.includes(weekdayOf(cursor)) && !blackoutDates.has(cursor)) dates.push(cursor);
    cursor = addDays(cursor, 1);
  }
  return dates;
}

/**
 * Places every pairing onto a date + field + time slot with no team
 * double-booked on a date. This is a tight bin-packing problem (210 games
 * must fill exactly 210 slots with zero slack), so a plain greedy pass can
 * paint itself into a corner near the end of the season — this returns
 * `null` on failure so the caller can retry with a fresh shuffle rather
 * than silently producing an incomplete schedule.
 */
function trySlot(
  pairings: Pairing[],
  dates: string[],
  fields: [string, string],
  times: [string, string, string],
  rng: () => number
): GeneratedGame[] | null {
  const pool = shuffle(pairings, rng);
  const games: GeneratedGame[] = [];
  // Light fairness heuristic: track each team's park/time usage so far and
  // prefer whichever slot they've used least, instead of pure chance —
  // keeps the season roughly balanced without hard-enforcing it.
  const parkCount = new Map<string, number>();
  const timeCount = new Map<string, number>();
  const bump = (map: Map<string, number>, team: string, key: string) => {
    map.set(`${team}|${key}`, (map.get(`${team}|${key}`) ?? 0) + 1);
  };
  const usage = (map: Map<string, number>, team: string, key: string) => map.get(`${team}|${key}`) ?? 0;

  for (const date of dates) {
    const usedToday = new Set<string>();
    const slots: { field: string; time: string }[] = [];
    for (const field of fields) for (const time of times) slots.push({ field, time });

    for (const slot of slots) {
      const idx = pool.findIndex((p) => !usedToday.has(p.home) && !usedToday.has(p.away));
      if (idx === -1) return null;

      // Among the next few valid candidates, weight toward whichever pair
      // has used this park/time slot the least so far.
      const candidates = pool
        .map((p, i) => ({ p, i }))
        .filter(({ p }) => !usedToday.has(p.home) && !usedToday.has(p.away))
        .slice(0, 12);
      candidates.sort((a, b) => {
        const scoreA = usage(parkCount, a.p.home, slot.field) + usage(parkCount, a.p.away, slot.field) +
          usage(timeCount, a.p.home, slot.time) + usage(timeCount, a.p.away, slot.time);
        const scoreB = usage(parkCount, b.p.home, slot.field) + usage(parkCount, b.p.away, slot.field) +
          usage(timeCount, b.p.home, slot.time) + usage(timeCount, b.p.away, slot.time);
        return scoreA - scoreB;
      });
      const chosen = candidates[0] ?? { p: pool[idx], i: idx };

      pool.splice(chosen.i, 1);
      usedToday.add(chosen.p.home);
      usedToday.add(chosen.p.away);
      bump(parkCount, chosen.p.home, slot.field);
      bump(parkCount, chosen.p.away, slot.field);
      bump(timeCount, chosen.p.home, slot.time);
      bump(timeCount, chosen.p.away, slot.time);
      games.push({
        date,
        time: slot.time,
        field: slot.field,
        homeTeamId: chosen.p.home,
        awayTeamId: chosen.p.away,
      });
    }
  }

  return pool.length === 0 ? games : null;
}

export class ScheduleGenerationError extends Error {}

export function generateSeasonSchedule(options: ScheduleGeneratorOptions): GeneratedGame[] {
  const { teamIds, seasonStartDate } = options;
  const weekdays = options.weekdays ?? DEFAULT_WEEKDAYS;
  const fields = options.fields ?? DEFAULT_FIELDS;
  const times = options.times ?? DEFAULT_TIMES;

  if (teamIds.length !== 14) {
    throw new ScheduleGenerationError(`Expected exactly 14 teams, got ${teamIds.length}.`);
  }
  if (new Set(teamIds).size !== 14) {
    throw new ScheduleGenerationError("Team list has duplicates — every team must appear exactly once.");
  }

  const totalGames = (teamIds.length * GAMES_PER_TEAM) / 2; // 210
  const gamesPerDate = fields.length * times.length; // 6
  const dateCount = totalGames / gamesPerDate; // 35
  if (!Number.isInteger(dateCount)) {
    throw new ScheduleGenerationError("Games don't divide evenly into whole game dates — check field/time counts.");
  }

  const seed = options.randomSeed ?? Math.floor(Math.random() * 2 ** 31);
  const rng = makeRng(seed);
  const blackoutDates = new Set(options.blackoutDates ?? []);

  for (let attempt = 0; attempt < MAX_SLOTTING_ATTEMPTS; attempt++) {
    const roundRobin = buildDoubleRoundRobin(teamIds);
    const bonus = buildBonusGames(teamIds, rng);
    const dates = buildDates(seasonStartDate, weekdays, dateCount, blackoutDates);
    const result = trySlot([...roundRobin, ...bonus], dates, fields, times, rng);
    if (result) {
      const timeOrder = new Map(times.map((t, i) => [t, i]));
      return result.sort((a, b) =>
        a.date === b.date ? (timeOrder.get(a.time) ?? 0) - (timeOrder.get(b.time) ?? 0) : a.date.localeCompare(b.date)
      );
    }
  }

  throw new ScheduleGenerationError(
    `Could not find a valid schedule after ${MAX_SLOTTING_ATTEMPTS} attempts — this shouldn't happen for 14 teams; please report this.`
  );
}

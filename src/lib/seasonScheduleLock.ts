/**
 * Once a season's regular schedule has actually started, regenerating or
 * re-importing it is dangerous — real scores may already be attached to
 * the existing games, and overwriting them would silently lose data. This
 * locks the Schedule Generator for a given year two weeks into that year's
 * May (the league's regular season always starts in May), rather than
 * hardcoding a specific year — so 2026 locks itself out automatically once
 * that date passes, 2027 locks itself out the following May, and so on,
 * with no yearly maintenance needed.
 */

/** "YYYY-05-15" for the given year — the cutoff itself. */
export function getScheduleLockDate(year: number): string {
  return `${year}-05-15`;
}

/** True once `today` (an Eastern "YYYY-MM-DD" date, e.g. from
 * getTodayEastern()) has reached that year's lock date — covers every past
 * season automatically, plus the current one once its own season is under
 * way. */
export function isScheduleLocked(year: number, today: string): boolean {
  return today >= getScheduleLockDate(year);
}

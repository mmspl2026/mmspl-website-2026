/**
 * Once a season is over, editing its standings should be a deliberate,
 * re-authenticated action, not something a stray click can do — a season
 * that's no longer active, or whose regular season end date has passed,
 * locks itself automatically. No DB flag to remember to set: the current
 * season stays fully editable the normal way for as long as it's actually
 * the active one, and every past season locks itself the moment a newer
 * one takes over (or its own end date passes), with no yearly maintenance
 * needed. Mirrors the same pure-date-function approach as
 * src/lib/seasonScheduleLock.ts.
 */

export interface StandingsLockSeason {
  isActive?: boolean;
  regularSeasonEnd?: string;
}

/** True if this season's standings should be read-only right now. */
export function isStandingsLocked(season: StandingsLockSeason, today: string): boolean {
  if (!season.isActive) return true;
  if (season.regularSeasonEnd && today > season.regularSeasonEnd) return true;
  return false;
}

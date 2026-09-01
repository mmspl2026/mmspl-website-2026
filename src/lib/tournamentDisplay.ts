import type { TournamentType, TournamentRound } from "./types";

export const TOURNAMENT_LABELS: Record<TournamentType, { short: string; full: string; trophy: string }> = {
  charity: {
    short: "Charity Tournament",
    full: "Kevan MacDonald Charity Tournament",
    trophy: "The Kevan MacDonald Cup",
  },
  mcgregor: {
    short: "Year-End Tournament",
    full: "Jim McGregor Year-End Tournament",
    trophy: "The Jim McGregor Trophy",
  },
};

// Matches the `category` field on awardTrophyPhoto documents exactly (the
// short name, not the "The ___" display form used in TOURNAMENT_LABELS above).
export const TOURNAMENT_TROPHY_AWARD_CATEGORY: Record<TournamentType, string> = {
  charity: "Kevan MacDonald Cup",
  mcgregor: "Jim McGregor Trophy",
};

export const ROUND_LABELS: Record<TournamentRound, string> = {
  roundRobin: "Round Robin",
  wildCard: "Wild Card",
  quarterFinal: "Quarter Final",
  semiFinal: "Semi Final",
  final: "Final",
};

export function formatGameDate(dateStr: string) {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString("en-CA", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export function formatDayTabLabel(dateStr: string) {
  return new Date(`${dateStr}T00:00:00`)
    .toLocaleDateString("en-CA", { weekday: "short", month: "short", day: "numeric" })
    .toUpperCase()
    .replace(",", "");
}

export function formatDateRange(dates: string[], year: number) {
  if (dates.length === 0) return String(year);
  const sorted = [...dates].sort();
  const min = new Date(`${sorted[0]}T00:00:00`);
  const max = new Date(`${sorted[sorted.length - 1]}T00:00:00`);
  const fmt = (d: Date) => d.toLocaleDateString("en-CA", { month: "long", day: "numeric" });
  if (sorted[0] === sorted[sorted.length - 1]) return `${fmt(min)}, ${year}`;
  if (min.getMonth() === max.getMonth()) {
    return `${min.toLocaleDateString("en-CA", { month: "long" })} ${min.getDate()}–${max.getDate()}, ${year}`;
  }
  return `${fmt(min)} – ${fmt(max)}, ${year}`;
}

import type { RosterPlayer } from "./types";

export interface StatLine {
  _id: string;
  player: string;
  attended: boolean;
  positionPlayed?: string;
  lineupOrder?: number;
  ab: number;
  h: number;
  r: number;
  rbi: number;
  hr: number;
  e: number;
}

export interface SeasonTotal {
  player: RosterPlayer;
  gp: number;
  ab: number;
  h: number;
  r: number;
  rbi: number;
  hr: number;
  e: number;
  avg: number;
}

/** Shared by the captain's /api/team/stats route and the public read-only share-link page, so totals are always computed the same way. */
export function computeSeasonTotals(roster: RosterPlayer[], lines: StatLine[]): SeasonTotal[] {
  return roster.map((player) => {
    const playerLines = lines.filter((l) => l.player === player._id);
    const sum = (key: keyof StatLine) => playerLines.reduce((acc, l) => acc + (Number(l[key]) || 0), 0);
    const ab = sum("ab");
    const h = sum("h");
    return {
      player,
      gp: playerLines.filter((l) => l.attended).length,
      ab,
      h,
      r: sum("r"),
      rbi: sum("rbi"),
      hr: sum("hr"),
      e: sum("e"),
      avg: ab > 0 ? h / ab : 0,
    };
  });
}

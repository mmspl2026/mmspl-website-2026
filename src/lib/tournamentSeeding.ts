import type { Standing } from "./types";

// Box seeding for the 14-team Jim McGregor Tournament, per the league's
// standard seed→box table (seed = final regular-season rank): seeds 1-4 and
// 5-8 split evenly across the four boxes, then the remaining seeds fill
// Boxes C and D out to 4 teams each while A and B stay at 3.
// Specific to a 14-team field — if the league ever runs this with a
// different number of teams, this table no longer applies.
const SEED_TO_BOX: Record<number, string> = {
  1: "A",
  8: "A",
  14: "A",
  2: "B",
  7: "B",
  13: "B",
  3: "C",
  6: "C",
  10: "C",
  11: "C",
  4: "D",
  5: "D",
  9: "D",
  12: "D",
};

export interface ProjectedBox {
  poolLetter: string;
  teams: string[];
}

/**
 * Projects tournament box seeding from the current regular-season
 * standings — "if the season ended today." Meant to be recomputed on every
 * page load rather than stored, so it always reflects the latest results
 * with no manual upkeep, right up until the real boxes are set.
 */
export function computeProjectedBoxes(standings: Standing[]): ProjectedBox[] | null {
  if (standings.length !== 14) return null;

  const boxes: Record<string, { seed: number; name: string }[]> = { A: [], B: [], C: [], D: [] };
  standings.forEach((s, i) => {
    const seed = i + 1;
    const box = SEED_TO_BOX[seed];
    if (box) boxes[box].push({ seed, name: s.team.name });
  });

  return ["A", "B", "C", "D"].map((letter) => ({
    poolLetter: letter,
    teams: boxes[letter].sort((a, b) => a.seed - b.seed).map((t) => t.name),
  }));
}

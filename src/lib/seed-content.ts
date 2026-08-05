/**
 * Fallback content shown when Sanity isn't configured yet (fresh clone,
 * local dev without .env.local) and as starter data an admin can mirror
 * into Sanity Studio. Historical facts (founding story, dates, ballparks,
 * address, charity partners) are real; team names/scores/standings below
 * are sample data until an admin enters real ones in Studio.
 */

export const SEED_TEAM_NAMES = [
  "Ace Pools Moose",
  "Beavers",
  "Wildcats",
  "Ironmen",
  "Thunderbirds",
  "Rebels",
  "Grizzlies",
  "Renegades",
  "Diamondbacks",
  "Outlaws",
  "Hurricanes",
  "Mavericks",
  "Bandits",
  "Stingers",
] as const;

export const LEAGUE_FOUNDING_YEAR = 1968;

export const IMPORTANT_DATES_2026 = [
  { label: "Captain's Meeting", date: "2026-02-11" },
  { label: "Rookie Evaluations", date: "2026-04-11", endDate: "2026-04-25", description: "Sessions on April 11, 19, and 25 — new players eligible for the entry draft attend one." },
  { label: "Entry Draft", date: "2026-04-29" },
  { label: "Opening Night", date: "2026-05-12" },
  { label: "Charity Tournament", date: "2026-05-28", endDate: "2026-05-31" },
  { label: "Golf Tournament", date: "2026-08-22" },
  { label: "Awards Banquet", date: "2026-09-12" },
  { label: "McGregor Playoff Tournament", date: "2026-09-17", endDate: "2026-09-20" },
  { label: "Annual General Meeting", date: "2026-10-14" },
] as const;

export const BALLPARKS = [
  {
    name: "Centennial Park",
    address: "Bullock Dr. & McCowan Rd., Markham, ON",
    mapUrl: "https://maps.app.goo.gl/KXYXR4snLHc7WKzy5",
  },
  {
    name: "Mintleaf Park",
    address: "Fincham Ave. & Wootten Way N., Markham, ON",
    mapUrl: "https://maps.app.goo.gl/PgHasbFa7G6vmo82A",
  },
] as const;

export const LEAGUE_ADDRESS = "6579 Highway 7, PO Box 77073, Markham, ON, L3P 0C8";

export const CHAMPIONS_2026 = {
  charityTournament: { champion: "Ace Pools Moose", finalist: "Beavers" },
  regularSeason: { champion: "TBD", finalist: "TBD" },
  yearEndTournament: { champion: "TBD", finalist: "TBD" },
};

export const EXECUTIVE_TEAM = [
  { name: "Sean Bansavatar", title: "First Vice-President" },
  { name: "Evange Bethanis", title: "Second Vice-President" },
] as const;

export const CHARITY_BENEFICIARIES_RECENT = [
  "Markham Food Bank",
  "Sandgate Women's Shelter",
  "Noah's Clubhouse",
  "Diabetes Canada",
  "TNT Foundation",
] as const;

export const SOCIAL_LINKS = {
  facebook: "https://www.facebook.com/markhammmspl",
  instagram: "https://www.instagram.com/markham_mens_slopitch/",
  youtube: "https://www.youtube.com/@MarkhamMMSPL",
} as const;

export const LEAGUE_STATS = {
  teams: 14,
  playersPerTeam: 15,
  ageRange: "25-60+",
  totalCharityDonated: 125000,
  donatingSince: 1982,
};

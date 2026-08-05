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

// Real content extracted from the Emergent reference site's /about page.
// Images downloaded from mmspl.ca and re-hosted as real Sanity assets
// (see scripts/migrate-about-page-images.js) — mmspl.ca is being retired.
export const ABOUT_PAGE_IMAGES = {
  hero: "https://cdn.sanity.io/images/9mdmc1ml/production/647556e124b1540d869abbde70c4d8702632b07e-640x480.jpg",
  logo50: "https://cdn.sanity.io/images/9mdmc1ml/production/2769604e4a292aeb7571ade1ea792f1fe4bea7fa-1280x1102.png",
} as const;

export const CHARITY_PRESENTATIONS = [
  {
    year: 2025,
    recipients: [
      { name: "Markham Mariners", amount: 1400, image: "https://cdn.sanity.io/images/9mdmc1ml/production/179d0cef222ef0d43810dc4223d6138b7e9a0dd5-478x356.jpg" },
      { name: "Sandgate Women's Shelter", amount: 1400, image: "https://cdn.sanity.io/images/9mdmc1ml/production/5a36790bd67429881e0380d3d500fbc006965b28-456x351.jpg" },
      { name: "Noah's Clubhouse", amount: 1400, image: "https://cdn.sanity.io/images/9mdmc1ml/production/b31dd9edcabd46b66eb31de90b7f0f11f92d8121-560x364.jpg" },
    ],
  },
  {
    year: 2024,
    recipients: [
      { name: "Markham Food Bank", amount: 1500, image: "https://cdn.sanity.io/images/9mdmc1ml/production/a524a624e0b2e1e6ea0a9c134b3b2e9df18ceb38-640x480.jpg" },
      { name: "Sandgate Women's Shelter", amount: 1500, image: ABOUT_PAGE_IMAGES.hero },
      { name: "TNT Foundation", amount: 500, image: "https://cdn.sanity.io/images/9mdmc1ml/production/01069b24eb15e86faa55560dedc6794b24653ade-640x480.jpg" },
      { name: "Markham District Baseball Association", amount: 1200, image: "https://cdn.sanity.io/images/9mdmc1ml/production/bd967f42c11f39bb2c8c3b1d9697a81e64ce1761-640x480.jpg" },
    ],
  },
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

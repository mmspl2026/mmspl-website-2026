import { groq } from "next-sanity";

export const activeSeasonQuery = groq`*[_type == "season" && isActive == true][0]{
  _id, year, isActive, regularSeasonStart, regularSeasonEnd, playoffCutoff
}`;

export const allSeasonsQuery = groq`*[_type == "season"] | order(year desc){
  _id, year, isActive, regularSeasonStart, regularSeasonEnd, playoffCutoff
}`;

export const standingsBySeasonQuery = groq`*[_type == "standing" && season->year == $year] | order((wins * 2 + ties) desc, runDifferential desc){
  _id,
  wins,
  losses,
  ties,
  runDifferential,
  defaults,
  team->{_id, name, shortName, division, color, logo}
}`;

export const gamesBySeasonQuery = groq`*[_type == "game" && season->year == $year] | order(date asc, time asc){
  _id,
  date,
  time,
  field,
  status,
  homeScore,
  awayScore,
  homeTeam->{_id, name, shortName, logo, division, color},
  awayTeam->{_id, name, shortName, logo, division, color}
}`;

export const upcomingGamesQuery = groq`*[_type == "game" && date >= $today] | order(date asc, time asc)[0...8]{
  _id,
  date,
  time,
  field,
  status,
  homeScore,
  awayScore,
  homeTeam->{_id, name, shortName, logo, division, color},
  awayTeam->{_id, name, shortName, logo, division, color}
}`;

export const recentNewsQuery = groq`*[_type == "news"] | order(date desc)[0...6]{
  _id, title, slug, photo, date, tag
}`;

export const newsBySlugQuery = groq`*[_type == "news" && slug.current == $slug][0]{
  _id, title, slug, body, photo, date, tag
}`;

export const allAwardYearsQuery = groq`array::unique(*[_type == "award"].year) | order(@ desc)`;

export const awardsByYearQuery = groq`*[_type == "award" && year == $year] | order(category asc){
  _id, year, category, winner, photo, description, team->{_id, name}
}`;

export const allAwardsQuery = groq`*[_type == "award"] | order(category asc, year desc){
  _id, year, category, winner
}`;

export const allAwardTrophyPhotosQuery = groq`*[_type == "awardTrophyPhoto"]{
  _id, category, photo
}`;

export const upcomingImportantDatesQuery = groq`*[_type == "importantDate" && date >= $today] | order(date asc){
  _id, label, date, endDate, description
}`;

export const allImportantDatesQuery = groq`*[_type == "importantDate"] | order(date asc){
  _id, label, date, endDate, description
}`;

export const adminSettingsQuery = groq`*[_type == "adminSettings"][0]{
  heroImage,
  standingsHeroImage,
  scheduleHeroImage,
  awardsHeroImage,
  registerHeroImage,
  aboutHeroImage,
  contactHeroImage,
  notificationsHeroImage,
  sponsorText,
  registrationOpen,
  registrationFee
}`;

export const subscriberEmailsQuery = groq`*[_type == "subscriber"].email`;

export const allPushSubscriptionsQuery = groq`*[_type == "pushSubscription"]{
  _id, endpoint, p256dh, auth
}`;

// --- Admin score entry ---

export const activeSeasonDatesQuery = groq`array::unique(*[_type == "game" && season->isActive == true].date) | order(@ asc)`;

export const gamesByDateForActiveSeasonQuery = groq`*[_type == "game" && date == $date && season->isActive == true] | order(time asc){
  _id,
  date,
  time,
  field,
  status,
  homeScore,
  awayScore,
  homeTeam->{_id, name, shortName, logo, division, color},
  awayTeam->{_id, name, shortName, logo, division, color},
  "seasonId": season->_id,
  "seasonYear": season->year
}`;

export const gamesByIdsQuery = groq`*[_type == "game" && _id in $ids]{
  _id,
  date,
  time,
  field,
  status,
  homeTeam->{_id, name},
  awayTeam->{_id, name},
  "seasonId": season->_id,
  "seasonYear": season->year
}`;

export const gameByIdQuery = groq`*[_type == "game" && _id == $id][0]{
  _id,
  date,
  time,
  field,
  status,
  homeScore,
  awayScore,
  homeTeam->{_id, name},
  awayTeam->{_id, name},
  "seasonId": season->_id,
  "seasonYear": season->year
}`;

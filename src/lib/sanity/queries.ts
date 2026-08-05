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

export const allNewsQuery = groq`*[_type == "news"] | order(date desc){
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
  _id, label, date, endDate, description, category
}`;

// Full season list (from May 1 of $seasonYear) for the homepage's Upcoming
// Dates rail — shows the whole season at a glance, not just future dates,
// so the horizontal scroll row isn't sparse right after the season starts.
export const seasonImportantDatesQuery = groq`*[_type == "importantDate" && date >= $seasonStart] | order(date asc){
  _id, label, date, endDate, description, category
}`;

export const allImportantDatesQuery = groq`*[_type == "importantDate"] | order(date asc){
  _id, label, date, endDate, description, category
}`;

// NOTE: this query is used by public pages via sanityFetch() and its result
// is sent to the browser — never add resendApiKey (a secret) here. It has
// its own dedicated, admin-only query below.
export const adminSettingsQuery = groq`*[_type == "adminSettings"][0]{
  heroImage,
  standingsHeroImage,
  scheduleHeroImage,
  awardsHeroImage,
  registerHeroImage,
  aboutHeroImage,
  contactHeroImage,
  notificationsHeroImage,
  adminInfoHeroImage,
  galleryHeroImage,
  sponsorText,
  homeCommunityPhotos[]{ image, position },
  registrationOpen,
  registrationFee,
  registrationClosedMessage
}`;

// Admin-only — includes the secret resendApiKey. Only ever fetch this from
// server-side admin API routes, never from a public page.
export const adminSettingsFullQuery = groq`*[_type == "adminSettings"][0]{
  registrationOpen,
  registrationFee,
  registrationClosedMessage,
  fromAddress,
  contactRecipients,
  resendApiKey
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

// --- Admin data manager ---

export const adminUserByUsernameQuery = groq`*[_type == "adminUser" && username == $username][0]{
  _id, name, username, email, role, active, passwordHash
}`;

export const adminUserByIdQuery = groq`*[_type == "adminUser" && _id == $id][0]{
  _id, name, username, email, role, active
}`;

export const allAdminUsersQuery = groq`*[_type == "adminUser"] | order(name asc){
  _id, name, username, email, role, active, createdAt
}`;

export const allRegistrationsQuery = groq`*[_type == "registration"] | order(submittedAt desc){
  _id, firstName, lastName,
  streetAddress, unit, city, postalCode,
  homeNumber, mobileNumber, email, alternateEmail, dateOfBirth, heardAbout,
  highestLevel, category, preferredPosition, yearsExperience, experienceComments,
  canPitch, yearsPitched, pitchingComments,
  status, emailStatus, submittedAt,
  season->{_id, year}
}`;

export const allContactSubmissionsQuery = groq`*[_type == "contactSubmission"] | order(submittedAt desc){
  _id, name, email, subject, message, status, submittedAt
}`;

export const allNotificationLogsQuery = groq`*[_type == "notificationLog"] | order(sentAt desc)[0...50]{
  _id, title, message, emailCount, pushCount, sentAt
}`;

export const subscriberCountQuery = groq`count(*[_type == "subscriber"])`;
export const pushSubscriptionCountQuery = groq`count(*[_type == "pushSubscription"])`;

// --- Admin info page (public) ---

export const allLeagueExecutivesQuery = groq`*[_type == "leagueExecutive"] | order(order asc){
  _id, role, name, email, order
}`;

export const allTeamRepresentativesQuery = groq`*[_type == "teamRepresentative"]{
  _id, repName, team->{_id, name, shortName}
} | order(team.name asc)`;

export const allLeagueDocumentsQuery = groq`*[_type == "leagueDocument"] | order(category asc, order asc){
  _id, title, description, category, badge, order,
  file{asset->{url, originalFilename}}
}`;

export const allNewsAdminQuery = groq`*[_type == "news"] | order(date desc){
  _id, title, slug, body, photo, date, tag
}`;

export const newsByIdQuery = groq`*[_type == "news" && _id == $id][0]{
  _id, title, slug, body, photo, date, tag
}`;

export const allGalleryPhotosQuery = groq`*[_type == "galleryPhoto"] | order(date desc){
  _id, image, caption, date, category
}`;

export const galleryCategoriesQuery = groq`*[_type == "adminSettings"][0].galleryCategories`;

export const recentGalleryPhotosQuery = groq`*[_type == "galleryPhoto"] | order(date desc)[0...6]{
  _id, image, caption
}`;

// Public gallery page — includes asset dimensions so the masonry layout can
// render each photo at its natural aspect ratio (matching the Emergent
// reference page, which uses plain <img> tags with no fixed crop).
export const publicGalleryPhotosQuery = groq`*[_type == "galleryPhoto"] | order(date desc){
  _id,
  caption,
  date,
  category,
  image{
    ...,
    asset->{
      url,
      metadata{ dimensions{ width, height } }
    }
  }
}`;

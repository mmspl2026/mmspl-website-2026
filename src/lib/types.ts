import type { Image } from "sanity";

export interface SanityImageWithAlt extends Image {
  alt?: string;
}

export interface Team {
  _id: string;
  name: string;
  shortName?: string;
  logo?: SanityImageWithAlt;
  division?: "A" | "B";
  color?: string;
}

export interface Season {
  _id: string;
  year: number;
  isActive: boolean;
  cancelled?: boolean;
  cancelledReason?: string;
  regularSeasonStart?: string;
  regularSeasonEnd?: string;
  playoffCutoff?: number;
}

export interface Game {
  _id: string;
  date: string;
  time: string;
  field?: string;
  homeTeam: Team;
  awayTeam: Team;
  homeScore?: number;
  awayScore?: number;
  status: "scheduled" | "live" | "final" | "forfeit" | "cancelled" | "postponed";
  forfeitingTeam?: "home" | "away";
}

export interface Standing {
  _id: string;
  team: Team;
  wins: number;
  losses: number;
  ties: number;
  runDifferential: number;
  defaults?: number;
}

export interface NewsItem {
  _id: string;
  title: string;
  slug: { current: string };
  body: unknown;
  photo?: SanityImageWithAlt;
  date: string;
  tag?: string;
}

export interface AwardTrophyPhoto {
  _id: string;
  category: string;
  photo: SanityImageWithAlt;
  description?: string;
  namedAfter?: string;
}

export interface Award {
  _id: string;
  year: number;
  category: string;
  winner: string;
  team?: Team;
  photo?: SanityImageWithAlt;
  description?: string;
}

export interface ImportantDate {
  _id: string;
  label: string;
  date: string;
  endDate?: string;
  description?: string;
  category?: "Season" | "Tournament" | "Registration" | "Admin";
}

export interface GalleryPhoto {
  _id: string;
  image: SanityImageWithAlt;
  caption?: string;
  date?: string;
  category?: string;
}

export interface PublicGalleryPhoto {
  _id: string;
  caption?: string;
  date?: string;
  category?: string;
  image: SanityImageWithAlt & {
    asset?: {
      url: string;
      metadata?: { dimensions?: { width: number; height: number } };
    };
  };
}

export interface AdminSettings {
  heroImage?: SanityImageWithAlt;
  standingsHeroImage?: SanityImageWithAlt;
  scheduleHeroImage?: SanityImageWithAlt;
  awardsHeroImage?: SanityImageWithAlt;
  registerHeroImage?: SanityImageWithAlt;
  aboutHeroImage?: SanityImageWithAlt;
  contactHeroImage?: SanityImageWithAlt;
  notificationsHeroImage?: SanityImageWithAlt;
  adminInfoHeroImage?: SanityImageWithAlt;
  galleryHeroImage?: SanityImageWithAlt;
  newsHeroImage?: SanityImageWithAlt;
  sponsorText?: string;
  homeCommunityPhotos?: { image: SanityImageWithAlt; position?: string }[];
  registrationOpen: boolean;
  registrationFee?: number;
  registrationClosedMessage?: string;
  fromAddress?: string;
  registrationRecipients?: string;
  contactRecipients?: string;
  resendApiKey?: string;
  galleryCategories?: string[];
}

export interface AdminGame extends Game {
  seasonId: string;
  seasonYear: number;
}

export interface PushSubscriptionRecord {
  _id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
}

export type AdminRole = "superadmin" | "exec";

export interface AdminUser {
  _id: string;
  name: string;
  username: string;
  email: string;
  role: AdminRole;
  active: boolean;
  createdAt: string;
  lastLogin?: string;
  mustChangePassword?: boolean;
  lockedUntil?: string;
}

export interface LoginAttempt {
  _id: string;
  username?: string;
  ip?: string;
  success: boolean;
  reason?: string;
  createdAt: string;
}

export type RegistrationStatus = "unpaid" | "call-up" | "completed" | "spam";

export interface Registration {
  _id: string;
  firstName: string;
  lastName: string;
  streetAddress?: string;
  unit?: string;
  city?: string;
  postalCode?: string;
  homeNumber?: string;
  mobileNumber?: string;
  email: string;
  alternateEmail?: string;
  dateOfBirth?: string;
  heardAbout?: string;
  highestLevel?: string;
  category?: string;
  preferredPosition?: string;
  yearsExperience?: string;
  experienceComments?: string;
  canPitch?: string;
  yearsPitched?: string;
  pitchingComments?: string;
  season?: Season;
  status: RegistrationStatus;
  emailStatus: "sent" | "failed";
  submittedAt: string;
}

export type ContactStatus = "new" | "read" | "replied" | "email-failed";

export interface ContactSubmission {
  _id: string;
  name: string;
  email: string;
  subject?: string;
  message: string;
  status: ContactStatus;
  submittedAt: string;
}

export interface NotificationLog {
  _id: string;
  title: string;
  message: string;
  emailCount: number;
  pushCount: number;
  sentAt: string;
}

export interface LeagueExecutive {
  _id: string;
  role: string;
  name: string;
  email?: string;
  order: number;
}

export interface TeamRepresentative {
  _id: string;
  repName: string;
  team: Team;
}

export interface SanityFileAsset {
  asset: {
    _id?: string;
    url: string;
    originalFilename?: string;
  };
}

export interface LeagueDocument {
  _id: string;
  title: string;
  description?: string;
  category: "Rules & Regulations" | "AGM Documents" | "General";
  year?: number;
  contentType: "file" | "page";
  slug?: { current: string };
  pageBody?: unknown;
  file?: SanityFileAsset;
  hasFile?: boolean;
  badge?: "PASSED" | "FAILED" | "NA";
  order: number;
}

export type TournamentType = "charity" | "mcgregor";

export interface TournamentResult {
  _id: string;
  year: number;
  type: TournamentType;
  champion?: string;
  finalist?: string;
  plannedStart?: string;
  plannedEnd?: string;
  mvp?: string;
  mvpTrophy?: string;
  championPhoto?: SanityImageWithAlt;
  finalistPhoto?: SanityImageWithAlt;
  mvpPhoto?: SanityImageWithAlt;
  secondaryChampion?: string;
  secondaryFinalist?: string;
  secondaryChampionPhoto?: SanityImageWithAlt;
  secondaryFinalistPhoto?: SanityImageWithAlt;
  hasDetailedResults: boolean;
  cancelled?: boolean;
  notes?: string;
}

export interface TournamentPool {
  _id: string;
  year: number;
  type: TournamentType;
  poolLetter: string;
  teams: string[];
}

export type TournamentRound = "roundRobin" | "wildCard" | "quarterFinal" | "semiFinal" | "final";
export type TournamentGameResult = "W" | "-";

export interface TournamentGame {
  _id: string;
  year: number;
  type: TournamentType;
  date: string;
  sortOrder?: number;
  time?: string;
  field?: string;
  homeTeam?: string;
  awayTeam?: string;
  /** Seed-slot code within the pool, e.g. "A1" — only ever set on the live
   * seeding projection, since real Sanity game records don't track this. */
  homeSeed?: string;
  awaySeed?: string;
  homeScore?: number;
  awayScore?: number;
  round: TournamentRound;
  pool?: string;
  homeResult?: TournamentGameResult;
  awayResult?: TournamentGameResult;
  setupNote?: string;
  teardownNote?: string;
}

export interface WildCardRanking {
  _id: string;
  year: number;
  type: TournamentType;
  rank: number;
  teamName: string;
  pool?: string;
  points?: number;
  wins?: number;
  losses?: number;
  ties?: number;
  runDifferential?: number;
  advanced: boolean;
}

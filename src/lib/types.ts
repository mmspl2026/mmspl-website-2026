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
  regularSeasonStart?: string;
  regularSeasonEnd?: string;
  playoffCutoff?: number;
}

export interface Game {
  _id: string;
  date: string;
  time: string;
  field: string;
  homeTeam: Team;
  awayTeam: Team;
  homeScore?: number;
  awayScore?: number;
  status: "scheduled" | "live" | "final" | "forfeit" | "cancelled" | "postponed";
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
  sponsorText?: string;
  homeCommunityPhotos?: { image: SanityImageWithAlt; position?: string }[];
  registrationOpen: boolean;
  registrationFee?: number;
  registrationClosedMessage?: string;
  fromAddress?: string;
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
}

export type RegistrationStatus = "unpaid" | "call-up" | "completed";

export interface Registration {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  birthYear?: string;
  experience?: string;
  position?: string;
  emergencyContact?: string;
  emergencyPhone?: string;
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
  email: string;
  order: number;
}

export interface TeamRepresentative {
  _id: string;
  repName: string;
  team: Team;
}

export interface SanityFileAsset {
  asset: {
    url: string;
    originalFilename?: string;
  };
}

export interface LeagueDocument {
  _id: string;
  title: string;
  description?: string;
  category: "Rules & Regulations" | "AGM Documents" | "General";
  file?: SanityFileAsset;
  badge?: "PASSED" | "FAILED";
  order: number;
}

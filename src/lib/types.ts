import type { Image } from "sanity";

export interface SanityImageWithAlt extends Image {
  alt?: string;
}

export interface Team {
  _id: string;
  name: string;
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
  status: "scheduled" | "final" | "cancelled" | "postponed";
}

export interface Standing {
  _id: string;
  team: Team;
  wins: number;
  losses: number;
  ties: number;
  runDifferential: number;
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
}

export interface GalleryPhoto {
  _id: string;
  image: SanityImageWithAlt;
  caption?: string;
  date?: string;
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
  sponsorText?: string;
  registrationOpen: boolean;
  registrationFee?: number;
}

export interface PushSubscriptionRecord {
  _id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
}

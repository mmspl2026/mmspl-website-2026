export type AwardTab = "championships" | "mvp" | "rookie" | "service" | "honorary";

export interface AwardCategoryConfig {
  tab: AwardTab;
  displayTitle: string;
  subtitle: string;
  description: string;
  headerGradient: "dark" | "red";
  columnLabel: "Champion" | "Recipient";
}

/**
 * Maps the `category` string stored on each award document to how Emergent
 * displays that trophy — title, description, tab grouping, header colour.
 * The stored category strings themselves are left as-is (they're referenced
 * by ~150 migrated documents); this is a display-only lookup.
 */
export const AWARD_CATEGORY_CONFIG: Record<string, AwardCategoryConfig> = {
  "Jim McGregor Trophy": {
    tab: "championships",
    displayTitle: "The Jim McGregor Trophy",
    subtitle: "Year-End Tournament Champions",
    description: "Presented to the Year-End Tournament Champion",
    headerGradient: "dark",
    columnLabel: "Champion",
  },
  "President's Trophy": {
    tab: "championships",
    displayTitle: "The President's Trophy",
    subtitle: "Regular Season Champions",
    description: "Presented to the team with the most points at the end of the Regular Season",
    headerGradient: "red",
    columnLabel: "Champion",
  },
  "Kevan MacDonald Cup": {
    tab: "championships",
    displayTitle: "The Kevan MacDonald Cup",
    subtitle: "Charity Tournament Champions",
    description: "Presented to the June Charity Tournament Champion.",
    headerGradient: "dark",
    columnLabel: "Champion",
  },
  "Richard Kirkby Memorial Trophy": {
    tab: "mvp",
    displayTitle: "Richard Kirkby Memorial Trophy",
    subtitle: "Final Tournament MVP",
    description: "Presented to the most valuable player in The League Championship",
    headerGradient: "red",
    columnLabel: "Recipient",
  },
  "Peter McClarty Memorial Trophy": {
    tab: "mvp",
    displayTitle: "Peter McClarty Memorial Trophy",
    subtitle: "Charity Tournament MVP",
    description: "Presented to the most valuable player in the Charity Tournament.",
    headerGradient: "red",
    columnLabel: "Recipient",
  },
  "Rookie of the Year": {
    tab: "rookie",
    displayTitle: "The Tom Higgins - Jim Sale Award",
    subtitle: "Rookie of the Year",
    description: "Presented to the first year player who distinguishes himself on and off the field",
    headerGradient: "dark",
    columnLabel: "Recipient",
  },
  "Service Award": {
    tab: "service",
    displayTitle: "The Steve Bull Award",
    subtitle: "Outstanding Service",
    description:
      "Awarded to a Member of the League that The League President feels has distinguished himself in contributing to the continued success and fellowship of the league",
    headerGradient: "red",
    columnLabel: "Recipient",
  },
};

export const AWARD_TABS: { id: AwardTab; label: string }[] = [
  { id: "championships", label: "Championships" },
  { id: "mvp", label: "MVP Awards" },
  { id: "rookie", label: "Rookie of Year" },
  { id: "service", label: "Service Awards" },
  { id: "honorary", label: "Honorary Members" },
];

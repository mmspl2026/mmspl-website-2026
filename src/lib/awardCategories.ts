/**
 * Maps the `category` string stored on each award document (and each
 * awardTrophyPhoto document) to that trophy's full ceremonial name, shown
 * on the /awards page beneath the featured winner. The stored category
 * strings themselves are left as-is (they're referenced by ~150 migrated
 * documents); this is a display-only lookup.
 */
export const AWARD_CATEGORY_ORDER = [
  "Jim McGregor Trophy",
  "Richard Kirkby Memorial Trophy",
  "Kevan MacDonald Cup",
  "Peter McClarty Memorial Trophy",
  "President's Trophy",
  "Rookie of the Year",
  "Service Award",
] as const;

export const AWARD_CATEGORY_DISPLAY_TITLE: Record<string, string> = {
  "Jim McGregor Trophy": "The Jim McGregor Trophy",
  "President's Trophy": "The President's Trophy",
  "Kevan MacDonald Cup": "The Kevan MacDonald Cup",
  "Richard Kirkby Memorial Trophy": "Richard Kirkby Memorial Trophy",
  "Peter McClarty Memorial Trophy": "Peter McClarty Memorial Trophy",
  "Rookie of the Year": "The Tom Higgins - Jim Sale Award",
  "Service Award": "The Steve Bull Award",
};

export const HONORARY_MEMBERS_TAB = "Honorary Members";

export const HONORARY_MEMBERS_DESCRIPTION =
  "In order to permanently recognize individuals who, through personal involvement with the league, have contributed to its growth, organization or enjoyment by its members, the league offers a status of honourary membership. This membership entitles the individual to participate in all social activities of the league that would otherwise be restricted to league members.";

export const HONORARY_MEMBERS_CRITERIA_INTRO = "In order to maintain this status an individual must:";

export const HONORARY_MEMBERS_CRITERIA = [
  "No longer be an active player in the MMSPL",
  "Must be nominated for the position at the Annual General Meeting",
  "Must be accepted by a majority vote at the Annual General Meeting",
];

export const HONORARY_MEMBERS = [
  "Jim McGregor",
  "Ernie Swift",
  "Don Feggi",
  "Chris Ruddle",
  "Greg Hoover",
  "Cameron Strath",
  "Phil Morra",
  "Jim Sale",
  "John Egli",
  "Brian Kirlin",
  "Steve Bull",
  "Tony Williamson",
  "Ron Goldenberg",
  "Peter McClarty",
];

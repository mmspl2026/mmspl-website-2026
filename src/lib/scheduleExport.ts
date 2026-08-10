import type { Game } from "@/lib/types";

interface ParkInfo {
  abbrev: string;
  short: string;
  location: string;
  geo: string;
  appleLocation: string;
}

// Mirrors the field values used by mmspl.ca's own schedule exports —
// abbreviation for SUMMARY, short name for CSV/DESCRIPTION, full postal
// address for LOCATION — plus verified GPS coordinates for GEO and Apple's
// structured-location extension so the event pins the correct map location.
const PARK_INFO: Record<string, ParkInfo> = {
  "Mintleaf Park": {
    abbrev: "ML",
    short: "Mintleaf",
    location: "Mintleaf Park\\, Markham\\, ON",
    geo: "43.8920964;-79.2447625",
    appleLocation:
      'X-APPLE-STRUCTURED-LOCATION;VALUE=URI;X-ADDRESS="Mintleaf Park, Markham, ON";X-APPLE-RADIUS=100;X-TITLE="Mintleaf Park":geo:43.8920964,-79.2447625',
  },
  "Centennial Park": {
    abbrev: "CN",
    short: "Centennial North",
    location: "Centennial Park\\, Markham\\, ON",
    geo: "43.8721326;-79.2899432",
    appleLocation:
      'X-APPLE-STRUCTURED-LOCATION;VALUE=URI;X-ADDRESS="Centennial Park, Markham, ON";X-APPLE-RADIUS=100;X-TITLE="Centennial Park":geo:43.8721326,-79.2899432',
  },
};

function parkInfo(field: string | undefined): ParkInfo {
  return field && PARK_INFO[field]
    ? PARK_INFO[field]
    : { abbrev: "", short: field || "TBD", location: field || "TBD", geo: "", appleLocation: "" };
}

export function slugifyTeamName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, "");
}

// Games run entirely within the May–September EDT window, so the offset
// from Eastern to UTC is always a fixed +4 hours (matches mmspl.ca's own
// generator, which does not account for DST edge cases either).
const GAME_DURATION_MINUTES = 80;
const EASTERN_TO_UTC_OFFSET_HOURS = 4;

function parseGameStartUtc(date: string, time: string): Date {
  const match = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec(time.trim());
  const [year, month, day] = date.split("-").map(Number);
  if (!match) {
    return new Date(Date.UTC(year, month - 1, day));
  }
  let hour = Number(match[1]) % 12;
  if (match[3].toUpperCase() === "PM") hour += 12;
  const minute = Number(match[2]);
  return new Date(Date.UTC(year, month - 1, day, hour + EASTERN_TO_UTC_OFFSET_HOURS, minute, 0));
}

function formatIcsUtc(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}` +
    `T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`
  );
}

function icsEscape(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

// RFC 5545 §3.1 line folding: physical lines are limited to 75 octets,
// continued with a single leading space on the next line.
function foldIcsLine(line: string): string {
  if (line.length <= 75) return line;
  const chunks: string[] = [line.slice(0, 75)];
  let rest = line.slice(75);
  while (rest.length > 0) {
    chunks.push(" " + rest.slice(0, 74));
    rest = rest.slice(74);
  }
  return chunks.join("\r\n");
}

interface IcsOptions {
  year: number;
  team?: { name: string; slug: string };
}

export function buildIcs(games: Game[], { year, team }: IcsOptions): string {
  const scopeSlug = team ? slugifyTeamName(team.name) : "masterschedule";
  const prodId = team ? `-//MMSPL//${team.name} Schedule ${year}//EN` : `-//MMSPL//Master Schedule ${year}//EN`;
  const calName = team ? `MMSPL ${year} - ${team.name}` : `MMSPL ${year} Master Schedule`;
  const dtstamp = formatIcsUtc(new Date());

  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:${prodId}`,
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${calName}`,
  ];

  games.forEach((game, i) => {
    const park = parkInfo(game.field);
    const start = parseGameStartUtc(game.date, game.time);
    const end = new Date(start.getTime() + GAME_DURATION_MINUTES * 60000);
    const uid = `mmspl-${year}-mmspl${year}${scopeSlug}-${String(i).padStart(3, "0")}@mmspl.ca`;

    const isAwayForTeam = team && game.awayTeam.name === team.name;
    const summary = isAwayForTeam
      ? `${park.abbrev}: ${game.homeTeam.name} vs ${game.awayTeam.name} (A)`
      : `${park.abbrev}: ${game.homeTeam.name} (H) vs ${game.awayTeam.name}`;

    const description = `Home: ${game.homeTeam.name}\\nVisitor: ${game.awayTeam.name}\\nPark: ${park.short}`;

    lines.push(
      "BEGIN:VEVENT",
      `UID:${uid}`,
      `DTSTAMP:${dtstamp}`,
      `DTSTART:${formatIcsUtc(start)}`,
      `DTEND:${formatIcsUtc(end)}`,
      foldIcsLine(`SUMMARY:${icsEscape(summary)}`),
      foldIcsLine(`LOCATION:${park.location}`),
      ...(park.geo ? [foldIcsLine(`GEO:${park.geo}`)] : []),
      ...(park.appleLocation ? [foldIcsLine(park.appleLocation)] : []),
      foldIcsLine(`DESCRIPTION:${description}`),
      "END:VEVENT"
    );
  });

  lines.push("END:VCALENDAR");
  return lines.join("\r\n") + "\r\n";
}

function csvCell(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

function formatCsvDate(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00`);
  return d.toLocaleDateString("en-CA", { weekday: "long", month: "long", day: "2-digit" });
}

export function buildCsv(games: Game[]): string {
  const showScore = (g: Game) => g.status === "final" || g.status === "forfeit" || g.status === "live";
  const rows = [
    ["Date", "Time", "Park", "Home Team", "Away Team", "Home Score", "Away Score", "Status"],
    ...games.map((g) => [
      formatCsvDate(g.date),
      g.time,
      parkInfo(g.field).short,
      g.homeTeam.name,
      g.awayTeam.name,
      showScore(g) ? String(g.homeScore ?? "") : "",
      showScore(g) ? String(g.awayScore ?? "") : "",
      g.status.charAt(0).toUpperCase() + g.status.slice(1),
    ]),
  ];
  return rows.map((row) => row.map(csvCell).join(",")).join("\r\n") + "\r\n";
}

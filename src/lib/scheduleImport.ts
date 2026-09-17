/**
 * Parses an admin-uploaded schedule file (CSV or Excel — DATE, TIME, PARK,
 * HOME, AWAY columns, same shape produced by the schedule generator's own
 * export) into the same shape the generator produces, so the league can
 * override the generator entirely with a hand-built spreadsheet and feed
 * it into the exact same preview/publish flow.
 */

import * as XLSX from "xlsx";

export interface ImportedGame {
  date: string;
  time: string;
  field: string;
  homeTeamId: string;
  awayTeamId: string;
  homeTeamName: string;
  awayTeamName: string;
}

export interface ImportTeam {
  _id: string;
  name: string;
}

export interface ParseResult {
  games: ImportedGame[];
  errors: string[];
}

/** Hand-rolled rather than a dependency — handles quoted fields with
 * embedded commas/quotes, which is the only real complexity for a 5-column
 * schedule CSV. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\r") {
      // skip — \r\n line endings are handled by the \n branch below
    } else if (c === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += c;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((cell) => cell.trim().length > 0));
}

const MONTH_NAMES = [
  "january", "february", "march", "april", "may", "june",
  "july", "august", "september", "october", "november", "december",
];

/** Accepts a plain "YYYY-MM-DD" date, or "[Weekday, ]Month D[, YYYY]" (e.g.
 * "Tuesday, May 12", the exported CSV's own format) — the latter borrows
 * `fallbackYear` when no year is present. Deliberately strict rather than
 * delegating arbitrary text to JS's own `Date` constructor, which silently
 * coerces garbage strings like "not-a-date" into a real (wrong) date
 * instead of rejecting them. */
export function parseImportedDate(raw: string, fallbackYear: string | number): string | null {
  const trimmed = raw.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;

  const withoutWeekday = trimmed.replace(/^[A-Za-z]+,\s*/, "");
  const match = withoutWeekday.match(/^([A-Za-z]+)\s+(\d{1,2})(?:,?\s*(\d{4}))?$/);
  if (!match) return null;

  const [, monthName, dayStr, yearStr] = match;
  const monthIndex = MONTH_NAMES.indexOf(monthName.toLowerCase());
  if (monthIndex === -1) return null;

  const day = Number(dayStr);
  if (day < 1 || day > 31) return null;

  const yearNum = yearStr ? Number(yearStr) : Number(fallbackYear);
  if (!Number.isInteger(yearNum)) return null;

  const mm = String(monthIndex + 1).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  return `${yearNum}-${mm}-${dd}`;
}

const HEADER_ALIASES: Record<"date" | "time" | "field" | "home" | "away", string[]> = {
  date: ["date"],
  time: ["time"],
  field: ["park", "field"],
  home: ["home", "hometeam", "home team"],
  away: ["away", "awayteam", "away team"],
};

/** Builds a lookup from draw-slot placeholder labels ("Team 1".."Team 14",
 * plus "Team A" as the league's own alias for "Team 1" — the original
 * template used that alias because Excel apparently misbehaves when a
 * column contains both the text "Team" and the number 1 together) to real
 * teams, from the same draw-order picker already in the generator form.
 * Lets an import file that hasn't had the draw applied yet (still reading
 * "Team 1", "Team 2", ...) resolve against whatever slots are filled in,
 * instead of requiring every cell to already be a real team name. */
export function buildDrawPlaceholderMap(draw: (ImportTeam | null)[]): Map<string, ImportTeam> {
  const map = new Map<string, ImportTeam>();
  draw.forEach((team, i) => {
    if (!team) return;
    map.set(`team ${i + 1}`, team);
    if (i === 0) map.set("team a", team);
  });
  return map;
}

export function parseScheduleCsv(
  text: string,
  teams: ImportTeam[],
  fallbackYear: string | number,
  placeholderMap?: Map<string, ImportTeam>
): ParseResult {
  return parseScheduleRows(parseCsv(text), teams, fallbackYear, placeholderMap);
}

/** Same as parseScheduleCsv but for an uploaded .xls/.xlsx file — reads the
 * first sheet, formatted (`raw: false`) so Excel's internal time-as-decimal
 * representation (e.g. 0.770833 for 6:30 PM) comes through as the same
 * "6:30 PM" string the CSV path already expects, not a raw fraction. */
export function parseScheduleXlsx(
  data: ArrayBuffer,
  teams: ImportTeam[],
  fallbackYear: string | number,
  placeholderMap?: Map<string, ImportTeam>
): ParseResult {
  let rows: string[][];
  try {
    const workbook = XLSX.read(data, { type: "array" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    if (!sheet) return { games: [], errors: ["The workbook has no sheets."] };
    rows = (XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false }) as unknown[][])
      .map((row) => row.map((cell) => (cell === null || cell === undefined ? "" : String(cell))))
      .filter((row) => row.some((cell) => cell.trim().length > 0));
  } catch {
    return { games: [], errors: ["Couldn't read this file as an Excel workbook — is it a valid .xls/.xlsx file?"] };
  }
  return parseScheduleRows(rows, teams, fallbackYear, placeholderMap);
}

function parseScheduleRows(
  rows: string[][],
  teams: ImportTeam[],
  fallbackYear: string | number,
  placeholderMap?: Map<string, ImportTeam>
): ParseResult {
  if (rows.length < 2) {
    return { games: [], errors: ["The file has no data rows below the header."] };
  }

  const header = rows[0].map((h) => h.trim().toLowerCase());
  const colIndex = (key: keyof typeof HEADER_ALIASES) => header.findIndex((h) => HEADER_ALIASES[key].includes(h));
  const idx = {
    date: colIndex("date"),
    time: colIndex("time"),
    field: colIndex("field"),
    home: colIndex("home"),
    away: colIndex("away"),
  };
  const missingCols = (Object.keys(idx) as (keyof typeof idx)[]).filter((k) => idx[k] === -1);
  if (missingCols.length > 0) {
    return {
      games: [],
      errors: [`Missing column(s): ${missingCols.join(", ").toUpperCase()}. Expected DATE, TIME, PARK, HOME, AWAY.`],
    };
  }

  const nameToTeam = new Map(teams.map((t) => [t.name.trim().toLowerCase(), t]));
  const isPlaceholderToken = (s: string) => /^team\s+([a-z]|\d+)$/i.test(s.trim());
  const resolveTeam = (raw: string) => nameToTeam.get(raw.toLowerCase()) ?? placeholderMap?.get(raw.toLowerCase());
  const teamError = (raw: string, label: "home" | "away", rowNum: number) =>
    isPlaceholderToken(raw)
      ? `Row ${rowNum}: "${raw}" is a draw placeholder that isn't assigned yet — fill in that slot in the Draw Order picker above, or edit the file to use real team names.`
      : `Row ${rowNum}: unrecognized ${label} team "${raw}" — must match a real team name exactly.`;
  const errors: string[] = [];
  const games: ImportedGame[] = [];

  rows.slice(1).forEach((r, i) => {
    const rowNum = i + 2; // 1-indexed + header row
    const dateRaw = (r[idx.date] ?? "").trim();
    const time = (r[idx.time] ?? "").trim();
    const field = (r[idx.field] ?? "").trim();
    const homeRaw = (r[idx.home] ?? "").trim();
    const awayRaw = (r[idx.away] ?? "").trim();

    const date = parseImportedDate(dateRaw, fallbackYear);
    const home = resolveTeam(homeRaw);
    const away = resolveTeam(awayRaw);

    if (!date) errors.push(`Row ${rowNum}: couldn't parse date "${dateRaw}".`);
    if (!time) errors.push(`Row ${rowNum}: missing time.`);
    if (!field) errors.push(`Row ${rowNum}: missing park/field.`);
    if (!home) errors.push(teamError(homeRaw, "home", rowNum));
    if (!away) errors.push(teamError(awayRaw, "away", rowNum));

    if (date && time && field && home && away) {
      games.push({
        date,
        time,
        field,
        homeTeamId: home._id,
        awayTeamId: away._id,
        homeTeamName: home.name,
        awayTeamName: away.name,
      });
    }
  });

  return { games, errors };
}

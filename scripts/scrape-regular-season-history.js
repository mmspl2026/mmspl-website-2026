"use strict";

/**
 * Scrapes historical regular-season game logs from mmspl.ca
 * (standings-YYYY-MONTH.html — yes, "standings" in the URL, but the page
 * itself is titled "YYYY Regular Season Game Log" and lists every game of
 * that month with real scores) and upserts real `game` documents.
 *
 * Confirmed by direct inspection:
 *  - This format exists 2010–2024 (2005–2009 only have a final standings
 *    table, no game log at all — confirmed via standings-2005.html).
 *  - Months present vary by year; tried candidates are april–october.
 *  - 2010 specifically has no per-game field/diamond label at all (every
 *    other year does) — `field` is left unset for that year only, which is
 *    why the `game` schema's `field` was relaxed from required to optional.
 *  - Team names are free text, not seed codes — resolved to real Sanity
 *    `team` documents (creating any that don't already exist) using the
 *    same deterministic `team-${slug}` _id scheme already used site-wide.
 *  - 2025/2026 already have real game data from another source — this
 *    script defaults to 2010-2024 to avoid touching those, but --years
 *    overrides if a gap ever needs re-checking.
 *
 * Idempotent: deterministic `game-hist-...` _id per game (prefixed to never
 * collide with the existing `game-YYYY-N` manually-numbered scheme used by
 * 2025/2026), createOrReplace throughout.
 *
 * Usage: node scripts/scrape-regular-season-history.js [--years=2010-2024] [--dry-run]
 */

const path = require("path");
const cheerio = require("cheerio");
const { createClient } = require("@sanity/client");

try {
  process.loadEnvFile(path.join(__dirname, "..", ".env.local"));
} catch {
  // no .env.local on disk — assume env vars are already set in the shell
}

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET;
const apiVersion = process.env.NEXT_PUBLIC_SANITY_API_VERSION || "2024-01-01";
const token = process.env.SANITY_API_TOKEN;

if (!projectId || !dataset || !token) {
  console.error("Missing NEXT_PUBLIC_SANITY_PROJECT_ID, NEXT_PUBLIC_SANITY_DATASET, or SANITY_API_TOKEN.");
  process.exit(1);
}

const client = createClient({ projectId, dataset, apiVersion, token, useCdn: false, timeout: 20000 });

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const yearsArg = args.find((a) => a.startsWith("--years="));
let YEAR_START = 2010;
let YEAR_END = 2024;
if (yearsArg) {
  const [a, b] = yearsArg.split("=")[1].split("-").map(Number);
  YEAR_START = a;
  YEAR_END = b || a;
}

const BASE = "https://mmspl.ca";
const MONTHS = ["april", "may", "june", "july", "august", "september", "october"];

async function fetchHtml(url, retries = 2) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);
    try {
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeout);
      return res.status === 200 ? await res.text() : null;
    } catch (err) {
      clearTimeout(timeout);
      if (attempt === retries) {
        console.warn(`  [fetch error] ${url}: ${err.message}`);
        return null;
      }
    }
  }
  return null;
}

function slugify(str) {
  return String(str)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeField(raw) {
  const t = raw.trim().toLowerCase();
  if (t.includes("centennial")) return "Centennial Park";
  if (t.includes("mintleaf")) return "Mintleaf Park";
  return undefined;
}

function parseDate(titleText, year) {
  const m = titleText.match(/^[A-Za-z]+\s+(.+)$/);
  const cleaned = m ? m[1] : titleText;
  const d = new Date(`${cleaned}, ${year}`);
  if (isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

function extractGamesFromMonthPage(html, year) {
  const $ = cheerio.load(html);
  const games = [];

  $("div.post").each((_, post) => {
    const $post = $(post);
    const $h2 = $post.find("> h2.title").first();
    if ($h2.length === 0) return;
    const titleText = $h2.text().trim();
    if (/Regular Season Game Log/i.test(titleText)) return; // the page-title post, not a game day

    const date = parseDate(titleText, year);
    if (!date) return;

    $post.find("> div.entry").each((__, entry) => {
      const $entry = $(entry);
      const time = $entry.find("td.gamescoretime").first().text().trim();
      if (!time) return;

      $entry.find("td.gamescorecol").each((___, cell) => {
        const $cell = $(cell);
        const $scoreTable = $cell.find("table.gamescore").first();
        if ($scoreTable.length === 0) return; // empty &nbsp; slot

        const $rows = $scoreTable.find("> tbody > tr, > tr");
        let fieldLabel;
        const teamRows = [];
        $rows.each((____, tr) => {
          const $tr = $(tr);
          const $tds = $tr.find("> td");
          if ($tds.length === 1 && $tds.attr("colspan")) {
            fieldLabel = $tds.text().trim();
          } else if ($tds.length >= 2) {
            teamRows.push({
              team: $tds.eq(0).text().trim(),
              scoreRaw: $tds.eq(1).text().trim(),
              isWinner: /font-weight:\s*bold/i.test($tr.attr("style") || ""),
            });
          }
        });
        if (teamRows.length !== 2) return;

        const [home, away] = teamRows;
        const homeScore = /^\d+$/.test(home.scoreRaw) ? Number(home.scoreRaw) : undefined;
        const awayScore = /^\d+$/.test(away.scoreRaw) ? Number(away.scoreRaw) : undefined;
        if (homeScore === undefined && awayScore === undefined) return; // no recorded result

        games.push({
          date,
          time,
          field: fieldLabel ? normalizeField(fieldLabel) : undefined,
          homeTeamName: home.team,
          awayTeamName: away.team,
          homeScore,
          awayScore,
        });
      });
    });
  });

  return games;
}

const teamIdCache = new Map();

async function resolveTeamId(name) {
  const id = `team-${slugify(name)}`;
  if (teamIdCache.has(id)) return id;
  if (!dryRun) {
    const existing = await client.fetch(`*[_type == "team" && _id == $id][0]{_id}`, { id });
    if (!existing) {
      await client.createIfNotExists({ _id: id, _type: "team", name });
      console.log(`  [team] created ${name}`);
    }
  }
  teamIdCache.set(id, true);
  return id;
}

async function processYear(year) {
  let totalGames = 0;
  for (const month of MONTHS) {
    const url = `${BASE}/standings-${year}-${month}.html`;
    const html = await fetchHtml(url);
    if (!html) continue;

    const games = extractGamesFromMonthPage(html, year);
    if (games.length === 0) continue;

    for (const g of games) {
      try {
        const homeTeamId = await resolveTeamId(g.homeTeamName);
        const awayTeamId = await resolveTeamId(g.awayTeamName);
        const gid = `game-hist-${year}-${slugify(g.date)}-${slugify(g.time)}-${slugify(g.field || "unknown")}-${slugify(g.homeTeamName)}-${slugify(g.awayTeamName)}`;

        const doc = {
          _id: gid,
          _type: "game",
          season: { _type: "reference", _ref: `season-${year}` },
          date: g.date,
          time: g.time,
          homeTeam: { _type: "reference", _ref: homeTeamId },
          awayTeam: { _type: "reference", _ref: awayTeamId },
          status: "final",
        };
        if (g.field) doc.field = g.field;
        if (g.homeScore !== undefined) doc.homeScore = g.homeScore;
        if (g.awayScore !== undefined) doc.awayScore = g.awayScore;

        if (!dryRun) await client.createOrReplace(doc);
        totalGames++;
      } catch (err) {
        console.warn(`  [game write error] ${year} ${month} ${g.date} ${g.time} ${g.homeTeamName} vs ${g.awayTeamName}: ${err.message}`);
      }
    }
    console.log(`  [${year} ${month}] ${games.length} games`);
  }
  return totalGames;
}

async function main() {
  // Hard safety net: some individual requests (mmspl.ca or the Sanity API)
  // have hung past their own timeouts in practice, wedging the whole batch.
  // This guarantees the process always exits within a bounded window so a
  // stuck run is never mistaken for one still silently making progress.
  const watchdog = setTimeout(() => {
    console.error("\n[watchdog] Forcing exit after 4 minutes with no completion.");
    process.exit(1);
  }, 240000);

  console.log(`Scraping regular season history for ${YEAR_START}-${YEAR_END}${dryRun ? " (dry run)" : ""}\n`);
  let grandTotal = 0;
  for (let year = YEAR_END; year >= YEAR_START; year--) {
    console.log(`--- ${year} ---`);
    try {
      const count = await processYear(year);
      grandTotal += count;
      if (count === 0) console.log(`  [skip] ${year} — no game log pages found`);
    } catch (err) {
      console.error(`  [error] ${year}: ${err.message}`);
    }
  }
  clearTimeout(watchdog);
  console.log(`\nDone. Total games upserted: ${grandTotal}. Teams created/verified: ${teamIdCache.size}`);
}

main();

"use strict";

/**
 * Scrapes MMSPL's tournament schedule pages (mmspl.ca, the old site being
 * retired) for the Kevan MacDonald Charity Tournament and Jim McGregor
 * Year-End Tournament, and upserts tournamentResult / tournamentPool /
 * tournamentGame / wildCardRanking documents into Sanity.
 *
 * Page formats vary by era, all confirmed by direct inspection (never
 * guessed):
 *  - Charity pages self-resolve team names either via an inline
 *    `var seeds = {'[A1]': 'Team Name', ...}` object, or by embedding the
 *    name directly in each cell ("B2 - The Classics").
 *  - Older McGregor pages sometimes only show bare seed codes (no map at
 *    all) — those years require a fallback fetch of standings-YYYY.html,
 *    zipped against the page's own `var seeds = ['A1','B1',...]` order
 *    array (replicating exactly what the site's own client-side JS does).
 *  - 2026+ charity has a second "-mobile" page with a Wild Card standings
 *    table and setup/teardown notes that don't exist on the classic pages;
 *    parsed opportunistically when present.
 *
 * Idempotent: deterministic _id per document, createOrReplace throughout.
 * Games with no recorded result (both sides unplayed placeholders) are
 * skipped rather than imported as blank TBD rows.
 *
 * Usage: node scripts/scrape-tournament-history.js [--years=2012-2026] [--dry-run]
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

const client = createClient({ projectId, dataset, apiVersion, token, useCdn: false });

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const yearsArg = args.find((a) => a.startsWith("--years="));
let YEAR_START = 2012;
let YEAR_END = new Date().getFullYear();
if (yearsArg) {
  const [a, b] = yearsArg.split("=")[1].split("-").map(Number);
  YEAR_START = a;
  YEAR_END = b || a;
}

const TYPES = [
  { type: "charity", urlSuffix: "charity", awardCategory: "Kevan MacDonald Cup", mvpCategory: "Peter McClarty Memorial Trophy", mvpTrophyName: "Peter McClarty Memorial Trophy" },
  { type: "mcgregor", urlSuffix: "final", awardCategory: "Jim McGregor Trophy", mvpCategory: "Richard Kirkby Memorial Trophy", mvpTrophyName: "Richard Kirkby Memorial Trophy" },
];

const BASE = "https://mmspl.ca";
const htmlCache = new Map();

async function fetchHtml(url) {
  if (htmlCache.has(url)) return htmlCache.get(url);
  try {
    const res = await fetch(url);
    const result = res.status === 200 ? await res.text() : null;
    htmlCache.set(url, result);
    return result;
  } catch (err) {
    console.warn(`  [fetch error] ${url}: ${err.message}`);
    htmlCache.set(url, null);
    return null;
  }
}

function slugify(str) {
  return String(str)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// --- Seed resolution -------------------------------------------------

/** Parses `var seeds = {'[A1]': 'Team Name', ...};` into {A1: 'Team Name'}. */
function extractSeedsObjectMap(html) {
  const m = html.match(/var\s+seeds\s*=\s*\{([\s\S]*?)\};/);
  if (!m) return null;
  const map = {};
  const entryRe = /'\[?([A-Z]\d+)\]?'\s*:\s*'([^']*)'/g;
  let entry;
  while ((entry = entryRe.exec(m[1]))) {
    map[entry[1]] = entry[2];
  }
  return Object.keys(map).length > 0 ? map : null;
}

/** Parses `var seeds = ['A1','B1',...];` into an ordered code array. */
function extractSeedsArray(html) {
  const m = html.match(/var\s+seeds\s*=\s*\[([\s\S]*?)\];/);
  if (!m) return null;
  const codes = [...m[1].matchAll(/'([A-Z]\d+)'/g)].map((x) => x[1]);
  return codes.length > 0 ? codes : null;
}

/** Fetches standings-YYYY.html and returns team names in rank order. */
async function fetchStandingsOrder(year) {
  const html = await fetchHtml(`${BASE}/standings-${year}.html`);
  if (!html) return null;
  const $ = cheerio.load(html);
  const names = [];
  $("table.dataTable tr").each((_, row) => {
    const $row = $(row);
    if ($row.hasClass("headerRow")) return;
    const name = $row.find("td").eq(1).text().trim();
    if (name) names.push(name);
  });
  return names.length > 0 ? names : null;
}

/** Builds a code->name seed map, trying the self-contained object map first, then the standings fallback. */
async function buildSeedMap(html, year) {
  const objectMap = extractSeedsObjectMap(html);
  if (objectMap) return objectMap;

  const orderArray = extractSeedsArray(html);
  if (orderArray) {
    const standingsOrder = await fetchStandingsOrder(year);
    if (standingsOrder) {
      const map = {};
      orderArray.forEach((code, i) => {
        if (standingsOrder[i]) map[code] = standingsOrder[i];
      });
      return map;
    }
  }
  return {};
}

/**
 * Resolves a raw team-cell text to {name, poolLetter}. Handles inline
 * "A1 - Team Name", bracketed/bare codes needing a seedMap lookup, and
 * literal placeholders ("Box Winner", "Qualifier 5", "WC1") passed through
 * unresolved (still informative even before the slot is filled).
 */
function resolveTeam(raw, seedMap) {
  const text = raw.trim();
  const inlineMatch = text.match(/^\[?([A-Z]\d+)\]?\s*-\s*(.+)$/);
  if (inlineMatch && !/^\(\d+\)$/.test(inlineMatch[2].trim())) {
    return { name: inlineMatch[2].trim(), poolLetter: inlineMatch[1][0] };
  }
  // Bare code, optionally suffixed with a "- (rank)" annotation instead of a
  // real name (older McGregor box listings) — both resolve via seedMap.
  const bareMatch = text.match(/^\[?([A-Z]\d+)\]?(?:\s*-\s*\(\d+\))?$/);
  if (bareMatch) {
    const code = bareMatch[1];
    return { name: seedMap[code] || code, poolLetter: code[0] };
  }
  return { name: text, poolLetter: undefined };
}

// --- Page parsing ------------------------------------------------------

/**
 * Two banner formats seen across years, both handled here:
 *  - classic: <p class="pictureframe"><img/><span>Champions - Name</span></p>
 *  - 2026+ desktop 3-card layout: <img alt="Champions"/> followed by a name
 *    div, no pictureframe wrapper or "Champions - " prefixed span at all.
 * Every format observed uses img[alt="Champions"|"Finalists"|"MVP"], so that
 * alone is used for photo URLs; names come from whichever format matches.
 */
function extractChampionBanner($) {
  let champion, finalist, mvp, championPhotoUrl, finalistPhotoUrl, mvpPhotoUrl;

  $("p.pictureframe").each((_, el) => {
    const $el = $(el);
    const label = $el.find("span").text().trim();
    if (/^Champions?\s*-/.test(label)) {
      champion = label.replace(/^Champions?\s*-\s*/, "").trim();
    } else if (/^Finalists?\s*-/.test(label)) {
      finalist = label.replace(/^Finalists?\s*-\s*/, "").trim();
    }
  });

  const fromCardLayout = (alt) => {
    const $img = $(`img[alt="${alt}"]`).first();
    if ($img.length === 0) return {};
    const src = $img.attr("src");
    const url = src ? new URL(src, BASE + "/").href : undefined;
    const name = $img.next("div").find("div").first().text().trim() || undefined;
    return { url, name };
  };

  const championCard = fromCardLayout("Champions");
  championPhotoUrl = championCard.url;
  if (!champion) champion = championCard.name;

  const finalistCard = fromCardLayout("Finalists");
  finalistPhotoUrl = finalistCard.url;
  if (!finalist) finalist = finalistCard.name;

  const mvpCard = fromCardLayout("MVP");
  mvpPhotoUrl = mvpCard.url;
  mvp = mvpCard.name;

  return { champion, finalist, mvp, championPhotoUrl, finalistPhotoUrl, mvpPhotoUrl };
}

function extractPools($, seedMap) {
  const pools = [];
  $("div.box").each((_, box) => {
    const $box = $(box);
    const heading = $box.find(".heading").text().trim();
    const letterMatch = heading.match(/([A-Z])\s*$/);
    if (!letterMatch) return;
    const poolLetter = letterMatch[1];
    const teams = [];
    $box.find("div.team").each((__, teamEl) => {
      const { name } = resolveTeam($(teamEl).text(), seedMap);
      if (name) teams.push(name);
    });
    if (teams.length > 0) pools.push({ poolLetter, teams });
  });
  return pools;
}

function roundFromLabel(label) {
  if (!label) return "roundRobin";
  if (/^final/i.test(label)) return "final";
  if (/^SF/i.test(label)) return "semiFinal";
  if (/^QF/i.test(label)) return "quarterFinal";
  if (/^WC/i.test(label)) return "wildCard";
  return "roundRobin";
}

function parseDate(rawDate, year) {
  const m = rawDate.match(/^[A-Za-z]+,?\s*(.+)$/);
  const cleaned = m ? m[1] : rawDate;
  const d = new Date(`${cleaned}, ${year}`);
  if (isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

/**
 * Playoff rows carry a decorative red side-label div ("Wild Card Playoffs",
 * "Quarter Final Playoffs", "Semi-Finals", "Final") that spans its row plus
 * `rowspan-1` following rows. Normally each individual game also has its own
 * inline round label inside its gamescore table (WC1, QF2, ...), but at
 * least one observed page (2026 charity, the Final row) omits that inline
 * label — so this side-label is used as a fallback, keyed by row element.
 */
function buildRoundOverrideMap($) {
  const overrides = new Map();
  $("table.dataTable tr").each((_, tr) => {
    $(tr)
      .find("> td")
      .each((__, td) => {
        const $td = $(td);
        const $label = $td.find("div").filter((___, div) => /background-color:\s*#AA1111/i.test($(div).attr("style") || "")).first();
        if ($label.length === 0) return;
        const text = $label.text();
        // Check Quarter Final before Wild Card: the QF label's own subtext
        // ("Pool A seeds vs Wild Card winners") contains the phrase "Wild
        // Card", so testing that pattern first would misclassify it.
        let round;
        if (/Quarter Final/i.test(text)) round = "quarterFinal";
        else if (/Wild Card/i.test(text)) round = "wildCard";
        else if (/Semi-?Final/i.test(text)) round = "semiFinal";
        else if (/^\s*Final\s*$/i.test(text)) round = "final";
        if (!round) return;
        const span = parseInt($td.attr("rowspan") || "1", 10);
        let sib = tr;
        for (let i = 0; i < span && sib; i++) {
          overrides.set(sib, round);
          sib = $(sib).next("tr")[0];
        }
      });
  });
  return overrides;
}

function extractGames($, seedMap, year) {
  const games = [];
  const headerCells = $("table.dataTable tr.headerRow td")
    .slice(2)
    .map((_, td) => $(td).text().trim())
    .get();
  const roundOverrides = buildRoundOverrideMap($);
  // Time strings aren't reliably sortable as text (some years omit AM/PM,
  // e.g. "8:00" for both a Tuesday-evening and a Saturday-morning game), so
  // document order — which mmspl.ca always lists correctly, top to bottom —
  // is captured here and used for display order instead.
  let sortCounter = 0;

  $("table.dataTable tr").each((_, row) => {
    const $row = $(row);
    if (!$row.hasClass("evenRow") && !$row.hasClass("oddRow")) return;
    const cells = $row.find("> td");
    const rawDate = $(cells[0]).text().trim();
    const time = $(cells[1]).text().trim();
    if (!rawDate || !time) return;
    const date = parseDate(rawDate, year);
    if (!date) return;

    for (let i = 0; i < headerCells.length; i++) {
      const field = headerCells[i];
      const $cell = $(cells[2 + i]);
      const $scoreTable = $cell.find("table.gamescore").first();
      if ($scoreTable.length === 0) continue;

      const $rows = $scoreTable.find("> tbody > tr, > tr");
      let roundLabel;
      let teamRows = [];
      $rows.each((__, tr) => {
        const $tr = $(tr);
        const $tds = $tr.find("> td");
        if ($tds.length === 1 && $tds.attr("colspan")) {
          roundLabel = $tds.text().trim();
        } else if ($tds.length >= 2) {
          teamRows.push({
            teamRaw: $tds.eq(0).text().trim(),
            scoreRaw: $tds.eq(1).text().trim(),
            isWinner: $tr.hasClass("winner"),
          });
        }
      });
      if (teamRows.length !== 2) continue;

      const [homeRow, awayRow] = teamRows;
      const home = resolveTeam(homeRow.teamRaw, seedMap);
      const away = resolveTeam(awayRow.teamRaw, seedMap);

      const parseScore = (row) => {
        if (/^\d+$/.test(row.scoreRaw)) return { score: Number(row.scoreRaw), result: undefined };
        if (row.scoreRaw === "W" || row.isWinner) return { score: undefined, result: "W" };
        if (row.scoreRaw === "-") return { score: undefined, result: "-" };
        return { score: undefined, result: undefined };
      };
      const homeParsed = parseScore(homeRow);
      const awayParsed = parseScore(awayRow);

      const hasRealResult =
        homeParsed.score !== undefined ||
        awayParsed.score !== undefined ||
        homeRow.isWinner ||
        awayRow.isWinner;
      if (!hasRealResult) continue; // unplayed placeholder slot — skip

      const round = roundLabel ? roundFromLabel(roundLabel) : roundOverrides.get(row) || "roundRobin";
      const game = {
        date,
        sortOrder: sortCounter++,
        time,
        field,
        homeTeam: home.name,
        awayTeam: away.name,
        round,
        pool: round === "roundRobin" ? home.poolLetter || away.poolLetter : undefined,
      };
      if (homeParsed.score !== undefined) game.homeScore = homeParsed.score;
      if (awayParsed.score !== undefined) game.awayScore = awayParsed.score;
      if (homeParsed.result) game.homeResult = homeParsed.result;
      if (awayParsed.result) game.awayResult = awayParsed.result;
      games.push(game);
    }
  });
  return games;
}

// --- Mobile-page extras (2026+ format) ---------------------------------

async function parseMobileExtras(year, urlSuffix) {
  const html = await fetchHtml(`${BASE}/schedule-${year}-${urlSuffix}-mobile.html`);
  if (!html) return null;
  const $ = cheerio.load(html);

  let mvpName, mvpPhotoUrl;
  const mvpBadge = $(".winner-mvp-badge").first();
  if (mvpBadge.length) {
    mvpName = mvpBadge.next(".winner-photo-name").text().trim() || undefined;
    const src = mvpBadge.closest(".winner-photo-box").find("img").attr("src");
    if (src) mvpPhotoUrl = new URL(src, BASE + "/").href;
  }

  const rankings = [];
  const $wc = $("#wc");
  if ($wc.length) {
    let eliminated = false;
    $wc.find("> div").each((_, div) => {
      const $div = $(div);
      const text = $div.text();
      if (/Eliminated/i.test(text) && $div.find("span").length === 0) {
        eliminated = true;
        return;
      }
      const spans = $div.find("> span");
      if (spans.length < 4) return;
      const rank = Number($(spans[0]).text().trim());
      if (!rank) return;
      const teamName = $(spans[1]).text().trim();
      const pool = $(spans[2]).text().trim() || undefined;
      const statsText = $(spans[3]).text().trim(); // e.g. "8pts 4W 0L +28"
      const statsMatch = statsText.match(/(-?\d+)pts\s+(\d+)W\s+(\d+)L\s+([+-]?\d+)/);
      rankings.push({
        rank,
        teamName,
        pool,
        points: statsMatch ? Number(statsMatch[1]) : undefined,
        wins: statsMatch ? Number(statsMatch[2]) : undefined,
        losses: statsMatch ? Number(statsMatch[3]) : undefined,
        runDifferential: statsMatch ? Number(statsMatch[4]) : undefined,
        advanced: !eliminated,
      });
    });
  }

  const dayNotes = [];
  $(".day-section").each((_, section) => {
    const $section = $(section);
    const dateHeading = $section.find("> div").first().text().trim();
    const dateMatch = dateHeading.match(/([A-Za-z]+ \d+)/);
    if (!dateMatch) return;
    const d = new Date(`${dateMatch[1]}, ${year}`);
    if (isNaN(d.getTime())) return;
    const date = d.toISOString().slice(0, 10);
    let setupNote, teardownNote;
    $section.find("> div").each((__, noteDiv) => {
      const $noteDiv = $(noteDiv);
      const lines = $noteDiv
        .find("> div")
        .slice(1)
        .map((___, line) => $(line).text().trim())
        .get();
      const label = $noteDiv.find("> div").first().text();
      if (/Setup/i.test(label)) setupNote = lines.join(", ");
      if (/Tear ?Down/i.test(label)) teardownNote = lines.join(", ");
    });
    if (setupNote || teardownNote) dayNotes.push({ date, setupNote, teardownNote });
  });

  return { mvpName, mvpPhotoUrl, rankings, dayNotes };
}

// --- Sanity helpers ------------------------------------------------------

const photoAssetCache = new Map();

async function uploadPhotoIfUrl(url, filename) {
  if (!url || dryRun) return undefined;
  if (photoAssetCache.has(url)) return photoAssetCache.get(url);
  try {
    const res = await fetch(url);
    if (res.status !== 200) return undefined;
    const buf = Buffer.from(await res.arrayBuffer());
    const asset = await client.assets.upload("image", buf, { filename });
    const value = { _type: "image", asset: { _type: "reference", _ref: asset._id } };
    photoAssetCache.set(url, value);
    return value;
  } catch (err) {
    console.warn(`  [photo upload failed] ${url}: ${err.message}`);
    return undefined;
  }
}

async function fetchAwardWinner(category, year) {
  const doc = await client.fetch(`*[_type == "award" && category == $category && year == $year][0]{winner}`, { category, year });
  return doc?.winner;
}

// --- Main ------------------------------------------------------------

async function processYearType(year, cfg) {
  const { type, urlSuffix, awardCategory, mvpCategory, mvpTrophyName } = cfg;
  const pageUrl = `${BASE}/schedule-${year}-${urlSuffix}.html`;
  const html = await fetchHtml(pageUrl);

  const resultId = `tournamentResult-${year}-${type}`;
  let champion, finalist, mvpFromPage, championPhotoUrl, finalistPhotoUrl, mvpPhotoUrl, pools = [], games = [];

  if (html) {
    const $ = cheerio.load(html);
    const banner = extractChampionBanner($);
    champion = banner.champion;
    finalist = banner.finalist;
    mvpFromPage = banner.mvp;
    championPhotoUrl = banner.championPhotoUrl;
    finalistPhotoUrl = banner.finalistPhotoUrl;
    mvpPhotoUrl = banner.mvpPhotoUrl;
    const seedMap = await buildSeedMap(html, year);
    pools = extractPools($, seedMap);
    games = extractGames($, seedMap, year);
  }

  // Fallback / cross-check champion + MVP from already-migrated award data.
  if (!champion) champion = await fetchAwardWinner(awardCategory, year);
  const mvp = mvpFromPage || (await fetchAwardWinner(mvpCategory, year));

  const mobileExtras = await parseMobileExtras(year, urlSuffix);
  if (mobileExtras?.mvpPhotoUrl) mvpPhotoUrl = mobileExtras.mvpPhotoUrl;

  const hasDetailedResults = games.length > 0;

  if (!champion && !hasDetailedResults) {
    console.log(`  [skip] ${year} ${type} — no page, no award data`);
    return { games: 0, pools: 0, rankings: 0 };
  }

  const [championPhoto, finalistPhoto, mvpPhoto] = await Promise.all([
    uploadPhotoIfUrl(championPhotoUrl, `tournament-${year}-${type}-champion.jpg`),
    uploadPhotoIfUrl(finalistPhotoUrl, `tournament-${year}-${type}-finalist.jpg`),
    uploadPhotoIfUrl(mvpPhotoUrl, `tournament-${year}-${type}-mvp.jpg`),
  ]);

  const resultDoc = {
    _id: resultId,
    _type: "tournamentResult",
    year,
    type,
    champion: champion || undefined,
    finalist: finalist || undefined,
    mvp: mvp || undefined,
    mvpTrophy: mvp ? mvpTrophyName : undefined,
    championPhoto,
    finalistPhoto,
    mvpPhoto,
    hasDetailedResults,
  };

  if (!dryRun) await client.createOrReplace(resultDoc);
  console.log(`  [result] ${year} ${type} — champion=${champion || "?"} detailed=${hasDetailedResults}`);

  // Apply day-level setup/teardown notes (2026+ mobile format) onto the
  // first/last game of each matching date.
  if (mobileExtras?.dayNotes?.length) {
    for (const note of mobileExtras.dayNotes) {
      const dayGames = games.filter((g) => g.date === note.date);
      if (dayGames.length === 0) continue;
      if (note.setupNote) dayGames[0].setupNote = note.setupNote;
      if (note.teardownNote) dayGames[dayGames.length - 1].teardownNote = note.teardownNote;
    }
  }

  if (!dryRun) {
    for (const pool of pools) {
      await client.createOrReplace({
        _id: `tournamentPool-${year}-${type}-${pool.poolLetter}`,
        _type: "tournamentPool",
        year,
        type,
        poolLetter: pool.poolLetter,
        teams: pool.teams,
      });
    }
    for (const game of games) {
      const gid = `tournamentGame-${year}-${type}-${slugify(game.date)}-${slugify(game.time)}-${slugify(game.field)}-${slugify(game.homeTeam)}-${slugify(game.awayTeam)}`;
      await client.createOrReplace({ _id: gid, _type: "tournamentGame", year, type, ...game });
    }
    for (const ranking of mobileExtras?.rankings || []) {
      await client.createOrReplace({
        _id: `wildCardRanking-${year}-${type}-${ranking.rank}`,
        _type: "wildCardRanking",
        year,
        type,
        ...ranking,
      });
    }
  }

  console.log(`  [pools] ${pools.length}  [games] ${games.length}  [wcRankings] ${mobileExtras?.rankings?.length || 0}`);
  return { games: games.length, pools: pools.length, rankings: mobileExtras?.rankings?.length || 0 };
}

async function main() {
  console.log(`Scraping tournament history for ${YEAR_START}-${YEAR_END}${dryRun ? " (dry run)" : ""}\n`);
  const totals = { games: 0, pools: 0, rankings: 0, results: 0 };

  for (let year = YEAR_END; year >= YEAR_START; year--) {
    for (const cfg of TYPES) {
      console.log(`--- ${year} ${cfg.type} ---`);
      try {
        const r = await processYearType(year, cfg);
        totals.games += r.games;
        totals.pools += r.pools;
        totals.rankings += r.rankings;
        totals.results += 1;
      } catch (err) {
        console.error(`  [error] ${year} ${cfg.type}: ${err.message}`);
      }
    }
  }

  console.log(`\nDone. tournamentResult upserts attempted: ${totals.results}, games: ${totals.games}, pools: ${totals.pools}, wildCardRankings: ${totals.rankings}`);
}

main();

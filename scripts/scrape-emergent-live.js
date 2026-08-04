"use strict";

/**
 * Scrapes current live public data straight from league-hub-32.emergent.host
 * and upserts it into Sanity. No browser/Chromium involved — the site is a
 * client-rendered SPA, but its real content comes from a plain JSON REST API
 * (confirmed by reading its compiled bundle), so this hits those endpoints
 * directly with Node's built-in fetch:
 *
 *   /api/standings?year=2026   -> standing docs
 *   /api/schedule?season=2026  -> game docs
 *   /api/news                  -> news docs
 *   /api/awards                -> award docs (flattened from nested entries)
 *   /api/gallery                -> galleryPhoto docs
 *
 * Teams are NOT recreated here — team names are matched against EXISTING
 * Sanity `team` docs by name (the API doesn't expose logos/colors/divisions,
 * so blindly upserting would wipe that data). Unmatched names get a minimal
 * stub via createIfNotExists, which never overwrites an existing doc.
 *
 * Uses the exact same deterministic _id scheme as scripts/migrate-from-emergent.js
 * (award-${categoryId}-${year}, galleryPhoto-${g.id}, news-${id}, game-${year}-${id},
 * standing-${year}-${teamId}) so this correctly replaces those same documents
 * in place rather than duplicating them. Idempotent — safe to re-run.
 *
 * Images (news photos, gallery photos) are downloaded and re-uploaded as real
 * Sanity assets — never hotlinked, since mmspl.ca is being retired.
 *
 * Usage: node scripts/scrape-emergent-live.js
 */

const path = require("path");
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
  console.error(
    "Missing NEXT_PUBLIC_SANITY_PROJECT_ID, NEXT_PUBLIC_SANITY_DATASET, or SANITY_API_TOKEN.\n" +
      "Set them in .env.local (same vars the Next.js app uses)."
  );
  process.exit(1);
}

const sanity = createClient({ projectId, dataset, apiVersion, token, useCdn: false });

const SITE = "https://league-hub-32.emergent.host";
const SEASON = 2026;

// --- helpers ------------------------------------------------------------

function slugify(str) {
  return String(str || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function getJSON(pathAndQuery) {
  const res = await fetch(`${SITE}${pathAndQuery}`);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${pathAndQuery}`);
  return res.json();
}

async function fetchWithRetry(url, attempts = 3) {
  let lastErr;
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return Buffer.from(await res.arrayBuffer());
    } catch (err) {
      lastErr = err;
      if (i < attempts - 1) await new Promise((r) => setTimeout(r, 500 * (i + 1)));
    }
  }
  throw lastErr;
}

const assetCache = new Map();
async function uploadImageIfUrl(url) {
  if (!url || !/^https?:\/\//.test(url)) return null;
  if (assetCache.has(url)) return assetCache.get(url);
  try {
    const buffer = await fetchWithRetry(url);
    const filename = path.basename(new URL(url).pathname) || `image-${Date.now()}.jpg`;
    const asset = await sanity.assets.upload("image", buffer, { filename });
    const ref = { _type: "image", asset: { _type: "reference", _ref: asset._id } };
    assetCache.set(url, ref);
    return ref;
  } catch (err) {
    console.warn(`    [image upload failed] ${url}: ${err.message}`);
    return null;
  }
}

const FIELD_MAP = {
  "Centennial North": "Centennial Park",
  Mintleaf: "Mintleaf Park",
};

const NEWS_TAG_MAP = {
  "League News": "league",
  Tournament: "results",
  Awards: "announcement",
};

// --- team name -> existing Sanity _id map --------------------------------

async function buildTeamIdMap() {
  const existing = await sanity.fetch(`*[_type == "team"]{_id, name}`);
  const map = new Map(existing.map((t) => [t.name, t._id]));
  return map;
}

async function ensureTeamStub(name, teamIdMap) {
  if (teamIdMap.has(name)) return teamIdMap.get(name);
  const _id = `team-${slugify(name)}`;
  await sanity.createIfNotExists({ _id, _type: "team", name });
  teamIdMap.set(name, _id);
  console.log(`    [new team stub] ${name} (no matching team existed — created with name only)`);
  return _id;
}

async function ensureSeason(year) {
  await sanity.createIfNotExists({ _id: `season-${year}`, _type: "season", year, isActive: year === SEASON });
}

// --- standings ------------------------------------------------------------

async function migrateStandings(teamIdMap) {
  const rows = await getJSON(`/api/standings?year=${SEASON}`);
  let migrated = 0,
    skipped = 0;
  for (const row of rows) {
    const teamId = await ensureTeamStub(row.name, teamIdMap);
    try {
      await sanity.createOrReplace({
        _id: `standing-${SEASON}-${teamId}`,
        _type: "standing",
        season: { _type: "reference", _ref: `season-${SEASON}` },
        team: { _type: "reference", _ref: teamId },
        wins: row.wins ?? 0,
        losses: row.losses ?? 0,
        ties: row.ties ?? 0,
        defaults: row.defaults ?? 0,
        runDifferential: 0, // not exposed by this API
      });
      migrated++;
    } catch (err) {
      console.warn(`    [fail] standing ${row.name}: ${err.message}`);
      skipped++;
    }
  }
  return { total: rows.length, migrated, skipped };
}

// --- schedule / games -------------------------------------------------

async function migrateGames(teamIdMap) {
  const games = await getJSON(`/api/schedule?season=${SEASON}`);
  let migrated = 0,
    skipped = 0;
  for (const g of games) {
    const homeId = await ensureTeamStub(g.homeTeam, teamIdMap);
    const awayId = await ensureTeamStub(g.awayTeam, teamIdMap);
    try {
      await sanity.createOrReplace({
        _id: `game-${SEASON}-${g.id}`,
        _type: "game",
        season: { _type: "reference", _ref: `season-${SEASON}` },
        date: g.date,
        time: g.time,
        field: FIELD_MAP[g.location] || g.location,
        homeTeam: { _type: "reference", _ref: homeId },
        awayTeam: { _type: "reference", _ref: awayId },
        homeScore: g.homeScore ?? undefined,
        awayScore: g.awayScore ?? undefined,
        status: g.status || "scheduled",
      });
      migrated++;
    } catch (err) {
      console.warn(`    [fail] game ${g.id}: ${err.message}`);
      skipped++;
    }
  }
  return { total: games.length, migrated, skipped };
}

// --- news --------------------------------------------------------------

async function migrateNews() {
  const articles = await getJSON(`/api/news`);
  let migrated = 0,
    skipped = 0;
  for (const a of articles) {
    const photo = await uploadImageIfUrl(a.image);
    try {
      await sanity.createOrReplace({
        _id: `news-${a.id}`,
        _type: "news",
        title: a.title,
        slug: { _type: "slug", current: slugify(a.title) },
        date: new Date(a.date).toISOString(),
        tag: NEWS_TAG_MAP[a.category] || "announcement",
        body: a.content
          ? [{ _type: "block", _key: "body0", style: "normal", children: [{ _type: "span", _key: "span0", text: a.content }] }]
          : [],
        ...(photo ? { photo } : {}),
      });
      migrated++;
    } catch (err) {
      console.warn(`    [fail] news "${a.title}": ${err.message}`);
      skipped++;
    }
  }
  return { total: articles.length, migrated, skipped };
}

// --- awards --------------------------------------------------------------

async function migrateAwards(teamIdMap) {
  const categories = await getJSON(`/api/awards`);
  let migrated = 0,
    skipped = 0,
    total = 0;
  for (const cat of categories) {
    for (const entry of cat.entries) {
      total++;
      if (!entry.winner || entry.winner === "Not Awarded") {
        skipped++;
        continue;
      }
      const teamId = teamIdMap.get(entry.winner); // may be undefined for individual (MVP-style) awards
      try {
        await sanity.createOrReplace({
          _id: `award-${cat.id}-${entry.year}`,
          _type: "award",
          year: entry.year,
          category: cat.name,
          winner: entry.winner,
          description: cat.description || undefined,
          ...(teamId ? { team: { _type: "reference", _ref: teamId } } : {}),
        });
        migrated++;
      } catch (err) {
        console.warn(`    [fail] award ${cat.name} ${entry.year}: ${err.message}`);
        skipped++;
      }
    }
  }
  return { total, migrated, skipped };
}

// --- gallery -------------------------------------------------------------

async function migrateGallery() {
  const photos = await getJSON(`/api/gallery`);
  let migrated = 0,
    skipped = 0;
  for (const p of photos) {
    const image = await uploadImageIfUrl(p.url);
    if (!image) {
      skipped++;
      continue;
    }
    try {
      await sanity.createOrReplace({
        _id: `galleryPhoto-${p.id}`,
        _type: "galleryPhoto",
        image: { ...image, alt: p.caption || "Gallery photo" },
        caption: p.caption || undefined,
        date: p.year ? `${p.year}-01-01` : undefined,
        category: p.category || undefined,
      });
      migrated++;
    } catch (err) {
      console.warn(`    [fail] gallery photo ${p.id}: ${err.message}`);
      skipped++;
    }
  }
  return { total: photos.length, migrated, skipped };
}

// --- main -------------------------------------------------------------

async function main() {
  console.log(`Scraping live public data from ${SITE} into Sanity project ${projectId}/${dataset}\n`);

  const teamIdMap = await buildTeamIdMap();
  console.log(`Loaded ${teamIdMap.size} existing team names from Sanity for reference-matching.\n`);

  await ensureSeason(SEASON);

  console.log("Standings...");
  const standings = await migrateStandings(teamIdMap);
  console.log(`  ${standings.migrated}/${standings.total} migrated, ${standings.skipped} skipped\n`);

  console.log("Schedule / Games...");
  const games = await migrateGames(teamIdMap);
  console.log(`  ${games.migrated}/${games.total} migrated, ${games.skipped} skipped\n`);

  console.log("News...");
  const news = await migrateNews();
  console.log(`  ${news.migrated}/${news.total} migrated, ${news.skipped} skipped\n`);

  console.log("Awards...");
  const awards = await migrateAwards(teamIdMap);
  console.log(`  ${awards.migrated}/${awards.total} migrated, ${awards.skipped} skipped\n`);

  console.log("Gallery...");
  const gallery = await migrateGallery();
  console.log(`  ${gallery.migrated}/${gallery.total} migrated, ${gallery.skipped} skipped\n`);

  console.log("=== Summary ===");
  console.table({ standings, games, news, awards, gallery });
}

main().catch((err) => {
  console.error("\nScrape failed:", err);
  process.exit(1);
});

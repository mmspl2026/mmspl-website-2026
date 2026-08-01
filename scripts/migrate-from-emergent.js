"use strict";

/**
 * One-time data migration from the old Emergent/Mongo site (mmspl.ca) into
 * Sanity. Source data was transcribed from that project's backend seed
 * files: seed_2026.py, seed_data.py, seed_awards.py, seed_important_dates.py,
 * seed_gallery.py.
 *
 * Unlike the old site, this script does NOT store external image URLs —
 * every image (gallery photos, news photos) is downloaded and re-uploaded
 * as a real Sanity asset, since the old mmspl.ca URLs will stop resolving
 * once that site is retired.
 *
 * Idempotent: every document gets a deterministic _id derived from its
 * source data, and is written with createOrReplace. Re-running is safe —
 * it converges to the same state rather than duplicating anything. Image
 * uploads are skipped on repeat runs if the target doc already has an
 * asset attached, so it doesn't re-fetch from mmspl.ca every time.
 *
 * Usage: node scripts/migrate-from-emergent.js
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

const client = createClient({ projectId, dataset, apiVersion, token, useCdn: false });

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function slugify(str) {
  return str
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Some historical team names collide once slugified (e.g. "S & H Raiders"
 * vs "S+H Raiders" are different real entries from different eras, but
 * both slugify to "s-h-raiders"). Building one shared name->id map up
 * front — with deterministic suffixes for collisions — keeps every doc
 * type (teams/standings/games/awards) pointing at the same team, instead
 * of computing slugify ad hoc and silently overwriting one team with
 * another.
 */
function buildTeamIdMap(names) {
  const map = new Map();
  const used = new Map();
  for (const name of names) {
    const base = `team-${slugify(name)}`;
    const count = used.get(base) || 0;
    used.set(base, count + 1);
    map.set(name, count === 0 ? base : `${base}-${count + 1}`);
  }
  return map;
}

function textToPortableText(text) {
  return [
    {
      _type: "block",
      _key: "body1",
      style: "normal",
      children: [{ _type: "span", _key: "body1span", text }],
    },
  ];
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

const failedDownloads = [];

/**
 * Downloads `url` and uploads it as a Sanity image asset, returning an
 * image field value ({_type, asset, alt}). Returns null (and records the
 * failure) if the download fails — callers should skip the photo field
 * rather than aborting the whole migration over one dead link.
 */
async function downloadAndUploadImage(url, alt, label) {
  try {
    const buffer = await fetchWithRetry(url);
    const filename = path.basename(new URL(url).pathname) || "image.jpg";
    const asset = await client.assets.upload("image", buffer, { filename });
    return {
      _type: "image",
      asset: { _type: "reference", _ref: asset._id },
      alt,
    };
  } catch (err) {
    console.warn(`  ! failed to download image for ${label}: ${url} (${err.message})`);
    failedDownloads.push({ label, url, error: err.message });
    return null;
  }
}

async function commitInBatches(mutations, label, chunkSize = 50) {
  let done = 0;
  for (let i = 0; i < mutations.length; i += chunkSize) {
    const chunk = mutations.slice(i, i + chunkSize);
    const tx = client.transaction();
    for (const doc of chunk) tx.createOrReplace(doc);
    await tx.commit();
    done += chunk.length;
    process.stdout.write(`\r  [${label}] ${done}/${mutations.length} upserted`);
  }
  process.stdout.write("\n");
}

// ---------------------------------------------------------------------------
// Source data — transcribed verbatim from the Emergent backend seed files
// ---------------------------------------------------------------------------

const MONTH_MAP = {
  January: "01",
  February: "02",
  March: "03",
  April: "04",
  May: "05",
  June: "06",
  July: "07",
  August: "08",
  September: "09",
  October: "10",
  November: "11",
  December: "12",
};

// seed_2026.py — STANDINGS_2026
const STANDINGS_2026 = [
  { rank: 1, name: "Derek Houghton Century 21", points: 17, wins: 8, losses: 1, ties: 1, gamesPlayed: 10 },
  { rank: 2, name: "OK Braves", points: 17, wins: 8, losses: 1, ties: 1, gamesPlayed: 10 },
  { rank: 3, name: "Ace Pools Moose", points: 13, wins: 6, losses: 3, ties: 1, gamesPlayed: 10 },
  { rank: 4, name: "Opal Electric Shamrocks", points: 12, wins: 5, losses: 3, ties: 2, gamesPlayed: 10 },
  { rank: 5, name: "Markham Goodyear Rangers", points: 10, wins: 4, losses: 3, ties: 2, gamesPlayed: 9 },
  { rank: 6, name: "McCalmont Financial Beavers", points: 10, wins: 4, losses: 3, ties: 2, gamesPlayed: 9 },
  { rank: 7, name: "DC Chiropractic Nads", points: 10, wins: 4, losses: 3, ties: 2, gamesPlayed: 9 },
  { rank: 8, name: "Northtown Sox", points: 9, wins: 4, losses: 4, ties: 1, gamesPlayed: 9 },
  { rank: 9, name: "The Condo Kings Army", points: 8, wins: 3, losses: 4, ties: 2, gamesPlayed: 9 },
  { rank: 10, name: "Red Hot Dawgs", points: 6, wins: 2, losses: 5, ties: 2, gamesPlayed: 9 },
  { rank: 11, name: "S & H Raiders", points: 5, wins: 2, losses: 7, ties: 1, gamesPlayed: 10 },
  { rank: 12, name: "The Classics", points: 5, wins: 2, losses: 6, ties: 1, gamesPlayed: 9 },
  { rank: 13, name: "Markham Knights", points: 5, wins: 2, losses: 7, ties: 1, gamesPlayed: 10 },
  { rank: 14, name: "Pilkey Glass Pirates", points: 5, wins: 2, losses: 6, ties: 1, gamesPlayed: 9 },
];

// seed_2026.py — RAW_GAMES: [dateStr, time, home, away, homeScore, awayScore, location]
const RAW_GAMES_2026 = [
  ["Tuesday, May 12", "6:30 PM", "The Condo Kings Army", "OK Braves", 14, 17, "Mintleaf"],
  ["Tuesday, May 12", "6:30 PM", "Ace Pools Moose", "Markham Knights", 12, 14, "Centennial North"],
  ["Tuesday, May 12", "8:00 PM", "Northtown Sox", "Pilkey Glass Pirates", 10, 9, "Mintleaf"],
  ["Tuesday, May 12", "8:00 PM", "DC Chiropractic Nads", "McCalmont Financial Beavers", 10, 24, "Centennial North"],
  ["Tuesday, May 12", "9:30 PM", "Derek Houghton Century 21", "The Classics", 18, 15, "Mintleaf"],
  ["Tuesday, May 12", "9:30 PM", "S & H Raiders", "Red Hot Dawgs", 12, 13, "Centennial North"],
  ["Thursday, May 14", "6:30 PM", "Red Hot Dawgs", "Markham Goodyear Rangers", 6, 21, "Mintleaf"],
  ["Thursday, May 14", "6:30 PM", "Pilkey Glass Pirates", "Ace Pools Moose", 22, 10, "Centennial North"],
  ["Thursday, May 14", "8:00 PM", "S & H Raiders", "The Condo Kings Army", 9, 23, "Mintleaf"],
  ["Thursday, May 14", "8:00 PM", "McCalmont Financial Beavers", "Derek Houghton Century 21", 14, 22, "Centennial North"],
  ["Thursday, May 14", "9:30 PM", "Northtown Sox", "Markham Knights", 23, 7, "Centennial North"],
  ["Thursday, May 14", "9:30 PM", "OK Braves", "Opal Electric Shamrocks", 16, 14, "Mintleaf"],
  ["Tuesday, May 19", "6:30 PM", "Markham Goodyear Rangers", "McCalmont Financial Beavers", 30, 21, "Mintleaf"],
  ["Tuesday, May 19", "6:30 PM", "S & H Raiders", "OK Braves", 15, 18, "Centennial North"],
  ["Tuesday, May 19", "8:00 PM", "DC Chiropractic Nads", "Markham Knights", 22, 15, "Centennial North"],
  ["Tuesday, May 19", "8:00 PM", "Opal Electric Shamrocks", "Derek Houghton Century 21", 19, 18, "Mintleaf"],
  ["Tuesday, May 19", "9:30 PM", "Pilkey Glass Pirates", "The Classics", 27, 28, "Mintleaf"],
  ["Tuesday, May 19", "9:30 PM", "The Condo Kings Army", "Ace Pools Moose", 11, 20, "Centennial North"],
  ["Thursday, May 21", "6:30 PM", "Northtown Sox", "McCalmont Financial Beavers", 15, 19, "Mintleaf"],
  ["Thursday, May 21", "6:30 PM", "Red Hot Dawgs", "Markham Knights", 12, 12, "Centennial North"],
  ["Thursday, May 21", "8:00 PM", "S & H Raiders", "Markham Goodyear Rangers", 11, 24, "Centennial North"],
  ["Thursday, May 21", "8:00 PM", "Opal Electric Shamrocks", "The Condo Kings Army", 15, 16, "Mintleaf"],
  ["Thursday, May 21", "9:30 PM", "OK Braves", "The Classics", 13, 10, "Centennial North"],
  ["Thursday, May 21", "9:30 PM", "Ace Pools Moose", "DC Chiropractic Nads", 19, 13, "Mintleaf"],
  ["Tuesday, May 26", "6:30 PM", "Opal Electric Shamrocks", "Pilkey Glass Pirates", 25, 15, "Mintleaf"],
  ["Tuesday, May 26", "6:30 PM", "S & H Raiders", "Derek Houghton Century 21", 6, 27, "Centennial North"],
  ["Tuesday, May 26", "8:00 PM", "Markham Goodyear Rangers", "Markham Knights", 19, 13, "Mintleaf"],
  ["Tuesday, May 26", "8:00 PM", "Ace Pools Moose", "Northtown Sox", 27, 26, "Centennial North"],
  ["Tuesday, May 26", "9:30 PM", "OK Braves", "Red Hot Dawgs", 19, 8, "Centennial North"],
  ["Tuesday, May 26", "9:30 PM", "McCalmont Financial Beavers", "The Classics", 29, 28, "Mintleaf"],
  ["Tuesday, June 02", "6:30 PM", "Markham Knights", "The Condo Kings Army", null, null, "Mintleaf"],
  ["Tuesday, June 02", "6:30 PM", "Red Hot Dawgs", "Opal Electric Shamrocks", 12, 24, "Centennial North"],
  ["Tuesday, June 02", "8:00 PM", "DC Chiropractic Nads", "Pilkey Glass Pirates", 16, 15, "Mintleaf"],
  ["Tuesday, June 02", "8:00 PM", "S & H Raiders", "The Classics", 20, 4, "Centennial North"],
  ["Tuesday, June 02", "9:30 PM", "Ace Pools Moose", "McCalmont Financial Beavers", 1, 1, "Mintleaf"],
  ["Tuesday, June 02", "9:30 PM", "Derek Houghton Century 21", "Markham Goodyear Rangers", 15, 8, "Centennial North"],
  ["Thursday, June 04", "6:30 PM", "Markham Knights", "Derek Houghton Century 21", 11, 17, "Centennial North"],
  ["Thursday, June 04", "6:30 PM", "Pilkey Glass Pirates", "The Condo Kings Army", 12, 10, "Mintleaf"],
  ["Thursday, June 04", "8:00 PM", "The Classics", "Ace Pools Moose", 6, 21, "Mintleaf"],
  ["Thursday, June 04", "8:00 PM", "DC Chiropractic Nads", "Red Hot Dawgs", 9, 5, "Centennial North"],
  ["Thursday, June 04", "9:30 PM", "Opal Electric Shamrocks", "Northtown Sox", 24, 10, "Centennial North"],
  ["Thursday, June 04", "9:30 PM", "OK Braves", "McCalmont Financial Beavers", 15, 12, "Mintleaf"],
  ["Tuesday, June 09", "6:30 PM", "Opal Electric Shamrocks", "Markham Goodyear Rangers", 21, 21, "Centennial North"],
  ["Tuesday, June 09", "6:30 PM", "Markham Knights", "Red Hot Dawgs", 15, 22, "Mintleaf"],
  ["Tuesday, June 09", "8:00 PM", "OK Braves", "Northtown Sox", 9, 14, "Centennial North"],
  ["Tuesday, June 09", "8:00 PM", "Ace Pools Moose", "Derek Houghton Century 21", 8, 9, "Mintleaf"],
  ["Tuesday, June 09", "9:30 PM", "S & H Raiders", "DC Chiropractic Nads", 12, 2, "Mintleaf"],
  ["Tuesday, June 09", "9:30 PM", "The Condo Kings Army", "The Classics", 20, 28, "Centennial North"],
  ["Thursday, June 11", "6:30 PM", "Markham Goodyear Rangers", "Northtown Sox", 5, 32, "Mintleaf"],
  ["Thursday, June 11", "6:30 PM", "McCalmont Financial Beavers", "S & H Raiders", 13, 8, "Centennial North"],
  ["Thursday, June 11", "8:00 PM", "The Classics", "DC Chiropractic Nads", 10, 27, "Mintleaf"],
  ["Thursday, June 11", "8:00 PM", "Pilkey Glass Pirates", "Derek Houghton Century 21", 16, 23, "Centennial North"],
  ["Thursday, June 11", "9:30 PM", "Opal Electric Shamrocks", "Ace Pools Moose", 16, 30, "Centennial North"],
  ["Thursday, June 11", "9:30 PM", "Markham Knights", "OK Braves", 16, 20, "Mintleaf"],
  ["Tuesday, June 16", "6:30 PM", "The Condo Kings Army", "DC Chiropractic Nads", 15, 15, "Centennial North"],
  ["Tuesday, June 16", "6:30 PM", "Derek Houghton Century 21", "S & H Raiders", 17, 16, "Mintleaf"],
  ["Tuesday, June 16", "8:00 PM", "Markham Goodyear Rangers", "Markham Knights", 7, 25, "Centennial North"],
  ["Tuesday, June 16", "8:00 PM", "Red Hot Dawgs", "OK Braves", 6, 16, "Mintleaf"],
  ["Tuesday, June 16", "9:30 PM", "Pilkey Glass Pirates", "Opal Electric Shamrocks", 10, 22, "Centennial North"],
  ["Tuesday, June 16", "9:30 PM", "Northtown Sox", "Ace Pools Moose", 12, 21, "Mintleaf"],
  ["Thursday, June 18", "6:30 PM", "The Classics", "McCalmont Financial Beavers", 1, 1, "Mintleaf"],
  ["Thursday, June 18", "6:30 PM", "Opal Electric Shamrocks", "DC Chiropractic Nads", 1, 1, "Centennial North"],
  ["Thursday, June 18", "8:00 PM", "Pilkey Glass Pirates", "Red Hot Dawgs", 1, 1, "Mintleaf"],
  ["Thursday, June 18", "8:00 PM", "Northtown Sox", "S & H Raiders", 1, 1, "Centennial North"],
  ["Thursday, June 18", "9:30 PM", "OK Braves", "Derek Houghton Century 21", 1, 1, "Centennial North"],
  ["Thursday, June 18", "9:30 PM", "The Condo Kings Army", "Markham Goodyear Rangers", 1, 1, "Mintleaf"],
  ["Tuesday, June 23", "6:30 PM", "The Condo Kings Army", "Northtown Sox", null, null, "Centennial North"],
  ["Tuesday, June 23", "6:30 PM", "Red Hot Dawgs", "Derek Houghton Century 21", null, null, "Mintleaf"],
  ["Tuesday, June 23", "8:00 PM", "McCalmont Financial Beavers", "OK Braves", null, null, "Centennial North"],
  ["Tuesday, June 23", "8:00 PM", "Pilkey Glass Pirates", "S & H Raiders", null, null, "Mintleaf"],
  ["Tuesday, June 23", "9:30 PM", "The Classics", "Ace Pools Moose", null, null, "Centennial North"],
  ["Tuesday, June 23", "9:30 PM", "Markham Goodyear Rangers", "DC Chiropractic Nads", null, null, "Mintleaf"],
  ["Thursday, June 25", "6:30 PM", "Red Hot Dawgs", "Pilkey Glass Pirates", null, null, "Centennial North"],
  ["Thursday, June 25", "6:30 PM", "Northtown Sox", "The Classics", null, null, "Mintleaf"],
  ["Thursday, June 25", "8:00 PM", "Derek Houghton Century 21", "McCalmont Financial Beavers", null, null, "Mintleaf"],
  ["Thursday, June 25", "8:00 PM", "DC Chiropractic Nads", "Opal Electric Shamrocks", null, null, "Centennial North"],
  ["Thursday, June 25", "9:30 PM", "Markham Knights", "S & H Raiders", null, null, "Centennial North"],
  ["Thursday, June 25", "9:30 PM", "Ace Pools Moose", "OK Braves", null, null, "Mintleaf"],
  ["Tuesday, June 30", "6:30 PM", "DC Chiropractic Nads", "OK Braves", null, null, "Centennial North"],
  ["Tuesday, June 30", "6:30 PM", "The Condo Kings Army", "Pilkey Glass Pirates", null, null, "Mintleaf"],
  ["Tuesday, June 30", "8:00 PM", "The Classics", "Markham Goodyear Rangers", null, null, "Mintleaf"],
  ["Tuesday, June 30", "8:00 PM", "Red Hot Dawgs", "McCalmont Financial Beavers", null, null, "Centennial North"],
  ["Tuesday, June 30", "9:30 PM", "Opal Electric Shamrocks", "Northtown Sox", null, null, "Mintleaf"],
  ["Tuesday, June 30", "9:30 PM", "Derek Houghton Century 21", "Markham Knights", null, null, "Centennial North"],
  ["Tuesday, July 07", "6:30 PM", "Red Hot Dawgs", "The Classics", null, null, "Centennial North"],
  ["Tuesday, July 07", "6:30 PM", "OK Braves", "Markham Goodyear Rangers", null, null, "Mintleaf"],
  ["Tuesday, July 07", "8:00 PM", "Derek Houghton Century 21", "The Condo Kings Army", null, null, "Mintleaf"],
  ["Tuesday, July 07", "8:00 PM", "Markham Knights", "Ace Pools Moose", null, null, "Centennial North"],
  ["Tuesday, July 07", "9:30 PM", "Opal Electric Shamrocks", "S & H Raiders", null, null, "Centennial North"],
  ["Tuesday, July 07", "9:30 PM", "Northtown Sox", "DC Chiropractic Nads", null, null, "Mintleaf"],
  ["Thursday, July 09", "6:30 PM", "Markham Goodyear Rangers", "Red Hot Dawgs", null, null, "Centennial North"],
  ["Thursday, July 09", "6:30 PM", "Pilkey Glass Pirates", "Northtown Sox", null, null, "Mintleaf"],
  ["Thursday, July 09", "8:00 PM", "The Classics", "Derek Houghton Century 21", null, null, "Centennial North"],
  ["Thursday, July 09", "8:00 PM", "OK Braves", "The Condo Kings Army", null, null, "Mintleaf"],
  ["Thursday, July 09", "9:30 PM", "McCalmont Financial Beavers", "DC Chiropractic Nads", null, null, "Centennial North"],
  ["Thursday, July 09", "9:30 PM", "S & H Raiders", "Opal Electric Shamrocks", null, null, "Mintleaf"],
  ["Tuesday, July 14", "6:30 PM", "S & H Raiders", "Ace Pools Moose", null, null, "Centennial North"],
  ["Tuesday, July 14", "6:30 PM", "Opal Electric Shamrocks", "McCalmont Financial Beavers", null, null, "Mintleaf"],
  ["Tuesday, July 14", "8:00 PM", "Red Hot Dawgs", "The Condo Kings Army", null, null, "Mintleaf"],
  ["Tuesday, July 14", "8:00 PM", "OK Braves", "Pilkey Glass Pirates", null, null, "Centennial North"],
  ["Tuesday, July 14", "9:30 PM", "Markham Knights", "The Classics", null, null, "Mintleaf"],
  ["Tuesday, July 14", "9:30 PM", "Northtown Sox", "Markham Goodyear Rangers", null, null, "Centennial North"],
  ["Thursday, July 16", "6:30 PM", "Ace Pools Moose", "Opal Electric Shamrocks", null, null, "Mintleaf"],
  ["Thursday, July 16", "6:30 PM", "DC Chiropractic Nads", "The Classics", null, null, "Centennial North"],
  ["Thursday, July 16", "8:00 PM", "McCalmont Financial Beavers", "Markham Goodyear Rangers", null, null, "Centennial North"],
  ["Thursday, July 16", "8:00 PM", "OK Braves", "Markham Knights", null, null, "Mintleaf"],
  ["Thursday, July 16", "9:30 PM", "Derek Houghton Century 21", "Pilkey Glass Pirates", null, null, "Centennial North"],
  ["Thursday, July 16", "9:30 PM", "The Condo Kings Army", "S & H Raiders", null, null, "Mintleaf"],
  ["Tuesday, July 21", "6:30 PM", "DC Chiropractic Nads", "Ace Pools Moose", null, null, "Mintleaf"],
  ["Tuesday, July 21", "6:30 PM", "Derek Houghton Century 21", "OK Braves", null, null, "Centennial North"],
  ["Tuesday, July 21", "8:00 PM", "Markham Knights", "Northtown Sox", null, null, "Centennial North"],
  ["Tuesday, July 21", "8:00 PM", "Opal Electric Shamrocks", "Red Hot Dawgs", null, null, "Mintleaf"],
  ["Tuesday, July 21", "9:30 PM", "McCalmont Financial Beavers", "S & H Raiders", null, null, "Centennial North"],
  ["Tuesday, July 21", "9:30 PM", "The Classics", "Pilkey Glass Pirates", null, null, "Mintleaf"],
  ["Thursday, July 23", "6:30 PM", "The Condo Kings Army", "Markham Knights", null, null, "Centennial North"],
  ["Thursday, July 23", "6:30 PM", "Opal Electric Shamrocks", "OK Braves", null, null, "Mintleaf"],
  ["Thursday, July 23", "8:00 PM", "McCalmont Financial Beavers", "Ace Pools Moose", null, null, "Centennial North"],
  ["Thursday, July 23", "8:00 PM", "The Classics", "S & H Raiders", null, null, "Mintleaf"],
  ["Thursday, July 23", "9:30 PM", "Pilkey Glass Pirates", "DC Chiropractic Nads", null, null, "Mintleaf"],
  ["Thursday, July 23", "9:30 PM", "Markham Goodyear Rangers", "Derek Houghton Century 21", null, null, "Centennial North"],
  ["Tuesday, July 28", "6:30 PM", "Red Hot Dawgs", "Northtown Sox", null, null, "Mintleaf"],
  ["Tuesday, July 28", "6:30 PM", "The Classics", "The Condo Kings Army", null, null, "Centennial North"],
  ["Tuesday, July 28", "8:00 PM", "OK Braves", "S & H Raiders", null, null, "Centennial North"],
  ["Tuesday, July 28", "8:00 PM", "Markham Knights", "DC Chiropractic Nads", null, null, "Mintleaf"],
  ["Tuesday, July 28", "9:30 PM", "Ace Pools Moose", "Markham Goodyear Rangers", null, null, "Centennial North"],
  ["Tuesday, July 28", "9:30 PM", "Pilkey Glass Pirates", "McCalmont Financial Beavers", null, null, "Mintleaf"],
  ["Thursday, July 30", "6:30 PM", "Derek Houghton Century 21", "Opal Electric Shamrocks", null, null, "Mintleaf"],
  ["Thursday, July 30", "6:30 PM", "Markham Goodyear Rangers", "Pilkey Glass Pirates", null, null, "Centennial North"],
  ["Thursday, July 30", "8:00 PM", "Ace Pools Moose", "The Condo Kings Army", null, null, "Centennial North"],
  ["Thursday, July 30", "8:00 PM", "McCalmont Financial Beavers", "Northtown Sox", null, null, "Mintleaf"],
  ["Thursday, July 30", "9:30 PM", "DC Chiropractic Nads", "The Classics", null, null, "Mintleaf"],
  ["Thursday, July 30", "9:30 PM", "Red Hot Dawgs", "Markham Knights", null, null, "Centennial North"],
  ["Tuesday, August 04", "6:30 PM", "Northtown Sox", "The Condo Kings Army", null, null, "Centennial North"],
  ["Tuesday, August 04", "6:30 PM", "Derek Houghton Century 21", "Ace Pools Moose", null, null, "Mintleaf"],
  ["Tuesday, August 04", "8:00 PM", "S & H Raiders", "DC Chiropractic Nads", null, null, "Mintleaf"],
  ["Tuesday, August 04", "8:00 PM", "Markham Goodyear Rangers", "The Classics", null, null, "Centennial North"],
  ["Tuesday, August 04", "9:30 PM", "Red Hot Dawgs", "McCalmont Financial Beavers", null, null, "Centennial North"],
  ["Tuesday, August 04", "9:30 PM", "Markham Knights", "Opal Electric Shamrocks", null, null, "Mintleaf"],
  ["Thursday, August 06", "6:30 PM", "DC Chiropractic Nads", "Markham Goodyear Rangers", null, null, "Mintleaf"],
  ["Thursday, August 06", "6:30 PM", "S & H Raiders", "Pilkey Glass Pirates", null, null, "Centennial North"],
  ["Thursday, August 06", "8:00 PM", "Northtown Sox", "OK Braves", null, null, "Centennial North"],
  ["Thursday, August 06", "8:00 PM", "Derek Houghton Century 21", "Red Hot Dawgs", null, null, "Mintleaf"],
  ["Thursday, August 06", "9:30 PM", "McCalmont Financial Beavers", "The Condo Kings Army", null, null, "Centennial North"],
  ["Thursday, August 06", "9:30 PM", "The Classics", "Opal Electric Shamrocks", null, null, "Mintleaf"],
  ["Tuesday, August 11", "6:30 PM", "Red Hot Dawgs", "Ace Pools Moose", null, null, "Mintleaf"],
  ["Tuesday, August 11", "6:30 PM", "Markham Goodyear Rangers", "OK Braves", null, null, "Centennial North"],
  ["Tuesday, August 11", "8:00 PM", "Pilkey Glass Pirates", "Markham Knights", null, null, "Mintleaf"],
  ["Tuesday, August 11", "8:00 PM", "S & H Raiders", "Northtown Sox", null, null, "Centennial North"],
  ["Tuesday, August 11", "9:30 PM", "Derek Houghton Century 21", "DC Chiropractic Nads", null, null, "Mintleaf"],
  ["Tuesday, August 11", "9:30 PM", "The Condo Kings Army", "Opal Electric Shamrocks", null, null, "Centennial North"],
  ["Thursday, August 13", "6:30 PM", "McCalmont Financial Beavers", "Markham Knights", null, null, "Mintleaf"],
  ["Thursday, August 13", "6:30 PM", "The Classics", "OK Braves", null, null, "Centennial North"],
  ["Thursday, August 13", "8:00 PM", "Ace Pools Moose", "Pilkey Glass Pirates", null, null, "Centennial North"],
  ["Thursday, August 13", "8:00 PM", "Markham Goodyear Rangers", "Opal Electric Shamrocks", null, null, "Mintleaf"],
  ["Thursday, August 13", "9:30 PM", "Red Hot Dawgs", "DC Chiropractic Nads", null, null, "Centennial North"],
  ["Thursday, August 13", "9:30 PM", "Northtown Sox", "Derek Houghton Century 21", null, null, "Mintleaf"],
  ["Tuesday, August 18", "6:30 PM", "The Classics", "Markham Knights", null, null, "Mintleaf"],
  ["Tuesday, August 18", "6:30 PM", "McCalmont Financial Beavers", "Opal Electric Shamrocks", null, null, "Centennial North"],
  ["Tuesday, August 18", "8:00 PM", "The Condo Kings Army", "Derek Houghton Century 21", null, null, "Centennial North"],
  ["Tuesday, August 18", "8:00 PM", "Markham Goodyear Rangers", "Ace Pools Moose", null, null, "Mintleaf"],
  ["Tuesday, August 18", "9:30 PM", "Pilkey Glass Pirates", "OK Braves", null, null, "Centennial North"],
  ["Tuesday, August 18", "9:30 PM", "Red Hot Dawgs", "S & H Raiders", null, null, "Mintleaf"],
  ["Thursday, August 20", "6:30 PM", "DC Chiropractic Nads", "Northtown Sox", null, null, "Centennial North"],
  ["Thursday, August 20", "6:30 PM", "The Condo Kings Army", "McCalmont Financial Beavers", null, null, "Mintleaf"],
  ["Thursday, August 20", "8:00 PM", "Opal Electric Shamrocks", "The Classics", null, null, "Centennial North"],
  ["Thursday, August 20", "8:00 PM", "Markham Knights", "Pilkey Glass Pirates", null, null, "Mintleaf"],
  ["Thursday, August 20", "9:30 PM", "Markham Goodyear Rangers", "S & H Raiders", null, null, "Centennial North"],
  ["Thursday, August 20", "9:30 PM", "Ace Pools Moose", "Red Hot Dawgs", null, null, "Mintleaf"],
  ["Tuesday, August 25", "6:30 PM", "S & H Raiders", "Markham Knights", null, null, "Mintleaf"],
  ["Tuesday, August 25", "6:30 PM", "DC Chiropractic Nads", "Derek Houghton Century 21", null, null, "Centennial North"],
  ["Tuesday, August 25", "8:00 PM", "The Condo Kings Army", "Pilkey Glass Pirates", null, null, "Centennial North"],
  ["Tuesday, August 25", "8:00 PM", "The Classics", "Markham Goodyear Rangers", null, null, "Mintleaf"],
  ["Tuesday, August 25", "9:30 PM", "McCalmont Financial Beavers", "Red Hot Dawgs", null, null, "Mintleaf"],
  ["Tuesday, August 25", "9:30 PM", "Northtown Sox", "Opal Electric Shamrocks", null, null, "Centennial North"],
  ["Thursday, August 27", "6:30 PM", "Markham Knights", "Derek Houghton Century 21", null, null, "Centennial North"],
  ["Thursday, August 27", "6:30 PM", "OK Braves", "DC Chiropractic Nads", null, null, "Mintleaf"],
  ["Thursday, August 27", "8:00 PM", "Ace Pools Moose", "The Classics", null, null, "Centennial North"],
  ["Thursday, August 27", "8:00 PM", "S & H Raiders", "The Condo Kings Army", null, null, "Mintleaf"],
  ["Thursday, August 27", "9:30 PM", "Pilkey Glass Pirates", "McCalmont Financial Beavers", null, null, "Centennial North"],
  ["Thursday, August 27", "9:30 PM", "Northtown Sox", "Markham Goodyear Rangers", null, null, "Mintleaf"],
  ["Tuesday, September 01", "6:30 PM", "McCalmont Financial Beavers", "The Classics", null, null, "Centennial North"],
  ["Tuesday, September 01", "6:30 PM", "Northtown Sox", "OK Braves", null, null, "Mintleaf"],
  ["Tuesday, September 01", "8:00 PM", "Markham Goodyear Rangers", "Opal Electric Shamrocks", null, null, "Mintleaf"],
  ["Tuesday, September 01", "8:00 PM", "DC Chiropractic Nads", "S & H Raiders", null, null, "Centennial North"],
  ["Tuesday, September 01", "9:30 PM", "The Condo Kings Army", "Red Hot Dawgs", null, null, "Centennial North"],
  ["Tuesday, September 01", "9:30 PM", "Ace Pools Moose", "Derek Houghton Century 21", null, null, "Mintleaf"],
  ["Thursday, September 03", "6:30 PM", "Derek Houghton Century 21", "Pilkey Glass Pirates", null, null, "Mintleaf"],
  ["Thursday, September 03", "6:30 PM", "Northtown Sox", "Red Hot Dawgs", null, null, "Centennial North"],
  ["Thursday, September 03", "8:00 PM", "S & H Raiders", "McCalmont Financial Beavers", null, null, "Mintleaf"],
  ["Thursday, September 03", "8:00 PM", "Opal Electric Shamrocks", "Ace Pools Moose", null, null, "Centennial North"],
  ["Thursday, September 03", "9:30 PM", "Markham Knights", "OK Braves", null, null, "Mintleaf"],
  ["Thursday, September 03", "9:30 PM", "DC Chiropractic Nads", "The Condo Kings Army", null, null, "Centennial North"],
  ["Tuesday, September 08", "6:30 PM", "Pilkey Glass Pirates", "Opal Electric Shamrocks", null, null, "Mintleaf"],
  ["Tuesday, September 08", "6:30 PM", "Derek Houghton Century 21", "S & H Raiders", null, null, "Centennial North"],
  ["Tuesday, September 08", "8:00 PM", "Ace Pools Moose", "Northtown Sox", null, null, "Mintleaf"],
  ["Tuesday, September 08", "8:00 PM", "OK Braves", "Red Hot Dawgs", null, null, "Centennial North"],
  ["Tuesday, September 08", "9:30 PM", "Markham Knights", "Markham Goodyear Rangers", null, null, "Centennial North"],
  ["Tuesday, September 08", "9:30 PM", "DC Chiropractic Nads", "The Condo Kings Army", null, null, "Mintleaf"],
  ["Thursday, September 10", "6:30 PM", "Markham Knights", "McCalmont Financial Beavers", null, null, "Mintleaf"],
  ["Thursday, September 10", "6:30 PM", "Pilkey Glass Pirates", "Markham Goodyear Rangers", null, null, "Centennial North"],
  ["Thursday, September 10", "8:00 PM", "The Classics", "Northtown Sox", null, null, "Mintleaf"],
  ["Thursday, September 10", "8:00 PM", "OK Braves", "DC Chiropractic Nads", null, null, "Centennial North"],
  ["Thursday, September 10", "9:30 PM", "Ace Pools Moose", "S & H Raiders", null, null, "Centennial North"],
  ["Thursday, September 10", "9:30 PM", "The Condo Kings Army", "Red Hot Dawgs", null, null, "Mintleaf"],
  ["Tuesday, September 15", "6:30 PM", "The Classics", "Red Hot Dawgs", null, null, "Mintleaf"],
  ["Tuesday, September 15", "6:30 PM", "Derek Houghton Century 21", "Northtown Sox", null, null, "Centennial North"],
  ["Tuesday, September 15", "8:00 PM", "OK Braves", "Ace Pools Moose", null, null, "Mintleaf"],
  ["Tuesday, September 15", "8:00 PM", "Opal Electric Shamrocks", "Markham Knights", null, null, "Centennial North"],
  ["Tuesday, September 15", "9:30 PM", "Markham Goodyear Rangers", "The Condo Kings Army", null, null, "Centennial North"],
  ["Tuesday, September 15", "9:30 PM", "McCalmont Financial Beavers", "Pilkey Glass Pirates", null, null, "Mintleaf"],
];

// seed_data.py — HISTORICAL_STANDINGS (2005-2025)
const HISTORICAL_STANDINGS = {
  2025: [
    { rank: 1, name: "Derek Houghton Century 21", points: 51, wins: 24, losses: 3, ties: 3, gamesPlayed: 30 },
    { rank: 2, name: "Polyson Sox", points: 49, wins: 24, losses: 5, ties: 1, gamesPlayed: 30 },
    { rank: 3, name: "Markham Goodyear Rangers", points: 41, wins: 19, losses: 8, ties: 3, gamesPlayed: 30 },
    { rank: 4, name: "Irish Holdings TNT Shamrocks", points: 34, wins: 15, losses: 11, ties: 4, gamesPlayed: 30 },
    { rank: 5, name: "Ace Pools Moose", points: 34, wins: 15, losses: 9, ties: 6, gamesPlayed: 30 },
    { rank: 6, name: "Red Hot Dawgs", points: 33, wins: 16, losses: 12, ties: 2, gamesPlayed: 30 },
    { rank: 7, name: "The Condo Kings Army", points: 29, wins: 12, losses: 13, ties: 5, gamesPlayed: 30 },
    { rank: 8, name: "The Classics", points: 28, wins: 13, losses: 15, ties: 2, gamesPlayed: 30 },
    { rank: 9, name: "McCalmont Financial Beavers", points: 24, wins: 11, losses: 17, ties: 2, gamesPlayed: 30 },
    { rank: 10, name: "Markham Knights", points: 23, wins: 10, losses: 17, ties: 3, gamesPlayed: 30 },
    { rank: 11, name: "DC Chiropractic Nads", points: 21, wins: 9, losses: 18, ties: 3, gamesPlayed: 30 },
    { rank: 12, name: "S & H Raiders", points: 18, wins: 7, losses: 19, ties: 4, gamesPlayed: 30 },
    { rank: 13, name: "OK Braves", points: 16, wins: 8, losses: 21, ties: 1, gamesPlayed: 30 },
    { rank: 14, name: "Pilkey Glass Pirates", points: 15, wins: 6, losses: 21, ties: 3, gamesPlayed: 30 },
  ],
  2024: [
    { rank: 1, name: "Golf19 Goodyear Rangers", points: 54, wins: 26, losses: 2, ties: 2, gamesPlayed: 30 },
    { rank: 2, name: "Derek Houghton Century 21", points: 49, wins: 23, losses: 4, ties: 3, gamesPlayed: 30 },
    { rank: 3, name: "Irish Holdings Shamrocks", points: 39, wins: 18, losses: 8, ties: 4, gamesPlayed: 30 },
    { rank: 4, name: "The Classics", points: 33, wins: 14, losses: 11, ties: 5, gamesPlayed: 30 },
    { rank: 5, name: "The Condo Kings Army", points: 31, wins: 14, losses: 13, ties: 3, gamesPlayed: 30 },
    { rank: 6, name: "Brickhouse Ok Braves", points: 30, wins: 14, losses: 13, ties: 3, gamesPlayed: 30 },
    { rank: 7, name: "Markham Knights", points: 29, wins: 12, losses: 13, ties: 5, gamesPlayed: 30 },
    { rank: 8, name: "Pilkey Glass Pirates", points: 28, wins: 12, losses: 14, ties: 4, gamesPlayed: 30 },
    { rank: 9, name: "S+H Raiders", points: 27, wins: 13, losses: 16, ties: 1, gamesPlayed: 30 },
    { rank: 10, name: "Ace Pools Moose", points: 27, wins: 12, losses: 15, ties: 3, gamesPlayed: 30 },
    { rank: 11, name: "McCalmont Financial Beavers", points: 19, wins: 9, losses: 18, ties: 3, gamesPlayed: 30 },
    { rank: 12, name: "DC Chiropractic Nads", points: 18, wins: 7, losses: 18, ties: 5, gamesPlayed: 30 },
    { rank: 13, name: "Polyson Sox", points: 17, wins: 6, losses: 19, ties: 5, gamesPlayed: 30 },
    { rank: 14, name: "Red Hot Dawgs", points: 13, wins: 6, losses: 22, ties: 2, gamesPlayed: 30 },
  ],
  2023: [
    { rank: 1, name: "Derek Houghton Century 21", points: 50, wins: 24, losses: 4, ties: 2, gamesPlayed: 30 },
    { rank: 2, name: "Golf19 Goodyear Rangers", points: 45, wins: 20, losses: 5, ties: 5, gamesPlayed: 30 },
    { rank: 3, name: "The Classics", points: 36, wins: 17, losses: 10, ties: 3, gamesPlayed: 30 },
    { rank: 4, name: "Red Hot Dawgs", points: 36, wins: 16, losses: 10, ties: 4, gamesPlayed: 30 },
    { rank: 5, name: "Brickhouse OK Braves", points: 36, wins: 16, losses: 10, ties: 4, gamesPlayed: 30 },
    { rank: 6, name: "McCalmont Financial Beavers", points: 32, wins: 14, losses: 10, ties: 6, gamesPlayed: 30 },
    { rank: 7, name: "Irish Holdings Shamrocks", points: 32, wins: 14, losses: 12, ties: 4, gamesPlayed: 30 },
    { rank: 8, name: "Polyson Sox", points: 32, wins: 14, losses: 12, ties: 4, gamesPlayed: 30 },
    { rank: 9, name: "DC Chiropractic Nads", points: 25, wins: 11, losses: 14, ties: 5, gamesPlayed: 30 },
    { rank: 10, name: "Markham Knights", points: 20, wins: 7, losses: 17, ties: 6, gamesPlayed: 30 },
    { rank: 11, name: "S+H Raiders", points: 20, wins: 9, losses: 18, ties: 3, gamesPlayed: 30 },
    { rank: 12, name: "Ace Pools Moose", points: 18, wins: 6, losses: 18, ties: 6, gamesPlayed: 30 },
    { rank: 13, name: "The Condo Kings Army", points: 14, wins: 5, losses: 20, ties: 5, gamesPlayed: 30 },
    { rank: 14, name: "Pilkey Glass Pirates", points: 13, wins: 7, losses: 20, ties: 3, gamesPlayed: 30 },
  ],
  2022: [
    { rank: 1, name: "Pilkey Glass Pirates", points: 44, wins: 21, losses: 7, ties: 2, gamesPlayed: 30 },
    { rank: 2, name: "Derek Houghton Century 21", points: 42, wins: 20, losses: 7, ties: 3, gamesPlayed: 30 },
    { rank: 3, name: "Rangers", points: 37, wins: 18, losses: 11, ties: 1, gamesPlayed: 30 },
    { rank: 4, name: "Irish Holdings Shamrocks", points: 36, wins: 17, losses: 11, ties: 2, gamesPlayed: 30 },
    { rank: 5, name: "The Condo Kings Army", points: 35, wins: 17, losses: 12, ties: 1, gamesPlayed: 30 },
    { rank: 6, name: "S+H Raiders", points: 34, wins: 17, losses: 12, ties: 1, gamesPlayed: 30 },
    { rank: 7, name: "Markham Knights", points: 32, wins: 15, losses: 13, ties: 2, gamesPlayed: 30 },
    { rank: 8, name: "OK Braves", points: 32, wins: 16, losses: 13, ties: 1, gamesPlayed: 30 },
    { rank: 9, name: "Red Hot Dawgs", points: 25, wins: 11, losses: 16, ties: 3, gamesPlayed: 30 },
    { rank: 10, name: "McCalmont Financial Beavers", points: 24, wins: 12, losses: 16, ties: 2, gamesPlayed: 30 },
    { rank: 11, name: "Polyson Sox", points: 24, wins: 11, losses: 16, ties: 3, gamesPlayed: 30 },
    { rank: 12, name: "Ace Pools Moose", points: 20, wins: 10, losses: 19, ties: 1, gamesPlayed: 30 },
    { rank: 13, name: "The Classics", points: 17, wins: 8, losses: 21, ties: 1, gamesPlayed: 30 },
    { rank: 14, name: "The SpoT Nads", points: 9, wins: 4, losses: 23, ties: 3, gamesPlayed: 30 },
  ],
  2021: [
    { rank: 1, name: "Duchess Beavers", points: 23, wins: 11, losses: 3, ties: 1, gamesPlayed: 15 },
    { rank: 2, name: "Pilkey Glass Pirates", points: 18, wins: 8, losses: 5, ties: 2, gamesPlayed: 15 },
    { rank: 3, name: "Rangers", points: 16, wins: 8, losses: 7, ties: 0, gamesPlayed: 15 },
    { rank: 4, name: "Markham Knights", points: 16, wins: 7, losses: 6, ties: 2, gamesPlayed: 15 },
    { rank: 5, name: "Northtown Sox", points: 15, wins: 7, losses: 7, ties: 1, gamesPlayed: 15 },
    { rank: 6, name: "The Classics", points: 15, wins: 7, losses: 7, ties: 1, gamesPlayed: 15 },
    { rank: 7, name: "The Condo Kings Army", points: 9, wins: 4, losses: 10, ties: 1, gamesPlayed: 15 },
    { rank: 8, name: "Derek Houghton Century 21", points: 5, wins: 3, losses: 10, ties: 2, gamesPlayed: 15 },
  ],
  2020: [{ rank: 1, name: "Season Not Held", points: 0, wins: 0, losses: 0, ties: 0, gamesPlayed: 0 }],
  2019: [
    { rank: 1, name: "Derek Houghton Century 21", points: 55, wins: 26, losses: 1, ties: 3, gamesPlayed: 30 },
    { rank: 2, name: "The Classics", points: 51, wins: 25, losses: 4, ties: 1, gamesPlayed: 30 },
    { rank: 3, name: "Pilkey Glass Pirates", points: 39, wins: 18, losses: 9, ties: 3, gamesPlayed: 30 },
    { rank: 4, name: "The SpoT Nads", points: 38, wins: 16, losses: 8, ties: 6, gamesPlayed: 30 },
    { rank: 5, name: "Markham Knights", points: 35, wins: 16, losses: 11, ties: 3, gamesPlayed: 30 },
    { rank: 6, name: "OK Braves", points: 34, wins: 16, losses: 12, ties: 2, gamesPlayed: 30 },
    { rank: 7, name: "S+H Raiders", points: 32, wins: 15, losses: 13, ties: 2, gamesPlayed: 30 },
    { rank: 8, name: "The Condo Kings Army", points: 31, wins: 16, losses: 13, ties: 1, gamesPlayed: 30 },
    { rank: 9, name: "Ace Pools Moose", points: 29, wins: 13, losses: 14, ties: 3, gamesPlayed: 30 },
    { rank: 10, name: "Duchess Beavers", points: 29, wins: 14, losses: 13, ties: 3, gamesPlayed: 30 },
    { rank: 11, name: "Red Hot Dawgs", points: 25, wins: 11, losses: 15, ties: 4, gamesPlayed: 30 },
    { rank: 12, name: "Rangers", points: 18, wins: 9, losses: 19, ties: 2, gamesPlayed: 30 },
    { rank: 13, name: "Northtown Sox", points: 17, wins: 7, losses: 20, ties: 3, gamesPlayed: 30 },
    { rank: 14, name: "Irish Holdings Shamrocks", points: 17, wins: 7, losses: 19, ties: 4, gamesPlayed: 30 },
    { rank: 15, name: "Seagate Jets", points: 16, wins: 6, losses: 19, ties: 5, gamesPlayed: 30 },
    { rank: 16, name: "Prime Flooring Brew Jays", points: 2, wins: 1, losses: 26, ties: 3, gamesPlayed: 30 },
  ],
  2018: [
    { rank: 1, name: "The Classics", points: 53, wins: 25, losses: 2, ties: 3, gamesPlayed: 30 },
    { rank: 2, name: "S+H Raiders", points: 47, wins: 20, losses: 3, ties: 7, gamesPlayed: 30 },
    { rank: 3, name: "Derek Houghton Century 21", points: 42, wins: 20, losses: 7, ties: 3, gamesPlayed: 30 },
    { rank: 4, name: "OK Braves", points: 42, wins: 18, losses: 6, ties: 6, gamesPlayed: 30 },
    { rank: 5, name: "Beavers", points: 36, wins: 16, losses: 10, ties: 4, gamesPlayed: 30 },
    { rank: 6, name: "Prime Flooring Brew Jays", points: 35, wins: 16, losses: 11, ties: 3, gamesPlayed: 30 },
    { rank: 7, name: "Irish Shamrocks", points: 32, wins: 13, losses: 11, ties: 6, gamesPlayed: 30 },
    { rank: 8, name: "Rangers", points: 28, wins: 13, losses: 15, ties: 2, gamesPlayed: 30 },
    { rank: 9, name: "Markham Knights", points: 26, wins: 11, losses: 15, ties: 4, gamesPlayed: 30 },
    { rank: 10, name: "Ace Pools Moose", points: 26, wins: 11, losses: 15, ties: 4, gamesPlayed: 30 },
    { rank: 11, name: "Northtown Sox", points: 21, wins: 7, losses: 16, ties: 7, gamesPlayed: 30 },
    { rank: 12, name: "Main's Mansion Nads", points: 21, wins: 9, losses: 18, ties: 3, gamesPlayed: 30 },
    { rank: 13, name: "Red Hot Dawgs", points: 21, wins: 9, losses: 18, ties: 3, gamesPlayed: 30 },
    { rank: 14, name: "Pilkey Glass Pirates", points: 19, wins: 8, losses: 19, ties: 3, gamesPlayed: 30 },
    { rank: 15, name: "The Condo Kings Army", points: 17, wins: 7, losses: 20, ties: 3, gamesPlayed: 30 },
    { rank: 16, name: "Seagate Jets", points: 12, wins: 5, losses: 22, ties: 3, gamesPlayed: 30 },
  ],
  2017: [
    { rank: 1, name: "Derek Houghton Century 21", points: 47, wins: 22, losses: 5, ties: 3, gamesPlayed: 30 },
    { rank: 2, name: "S+H Raiders", points: 40, wins: 17, losses: 7, ties: 6, gamesPlayed: 30 },
    { rank: 3, name: "OK Braves", points: 40, wins: 18, losses: 8, ties: 4, gamesPlayed: 30 },
    { rank: 4, name: "The Condo Kings Army", points: 38, wins: 17, losses: 9, ties: 4, gamesPlayed: 30 },
    { rank: 5, name: "Seagate Jets", points: 38, wins: 14, losses: 6, ties: 10, gamesPlayed: 30 },
    { rank: 6, name: "The Classics", points: 33, wins: 14, losses: 11, ties: 5, gamesPlayed: 30 },
    { rank: 7, name: "Markham Knights", points: 32, wins: 12, losses: 10, ties: 8, gamesPlayed: 30 },
    { rank: 8, name: "Main's Mansion Nads", points: 30, wins: 13, losses: 13, ties: 4, gamesPlayed: 30 },
    { rank: 9, name: "Pilkey Glass Pirates", points: 28, wins: 11, losses: 13, ties: 6, gamesPlayed: 30 },
    { rank: 10, name: "Northtown Sox", points: 26, wins: 10, losses: 14, ties: 6, gamesPlayed: 30 },
    { rank: 11, name: "Ace Pools Moose", points: 26, wins: 11, losses: 14, ties: 5, gamesPlayed: 30 },
    { rank: 12, name: "Prime Flooring Brew Jays", points: 25, wins: 11, losses: 14, ties: 5, gamesPlayed: 30 },
    { rank: 13, name: "Sibra Kitchens Bolts", points: 23, wins: 8, losses: 15, ties: 7, gamesPlayed: 30 },
    { rank: 14, name: "Main's Mansion Rangers", points: 22, wins: 9, losses: 17, ties: 4, gamesPlayed: 30 },
    { rank: 15, name: "Beavers", points: 22, wins: 7, losses: 15, ties: 8, gamesPlayed: 30 },
    { rank: 16, name: "Red Hot Dawgs", points: 7, wins: 1, losses: 24, ties: 5, gamesPlayed: 30 },
  ],
  2016: [
    { rank: 1, name: "Markham Knights", points: 45, wins: 22, losses: 7, ties: 1, gamesPlayed: 30 },
    { rank: 2, name: "Derek Houghton Century 21", points: 43, wins: 20, losses: 7, ties: 3, gamesPlayed: 30 },
    { rank: 3, name: "S+H Raiders", points: 43, wins: 20, losses: 7, ties: 3, gamesPlayed: 30 },
    { rank: 4, name: "Pilkey Glass Pirates", points: 42, wins: 20, losses: 8, ties: 2, gamesPlayed: 30 },
    { rank: 5, name: "Sibra Kitchens Bolts", points: 39, wins: 19, losses: 10, ties: 1, gamesPlayed: 30 },
    { rank: 6, name: "Main's Mansion Nads", points: 35, wins: 15, losses: 10, ties: 5, gamesPlayed: 30 },
    { rank: 7, name: "The Classics", points: 33, wins: 16, losses: 13, ties: 1, gamesPlayed: 30 },
    { rank: 8, name: "Main's Mansion Rangers", points: 32, wins: 15, losses: 13, ties: 2, gamesPlayed: 30 },
    { rank: 9, name: "Seagate Jets", points: 31, wins: 14, losses: 13, ties: 3, gamesPlayed: 30 },
    { rank: 10, name: "Brew Jays", points: 29, wins: 14, losses: 15, ties: 1, gamesPlayed: 30 },
    { rank: 11, name: "Ace Pools Moose", points: 28, wins: 13, losses: 15, ties: 2, gamesPlayed: 30 },
    { rank: 12, name: "OK Braves", points: 27, wins: 13, losses: 16, ties: 1, gamesPlayed: 30 },
    { rank: 13, name: "The Condo Kings Army", points: 18, wins: 7, losses: 19, ties: 4, gamesPlayed: 30 },
    { rank: 14, name: "Red Hot Dawgs", points: 13, wins: 6, losses: 21, ties: 3, gamesPlayed: 30 },
    { rank: 15, name: "Symantec Beavers", points: 12, wins: 6, losses: 24, ties: 0, gamesPlayed: 30 },
    { rank: 16, name: "Northtown Sox", points: 8, wins: 4, losses: 26, ties: 0, gamesPlayed: 30 },
  ],
  2015: [
    { rank: 1, name: "S+H Raiders", points: 49, wins: 23, losses: 4, ties: 3, gamesPlayed: 30 },
    { rank: 2, name: "The Classics", points: 44, wins: 20, losses: 6, ties: 4, gamesPlayed: 30 },
    { rank: 3, name: "Derek Houghton Century 21", points: 41, wins: 19, losses: 8, ties: 3, gamesPlayed: 30 },
    { rank: 4, name: "Main's Mansion Rangers", points: 38, wins: 18, losses: 10, ties: 2, gamesPlayed: 30 },
    { rank: 5, name: "Ace Pools Moose", points: 35, wins: 16, losses: 11, ties: 3, gamesPlayed: 30 },
    { rank: 6, name: "Pilkey Glass Pirates", points: 32, wins: 15, losses: 13, ties: 2, gamesPlayed: 30 },
    { rank: 7, name: "Northtown Sox", points: 32, wins: 14, losses: 12, ties: 4, gamesPlayed: 30 },
    { rank: 8, name: "Sibra Kitchens Bolts", points: 31, wins: 13, losses: 12, ties: 5, gamesPlayed: 30 },
    { rank: 9, name: "Markham Knights", points: 30, wins: 14, losses: 14, ties: 2, gamesPlayed: 30 },
    { rank: 10, name: "Brew Jays", points: 28, wins: 13, losses: 15, ties: 2, gamesPlayed: 30 },
    { rank: 11, name: "Wild Wing North Nads", points: 28, wins: 12, losses: 14, ties: 4, gamesPlayed: 30 },
    { rank: 12, name: "Seagate Jets", points: 27, wins: 11, losses: 14, ties: 5, gamesPlayed: 30 },
    { rank: 13, name: "OK Braves", points: 22, wins: 10, losses: 18, ties: 2, gamesPlayed: 30 },
    { rank: 14, name: "Red Hot Dawgs", points: 22, wins: 9, losses: 17, ties: 4, gamesPlayed: 30 },
    { rank: 15, name: "Symantec Beavers", points: 12, wins: 5, losses: 23, ties: 2, gamesPlayed: 30 },
    { rank: 16, name: "The Condo Kings Army", points: 9, wins: 3, losses: 24, ties: 3, gamesPlayed: 30 },
  ],
  2014: [
    { rank: 1, name: "S+H Raiders", points: 46, wins: 20, losses: 4, ties: 6, gamesPlayed: 30 },
    { rank: 2, name: "The Classics", points: 40, wins: 18, losses: 8, ties: 4, gamesPlayed: 30 },
    { rank: 3, name: "Seagate Chiefs", points: 37, wins: 16, losses: 9, ties: 5, gamesPlayed: 30 },
    { rank: 4, name: "Ace Pools Moose", points: 36, wins: 15, losses: 9, ties: 6, gamesPlayed: 30 },
    { rank: 5, name: "OK Braves", points: 35, wins: 15, losses: 10, ties: 5, gamesPlayed: 30 },
    { rank: 6, name: "The Condo Kings Army", points: 33, wins: 15, losses: 10, ties: 5, gamesPlayed: 30 },
    { rank: 7, name: "Sibra Kitchens Bolts", points: 33, wins: 14, losses: 11, ties: 5, gamesPlayed: 30 },
    { rank: 8, name: "Brew Jays", points: 33, wins: 15, losses: 12, ties: 3, gamesPlayed: 30 },
    { rank: 9, name: "Northtown Sox", points: 31, wins: 14, losses: 12, ties: 4, gamesPlayed: 30 },
    { rank: 10, name: "Pilkey Glass Pirates", points: 30, wins: 12, losses: 12, ties: 6, gamesPlayed: 30 },
    { rank: 11, name: "Main's Mansion Rangers", points: 29, wins: 11, losses: 12, ties: 7, gamesPlayed: 30 },
    { rank: 12, name: "Red Hot Dawgs", points: 25, wins: 8, losses: 13, ties: 9, gamesPlayed: 30 },
    { rank: 13, name: "Baseline Beavers", points: 24, wins: 10, losses: 16, ties: 4, gamesPlayed: 30 },
    { rank: 14, name: "Derek Houghton Century 21", points: 19, wins: 8, losses: 17, ties: 5, gamesPlayed: 30 },
    { rank: 15, name: "Wild Wing North Nads", points: 18, wins: 7, losses: 19, ties: 4, gamesPlayed: 30 },
    { rank: 16, name: "Markham Knights", points: 6, wins: 2, losses: 26, ties: 2, gamesPlayed: 30 },
  ],
  2013: [
    { rank: 1, name: "S+H Raiders", points: 45, wins: 21, losses: 6, ties: 3, gamesPlayed: 30 },
    { rank: 2, name: "Ace Pools Moose", points: 42, wins: 18, losses: 6, ties: 6, gamesPlayed: 30 },
    { rank: 3, name: "Northtown Sox", points: 39, wins: 17, losses: 8, ties: 5, gamesPlayed: 30 },
    { rank: 4, name: "The Condo Kings Army", points: 36, wins: 16, losses: 10, ties: 4, gamesPlayed: 30 },
    { rank: 5, name: "Aviva Beavers", points: 35, wins: 15, losses: 10, ties: 5, gamesPlayed: 30 },
    { rank: 6, name: "Adam's Lighting Bolts", points: 34, wins: 15, losses: 11, ties: 4, gamesPlayed: 30 },
    { rank: 7, name: "Rico's Bar & Bistro OK Braves", points: 31, wins: 14, losses: 13, ties: 3, gamesPlayed: 30 },
    { rank: 8, name: "Markham Knights", points: 31, wins: 13, losses: 12, ties: 5, gamesPlayed: 30 },
    { rank: 9, name: "Seagate Chiefs", points: 31, wins: 13, losses: 12, ties: 5, gamesPlayed: 30 },
    { rank: 10, name: "Red Hot Dawgs", points: 29, wins: 12, losses: 13, ties: 5, gamesPlayed: 30 },
    { rank: 11, name: "Pilkey Glass Pirates", points: 27, wins: 10, losses: 13, ties: 7, gamesPlayed: 30 },
    { rank: 12, name: "Col. Mustards Classics", points: 27, wins: 11, losses: 14, ties: 5, gamesPlayed: 30 },
    { rank: 13, name: "Main's Mansion Rangers", points: 21, wins: 10, losses: 18, ties: 2, gamesPlayed: 30 },
    { rank: 14, name: "HyperT Hitmen", points: 21, wins: 7, losses: 16, ties: 7, gamesPlayed: 30 },
    { rank: 15, name: "Wild Wing North Nads", points: 16, wins: 6, losses: 20, ties: 4, gamesPlayed: 30 },
    { rank: 16, name: "Derek Houghton Remax", points: 14, wins: 4, losses: 20, ties: 6, gamesPlayed: 30 },
  ],
  2012: [
    { rank: 1, name: "Aviva Beavers", points: 48, wins: 21, losses: 3, ties: 6, gamesPlayed: 30 },
    { rank: 2, name: "Ace Pools Moose", points: 40, wins: 18, losses: 8, ties: 4, gamesPlayed: 30 },
    { rank: 3, name: "Red Hot Dawgs", points: 37, wins: 16, losses: 9, ties: 5, gamesPlayed: 30 },
    { rank: 4, name: "Seagate Chiefs", points: 36, wins: 15, losses: 9, ties: 6, gamesPlayed: 30 },
    { rank: 5, name: "Pilkey Glass Pirates", points: 36, wins: 16, losses: 10, ties: 4, gamesPlayed: 30 },
    { rank: 6, name: "Northtown Sox", points: 34, wins: 14, losses: 10, ties: 6, gamesPlayed: 30 },
    { rank: 7, name: "Adam's Lighting Bolts", points: 33, wins: 13, losses: 10, ties: 7, gamesPlayed: 30 },
    { rank: 8, name: "Markham Knights", points: 30, wins: 12, losses: 12, ties: 6, gamesPlayed: 30 },
    { rank: 9, name: "Main's Mansion Rangers", points: 29, wins: 11, losses: 12, ties: 7, gamesPlayed: 30 },
    { rank: 10, name: "Col. Mustard's Classics", points: 28, wins: 11, losses: 13, ties: 6, gamesPlayed: 30 },
    { rank: 11, name: "S+H Raiders", points: 27, wins: 11, losses: 14, ties: 5, gamesPlayed: 30 },
    { rank: 12, name: "Rico's Bar & Bistro OK Braves", points: 26, wins: 9, losses: 13, ties: 8, gamesPlayed: 30 },
    { rank: 13, name: "Route 48 Nads", points: 23, wins: 9, losses: 16, ties: 5, gamesPlayed: 30 },
    { rank: 14, name: "Derek Houghton Remax", points: 23, wins: 10, losses: 16, ties: 4, gamesPlayed: 30 },
    { rank: 15, name: "HyperT Hitmen", points: 18, wins: 6, losses: 18, ties: 6, gamesPlayed: 30 },
    { rank: 16, name: "The Condo Kings Army", points: 11, wins: 2, losses: 21, ties: 7, gamesPlayed: 30 },
  ],
  2011: [
    { rank: 1, name: "Red Hot Dawgs", points: 48, wins: 22, losses: 4, ties: 4, gamesPlayed: 30 },
    { rank: 2, name: "Northtown Sox", points: 43, wins: 20, losses: 7, ties: 3, gamesPlayed: 30 },
    { rank: 3, name: "Aviva Beavers", points: 42, wins: 17, losses: 5, ties: 8, gamesPlayed: 30 },
    { rank: 4, name: "Col Mustard's Classics", points: 41, wins: 18, losses: 7, ties: 5, gamesPlayed: 30 },
    { rank: 5, name: "Active Green+Ross Athletics", points: 38, wins: 16, losses: 8, ties: 6, gamesPlayed: 30 },
    { rank: 6, name: "CDS Moose", points: 36, wins: 16, losses: 10, ties: 4, gamesPlayed: 30 },
    { rank: 7, name: "Markham Knights", points: 32, wins: 13, losses: 11, ties: 6, gamesPlayed: 30 },
    { rank: 8, name: "Pilkey Glass Pirates", points: 32, wins: 14, losses: 12, ties: 4, gamesPlayed: 30 },
    { rank: 9, name: "Main's Mansion Rangers", points: 27, wins: 11, losses: 14, ties: 5, gamesPlayed: 30 },
    { rank: 10, name: "Seagate Chiefs", points: 26, wins: 12, losses: 15, ties: 3, gamesPlayed: 30 },
    { rank: 11, name: "Rico's Bar & Bistro OK Braves", points: 25, wins: 10, losses: 15, ties: 5, gamesPlayed: 30 },
    { rank: 12, name: "S+H Raiders", points: 23, wins: 9, losses: 16, ties: 5, gamesPlayed: 30 },
    { rank: 13, name: "HyperT Hitmen", points: 21, wins: 8, losses: 17, ties: 5, gamesPlayed: 30 },
    { rank: 14, name: "Wing It", points: 20, wins: 8, losses: 18, ties: 4, gamesPlayed: 30 },
    { rank: 15, name: "Adam's Lighting Bolts", points: 18, wins: 7, losses: 19, ties: 4, gamesPlayed: 30 },
    { rank: 16, name: "Derek Houghton Remax", points: 5, wins: 2, losses: 25, ties: 3, gamesPlayed: 30 },
  ],
  2010: [
    { rank: 1, name: "EM Automotive Sox", points: 50, wins: 23, losses: 3, ties: 4, gamesPlayed: 30 },
    { rank: 2, name: "Red Hot Dawgs", points: 42, wins: 18, losses: 6, ties: 6, gamesPlayed: 30 },
    { rank: 3, name: "Aviva Beavers", points: 42, wins: 19, losses: 7, ties: 4, gamesPlayed: 30 },
    { rank: 4, name: "CDS Moose", points: 39, wins: 18, losses: 9, ties: 3, gamesPlayed: 30 },
    { rank: 5, name: "Adam's Lighting Bolts", points: 37, wins: 17, losses: 10, ties: 3, gamesPlayed: 30 },
    { rank: 6, name: "Main's Mansion Rangers", points: 35, wins: 15, losses: 10, ties: 5, gamesPlayed: 30 },
    { rank: 7, name: "Active Green+Ross Athletics", points: 29, wins: 14, losses: 15, ties: 1, gamesPlayed: 30 },
    { rank: 8, name: "Seagate", points: 29, wins: 12, losses: 12, ties: 6, gamesPlayed: 30 },
    { rank: 9, name: "OK Braves", points: 29, wins: 13, losses: 14, ties: 3, gamesPlayed: 30 },
    { rank: 10, name: "The Hitmen", points: 29, wins: 14, losses: 15, ties: 1, gamesPlayed: 30 },
    { rank: 11, name: "Col Mustard's Classics", points: 23, wins: 11, losses: 18, ties: 1, gamesPlayed: 30 },
    { rank: 12, name: "Markham Knights", points: 23, wins: 9, losses: 16, ties: 5, gamesPlayed: 30 },
    { rank: 13, name: "Harding Display Pirates", points: 22, wins: 11, losses: 18, ties: 1, gamesPlayed: 30 },
    { rank: 14, name: "Wing It", points: 20, wins: 8, losses: 18, ties: 4, gamesPlayed: 30 },
    { rank: 15, name: "Houghton Remax", points: 16, wins: 6, losses: 19, ties: 5, gamesPlayed: 30 },
    { rank: 16, name: "CDI Computers Heirs", points: 12, wins: 5, losses: 23, ties: 2, gamesPlayed: 30 },
  ],
  2009: [
    { rank: 1, name: "Sgt. Pepper's", points: 49, wins: 22, losses: 4, ties: 3, gamesPlayed: 30 },
    { rank: 2, name: "Red Hot Dawgs", points: 43, wins: 20, losses: 7, ties: 3, gamesPlayed: 30 },
    { rank: 3, name: "Harding Display", points: 41, wins: 19, losses: 8, ties: 3, gamesPlayed: 30 },
    { rank: 4, name: "Active Green+Ross", points: 41, wins: 19, losses: 8, ties: 3, gamesPlayed: 30 },
    { rank: 5, name: "Aviva", points: 36, wins: 16, losses: 10, ties: 4, gamesPlayed: 30 },
    { rank: 6, name: "Main's Mansion", points: 36, wins: 16, losses: 10, ties: 4, gamesPlayed: 30 },
    { rank: 7, name: "OK Transportation", points: 35, wins: 16, losses: 11, ties: 3, gamesPlayed: 30 },
    { rank: 8, name: "CDS", points: 31, wins: 14, losses: 13, ties: 3, gamesPlayed: 30 },
    { rank: 9, name: "EM Automotive", points: 30, wins: 14, losses: 14, ties: 2, gamesPlayed: 30 },
    { rank: 10, name: "Adam's Lighting", points: 26, wins: 11, losses: 15, ties: 4, gamesPlayed: 30 },
    { rank: 11, name: "Sylvia Morris C21", points: 22, wins: 10, losses: 17, ties: 3, gamesPlayed: 30 },
    { rank: 12, name: "CDI Computers", points: 20, wins: 9, losses: 19, ties: 2, gamesPlayed: 30 },
    { rank: 13, name: "Seagate", points: 19, wins: 10, losses: 18, ties: 2, gamesPlayed: 30 },
    { rank: 14, name: "Houghton Remax", points: 18, wins: 8, losses: 20, ties: 2, gamesPlayed: 30 },
    { rank: 15, name: "Markham Knights", points: 15, wins: 6, losses: 19, ties: 3, gamesPlayed: 30 },
    { rank: 16, name: "Wing It", points: 14, wins: 5, losses: 21, ties: 4, gamesPlayed: 30 },
  ],
  2008: [
    { rank: 1, name: "Sgt. Pepper's", points: 47, wins: 22, losses: 5, ties: 3, gamesPlayed: 30 },
    { rank: 2, name: "Red Hot Dawgs", points: 43, wins: 20, losses: 7, ties: 3, gamesPlayed: 30 },
    { rank: 3, name: "Active Green+Ross", points: 42, wins: 19, losses: 7, ties: 4, gamesPlayed: 30 },
    { rank: 4, name: "Sylvia Morris C21", points: 42, wins: 20, losses: 8, ties: 2, gamesPlayed: 30 },
    { rank: 5, name: "CDS", points: 38, wins: 17, losses: 9, ties: 4, gamesPlayed: 30 },
    { rank: 6, name: "Rangers", points: 34, wins: 15, losses: 11, ties: 4, gamesPlayed: 30 },
    { rank: 7, name: "OK Transportation", points: 33, wins: 14, losses: 11, ties: 5, gamesPlayed: 30 },
    { rank: 8, name: "Adam's Lighting", points: 29, wins: 13, losses: 14, ties: 3, gamesPlayed: 30 },
    { rank: 9, name: "Houghton Remax", points: 28, wins: 14, losses: 14, ties: 2, gamesPlayed: 30 },
    { rank: 10, name: "Seagate", points: 25, wins: 10, losses: 15, ties: 5, gamesPlayed: 30 },
    { rank: 11, name: "CDI Computers", points: 24, wins: 10, losses: 16, ties: 4, gamesPlayed: 30 },
    { rank: 12, name: "Crush", points: 21, wins: 9, losses: 18, ties: 3, gamesPlayed: 30 },
    { rank: 13, name: "Samco Machinery", points: 20, wins: 9, losses: 18, ties: 3, gamesPlayed: 30 },
    { rank: 14, name: "EM Automotive", points: 20, wins: 9, losses: 19, ties: 2, gamesPlayed: 30 },
    { rank: 15, name: "Markham Knights", points: 16, wins: 6, losses: 20, ties: 4, gamesPlayed: 30 },
    { rank: 16, name: "Wild Wing", points: 15, wins: 7, losses: 20, ties: 1, gamesPlayed: 30 },
  ],
  2007: [
    { rank: 1, name: "Active Green+Ross", points: 44, wins: 21, losses: 7, ties: 2, gamesPlayed: 30 },
    { rank: 2, name: "Houghton Remax", points: 41, wins: 19, losses: 8, ties: 3, gamesPlayed: 30 },
    { rank: 3, name: "Sgt. Pepper's", points: 40, wins: 18, losses: 8, ties: 4, gamesPlayed: 30 },
    { rank: 4, name: "Office Depot", points: 35, wins: 15, losses: 10, ties: 5, gamesPlayed: 30 },
    { rank: 5, name: "Samco Machinery", points: 34, wins: 16, losses: 12, ties: 2, gamesPlayed: 30 },
    { rank: 6, name: "Wild Wing", points: 32, wins: 14, losses: 12, ties: 4, gamesPlayed: 30 },
    { rank: 7, name: "Red Hot Dawgs", points: 32, wins: 14, losses: 12, ties: 4, gamesPlayed: 30 },
    { rank: 8, name: "Sylvia Morris C21", points: 31, wins: 14, losses: 13, ties: 3, gamesPlayed: 30 },
    { rank: 9, name: "CDS", points: 28, wins: 12, losses: 14, ties: 4, gamesPlayed: 30 },
    { rank: 10, name: "Poplar Remax", points: 27, wins: 12, losses: 15, ties: 3, gamesPlayed: 30 },
    { rank: 11, name: "CG&B Insurance", points: 25, wins: 11, losses: 16, ties: 3, gamesPlayed: 30 },
    { rank: 12, name: "OK Transportation", points: 24, wins: 10, losses: 16, ties: 4, gamesPlayed: 30 },
    { rank: 13, name: "Adam's Lighting", points: 24, wins: 10, losses: 16, ties: 4, gamesPlayed: 30 },
    { rank: 14, name: "Markham Knights", points: 23, wins: 11, losses: 18, ties: 1, gamesPlayed: 30 },
    { rank: 15, name: "Seagate", points: 23, wins: 10, losses: 17, ties: 3, gamesPlayed: 30 },
    { rank: 16, name: "EM Automotive", points: 17, wins: 8, losses: 21, ties: 1, gamesPlayed: 30 },
  ],
  2006: [
    { rank: 1, name: "Active Green+Ross", points: 44, wins: 21, losses: 7, ties: 2, gamesPlayed: 30 },
    { rank: 2, name: "Seagate", points: 38, wins: 17, losses: 9, ties: 4, gamesPlayed: 30 },
    { rank: 3, name: "Red Hot Dawgs", points: 38, wins: 18, losses: 10, ties: 2, gamesPlayed: 30 },
    { rank: 4, name: "EM Automotive", points: 36, wins: 15, losses: 9, ties: 6, gamesPlayed: 30 },
    { rank: 5, name: "Markham Knights", points: 36, wins: 17, losses: 11, ties: 2, gamesPlayed: 30 },
    { rank: 6, name: "Uptown Bar & Grill", points: 34, wins: 15, losses: 11, ties: 4, gamesPlayed: 30 },
    { rank: 7, name: "Office Depot", points: 31, wins: 14, losses: 13, ties: 3, gamesPlayed: 30 },
    { rank: 8, name: "Houghton Remax", points: 30, wins: 13, losses: 13, ties: 4, gamesPlayed: 30 },
    { rank: 9, name: "Duchess", points: 29, wins: 13, losses: 14, ties: 3, gamesPlayed: 30 },
    { rank: 10, name: "OK Transportation", points: 27, wins: 12, losses: 15, ties: 3, gamesPlayed: 30 },
    { rank: 11, name: "Samco Machinery", points: 26, wins: 12, losses: 16, ties: 2, gamesPlayed: 30 },
    { rank: 12, name: "Tampa Taps", points: 25, wins: 10, losses: 15, ties: 5, gamesPlayed: 30 },
    { rank: 13, name: "Poplar Remax", points: 25, wins: 10, losses: 15, ties: 5, gamesPlayed: 30 },
    { rank: 14, name: "Sgt. Peppers", points: 24, wins: 9, losses: 15, ties: 6, gamesPlayed: 30 },
    { rank: 15, name: "Canadian Detailing", points: 21, wins: 9, losses: 18, ties: 3, gamesPlayed: 30 },
    { rank: 16, name: "CG&B Insurance", points: 16, wins: 6, losses: 20, ties: 4, gamesPlayed: 30 },
  ],
  2005: [
    { rank: 1, name: "OK Transportation", points: 47, wins: 23, losses: 6, ties: 1, gamesPlayed: 30 },
    { rank: 2, name: "Uptown Bar & Grill", points: 44, wins: 21, losses: 7, ties: 2, gamesPlayed: 30 },
    { rank: 3, name: "Markham Knights", points: 43, wins: 21, losses: 8, ties: 1, gamesPlayed: 30 },
    { rank: 4, name: "The Autumn Group", points: 39, wins: 19, losses: 10, ties: 1, gamesPlayed: 30 },
    { rank: 5, name: "M&M Meats", points: 37, wins: 17, losses: 10, ties: 3, gamesPlayed: 30 },
    { rank: 6, name: "Sgt. Peppers", points: 31, wins: 15, losses: 14, ties: 1, gamesPlayed: 30 },
    { rank: 7, name: "Shoeless Joes", points: 30, wins: 13, losses: 13, ties: 4, gamesPlayed: 30 },
    { rank: 8, name: "Active Green+Ross", points: 29, wins: 14, losses: 15, ties: 1, gamesPlayed: 30 },
    { rank: 9, name: "Red Hot Dawgs", points: 27, wins: 12, losses: 15, ties: 3, gamesPlayed: 30 },
    { rank: 10, name: "Tampa Taps", points: 26, wins: 12, losses: 16, ties: 2, gamesPlayed: 30 },
    { rank: 11, name: "Houghton Remax", points: 25, wins: 11, losses: 16, ties: 3, gamesPlayed: 30 },
    { rank: 12, name: "EM Automotive", points: 23, wins: 11, losses: 18, ties: 1, gamesPlayed: 30 },
    { rank: 13, name: "Tommy Cooks", points: 21, wins: 10, losses: 19, ties: 1, gamesPlayed: 30 },
    { rank: 14, name: "Samco Machinery", points: 20, wins: 8, losses: 18, ties: 4, gamesPlayed: 30 },
    { rank: 15, name: "Cardinal Towing", points: 19, wins: 8, losses: 19, ties: 3, gamesPlayed: 30 },
    { rank: 16, name: "Canadian Detailing", points: 19, wins: 8, losses: 19, ties: 3, gamesPlayed: 30 },
  ],
};

// seed_data.py — SCHEDULE_GAMES (2025 season)
const SCHEDULE_GAMES_2025 = [
  { id: 1, date: "2025-05-13", time: "6:30 PM", homeTeam: "The Condo Kings Army", awayTeam: "DC Chiropractic Nads", location: "Centennial North", homeScore: 0, awayScore: 0 },
  { id: 2, date: "2025-05-13", time: "6:30 PM", homeTeam: "Red Hot Dawgs", awayTeam: "Pilkey Glass Pirates", location: "Mintleaf", homeScore: 14, awayScore: 9 },
  { id: 3, date: "2025-05-13", time: "8:00 PM", homeTeam: "Markham Goodyear Rangers", awayTeam: "Irish Holdings TNT Shamrocks", location: "Centennial North", homeScore: 16, awayScore: 17 },
  { id: 4, date: "2025-05-13", time: "8:00 PM", homeTeam: "S & H Raiders", awayTeam: "Polyson Sox", location: "Mintleaf", homeScore: 6, awayScore: 24 },
  { id: 5, date: "2025-05-13", time: "9:30 PM", homeTeam: "Derek Houghton Century 21", awayTeam: "OK Braves", location: "Centennial North", homeScore: 22, awayScore: 12 },
  { id: 6, date: "2025-05-13", time: "9:30 PM", homeTeam: "Ace Pools Moose", awayTeam: "The Classics", location: "Mintleaf", homeScore: 9, awayScore: 23 },
  { id: 7, date: "2025-05-15", time: "6:30 PM", homeTeam: "DC Chiropractic Nads", awayTeam: "S & H Raiders", location: "Centennial North", homeScore: 26, awayScore: 22 },
  { id: 8, date: "2025-05-15", time: "6:30 PM", homeTeam: "Markham Knights", awayTeam: "Derek Houghton Century 21", location: "Mintleaf", homeScore: 9, awayScore: 16 },
  { id: 9, date: "2025-05-15", time: "8:00 PM", homeTeam: "The Classics", awayTeam: "Markham Goodyear Rangers", location: "Centennial North", homeScore: 11, awayScore: 28 },
  { id: 10, date: "2025-05-15", time: "8:00 PM", homeTeam: "Pilkey Glass Pirates", awayTeam: "OK Braves", location: "Mintleaf", homeScore: 12, awayScore: 15 },
  { id: 11, date: "2025-05-15", time: "9:30 PM", homeTeam: "The Condo Kings Army", awayTeam: "Polyson Sox", location: "Centennial North", homeScore: 13, awayScore: 17 },
  { id: 12, date: "2025-05-15", time: "9:30 PM", homeTeam: "McCalmont Financial Beavers", awayTeam: "Red Hot Dawgs", location: "Mintleaf", homeScore: 14, awayScore: 22 },
  { id: 13, date: "2025-05-20", time: "6:30 PM", homeTeam: "Ace Pools Moose", awayTeam: "S & H Raiders", location: "Centennial North", homeScore: 21, awayScore: 8 },
  { id: 14, date: "2025-05-20", time: "6:30 PM", homeTeam: "Markham Goodyear Rangers", awayTeam: "Markham Knights", location: "Mintleaf", homeScore: 15, awayScore: 13 },
  { id: 15, date: "2025-05-20", time: "8:00 PM", homeTeam: "The Condo Kings Army", awayTeam: "Irish Holdings TNT Shamrocks", location: "Centennial North", homeScore: 9, awayScore: 8 },
  { id: 16, date: "2025-05-20", time: "8:00 PM", homeTeam: "The Classics", awayTeam: "McCalmont Financial Beavers", location: "Mintleaf", homeScore: 17, awayScore: 7 },
  { id: 17, date: "2025-05-20", time: "9:30 PM", homeTeam: "DC Chiropractic Nads", awayTeam: "Pilkey Glass Pirates", location: "Centennial North", homeScore: 4, awayScore: 18 },
  { id: 18, date: "2025-05-20", time: "9:30 PM", homeTeam: "Red Hot Dawgs", awayTeam: "OK Braves", location: "Mintleaf", homeScore: 21, awayScore: 7 },
  { id: 19, date: "2025-05-25", time: "5:00 PM", homeTeam: "Markham Goodyear Rangers", awayTeam: "The Condo Kings Army", location: "Mintleaf", homeScore: 20, awayScore: 2 },
  { id: 20, date: "2025-05-25", time: "6:30 PM", homeTeam: "Markham Knights", awayTeam: "OK Braves", location: "Mintleaf", homeScore: 16, awayScore: 13 },
  { id: 21, date: "2025-05-25", time: "8:00 PM", homeTeam: "Polyson Sox", awayTeam: "The Classics", location: "Mintleaf", homeScore: 26, awayScore: 18 },
  { id: 22, date: "2025-05-25", time: "9:30 PM", homeTeam: "Derek Houghton Century 21", awayTeam: "Ace Pools Moose", location: "Mintleaf", homeScore: 19, awayScore: 20 },
  { id: 23, date: "2025-05-27", time: "6:30 PM", homeTeam: "The Classics", awayTeam: "OK Braves", location: "Centennial North", homeScore: 20, awayScore: 7 },
  { id: 24, date: "2025-05-27", time: "6:30 PM", homeTeam: "S & H Raiders", awayTeam: "McCalmont Financial Beavers", location: "Mintleaf", homeScore: 7, awayScore: 19 },
  { id: 25, date: "2025-05-27", time: "8:00 PM", homeTeam: "Polyson Sox", awayTeam: "DC Chiropractic Nads", location: "Centennial North", homeScore: 29, awayScore: 6 },
  { id: 26, date: "2025-05-27", time: "8:00 PM", homeTeam: "The Condo Kings Army", awayTeam: "Markham Knights", location: "Mintleaf", homeScore: 23, awayScore: 9 },
  { id: 27, date: "2025-05-27", time: "9:30 PM", homeTeam: "Derek Houghton Century 21", awayTeam: "Red Hot Dawgs", location: "Centennial North", homeScore: 21, awayScore: 9 },
  { id: 28, date: "2025-05-27", time: "9:30 PM", homeTeam: "Ace Pools Moose", awayTeam: "Markham Goodyear Rangers", location: "Mintleaf", homeScore: 13, awayScore: 23 },
  { id: 29, date: "2025-06-03", time: "6:30 PM", homeTeam: "McCalmont Financial Beavers", awayTeam: "Derek Houghton Century 21", location: "Centennial North", homeScore: 7, awayScore: 7 },
  { id: 30, date: "2025-06-03", time: "6:30 PM", homeTeam: "Pilkey Glass Pirates", awayTeam: "The Condo Kings Army", location: "Mintleaf", homeScore: 14, awayScore: 18 },
  { id: 31, date: "2025-06-03", time: "8:00 PM", homeTeam: "Ace Pools Moose", awayTeam: "OK Braves", location: "Centennial North", homeScore: 21, awayScore: 12 },
  { id: 32, date: "2025-06-03", time: "8:00 PM", homeTeam: "S & H Raiders", awayTeam: "Irish Holdings TNT Shamrocks", location: "Mintleaf", homeScore: 19, awayScore: 22 },
  { id: 33, date: "2025-06-03", time: "9:30 PM", homeTeam: "Markham Knights", awayTeam: "The Classics", location: "Centennial North", homeScore: 17, awayScore: 18 },
  { id: 34, date: "2025-06-03", time: "9:30 PM", homeTeam: "Markham Goodyear Rangers", awayTeam: "DC Chiropractic Nads", location: "Mintleaf", homeScore: 27, awayScore: 20 },
  { id: 35, date: "2025-06-05", time: "6:30 PM", homeTeam: "The Classics", awayTeam: "The Condo Kings Army", location: "Centennial North", homeScore: 19, awayScore: 10 },
  { id: 36, date: "2025-06-05", time: "6:30 PM", homeTeam: "Pilkey Glass Pirates", awayTeam: "S & H Raiders", location: "Mintleaf", homeScore: 12, awayScore: 16 },
  { id: 37, date: "2025-06-05", time: "8:00 PM", homeTeam: "Derek Houghton Century 21", awayTeam: "Irish Holdings TNT Shamrocks", location: "Centennial North", homeScore: 20, awayScore: 11 },
  { id: 38, date: "2025-06-05", time: "8:00 PM", homeTeam: "DC Chiropractic Nads", awayTeam: "Ace Pools Moose", location: "Mintleaf", homeScore: 11, awayScore: 25 },
  { id: 39, date: "2025-06-05", time: "9:30 PM", homeTeam: "Polyson Sox", awayTeam: "McCalmont Financial Beavers", location: "Centennial North", homeScore: 15, awayScore: 4 },
  { id: 40, date: "2025-06-05", time: "9:30 PM", homeTeam: "Markham Goodyear Rangers", awayTeam: "Red Hot Dawgs", location: "Mintleaf", homeScore: 16, awayScore: 12 },
  { id: 41, date: "2025-06-08", time: "5:00 PM", homeTeam: "Irish Holdings TNT Shamrocks", awayTeam: "Red Hot Dawgs", location: "Mintleaf", homeScore: 12, awayScore: 15 },
  { id: 42, date: "2025-06-08", time: "6:30 PM", homeTeam: "OK Braves", awayTeam: "DC Chiropractic Nads", location: "Mintleaf", homeScore: 17, awayScore: 12 },
  { id: 43, date: "2025-06-08", time: "8:00 PM", homeTeam: "Derek Houghton Century 21", awayTeam: "Pilkey Glass Pirates", location: "Mintleaf", homeScore: 16, awayScore: 12 },
  { id: 44, date: "2025-06-08", time: "9:30 PM", homeTeam: "S & H Raiders", awayTeam: "Markham Goodyear Rangers", location: "Mintleaf", homeScore: 11, awayScore: 22 },
  { id: 45, date: "2025-06-10", time: "6:30 PM", homeTeam: "Markham Knights", awayTeam: "McCalmont Financial Beavers", location: "Centennial North", homeScore: 7, awayScore: 14 },
  { id: 46, date: "2025-06-10", time: "6:30 PM", homeTeam: "Derek Houghton Century 21", awayTeam: "The Condo Kings Army", location: "Mintleaf", homeScore: 15, awayScore: 14 },
  { id: 47, date: "2025-06-10", time: "8:00 PM", homeTeam: "Polyson Sox", awayTeam: "Red Hot Dawgs", location: "Centennial North", homeScore: 11, awayScore: 14 },
  { id: 48, date: "2025-06-10", time: "8:00 PM", homeTeam: "The Classics", awayTeam: "DC Chiropractic Nads", location: "Mintleaf", homeScore: 26, awayScore: 17 },
  { id: 49, date: "2025-06-10", time: "9:30 PM", homeTeam: "Ace Pools Moose", awayTeam: "Pilkey Glass Pirates", location: "Centennial North", homeScore: 17, awayScore: 14 },
  { id: 50, date: "2025-06-10", time: "9:30 PM", homeTeam: "Irish Holdings TNT Shamrocks", awayTeam: "OK Braves", location: "Mintleaf", homeScore: 21, awayScore: 22 },
  { id: 51, date: "2025-06-12", time: "6:30 PM", homeTeam: "OK Braves", awayTeam: "Markham Goodyear Rangers", location: "Centennial North", homeScore: 3, awayScore: 14 },
  { id: 52, date: "2025-06-12", time: "6:30 PM", homeTeam: "Polyson Sox", awayTeam: "Markham Knights", location: "Mintleaf", homeScore: 20, awayScore: 7 },
  { id: 53, date: "2025-06-12", time: "8:00 PM", homeTeam: "The Classics", awayTeam: "S & H Raiders", location: "Centennial North", homeScore: 15, awayScore: 17 },
  { id: 54, date: "2025-06-12", time: "8:00 PM", homeTeam: "Irish Holdings TNT Shamrocks", awayTeam: "Ace Pools Moose", location: "Mintleaf", homeScore: 16, awayScore: 16 },
  { id: 55, date: "2025-06-12", time: "9:30 PM", homeTeam: "DC Chiropractic Nads", awayTeam: "McCalmont Financial Beavers", location: "Centennial North", homeScore: 13, awayScore: 19 },
  { id: 56, date: "2025-06-12", time: "9:30 PM", homeTeam: "Red Hot Dawgs", awayTeam: "The Condo Kings Army", location: "Mintleaf", homeScore: 13, awayScore: 5 },
  { id: 57, date: "2025-06-17", time: "6:30 PM", homeTeam: "Irish Holdings TNT Shamrocks", awayTeam: "Pilkey Glass Pirates", location: "Centennial North", homeScore: 14, awayScore: 11 },
  { id: 58, date: "2025-06-17", time: "6:30 PM", homeTeam: "OK Braves", awayTeam: "The Classics", location: "Mintleaf", homeScore: 11, awayScore: 19 },
  { id: 59, date: "2025-06-17", time: "8:00 PM", homeTeam: "The Condo Kings Army", awayTeam: "Markham Knights", location: "Centennial North", homeScore: 26, awayScore: 21 },
  { id: 60, date: "2025-06-17", time: "8:00 PM", homeTeam: "Red Hot Dawgs", awayTeam: "Derek Houghton Century 21", location: "Mintleaf", homeScore: 9, awayScore: 21 },
  { id: 61, date: "2025-06-17", time: "9:30 PM", homeTeam: "McCalmont Financial Beavers", awayTeam: "S & H Raiders", location: "Centennial North", homeScore: 11, awayScore: 12 },
  { id: 62, date: "2025-06-17", time: "9:30 PM", homeTeam: "DC Chiropractic Nads", awayTeam: "Polyson Sox", location: "Mintleaf", homeScore: 16, awayScore: 25 },
  { id: 63, date: "2025-06-19", time: "6:30 PM", homeTeam: "Irish Holdings TNT Shamrocks", awayTeam: "McCalmont Financial Beavers", location: "Centennial North", homeScore: 20, awayScore: 21 },
  { id: 64, date: "2025-06-19", time: "6:30 PM", homeTeam: "Markham Goodyear Rangers", awayTeam: "Ace Pools Moose", location: "Mintleaf", homeScore: 25, awayScore: 26 },
  { id: 65, date: "2025-06-19", time: "8:00 PM", homeTeam: "OK Braves", awayTeam: "Polyson Sox", location: "Centennial North", homeScore: 0, awayScore: 1 },
  { id: 66, date: "2025-06-19", time: "8:00 PM", homeTeam: "Derek Houghton Century 21", awayTeam: "S & H Raiders", location: "Mintleaf", homeScore: 21, awayScore: 14 },
  { id: 67, date: "2025-06-19", time: "9:30 PM", homeTeam: "The Classics", awayTeam: "Red Hot Dawgs", location: "Centennial North", homeScore: 8, awayScore: 14 },
  { id: 68, date: "2025-06-19", time: "9:30 PM", homeTeam: "Markham Knights", awayTeam: "Pilkey Glass Pirates", location: "Mintleaf", homeScore: 25, awayScore: 13 },
  { id: 69, date: "2025-06-22", time: "5:00 PM", homeTeam: "Polyson Sox", awayTeam: "Ace Pools Moose", location: "Mintleaf", homeScore: 26, awayScore: 11 },
  { id: 70, date: "2025-06-22", time: "6:30 PM", homeTeam: "DC Chiropractic Nads", awayTeam: "Red Hot Dawgs", location: "Mintleaf", homeScore: 22, awayScore: 17 },
  { id: 71, date: "2025-06-22", time: "8:00 PM", homeTeam: "The Condo Kings Army", awayTeam: "McCalmont Financial Beavers", location: "Mintleaf", homeScore: 15, awayScore: 20 },
  { id: 72, date: "2025-06-22", time: "9:30 PM", homeTeam: "Pilkey Glass Pirates", awayTeam: "Markham Knights", location: "Mintleaf", homeScore: 14, awayScore: 20 },
  { id: 73, date: "2025-06-24", time: "6:30 PM", homeTeam: "Polyson Sox", awayTeam: "Pilkey Glass Pirates", location: "Centennial North", homeScore: 14, awayScore: 11 },
  { id: 74, date: "2025-06-24", time: "6:30 PM", homeTeam: "The Classics", awayTeam: "Derek Houghton Century 21", location: "Mintleaf", homeScore: 11, awayScore: 14 },
  { id: 75, date: "2025-06-24", time: "8:00 PM", homeTeam: "Red Hot Dawgs", awayTeam: "Markham Goodyear Rangers", location: "Centennial North", homeScore: 16, awayScore: 14 },
  { id: 76, date: "2025-06-24", time: "8:00 PM", homeTeam: "OK Braves", awayTeam: "S & H Raiders", location: "Mintleaf", homeScore: 26, awayScore: 1 },
  { id: 77, date: "2025-06-24", time: "9:30 PM", homeTeam: "DC Chiropractic Nads", awayTeam: "Ace Pools Moose", location: "Centennial North", homeScore: 12, awayScore: 33 },
  { id: 78, date: "2025-06-24", time: "9:30 PM", homeTeam: "Irish Holdings TNT Shamrocks", awayTeam: "Markham Knights", location: "Mintleaf", homeScore: 18, awayScore: 17 },
  { id: 79, date: "2025-06-26", time: "6:30 PM", homeTeam: "S & H Raiders", awayTeam: "Derek Houghton Century 21", location: "Centennial North", homeScore: 7, awayScore: 16 },
  { id: 80, date: "2025-06-26", time: "6:30 PM", homeTeam: "Ace Pools Moose", awayTeam: "Polyson Sox", location: "Mintleaf", homeScore: 5, awayScore: 13 },
  { id: 81, date: "2025-06-26", time: "8:00 PM", homeTeam: "McCalmont Financial Beavers", awayTeam: "Irish Holdings TNT Shamrocks", location: "Centennial North", homeScore: 8, awayScore: 21 },
  { id: 82, date: "2025-06-26", time: "8:00 PM", homeTeam: "Markham Goodyear Rangers", awayTeam: "The Classics", location: "Mintleaf", homeScore: 21, awayScore: 20 },
  { id: 83, date: "2025-06-26", time: "9:30 PM", homeTeam: "OK Braves", awayTeam: "The Condo Kings Army", location: "Centennial North", homeScore: 14, awayScore: 15 },
  { id: 84, date: "2025-06-26", time: "9:30 PM", homeTeam: "Red Hot Dawgs", awayTeam: "DC Chiropractic Nads", location: "Mintleaf", homeScore: 10, awayScore: 14 },
  { id: 85, date: "2025-07-03", time: "6:30 PM", homeTeam: "Red Hot Dawgs", awayTeam: "Irish Holdings TNT Shamrocks", location: "Centennial North", homeScore: 10, awayScore: 20 },
  { id: 86, date: "2025-07-03", time: "6:30 PM", homeTeam: "S & H Raiders", awayTeam: "Pilkey Glass Pirates", location: "Mintleaf", homeScore: 14, awayScore: 15 },
  { id: 87, date: "2025-07-03", time: "8:00 PM", homeTeam: "Markham Goodyear Rangers", awayTeam: "Derek Houghton Century 21", location: "Centennial North", homeScore: 21, awayScore: 22 },
  { id: 88, date: "2025-07-03", time: "8:00 PM", homeTeam: "Markham Knights", awayTeam: "Ace Pools Moose", location: "Mintleaf", homeScore: 9, awayScore: 19 },
  { id: 89, date: "2025-07-03", time: "9:30 PM", homeTeam: "The Condo Kings Army", awayTeam: "The Classics", location: "Centennial North", homeScore: 20, awayScore: 8 },
  { id: 90, date: "2025-07-03", time: "9:30 PM", homeTeam: "Polyson Sox", awayTeam: "McCalmont Financial Beavers", location: "Mintleaf", homeScore: 33, awayScore: 16 },
  { id: 91, date: "2025-07-08", time: "6:30 PM", homeTeam: "Ace Pools Moose", awayTeam: "Derek Houghton Century 21", location: "Centennial North", homeScore: 14, awayScore: 14 },
  { id: 92, date: "2025-07-08", time: "6:30 PM", homeTeam: "Markham Knights", awayTeam: "Red Hot Dawgs", location: "Mintleaf", homeScore: 11, awayScore: 18 },
  { id: 93, date: "2025-07-08", time: "8:00 PM", homeTeam: "DC Chiropractic Nads", awayTeam: "The Condo Kings Army", location: "Centennial North", homeScore: 17, awayScore: 16 },
  { id: 94, date: "2025-07-08", time: "8:00 PM", homeTeam: "Pilkey Glass Pirates", awayTeam: "The Classics", location: "Mintleaf", homeScore: 23, awayScore: 13 },
  { id: 95, date: "2025-07-08", time: "9:30 PM", homeTeam: "OK Braves", awayTeam: "McCalmont Financial Beavers", location: "Centennial North", homeScore: 9, awayScore: 19 },
  { id: 96, date: "2025-07-08", time: "9:30 PM", homeTeam: "Irish Holdings TNT Shamrocks", awayTeam: "Polyson Sox", location: "Mintleaf", homeScore: 10, awayScore: 21 },
  { id: 97, date: "2025-07-10", time: "6:30 PM", homeTeam: "Derek Houghton Century 21", awayTeam: "Markham Knights", location: "Centennial North", homeScore: 17, awayScore: 9 },
  { id: 98, date: "2025-07-10", time: "6:30 PM", homeTeam: "Polyson Sox", awayTeam: "S & H Raiders", location: "Mintleaf", homeScore: 20, awayScore: 8 },
  { id: 99, date: "2025-07-10", time: "8:00 PM", homeTeam: "The Classics", awayTeam: "Ace Pools Moose", location: "Centennial North", homeScore: 10, awayScore: 28 },
  { id: 100, date: "2025-07-10", time: "8:00 PM", homeTeam: "Pilkey Glass Pirates", awayTeam: "Red Hot Dawgs", location: "Mintleaf", homeScore: 11, awayScore: 12 },
  { id: 101, date: "2025-07-10", time: "9:30 PM", homeTeam: "Irish Holdings TNT Shamrocks", awayTeam: "Markham Goodyear Rangers", location: "Centennial North", homeScore: 14, awayScore: 15 },
  { id: 102, date: "2025-07-10", time: "9:30 PM", homeTeam: "McCalmont Financial Beavers", awayTeam: "OK Braves", location: "Mintleaf", homeScore: 11, awayScore: 20 },
  { id: 103, date: "2025-07-15", time: "6:30 PM", homeTeam: "DC Chiropractic Nads", awayTeam: "OK Braves", location: "Centennial North", homeScore: 17, awayScore: 4 },
  { id: 104, date: "2025-07-15", time: "6:30 PM", homeTeam: "Markham Goodyear Rangers", awayTeam: "McCalmont Financial Beavers", location: "Mintleaf", homeScore: 17, awayScore: 11 },
  { id: 105, date: "2025-07-15", time: "8:00 PM", homeTeam: "S & H Raiders", awayTeam: "Red Hot Dawgs", location: "Centennial North", homeScore: 9, awayScore: 22 },
  { id: 106, date: "2025-07-15", time: "8:00 PM", homeTeam: "Pilkey Glass Pirates", awayTeam: "Derek Houghton Century 21", location: "Mintleaf", homeScore: 17, awayScore: 18 },
  { id: 107, date: "2025-07-15", time: "9:30 PM", homeTeam: "Markham Knights", awayTeam: "Polyson Sox", location: "Centennial North", homeScore: 30, awayScore: 19 },
  { id: 108, date: "2025-07-15", time: "9:30 PM", homeTeam: "Ace Pools Moose", awayTeam: "The Condo Kings Army", location: "Mintleaf", homeScore: 18, awayScore: 19 },
  { id: 109, date: "2025-07-17", time: "6:30 PM", homeTeam: "Ace Pools Moose", awayTeam: "Irish Holdings TNT Shamrocks", location: "Centennial North", homeScore: 20, awayScore: 19 },
  { id: 110, date: "2025-07-17", time: "6:30 PM", homeTeam: "McCalmont Financial Beavers", awayTeam: "DC Chiropractic Nads", location: "Mintleaf", homeScore: 2, awayScore: 7 },
  { id: 111, date: "2025-07-17", time: "8:00 PM", homeTeam: "Markham Knights", awayTeam: "Markham Goodyear Rangers", location: "Centennial North", homeScore: 6, awayScore: 20 },
  { id: 112, date: "2025-07-17", time: "8:00 PM", homeTeam: "The Condo Kings Army", awayTeam: "Red Hot Dawgs", location: "Mintleaf", homeScore: 1, awayScore: 20 },
  { id: 113, date: "2025-07-17", time: "9:30 PM", homeTeam: "S & H Raiders", awayTeam: "The Classics", location: "Centennial North", homeScore: 17, awayScore: 18 },
  { id: 114, date: "2025-07-17", time: "9:30 PM", homeTeam: "OK Braves", awayTeam: "Pilkey Glass Pirates", location: "Mintleaf", homeScore: 17, awayScore: 13 },
  { id: 115, date: "2025-07-22", time: "6:30 PM", homeTeam: "Red Hot Dawgs", awayTeam: "The Classics", location: "Centennial North", homeScore: 0, awayScore: 7 },
  { id: 116, date: "2025-07-22", time: "6:30 PM", homeTeam: "DC Chiropractic Nads", awayTeam: "Irish Holdings TNT Shamrocks", location: "Mintleaf", homeScore: 12, awayScore: 24 },
  { id: 117, date: "2025-07-22", time: "8:00 PM", homeTeam: "Polyson Sox", awayTeam: "The Condo Kings Army", location: "Centennial North", homeScore: 22, awayScore: 6 },
  { id: 118, date: "2025-07-22", time: "8:00 PM", homeTeam: "Derek Houghton Century 21", awayTeam: "McCalmont Financial Beavers", location: "Mintleaf", homeScore: 19, awayScore: 10 },
  { id: 119, date: "2025-07-22", time: "9:30 PM", homeTeam: "OK Braves", awayTeam: "Markham Goodyear Rangers", location: "Centennial North", homeScore: 16, awayScore: 17 },
  { id: 120, date: "2025-07-22", time: "9:30 PM", homeTeam: "S & H Raiders", awayTeam: "Ace Pools Moose", location: "Mintleaf", homeScore: 14, awayScore: 25 },
  { id: 121, date: "2025-07-29", time: "6:30 PM", homeTeam: "Pilkey Glass Pirates", awayTeam: "Ace Pools Moose", location: "Centennial North", homeScore: 15, awayScore: 15 },
  { id: 122, date: "2025-07-29", time: "6:30 PM", homeTeam: "Polyson Sox", awayTeam: "Derek Houghton Century 21", location: "Mintleaf", homeScore: 8, awayScore: 23 },
  { id: 123, date: "2025-07-29", time: "8:00 PM", homeTeam: "OK Braves", awayTeam: "Red Hot Dawgs", location: "Centennial North", homeScore: 4, awayScore: 16 },
  { id: 124, date: "2025-07-29", time: "8:00 PM", homeTeam: "Irish Holdings TNT Shamrocks", awayTeam: "The Condo Kings Army", location: "Mintleaf", homeScore: 14, awayScore: 14 },
  { id: 125, date: "2025-07-29", time: "9:30 PM", homeTeam: "Markham Knights", awayTeam: "DC Chiropractic Nads", location: "Centennial North", homeScore: 16, awayScore: 14 },
  { id: 126, date: "2025-07-29", time: "9:30 PM", homeTeam: "Markham Goodyear Rangers", awayTeam: "S & H Raiders", location: "Mintleaf", homeScore: 23, awayScore: 8 },
  { id: 127, date: "2025-07-31", time: "6:30 PM", homeTeam: "Markham Knights", awayTeam: "S & H Raiders", location: "Centennial North", homeScore: 17, awayScore: 12 },
  { id: 128, date: "2025-07-31", time: "6:30 PM", homeTeam: "McCalmont Financial Beavers", awayTeam: "The Classics", location: "Mintleaf", homeScore: 15, awayScore: 19 },
  { id: 129, date: "2025-07-31", time: "8:00 PM", homeTeam: "Pilkey Glass Pirates", awayTeam: "DC Chiropractic Nads", location: "Centennial North", homeScore: 25, awayScore: 6 },
  { id: 130, date: "2025-07-31", time: "8:00 PM", homeTeam: "Polyson Sox", awayTeam: "Markham Goodyear Rangers", location: "Mintleaf", homeScore: 22, awayScore: 23 },
  { id: 131, date: "2025-07-31", time: "9:30 PM", homeTeam: "The Condo Kings Army", awayTeam: "Derek Houghton Century 21", location: "Centennial North", homeScore: 3, awayScore: 11 },
  { id: 132, date: "2025-07-31", time: "9:30 PM", homeTeam: "Ace Pools Moose", awayTeam: "Irish Holdings TNT Shamrocks", location: "Mintleaf", homeScore: 23, awayScore: 30 },
  { id: 133, date: "2025-08-05", time: "6:30 PM", homeTeam: "Pilkey Glass Pirates", awayTeam: "Polyson Sox", location: "Centennial North", homeScore: 13, awayScore: 20 },
  { id: 134, date: "2025-08-05", time: "6:30 PM", homeTeam: "DC Chiropractic Nads", awayTeam: "The Classics", location: "Mintleaf", homeScore: 8, awayScore: 28 },
  { id: 135, date: "2025-08-05", time: "8:00 PM", homeTeam: "Ace Pools Moose", awayTeam: "Markham Knights", location: "Centennial North", homeScore: 0, awayScore: 7 },
  { id: 136, date: "2025-08-05", time: "8:00 PM", homeTeam: "Irish Holdings TNT Shamrocks", awayTeam: "OK Braves", location: "Mintleaf", homeScore: 20, awayScore: 10 },
  { id: 137, date: "2025-08-05", time: "9:30 PM", homeTeam: "Markham Goodyear Rangers", awayTeam: "Derek Houghton Century 21", location: "Centennial North", homeScore: 6, awayScore: 25 },
  { id: 138, date: "2025-08-05", time: "9:30 PM", homeTeam: "McCalmont Financial Beavers", awayTeam: "The Condo Kings Army", location: "Mintleaf", homeScore: 13, awayScore: 10 },
  { id: 139, date: "2025-08-07", time: "6:30 PM", homeTeam: "S & H Raiders", awayTeam: "OK Braves", location: "Centennial North", homeScore: 14, awayScore: 28 },
  { id: 140, date: "2025-08-07", time: "6:30 PM", homeTeam: "Markham Knights", awayTeam: "Irish Holdings TNT Shamrocks", location: "Mintleaf", homeScore: 14, awayScore: 25 },
  { id: 141, date: "2025-08-07", time: "8:00 PM", homeTeam: "Red Hot Dawgs", awayTeam: "Polyson Sox", location: "Centennial North", homeScore: 2, awayScore: 17 },
  { id: 142, date: "2025-08-07", time: "8:00 PM", homeTeam: "Derek Houghton Century 21", awayTeam: "The Classics", location: "Mintleaf", homeScore: 33, awayScore: 23 },
  { id: 143, date: "2025-08-07", time: "9:30 PM", homeTeam: "Pilkey Glass Pirates", awayTeam: "Markham Goodyear Rangers", location: "Centennial North", homeScore: 14, awayScore: 29 },
  { id: 144, date: "2025-08-07", time: "9:30 PM", homeTeam: "McCalmont Financial Beavers", awayTeam: "Ace Pools Moose", location: "Mintleaf", homeScore: 25, awayScore: 11 },
  { id: 145, date: "2025-08-12", time: "6:30 PM", homeTeam: "Red Hot Dawgs", awayTeam: "Markham Knights", location: "Centennial North", homeScore: 14, awayScore: 11 },
  { id: 146, date: "2025-08-12", time: "6:30 PM", homeTeam: "DC Chiropractic Nads", awayTeam: "Derek Houghton Century 21", location: "Mintleaf", homeScore: 5, awayScore: 23 },
  { id: 147, date: "2025-08-12", time: "8:00 PM", homeTeam: "Polyson Sox", awayTeam: "OK Braves", location: "Centennial North", homeScore: 19, awayScore: 9 },
  { id: 148, date: "2025-08-12", time: "8:00 PM", homeTeam: "The Condo Kings Army", awayTeam: "S & H Raiders", location: "Mintleaf", homeScore: 18, awayScore: 22 },
  { id: 149, date: "2025-08-12", time: "9:30 PM", homeTeam: "McCalmont Financial Beavers", awayTeam: "Pilkey Glass Pirates", location: "Centennial North", homeScore: 26, awayScore: 17 },
  { id: 150, date: "2025-08-12", time: "9:30 PM", homeTeam: "Irish Holdings TNT Shamrocks", awayTeam: "The Classics", location: "Mintleaf", homeScore: 9, awayScore: 10 },
  { id: 151, date: "2025-08-14", time: "6:30 PM", homeTeam: "Red Hot Dawgs", awayTeam: "Ace Pools Moose", location: "Centennial North", homeScore: 9, awayScore: 15 },
  { id: 152, date: "2025-08-14", time: "6:30 PM", homeTeam: "The Condo Kings Army", awayTeam: "Markham Goodyear Rangers", location: "Mintleaf", homeScore: 21, awayScore: 18 },
  { id: 153, date: "2025-08-14", time: "8:00 PM", homeTeam: "S & H Raiders", awayTeam: "DC Chiropractic Nads", location: "Centennial North", homeScore: 16, awayScore: 13 },
  { id: 154, date: "2025-08-14", time: "8:00 PM", homeTeam: "McCalmont Financial Beavers", awayTeam: "Markham Knights", location: "Mintleaf", homeScore: 12, awayScore: 13 },
  { id: 155, date: "2025-08-14", time: "9:30 PM", homeTeam: "Irish Holdings TNT Shamrocks", awayTeam: "Derek Houghton Century 21", location: "Centennial North", homeScore: 12, awayScore: 10 },
  { id: 156, date: "2025-08-14", time: "9:30 PM", homeTeam: "The Classics", awayTeam: "Polyson Sox", location: "Mintleaf", homeScore: 13, awayScore: 17 },
  { id: 157, date: "2025-08-19", time: "6:30 PM", homeTeam: "McCalmont Financial Beavers", awayTeam: "Markham Goodyear Rangers", location: "Centennial North", homeScore: 18, awayScore: 16 },
  { id: 158, date: "2025-08-19", time: "6:30 PM", homeTeam: "The Condo Kings Army", awayTeam: "Ace Pools Moose", location: "Mintleaf", homeScore: 7, awayScore: 0 },
  { id: 159, date: "2025-08-19", time: "8:00 PM", homeTeam: "The Classics", awayTeam: "Pilkey Glass Pirates", location: "Centennial North", homeScore: 0, awayScore: 0 },
  { id: 160, date: "2025-08-19", time: "8:00 PM", homeTeam: "DC Chiropractic Nads", awayTeam: "Markham Knights", location: "Mintleaf", homeScore: 19, awayScore: 17 },
  { id: 161, date: "2025-08-19", time: "9:30 PM", homeTeam: "Red Hot Dawgs", awayTeam: "S & H Raiders", location: "Centennial North", homeScore: 0, awayScore: 0 },
  { id: 162, date: "2025-08-19", time: "9:30 PM", homeTeam: "OK Braves", awayTeam: "Derek Houghton Century 21", location: "Mintleaf", homeScore: 0, awayScore: 7 },
  { id: 163, date: "2025-08-21", time: "6:30 PM", homeTeam: "Polyson Sox", awayTeam: "Irish Holdings TNT Shamrocks", location: "Centennial North", homeScore: 19, awayScore: 15 },
  { id: 164, date: "2025-08-21", time: "6:30 PM", homeTeam: "Markham Goodyear Rangers", awayTeam: "Pilkey Glass Pirates", location: "Mintleaf", homeScore: 27, awayScore: 20 },
  { id: 165, date: "2025-08-21", time: "8:00 PM", homeTeam: "Ace Pools Moose", awayTeam: "McCalmont Financial Beavers", location: "Centennial North", homeScore: 26, awayScore: 18 },
  { id: 166, date: "2025-08-21", time: "8:00 PM", homeTeam: "S & H Raiders", awayTeam: "The Condo Kings Army", location: "Mintleaf", homeScore: 17, awayScore: 17 },
  { id: 167, date: "2025-08-21", time: "9:30 PM", homeTeam: "OK Braves", awayTeam: "Markham Knights", location: "Centennial North", homeScore: 14, awayScore: 22 },
  { id: 168, date: "2025-08-21", time: "9:30 PM", homeTeam: "Derek Houghton Century 21", awayTeam: "DC Chiropractic Nads", location: "Mintleaf", homeScore: 26, awayScore: 14 },
  { id: 169, date: "2025-08-26", time: "6:30 PM", homeTeam: "The Classics", awayTeam: "Irish Holdings TNT Shamrocks", location: "Centennial North", homeScore: 8, awayScore: 13 },
  { id: 170, date: "2025-08-26", time: "6:30 PM", homeTeam: "The Condo Kings Army", awayTeam: "OK Braves", location: "Mintleaf", homeScore: 16, awayScore: 14 },
  { id: 171, date: "2025-08-26", time: "8:00 PM", homeTeam: "S & H Raiders", awayTeam: "Pilkey Glass Pirates", location: "Centennial North", homeScore: 10, awayScore: 16 },
  { id: 172, date: "2025-08-26", time: "8:00 PM", homeTeam: "Markham Knights", awayTeam: "Ace Pools Moose", location: "Mintleaf", homeScore: 18, awayScore: 28 },
  { id: 173, date: "2025-08-26", time: "9:30 PM", homeTeam: "McCalmont Financial Beavers", awayTeam: "Polyson Sox", location: "Centennial North", homeScore: 10, awayScore: 25 },
  { id: 174, date: "2025-08-26", time: "9:30 PM", homeTeam: "Derek Houghton Century 21", awayTeam: "Markham Goodyear Rangers", location: "Mintleaf", homeScore: 22, awayScore: 9 },
  { id: 175, date: "2025-08-28", time: "6:30 PM", homeTeam: "The Classics", awayTeam: "The Condo Kings Army", location: "Centennial North", homeScore: 19, awayScore: 20 },
  { id: 176, date: "2025-08-28", time: "6:30 PM", homeTeam: "Irish Holdings TNT Shamrocks", awayTeam: "Red Hot Dawgs", location: "Mintleaf", homeScore: 10, awayScore: 15 },
  { id: 177, date: "2025-08-28", time: "8:00 PM", homeTeam: "Ace Pools Moose", awayTeam: "DC Chiropractic Nads", location: "Centennial North", homeScore: 30, awayScore: 12 },
  { id: 178, date: "2025-08-28", time: "8:00 PM", homeTeam: "Pilkey Glass Pirates", awayTeam: "OK Braves", location: "Mintleaf", homeScore: 16, awayScore: 28 },
  { id: 179, date: "2025-08-28", time: "9:30 PM", homeTeam: "Markham Goodyear Rangers", awayTeam: "S & H Raiders", location: "Centennial North", homeScore: 26, awayScore: 19 },
  { id: 180, date: "2025-08-28", time: "9:30 PM", homeTeam: "Markham Knights", awayTeam: "Polyson Sox", location: "Mintleaf", homeScore: 15, awayScore: 20 },
  { id: 181, date: "2025-09-02", time: "6:30 PM", homeTeam: "Ace Pools Moose", awayTeam: "Markham Goodyear Rangers", location: "Centennial North", homeScore: 25, awayScore: 25 },
  { id: 182, date: "2025-09-02", time: "6:30 PM", homeTeam: "Red Hot Dawgs", awayTeam: "Polyson Sox", location: "Mintleaf", homeScore: 12, awayScore: 15 },
  { id: 183, date: "2025-09-02", time: "8:00 PM", homeTeam: "OK Braves", awayTeam: "Irish Holdings TNT Shamrocks", location: "Centennial North", homeScore: 8, awayScore: 22 },
  { id: 184, date: "2025-09-02", time: "8:00 PM", homeTeam: "McCalmont Financial Beavers", awayTeam: "Markham Knights", location: "Mintleaf", homeScore: 16, awayScore: 17 },
  { id: 185, date: "2025-09-02", time: "9:30 PM", homeTeam: "Derek Houghton Century 21", awayTeam: "Pilkey Glass Pirates", location: "Centennial North", homeScore: 22, awayScore: 10 },
  { id: 186, date: "2025-09-02", time: "9:30 PM", homeTeam: "The Classics", awayTeam: "DC Chiropractic Nads", location: "Mintleaf", homeScore: 15, awayScore: 20 },
  { id: 187, date: "2025-09-04", time: "6:30 PM", homeTeam: "Derek Houghton Century 21", awayTeam: "Polyson Sox", location: "Centennial North", homeScore: 14, awayScore: 9 },
  { id: 188, date: "2025-09-04", time: "6:30 PM", homeTeam: "S & H Raiders", awayTeam: "The Classics", location: "Mintleaf", homeScore: 22, awayScore: 12 },
  { id: 189, date: "2025-09-04", time: "8:00 PM", homeTeam: "DC Chiropractic Nads", awayTeam: "McCalmont Financial Beavers", location: "Centennial North", homeScore: 25, awayScore: 13 },
  { id: 190, date: "2025-09-04", time: "8:00 PM", homeTeam: "Markham Goodyear Rangers", awayTeam: "OK Braves", location: "Mintleaf", homeScore: 22, awayScore: 21 },
  { id: 191, date: "2025-09-04", time: "9:30 PM", homeTeam: "Pilkey Glass Pirates", awayTeam: "Irish Holdings TNT Shamrocks", location: "Centennial North", homeScore: 5, awayScore: 16 },
  { id: 192, date: "2025-09-04", time: "9:30 PM", homeTeam: "Red Hot Dawgs", awayTeam: "The Condo Kings Army", location: "Mintleaf", homeScore: 15, awayScore: 16 },
  { id: 193, date: "2025-09-09", time: "6:30 PM", homeTeam: "OK Braves", awayTeam: "The Classics", location: "Centennial North", homeScore: 9, awayScore: 15 },
  { id: 194, date: "2025-09-09", time: "6:30 PM", homeTeam: "McCalmont Financial Beavers", awayTeam: "S & H Raiders", location: "Mintleaf", homeScore: 17, awayScore: 20 },
  { id: 195, date: "2025-09-09", time: "8:00 PM", homeTeam: "Derek Houghton Century 21", awayTeam: "Red Hot Dawgs", location: "Centennial North", homeScore: 15, awayScore: 16 },
  { id: 196, date: "2025-09-09", time: "8:00 PM", homeTeam: "Polyson Sox", awayTeam: "DC Chiropractic Nads", location: "Mintleaf", homeScore: 25, awayScore: 16 },
  { id: 197, date: "2025-09-09", time: "9:30 PM", homeTeam: "Markham Knights", awayTeam: "The Condo Kings Army", location: "Centennial North", homeScore: 16, awayScore: 16 },
  { id: 198, date: "2025-09-09", time: "9:30 PM", homeTeam: "Pilkey Glass Pirates", awayTeam: "Irish Holdings TNT Shamrocks", location: "Mintleaf", homeScore: 11, awayScore: 21 },
  { id: 199, date: "2025-05-22", time: "6:30 PM", homeTeam: "The Condo Kings Army", awayTeam: "Derek Houghton Century 21", location: "Centennial North", homeScore: 0, awayScore: 0 },
  { id: 200, date: "2025-05-22", time: "6:30 PM", homeTeam: "Markham Goodyear Rangers", awayTeam: "Polyson Sox", location: "Mintleaf", homeScore: 0, awayScore: 0 },
  { id: 201, date: "2025-05-22", time: "8:00 PM", homeTeam: "Ace Pools Moose", awayTeam: "Red Hot Dawgs", location: "Centennial North", homeScore: 0, awayScore: 0 },
  { id: 202, date: "2025-05-22", time: "8:00 PM", homeTeam: "Pilkey Glass Pirates", awayTeam: "McCalmont Financial Beavers", location: "Mintleaf", homeScore: 0, awayScore: 0 },
  { id: 203, date: "2025-05-22", time: "9:30 PM", homeTeam: "S & H Raiders", awayTeam: "Markham Knights", location: "Centennial North", homeScore: 0, awayScore: 0 },
  { id: 204, date: "2025-05-22", time: "9:30 PM", homeTeam: "Irish Holdings TNT Shamrocks", awayTeam: "DC Chiropractic Nads", location: "Mintleaf", homeScore: 0, awayScore: 0 },
  { id: 205, date: "2025-09-06", time: "6:30 PM", homeTeam: "Markham Goodyear Rangers", awayTeam: "Irish Holdings TNT Shamrocks", location: "Centennial North", homeScore: 0, awayScore: 0 },
  { id: 206, date: "2025-09-06", time: "6:30 PM", homeTeam: "Ace Pools Moose", awayTeam: "Red Hot Dawgs", location: "Mintleaf", homeScore: 0, awayScore: 0 },
  { id: 207, date: "2025-09-06", time: "8:00 PM", homeTeam: "The Condo Kings Army", awayTeam: "McCalmont Financial Beavers", location: "Centennial North", homeScore: 0, awayScore: 0 },
  { id: 208, date: "2025-09-06", time: "8:00 PM", homeTeam: "S & H Raiders", awayTeam: "Pilkey Glass Pirates", location: "Mintleaf", homeScore: 0, awayScore: 0 },
  { id: 209, date: "2025-09-06", time: "9:30 PM", homeTeam: "The Classics", awayTeam: "Markham Knights", location: "Centennial North", homeScore: 0, awayScore: 0 },
  { id: 210, date: "2025-09-06", time: "9:30 PM", homeTeam: "DC Chiropractic Nads", awayTeam: "OK Braves", location: "Mintleaf", homeScore: 0, awayScore: 0 },
];

// seed_data.py — NEWS_ARTICLES
const NEWS_ARTICLES = [
  {
    id: "1",
    title: "2025 McGregor Tournament Champions",
    date: "2025-09-14",
    category: "Tournament",
    excerpt: "Congratulations to Derek Houghton Century 21 on winning the Triple Crown Tournament!",
    image: "https://www.mmspl.ca/res/img/2025-mcgregor-champions.jpg",
    content:
      "Congratulations to our 'Triple Crown' Tournament Champions, Derek Houghton Century 21! The team showed exceptional skill and determination throughout the tournament.",
  },
  {
    id: "2",
    title: "Nick Stewart Named Tournament MVP",
    date: "2025-09-14",
    category: "Awards",
    excerpt: "Congratulations to McGregor Tournament MVP, Nick Stewart!",
    image: "https://www.mmspl.ca/res/img/2025-mcgregor-mvp.jpg",
    content: "Nick Stewart has been awarded the Richard Kirkby Memorial Trophy as the 2025 McGregor Tournament MVP.",
  },
  {
    id: "3",
    title: "2025 AGM Motions Results",
    date: "2025-03-15",
    category: "League News",
    excerpt: "Review the results of all AGM motions voted on at the 2025 Annual General Meeting.",
    image: "",
    content:
      "Five motions were voted on at the 2025 AGM. Motion 2 (Board for Home Plate) and Motion 3 (Bases with Pegs) were passed, while Motions 1, 4, and 5 failed.",
  },
];

// seed_awards.py — AWARD_CATEGORIES
const AWARD_CATEGORIES = [
  {
    id: "jim-mcgregor",
    name: "Jim McGregor Trophy",
    description: "Year-End Tournament Champions",
    isTeamAward: true,
    entries: [
      { year: 2025, winner: "Derek Houghton Century 21" }, { year: 2024, winner: "Golf19 Goodyear Rangers" },
      { year: 2023, winner: "Golf19 Goodyear Rangers" }, { year: 2022, winner: "Derek Houghton Century 21" },
      { year: 2021, winner: "Northtown Sox" }, { year: 2020, winner: "Not Awarded" },
      { year: 2019, winner: "Derek Houghton Century 21" }, { year: 2018, winner: "The Classics" },
      { year: 2017, winner: "Derek Houghton Century 21" }, { year: 2016, winner: "Derek Houghton Century 21" },
      { year: 2015, winner: "Northtown Sox" }, { year: 2014, winner: "The Classics" },
      { year: 2013, winner: "Northtown Sox" }, { year: 2012, winner: "Pilkey Glass Pirates" },
      { year: 2011, winner: "Northtown Sox" }, { year: 2010, winner: "EM Automotive Sox" },
      { year: 2009, winner: "Red Hot Dawgs" }, { year: 2008, winner: "Red Hot Dawgs" },
      { year: 2007, winner: "Markham Knights" }, { year: 2006, winner: "Remax Crush" },
      { year: 2005, winner: "EM Automotive Sox" }, { year: 2004, winner: "Markham Knights" },
      { year: 2003, winner: "Col. Mustards Athletics" }, { year: 2002, winner: "Col. Mustards Athletics" },
      { year: 2001, winner: "Fox & Fiddle" }, { year: 2000, winner: "Northtown Auto Centre" },
      { year: 1999, winner: "Col. Mustards Athletics" }, { year: 1998, winner: "Markham Chrysler" },
      { year: 1997, winner: "Buttonville Esso" }, { year: 1996, winner: "Markham Chrysler" },
      { year: 1995, winner: "Foremost Financial / Markham Vision" }, { year: 1993, winner: "Fenway's Braves" },
      { year: 1992, winner: "Fenway's Braves" }, { year: 1991, winner: "Lube 'N' Zoom" },
      { year: 1990, winner: "The Village Grocer" }, { year: 1989, winner: "Ethier Cribari" },
      { year: 1988, winner: "Toni Sullivan Remax" }, { year: 1987, winner: "Barry's Auto" },
      { year: 1986, winner: "Hogan Chev Olds" }, { year: 1985, winner: "Unionville Motors" },
      { year: 1984, winner: "Carson & Weeks" }, { year: 1983, winner: "Century 21 / Sylvia Houghton" },
      { year: 1982, winner: "Susan Moon" }, { year: 1981, winner: "North Sherwood Shell" },
      { year: 1980, winner: "North Sherwood" }, { year: 1979, winner: "Sherwood Green" },
      { year: 1978, winner: "Sherwood Green" }, { year: 1977, winner: "East Markham" },
      { year: 1976, winner: "Sherwood North" }, { year: 1975, winner: "Sherwood Green" },
      { year: 1974, winner: "East Markham" }, { year: 1973, winner: "Unionville Vets" },
      { year: 1972, winner: "Sherwood North" }, { year: 1971, winner: "Unionville" },
      { year: 1970, winner: "Unionville" }, { year: 1969, winner: "Sherwood Estates" },
    ],
  },
  {
    id: "presidents-trophy",
    name: "President's Trophy",
    description: "Regular Season Champions",
    isTeamAward: true,
    entries: [
      { year: 2025, winner: "Derek Houghton Century 21" }, { year: 2024, winner: "Golf19 Goodyear Rangers" },
      { year: 2023, winner: "Derek Houghton Century 21" }, { year: 2022, winner: "Pilkey Glass Pirates" },
      { year: 2021, winner: "The Duchess Beavers" }, { year: 2020, winner: "Not Awarded" },
      { year: 2019, winner: "Derek Houghton Century 21" }, { year: 2018, winner: "The Classics" },
      { year: 2017, winner: "Derek Houghton Century 21" }, { year: 2016, winner: "Markham Knights" },
      { year: 2015, winner: "S+H Raiders" }, { year: 2014, winner: "S+H Raiders" },
      { year: 2013, winner: "S+H Raiders" }, { year: 2012, winner: "Aviva Beavers" },
      { year: 2011, winner: "Red Hot Dawgs" }, { year: 2010, winner: "EM Automotive Sox" },
    ],
  },
  {
    id: "richard-kirkby",
    name: "Richard Kirkby Memorial Trophy",
    description: "Tournament MVP",
    isTeamAward: false,
    entries: [
      { year: 2025, winner: "Nick Stewart" }, { year: 2024, winner: "Tyler Chong" },
      { year: 2023, winner: "Tyler Chong" }, { year: 2022, winner: "Steve Cline" },
      { year: 2021, winner: "Alfred Georgi" }, { year: 2020, winner: "Not Awarded" },
      { year: 2019, winner: "Nick Stewart" }, { year: 2018, winner: "Jason Goldenberg" },
      { year: 2017, winner: "Derek Houghton" }, { year: 2016, winner: "Andrew Ming" },
      { year: 2015, winner: "Matt De Kuyper" }, { year: 2014, winner: "Paul Webb" },
      { year: 2013, winner: "Andrew Newell" }, { year: 2012, winner: "Craig Leach" },
      { year: 2011, winner: "J.R. Newell" }, { year: 2010, winner: "Dave Ross" },
      { year: 2009, winner: "Aidan Fitzpatrick" }, { year: 2008, winner: "Brian Kirlin" },
      { year: 2007, winner: "Gerry Franklin" }, { year: 2006, winner: "Jean-Yves Lamirande" },
      { year: 2005, winner: "Dave Wozniak" }, { year: 2004, winner: "Art Wood" },
      { year: 2003, winner: "Paul O'Leary" }, { year: 2002, winner: "Phil Morra" },
      { year: 2001, winner: "Randy Brown" }, { year: 2000, winner: "Dave Kelso" },
      { year: 1999, winner: "Phil Morra" }, { year: 1998, winner: "Mark Evans" },
    ],
  },
  {
    id: "kevan-macdonald",
    name: "Kevan MacDonald Cup",
    description: "Charity Tournament Champions",
    isTeamAward: true,
    entries: [
      { year: 2026, winner: "Ace Pools Moose" }, { year: 2025, winner: "Derek Houghton Century 21" },
      { year: 2024, winner: "Derek Houghton Century 21" }, { year: 2023, winner: "Derek Houghton Century 21" },
      { year: 2022, winner: "Derek Houghton Century 21" }, { year: 2021, winner: "Not Awarded" },
      { year: 2020, winner: "Not Awarded" }, { year: 2019, winner: "The Classics" },
      { year: 2018, winner: "Derek Houghton Century 21" }, { year: 2017, winner: "Derek Houghton Century 21" },
      { year: 2016, winner: "Ace Pools Moose" }, { year: 2015, winner: "Derek Houghton Century 21" },
      { year: 2014, winner: "S+H Raiders" }, { year: 2013, winner: "Col. Mustards Classics" },
      { year: 2012, winner: "The Red Hot Dawgs" }, { year: 2011, winner: "The Red Hot Dawgs" },
      { year: 2010, winner: "The Red Hot Dawgs" }, { year: 2009, winner: "Main's Mansion Rangers" },
      { year: 2008, winner: "The Rangers" }, { year: 2007, winner: "Sylvia Morris Century 21 Hitmen" },
      { year: 2006, winner: "Samco Machinery Pirates" }, { year: 2005, winner: "Derek Houghton Remax" },
    ],
  },
  {
    id: "rookie",
    name: "Rookie of the Year",
    description: "",
    isTeamAward: false,
    entries: [
      { year: 2025, winner: "Erik Brokelman" }, { year: 2024, winner: "Beto Cervantes" },
      { year: 2023, winner: "Tyler Chong" }, { year: 2022, winner: "Gregg Hewitt, Joe Costa" },
      { year: 2021, winner: "Not Awarded" }, { year: 2020, winner: "Not Awarded" },
      { year: 2019, winner: "Scott Jackson" }, { year: 2018, winner: "Ken Wang, Lenny Bushy" },
      { year: 2017, winner: "Andrew Thompson" }, { year: 2016, winner: "Ian U, Chris Mclean" },
      { year: 2015, winner: "Ping Zhang, Mike Maskery" }, { year: 2014, winner: "Nick Stewart" },
      { year: 2013, winner: "Rob Li, Brian MacDonald" }, { year: 2012, winner: "Warren Fisher" },
      { year: 2011, winner: "Jamie Ashmead" }, { year: 2010, winner: "Adam Kanaris" },
      { year: 2009, winner: "J.R. Newell, Johnny Pilatzke" },
    ],
  },
  {
    id: "service-award",
    name: "Service Award",
    description: "",
    isTeamAward: false,
    entries: [
      { year: 2025, winner: "Mark Parent" }, { year: 2024, winner: "Sean Bansavatar" },
      { year: 2023, winner: "Andrew Ming" }, { year: 2022, winner: "Jay McLean" },
      { year: 2021, winner: "Not Awarded" }, { year: 2020, winner: "Not Awarded" },
      { year: 2019, winner: "Sunil Vaidya" }, { year: 2018, winner: "Derek Houghton" },
      { year: 2017, winner: "Todd McLeish, Adam Kanaris" }, { year: 2016, winner: "John Bell" },
      { year: 2015, winner: "Peter McLarty" }, { year: 2014, winner: "Tony Williamson" },
      { year: 2013, winner: "Brian Kirlin" }, { year: 2012, winner: "The Condo Kings Army" },
      { year: 2011, winner: "Bob Routledge" }, { year: 2010, winner: "Kirby Kuindersma" },
      { year: 2009, winner: "Phil Morra" }, { year: 2008, winner: "Tom Higgins Sr., Jim Sale" },
      { year: 2007, winner: "Rudy Pitton" }, { year: 2006, winner: "John Egli" },
    ],
  },
  {
    id: "peter-mcclarty",
    name: "Peter McClarty Memorial Trophy",
    description: "Charity Tournament MVP",
    isTeamAward: false,
    entries: [
      { year: 2026, winner: "McCron" },
      { year: 2025, winner: "Nick Stewart" },
    ],
  },
];

// seed_important_dates.py — IMPORTANT_DATES_SEED
const IMPORTANT_DATES_SEED = [
  { title: "Regular Season Opens", date: "2026-05-12", type: "Season", notes: "First games of the 2026 season" },
  { title: "Kevan MacDonald Charity Tournament", date: "2026-05-28", type: "Tournament", notes: "May 28 – 31, 2026" },
  { title: "Regular Season Ends", date: "2026-09-15", type: "Season", notes: "Last regular season game day" },
  { title: "Jim McGregor Year-End Tournament", date: "2026-09-17", type: "Tournament", notes: "Year-End Championship Tournament" },
  { title: "2027 Registration Opens", date: "2026-10-01", type: "Registration", notes: "Registration for the 2027 season opens" },
  { title: "2027 Registration Fee Due", date: "2026-11-30", type: "Registration", notes: "Deadline for 2027 registration payment" },
  { title: "Annual General Meeting (AGM)", date: "2027-03-01", type: "Admin", notes: "Annual General Meeting — date TBD" },
  { title: "Captains Meeting", date: "2027-04-01", type: "Admin", notes: "Team captains meeting — date TBD" },
  { title: "2027 Player Evaluations", date: "2027-04-15", type: "Admin", notes: "New player evaluation day — date TBD" },
  { title: "2027 Regular Season Opens", date: "2027-05-11", type: "Season", notes: "First games of the 2027 season" },
];

// seed_gallery.py / seed_data.py — GALLERY_IMAGES (identical in both files)
const GALLERY_IMAGES = [
  { id: "g1", url: "https://www.mmspl.ca/res/img/2026-charity-champions.jpg", caption: "2026 Charity Tournament Champions — Ace Pools Moose", category: "Tournament", year: 2026 },
  { id: "g2", url: "https://www.mmspl.ca/res/img/2026-charity-mvp.jpg", caption: "2026 Peter McClarty Memorial Trophy — McCron (MVP)", category: "Awards", year: 2026 },
  { id: "g3", url: "https://www.mmspl.ca/res/img/2026-charity-finalists.jpg", caption: "2026 Charity Tournament Finalists — Beavers", category: "Tournament", year: 2026 },
  { id: "g4", url: "https://www.mmspl.ca/res/img/2025-mcgregor-champions.jpg", caption: "2025 McGregor Tournament Champions — Derek Houghton Century 21", category: "Tournament", year: 2025 },
  { id: "g5", url: "https://www.mmspl.ca/res/img/2025-mcgregor-mvp.jpg", caption: "2025 Richard Kirkby Memorial Trophy — Nick Stewart (MVP)", category: "Awards", year: 2025 },
  { id: "g6", url: "https://www.mmspl.ca/res/img/2025-mcgregor-finalists.jpg", caption: "2025 McGregor Tournament Finalists — Markham Goodyear Rangers", category: "Tournament", year: 2025 },
  { id: "g7", url: "https://www.mmspl.ca/res/img/2025-charity-champions.jpg", caption: "2025 Charity Tournament Champions — Derek Houghton Century 21", category: "Charity", year: 2025 },
  { id: "g8", url: "https://www.mmspl.ca/res/img/2025-charity-finalists.jpg", caption: "2025 Charity Tournament Finalists — Markham Goodyear Rangers", category: "Charity", year: 2025 },
  { id: "g9", url: "https://www.mmspl.ca/res/img/2025_Charity_Markham_Mariners.jpg", caption: "2025 Charity Presentation — Markham Mariners", category: "Charity", year: 2025 },
  { id: "g10", url: "https://www.mmspl.ca/res/img/2025_Charity_Sandgate.jpg", caption: "2025 Charity Presentation — Sandgate Women's Shelter", category: "Charity", year: 2025 },
  { id: "g11", url: "https://www.mmspl.ca/res/img/2025_Charity_Noahs_Clubhouse.jpg", caption: "2025 Charity Presentation — Noah's Clubhouse", category: "Charity", year: 2025 },
  { id: "g12", url: "https://www.mmspl.ca/res/img/2025_Charity_Diabetes_Canada.jpg", caption: "2025 Diabetes Canada Collection — Shamrocks", category: "Charity", year: 2025 },
  { id: "g13", url: "https://www.mmspl.ca/res/img/2024_Charity_Markham_Food_Bank.jpg", caption: "2024 Charity Presentation — Markham Food Bank", category: "Charity", year: 2024 },
  { id: "g14", url: "https://www.mmspl.ca/res/img/2024_Charity_Sandgate_Womens.jpg", caption: "2024 Charity Presentation — Sandgate Women's Shelter", category: "Charity", year: 2024 },
  { id: "g15", url: "https://www.mmspl.ca/res/img/2024_Charity_TNT_Foundation.jpg", caption: "2024 Charity Presentation — TNT Foundation", category: "Charity", year: 2024 },
  { id: "g16", url: "https://www.mmspl.ca/res/img/2024_Charity_MDBA.jpg", caption: "2024 Charity Presentation — Markham District Baseball Association", category: "Charity", year: 2024 },
  { id: "g17", url: "https://www.mmspl.ca/res/img/2016-charity-presentation-cfd.jpg", caption: "2016 Charity Presentation — Centre For Dreams", category: "Charity", year: 2016 },
  { id: "g18", url: "https://www.mmspl.ca/res/img/2016-charity-presentation-mdba.jpg", caption: "2016 Charity Presentation — Markham District Baseball Association", category: "Charity", year: 2016 },
  { id: "g19", url: "https://www.mmspl.ca/res/img/2016-charity-presentation-sws.jpg", caption: "2016 Charity Presentation — Sandgate Women's Shelter", category: "Charity", year: 2016 },
  { id: "g20", url: "https://www.mmspl.ca/res/img/2013-charity-MHFC.jpg", caption: "2013 Charity Presentation — Minor Hockey Fights Cancer", category: "Charity", year: 2013 },
  { id: "g21", url: "https://www.mmspl.ca/res/img/2013-charity-MM.jpg", caption: "2013 Charity Presentation — Markham Mariners", category: "Charity", year: 2013 },
  { id: "g22", url: "https://www.mmspl.ca/res/img/2012-charity-presentation-yrfo-640x480.jpg", caption: "2012 Charity Presentation — Markham Food Bank", category: "Charity", year: 2012 },
  { id: "g23", url: "https://www.mmspl.ca/res/img/2011-charity-presentation-bbbs-640x480.jpg", caption: "2011 Charity Presentation — Big Brothers Big Sisters of York", category: "Charity", year: 2011 },
  { id: "g24", url: "https://www.mmspl.ca/res/img/2010-charity-presentation-640x480.jpg", caption: "2010 Charity Presentation — TNT Foundation", category: "Charity", year: 2010 },
  { id: "g25", url: "https://www.mmspl.ca/res/img/2009-charity-presentation-640x480.jpg", caption: "2009 Charity Presentation — Markham Food Bank", category: "Charity", year: 2009 },
  { id: "g26", url: "https://www.mmspl.ca/res/img/2008-charity-presentation-640x480.jpg", caption: "2008 Charity Presentation — TNT Foundation", category: "Charity", year: 2008 },
  { id: "g27", url: "https://www.mmspl.ca/res/img/2015-charity-clothing-640x480.jpg", caption: "2015 Clothing Drive — Sibra Kitchens Bolts", category: "Charity", year: 2015 },
];

// ---------------------------------------------------------------------------
// Transforms
// ---------------------------------------------------------------------------

const LOCATION_MAP = {
  Mintleaf: "Mintleaf Park",
  "Centennial North": "Centennial Park", // schema has no North/South distinction — collapsed to "Centennial Park"
};

function mapLocation(loc) {
  return LOCATION_MAP[loc] || loc;
}

function parseRawGameDate(dateStr) {
  const monthDay = dateStr.trim().split(", ")[1].trim();
  const [month, day] = monthDay.split(" ");
  return `2026-${MONTH_MAP[month]}-${day.padStart(2, "0")}`;
}

function build2026Games() {
  return RAW_GAMES_2026.map(([dateStr, time, home, away, hs, as_, loc], idx) => ({
    id: 3001 + idx,
    date: parseRawGameDate(dateStr),
    time,
    homeTeam: home,
    awayTeam: away,
    homeScore: hs,
    awayScore: as_,
    location: loc,
    status: hs !== null && as_ !== null ? "final" : "scheduled",
  }));
}

function collectAllTeamNames() {
  const names = new Set();
  STANDINGS_2026.forEach((s) => names.add(s.name));
  build2026Games().forEach((g) => {
    names.add(g.homeTeam);
    names.add(g.awayTeam);
  });
  Object.values(HISTORICAL_STANDINGS)
    .flat()
    .forEach((s) => {
      if (s.name !== "Season Not Held") names.add(s.name);
    });
  SCHEDULE_GAMES_2025.forEach((g) => {
    names.add(g.homeTeam);
    names.add(g.awayTeam);
  });
  return Array.from(names).sort();
}

// ---------------------------------------------------------------------------
// Upsert steps
// ---------------------------------------------------------------------------

async function upsertSeasons() {
  const years = new Set([2026, ...Object.keys(HISTORICAL_STANDINGS).map(Number)]);
  const docs = Array.from(years)
    .sort((a, b) => a - b)
    .map((year) => {
      const doc = {
        _id: `season-${year}`,
        _type: "season",
        year,
        isActive: year === 2026,
      };
      if (year === 2026) {
        doc.regularSeasonStart = "2026-05-12";
        doc.regularSeasonEnd = "2026-09-15";
      }
      return doc;
    });
  await commitInBatches(docs, "seasons");
  return docs.map((d) => d.year);
}

async function upsertTeams(teamIdMap) {
  const docs = Array.from(teamIdMap.entries()).map(([name, _id]) => ({
    _id,
    _type: "team",
    name,
  }));
  await commitInBatches(docs, "teams");
}

async function upsertStandings(teamIdMap) {
  const docs = [];
  const allYears = { ...HISTORICAL_STANDINGS, 2026: STANDINGS_2026 };
  for (const [yearStr, rows] of Object.entries(allYears)) {
    const year = Number(yearStr);
    for (const row of rows) {
      if (row.name === "Season Not Held") continue;
      if (!teamIdMap.has(row.name)) continue;
      const teamRef = teamIdMap.get(row.name);
      docs.push({
        _id: `standing-${year}-${teamRef}`,
        _type: "standing",
        season: { _type: "reference", _ref: `season-${year}` },
        team: { _type: "reference", _ref: teamRef },
        wins: row.wins,
        losses: row.losses,
        ties: row.ties,
      });
    }
  }
  await commitInBatches(docs, "standings");
}

async function upsertGames(teamIdMap) {
  const docs = [];

  for (const g of SCHEDULE_GAMES_2025) {
    docs.push({
      _id: `game-2025-${g.id}`,
      _type: "game",
      season: { _type: "reference", _ref: "season-2025" },
      date: g.date,
      time: g.time,
      field: mapLocation(g.location),
      homeTeam: { _type: "reference", _ref: teamIdMap.get(g.homeTeam) },
      awayTeam: { _type: "reference", _ref: teamIdMap.get(g.awayTeam) },
      homeScore: g.homeScore,
      awayScore: g.awayScore,
      status: "final", // 2025 season is fully concluded relative to today
    });
  }

  for (const g of build2026Games()) {
    const doc = {
      _id: `game-2026-${g.id}`,
      _type: "game",
      season: { _type: "reference", _ref: "season-2026" },
      date: g.date,
      time: g.time,
      field: mapLocation(g.location),
      homeTeam: { _type: "reference", _ref: teamIdMap.get(g.homeTeam) },
      awayTeam: { _type: "reference", _ref: teamIdMap.get(g.awayTeam) },
      status: g.status,
    };
    if (g.status === "final") {
      doc.homeScore = g.homeScore;
      doc.awayScore = g.awayScore;
    }
    docs.push(doc);
  }

  await commitInBatches(docs, "games");
}

async function upsertAwards(teamIdMap) {
  const docs = [];
  let skippedNotAwarded = 0;
  for (const category of AWARD_CATEGORIES) {
    for (const entry of category.entries) {
      if (entry.winner === "Not Awarded") {
        skippedNotAwarded++;
        continue;
      }
      const doc = {
        _id: `award-${category.id}-${entry.year}`,
        _type: "award",
        year: entry.year,
        category: category.name,
        winner: entry.winner,
      };
      if (category.description) doc.description = category.description;
      if (category.isTeamAward && teamIdMap.has(entry.winner)) {
        doc.team = { _type: "reference", _ref: teamIdMap.get(entry.winner) };
      }
      docs.push(doc);
    }
  }
  await commitInBatches(docs, "awards");
  console.log(`  (skipped ${skippedNotAwarded} "Not Awarded" entries)`);
}

async function upsertImportantDates() {
  const docs = IMPORTANT_DATES_SEED.map((d) => ({
    _id: `importantDate-${d.date}-${slugify(d.title)}`,
    _type: "importantDate",
    label: d.title,
    date: d.date,
    description: d.notes,
  }));
  await commitInBatches(docs, "important dates");
}

async function upsertGallery() {
  const existingIds = new Set(
    (
      await client.fetch(
        `*[_type == "galleryPhoto" && _id in $ids && defined(image.asset._ref)]._id`,
        { ids: GALLERY_IMAGES.map((g) => `galleryPhoto-${g.id}`) }
      )
    ).map(String)
  );

  let done = 0;
  for (const g of GALLERY_IMAGES) {
    const _id = `galleryPhoto-${g.id}`;
    done++;
    process.stdout.write(`\r  [gallery] ${done}/${GALLERY_IMAGES.length}`);
    if (existingIds.has(_id)) continue; // already imported with an asset — skip re-fetching mmspl.ca

    const image = await downloadAndUploadImage(g.url, g.caption, g.caption);
    if (!image) continue;

    await client.createOrReplace({
      _id,
      _type: "galleryPhoto",
      image,
      caption: g.caption,
      date: `${g.year}-01-01`, // source only has year-level granularity
    });
  }
  process.stdout.write("\n");
}

const NEWS_TAG_MAP = {
  "League News": "league",
  Tournament: "results",
  Awards: "announcement",
};

async function upsertNews() {
  const existingIds = new Set(
    (await client.fetch(`*[_type == "news" && _id in $ids]._id`, { ids: NEWS_ARTICLES.map((a) => `news-${a.id}`) })).map(
      String
    )
  );

  for (const article of NEWS_ARTICLES) {
    const _id = `news-${article.id}`;
    const doc = {
      _id,
      _type: "news",
      title: article.title,
      slug: { _type: "slug", current: slugify(article.title) },
      body: textToPortableText(article.content),
      date: `${article.date}T00:00:00Z`,
      tag: NEWS_TAG_MAP[article.category],
      notifySubscribers: false, // must stay false — this is a backfill, not a new announcement
    };

    if (article.image) {
      const existing = existingIds.has(_id)
        ? await client.fetch(`*[_id == $id][0].photo.asset._ref`, { id: _id })
        : null;
      if (!existing) {
        const photo = await downloadAndUploadImage(article.image, article.title, article.title);
        if (photo) doc.photo = photo;
      }
    }

    await client.createOrReplace(doc);
    console.log(`  [news] upserted "${article.title}"`);
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log(`Migrating into Sanity project ${projectId}/${dataset}\n`);

  console.log("1/8 Seasons");
  await upsertSeasons();

  console.log("2/8 Teams");
  const teamIdMap = buildTeamIdMap(collectAllTeamNames());
  await upsertTeams(teamIdMap);

  console.log("3/8 Standings");
  await upsertStandings(teamIdMap);

  console.log("4/8 Games");
  await upsertGames(teamIdMap);

  console.log("5/8 Awards");
  await upsertAwards(teamIdMap);

  console.log("6/8 Important dates");
  await upsertImportantDates();

  console.log("7/8 Gallery photos (downloading from mmspl.ca — this is the slow step)");
  await upsertGallery();

  console.log("8/8 News articles");
  await upsertNews();

  console.log("\nDone.");
  console.log(`  Teams:  ${teamIdMap.size}`);
  console.log(`  Games:  ${SCHEDULE_GAMES_2025.length + RAW_GAMES_2026.length}`);
  console.log(`  Gallery photos: ${GALLERY_IMAGES.length}`);
  console.log(`  News articles: ${NEWS_ARTICLES.length}`);

  if (failedDownloads.length > 0) {
    console.log(`\n${failedDownloads.length} image(s) failed to download — needs manual follow-up:`);
    for (const f of failedDownloads) {
      console.log(`  - ${f.label}: ${f.url} (${f.error})`);
    }
  }
}

if (require.main === module) {
  main().catch((err) => {
    console.error("\nMigration failed:", err);
    process.exit(1);
  });
}

module.exports = {
  collectAllTeamNames,
  slugify,
  buildTeamIdMap,
  build2026Games,
  mapLocation,
  HISTORICAL_STANDINGS,
  STANDINGS_2026,
  SCHEDULE_GAMES_2025,
  RAW_GAMES_2026,
  AWARD_CATEGORIES,
  IMPORTANT_DATES_SEED,
  GALLERY_IMAGES,
  NEWS_ARTICLES,
};

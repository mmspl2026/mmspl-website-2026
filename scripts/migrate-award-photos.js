"use strict";

/**
 * Downloads the 7 trophy photos from mmspl.ca (the old site being retired)
 * and uploads them as real Sanity assets on awardTrophyPhoto documents, one
 * per award category. Run before mmspl.ca goes offline.
 *
 * Idempotent: deterministic _id per category, createOrReplace. Skips
 * re-downloading a category if it already has an asset attached.
 *
 * Usage: node scripts/migrate-award-photos.js
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

function slugify(str) {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// category string must exactly match the `category` field on award documents
const TROPHY_PHOTOS = [
  { category: "Jim McGregor Trophy", url: "https://mmspl.ca/res/img/award-finals-250x351.jpg", alt: "Jim McGregor Trophy" },
  { category: "President's Trophy", url: "https://mmspl.ca/res/img/award-league-250x351.jpg", alt: "President's Trophy" },
  { category: "Kevan MacDonald Cup", url: "https://mmspl.ca/res/img/award-charity-250x411.jpg", alt: "Kevan MacDonald Cup" },
  { category: "Richard Kirkby Memorial Trophy", url: "https://mmspl.ca/res/img/award-mvp-250x351.jpg", alt: "Richard Kirkby Memorial Trophy" },
  { category: "Peter McClarty Memorial Trophy", url: "https://mmspl.ca/res/img/2025-charity-mvp.jpg", alt: "Peter McClarty Memorial Trophy" },
  { category: "Rookie of the Year", url: "https://mmspl.ca/res/img/award-rookie-250x350.jpg", alt: "Tom Higgins - Jim Sale Award" },
  { category: "Service Award", url: "https://mmspl.ca/res/img/award-service-250x351.jpg", alt: "Steve Bull Award" },
];

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

async function main() {
  console.log(`Migrating award trophy photos into Sanity project ${projectId}/${dataset}\n`);

  const existingIds = new Set(
    (await client.fetch(`*[_type == "awardTrophyPhoto" && defined(photo.asset._ref)]._id`)).map(String)
  );

  let uploaded = 0;
  let skipped = 0;
  const failed = [];

  for (const entry of TROPHY_PHOTOS) {
    const _id = `awardTrophyPhoto-${slugify(entry.category)}`;
    if (existingIds.has(_id)) {
      console.log(`  [skip] ${entry.category} — already has a photo`);
      skipped++;
      continue;
    }

    try {
      const buffer = await fetchWithRetry(entry.url);
      const filename = path.basename(new URL(entry.url).pathname) || "trophy.jpg";
      const asset = await client.assets.upload("image", buffer, { filename });
      await client.createOrReplace({
        _id,
        _type: "awardTrophyPhoto",
        category: entry.category,
        photo: {
          _type: "image",
          asset: { _type: "reference", _ref: asset._id },
          alt: entry.alt,
        },
      });
      console.log(`  [ok] ${entry.category}`);
      uploaded++;
    } catch (err) {
      console.warn(`  [fail] ${entry.category}: ${err.message}`);
      failed.push({ category: entry.category, url: entry.url, error: err.message });
    }
  }

  console.log(`\nDone. Uploaded ${uploaded}, skipped ${skipped} (already had photos), failed ${failed.length}.`);
  if (failed.length > 0) {
    console.log("\nFailed downloads — needs manual follow-up:");
    for (const f of failed) console.log(`  - ${f.category}: ${f.url} (${f.error})`);
  }
}

main().catch((err) => {
  console.error("\nMigration failed:", err);
  process.exit(1);
});

"use strict";

/**
 * Downloads the real images used on Emergent's actual /about page (hero,
 * 50-years anniversary logo, 7 charity presentation photos) and re-uploads
 * them as real Sanity assets — mmspl.ca is being retired, never hotlink it.
 *
 * Prints the resulting Sanity CDN URLs so they can be pasted into
 * seed-content.ts as static content (this is fixed historical content, not
 * something that needs its own editable Sanity schema).
 *
 * Usage: node scripts/migrate-about-page-images.js
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
  console.error("Missing Sanity env vars — check .env.local");
  process.exit(1);
}

const client = createClient({ projectId, dataset, apiVersion, token, useCdn: false });

const IMAGES = [
  { key: "hero", url: "https://www.mmspl.ca/res/img/2024_Charity_Sandgate_Womens.jpg" },
  { key: "logo50", url: "https://www.mmspl.ca/res/img/MMSP-LOGO-50-YRS.png" },
  { key: "2025-markham-mariners", url: "https://www.mmspl.ca/res/img/2025_Charity_Markham_Mariners.jpg" },
  { key: "2025-sandgate", url: "https://www.mmspl.ca/res/img/2025_Charity_Sandgate.jpg" },
  { key: "2025-noahs-clubhouse", url: "https://www.mmspl.ca/res/img/2025_Charity_Noahs_Clubhouse.jpg" },
  { key: "2024-markham-food-bank", url: "https://www.mmspl.ca/res/img/2024_Charity_Markham_Food_Bank.jpg" },
  { key: "2024-tnt-foundation", url: "https://www.mmspl.ca/res/img/2024_Charity_TNT_Foundation.jpg" },
  { key: "2024-mdba", url: "https://www.mmspl.ca/res/img/2024_Charity_MDBA.jpg" },
];

async function main() {
  console.log(`Uploading About page images into Sanity project ${projectId}/${dataset}\n`);
  const results = {};
  for (const { key, url } of IMAGES) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
    const buffer = Buffer.from(await res.arrayBuffer());
    const filename = path.basename(new URL(url).pathname);
    const asset = await client.assets.upload("image", buffer, { filename });
    results[key] = asset.url;
    console.log(`[ok] ${key} -> ${asset.url}`);
  }
  console.log("\n--- JSON summary ---");
  console.log(JSON.stringify(results, null, 2));
}

main().catch((err) => {
  console.error("Failed:", err);
  process.exit(1);
});

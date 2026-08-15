"use strict";

/**
 * One-time migration: pulls the "other documents" listed on the old site's
 * admin.html (AGM minutes, draft orders, meeting minutes, constitution,
 * house rules, rulebook, an old AGM presentation) and re-creates them as
 * "General" category leagueDocument records in Sanity, with the actual
 * file re-uploaded as a Sanity asset (not just linked externally).
 *
 * Idempotent — skips any document whose title already exists.
 *
 * Usage:
 *   node scripts/migrate-old-admin-documents.js
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
  console.error("Missing NEXT_PUBLIC_SANITY_PROJECT_ID, NEXT_PUBLIC_SANITY_DATASET, or SANITY_API_TOKEN.");
  process.exit(1);
}

const client = createClient({ projectId, dataset, apiVersion, token, useCdn: false });

const SOURCE_BASE = "https://mmspl.ca/";

// { href relative to SOURCE_BASE, display title } — scraped from
// https://mmspl.ca/admin.html, in the same order they appear there.
const DOCUMENTS = [
  { href: "res/docs/2025-constitution.docx", title: "2025 League Constitution" },
  { href: "res/docs/2025-house-rules.docx", title: "2025 MMSPL House Rules" },
  { href: "res/docs/2018-spn-rulebook-v2.pdf", title: "SPN Rule Book" },
  { href: "res/docs/2025-AGM.pdf", title: "2025 AGM Minutes" },
  { href: "res/docs/2024-AGM.pdf", title: "2024 AGM Minutes" },
  { href: "res/docs/2024-captains-meeting-minutes.pdf", title: "2024 Captains Meeting Minutes" },
  { href: "res/docs/2023-AGM.pdf", title: "2023 AGM Minutes" },
  { href: "res/docs/2022-AGM-Minutes.docx", title: "2022 AGM Minutes" },
  { href: "res/docs/2022-captains-meeting-minutes.docx", title: "2022 Captains Meeting Minutes" },
  { href: "res/docs/2021-captains-meeting-minutes.docx", title: "2021 Captains Meeting Minutes" },
  { href: "res/docs/2019-AGM.pdf", title: "2019 AGM Minutes" },
  { href: "res/docs/2018-AGM-Minutes.docx", title: "2018 AGM Minutes" },
  { href: "res/docs/2017-AGM-Minutes.docx", title: "2017 AGM Minutes" },
  { href: "res/docs/2016-AGM-Minutes.docx", title: "2016 AGM Minutes" },
  { href: "res/docs/2015-AGM-minutes.docx", title: "2015 AGM Minutes" },
  { href: "res/docs/2015-draft-order.pdf", title: "2015 Draft Order" },
  { href: "res/docs/2014-AGM-minutes.docx", title: "2014 AGM Minutes" },
  { href: "res/docs/2014-draft-order.pdf", title: "2014 Draft Order" },
  { href: "res/docs/2013-AGM-Minutes.docx", title: "2013 AGM Minutes" },
  { href: "res/docs/2013-March-4-minutes.docx", title: "2013 March 4 Meeting Minutes" },
  { href: "res/docs/2013-draft-order.pdf", title: "2013 Draft Order" },
  { href: "res/docs/2012-AGM-Minutes.doc", title: "2012 AGM Minutes" },
  { href: "res/docs/2012-draft-order.pdf", title: "2012 Draft Order" },
  { href: "res/docs/2012-March-15-minutes.docx", title: "2012 March 15 Meeting Minutes" },
  { href: "res/docs/2012-February-15-minutes.doc", title: "2012 February 15 Meeting Minutes" },
  { href: "res/docs/2011-AGM-Minutes.docx", title: "2011 AGM Minutes" },
  { href: "res/docs/2010-AGM-Minutes.docx", title: "2010 AGM Minutes" },
  { href: "res/docs/2010-AGM-Presentation.pptx", title: "2010 AGM Presentation" },
  { href: "res/docs/2009 MMSPL AGM Minutes.doc", title: "2009 AGM Minutes" },
  { href: "res/docs/LCC Draft Recommendations-REVISED DRAFT-Oct 2009.pdf", title: "2009 LLC Recommendation" },
];

const MIME_BY_EXT = {
  ".pdf": "application/pdf",
  ".txt": "text/plain",
  ".doc": "application/msword",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".ppt": "application/vnd.ms-powerpoint",
  ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
};

function extname(filename) {
  const idx = filename.lastIndexOf(".");
  return idx === -1 ? "" : filename.slice(idx).toLowerCase();
}

function extractYear(title) {
  const m = title.match(/\b(19|20)\d{2}\b/);
  return m ? Number(m[0]) : undefined;
}

async function main() {
  let created = 0;
  let skipped = 0;
  let failed = 0;

  for (let i = 0; i < DOCUMENTS.length; i++) {
    const { href, title } = DOCUMENTS[i];

    const existing = await client.fetch(`*[_type == "leagueDocument" && title == $title][0]{_id}`, { title });
    if (existing) {
      console.log(`SKIP (already exists): ${title}`);
      skipped++;
      continue;
    }

    const url = SOURCE_BASE + href.split("/").map(encodeURIComponent).join("/");
    const filename = href.split("/").pop();
    const ext = extname(filename);
    const mimeType = MIME_BY_EXT[ext] || "application/octet-stream";

    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`fetch failed: HTTP ${res.status}`);
      const buffer = Buffer.from(await res.arrayBuffer());

      const asset = await client.assets.upload("file", buffer, { filename, contentType: mimeType });

      await client.create({
        _type: "leagueDocument",
        title,
        category: "General",
        contentType: "file",
        year: extractYear(title),
        file: { _type: "file", asset: { _type: "reference", _ref: asset._id } },
        order: i,
      });

      console.log(`OK: ${title} (${filename}, ${buffer.length} bytes)`);
      created++;
    } catch (err) {
      console.error(`FAILED: ${title} — ${err.message}`);
      failed++;
    }
  }

  console.log(`\nDone. Created ${created}, skipped ${skipped} (already existed), failed ${failed}.`);
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});

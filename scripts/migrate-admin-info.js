"use strict";

/**
 * Seeds the new public /admin-info page content into Sanity:
 *  - 6 leagueExecutive records (2026 Executives)
 *  - 14 teamRepresentative records (referencing existing team docs)
 *  - 6 leagueDocument records (1 house rules PDF [no file available — see
 *    below], 5 AGM motion PDFs downloaded from mmspl.ca and re-uploaded as
 *    real Sanity file assets — mmspl.ca is being retired, never hotlink it)
 *  - downloads the Admin page hero image and sets it on adminSettings
 *
 * Content and PDF source URLs were extracted directly from the Emergent
 * reference site's compiled JS bundle + its /api/documents endpoint.
 *
 * Idempotent: deterministic _id per record, createOrReplace.
 *
 * Usage: node scripts/migrate-admin-info.js
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

const EXECUTIVES = [
  { role: "President", name: "Mark Parent", email: "president@mmspl.ca", order: 1 },
  { role: "1st Vice President", name: "Sean Bansavatar", email: "first-vice-president@mmspl.ca", order: 2 },
  { role: "2nd Vice President", name: "Evange Bethanis", email: "second-vice-president@mmspl.ca", order: 3 },
  { role: "Treasurer", name: "Dave Newson", email: "treasurer@mmspl.ca", order: 4 },
  { role: "Secretary", name: "Avi Bhatia", email: "secretary@mmspl.ca", order: 5 },
  { role: "Equipment Manager", name: "Bryan Anderson", email: "manager@mmspl.ca", order: 6 },
];

const TEAM_REPS = [
  { team: "Ace Pools Moose", rep: "Ken Bailie" },
  { team: "DC Chiropractic Nads", rep: "Patrick Belgar" },
  { team: "Derek Houghton Century 21", rep: "Andrew Ming" },
  { team: "Markham Goodyear Rangers", rep: "Wendell Tseng" },
  { team: "Markham Knights", rep: "Victor Chau" },
  { team: "McCalmont Financial Beavers", rep: "Eric Opsahl" },
  { team: "OK Braves", rep: "Rudy Pitton" },
  { team: "Opal Electric Shamrocks", rep: "Erik Brokelman" },
  { team: "Pilkey Glass Pirates", rep: "Gabe Tsang" },
  { team: "Polyson Sox", rep: "Matt DeKuyper" },
  { team: "Red Hot Dawgs", rep: "Lonny Kirlin" },
  { team: "S & H Raiders", rep: "Greg Ashmead" },
  { team: "The Classics", rep: "Jeff Knight" },
  { team: "The Condo Kings Army", rep: "Frank Filntissis" },
];

// File source is null for the house rules PDF — it 404s on the Emergent
// host and no working copy was found on mmspl.ca either. The document
// record is still created (so the entry/category shows up), but with no
// file attached until someone uploads the real PDF via Sanity Studio.
const DOCUMENTS = [
  { title: "2025 MMSPL House Rules", category: "Rules & Regulations", order: 1, fileUrl: null },
  {
    title: "2025 AGM — Motion 1: Son Age Rule",
    description: "Proposed amendment to the son age rule. Vote result: FAILED",
    category: "AGM Documents",
    badge: "FAILED",
    order: 1,
    fileUrl: "https://www.mmspl.ca/res/docs/2025-AGM-Motion-01.pdf",
  },
  {
    title: "2025 AGM — Motion 2: Board for Home Plate",
    description: "Motion to add a board in front of home plate. Vote result: PASSED",
    category: "AGM Documents",
    badge: "PASSED",
    order: 2,
    fileUrl: "https://www.mmspl.ca/res/docs/2025-AGM-Motion-02.pdf",
  },
  {
    title: "2025 AGM — Motion 3: Bases with Pegs",
    description: "Motion to use bases with pegs. Vote result: PASSED",
    category: "AGM Documents",
    badge: "PASSED",
    order: 3,
    fileUrl: "https://www.mmspl.ca/res/docs/2025-AGM-Motion-03.pdf",
  },
  {
    title: "2025 AGM — Motion 4: Sponsorship Rule",
    description: "Proposed change to sponsorship rules. Vote result: FAILED",
    category: "AGM Documents",
    badge: "FAILED",
    order: 4,
    fileUrl: "https://www.mmspl.ca/res/docs/2025-AGM-Motion-04.pdf",
  },
  {
    title: "2025 AGM — Motion 5: Home Run Rule",
    description: "Proposed changes to the home run rule. Vote result: FAILED",
    category: "AGM Documents",
    badge: "FAILED",
    order: 5,
    fileUrl: "https://www.mmspl.ca/res/docs/2025-AGM-Motion-05.pdf",
  },
];

const HERO_IMAGE_URL =
  "https://customer-assets.emergentagent.com/job_ba97d006-1e3d-4edc-bd93-469bc899c126/artifacts/6gh84uuu_new_admin_hero_s.jpg";

async function seedExecutives() {
  console.log("\nExecutives:");
  for (const e of EXECUTIVES) {
    const _id = `leagueExecutive-${slugify(e.role)}`;
    await client.createOrReplace({ _id, _type: "leagueExecutive", ...e });
    console.log(`  [ok] ${e.role} — ${e.name}`);
  }
}

async function seedTeamReps() {
  console.log("\nTeam representatives:");
  const teams = await client.fetch(`*[_type == "team"]{_id, name}`);
  const byName = new Map(teams.map((t) => [t.name, t._id]));

  for (const r of TEAM_REPS) {
    const teamId = byName.get(r.team);
    if (!teamId) {
      console.warn(`  [fail] ${r.team} — no matching team document found`);
      continue;
    }
    const _id = `teamRepresentative-${slugify(r.team)}`;
    await client.createOrReplace({
      _id,
      _type: "teamRepresentative",
      repName: r.rep,
      team: { _type: "reference", _ref: teamId },
    });
    console.log(`  [ok] ${r.team} — ${r.rep}`);
  }
}

async function seedDocuments() {
  console.log("\nDocuments:");
  const existing = await client.fetch(`*[_type == "leagueDocument" && defined(file.asset._ref)]._id`);
  const existingIds = new Set(existing.map(String));

  for (const d of DOCUMENTS) {
    const _id = `leagueDocument-${slugify(d.title)}`;

    if (!d.fileUrl) {
      await client.createOrReplace({
        _id,
        _type: "leagueDocument",
        title: d.title,
        description: d.description,
        category: d.category,
        badge: d.badge,
        order: d.order,
      });
      console.log(`  [ok, no file] ${d.title} — needs manual PDF upload via Sanity Studio`);
      continue;
    }

    if (existingIds.has(_id)) {
      console.log(`  [skip] ${d.title} — already has a file`);
      continue;
    }

    try {
      const buffer = await fetchWithRetry(d.fileUrl);
      const filename = path.basename(new URL(d.fileUrl).pathname);
      const asset = await client.assets.upload("file", buffer, { filename, contentType: "application/pdf" });
      await client.createOrReplace({
        _id,
        _type: "leagueDocument",
        title: d.title,
        description: d.description,
        category: d.category,
        badge: d.badge,
        order: d.order,
        file: { _type: "file", asset: { _type: "reference", _ref: asset._id } },
      });
      console.log(`  [ok] ${d.title}`);
    } catch (err) {
      console.warn(`  [fail] ${d.title}: ${err.message}`);
    }
  }
}

async function seedHeroImage() {
  console.log("\nHero image:");
  const settings = await client.fetch(`*[_type == "adminSettings"][0]{_id, adminInfoHeroImage}`);
  if (settings?.adminInfoHeroImage?.asset) {
    console.log("  [skip] adminInfoHeroImage already set");
    return;
  }

  const buffer = await fetchWithRetry(HERO_IMAGE_URL);
  const asset = await client.assets.upload("image", buffer, { filename: "admin-hero.jpg" });

  if (settings?._id) {
    await client.patch(settings._id).set({ adminInfoHeroImage: { _type: "image", asset: { _type: "reference", _ref: asset._id } } }).commit();
  } else {
    await client.create({
      _type: "adminSettings",
      adminInfoHeroImage: { _type: "image", asset: { _type: "reference", _ref: asset._id } },
    });
  }
  console.log("  [ok] uploaded and set on adminSettings.adminInfoHeroImage");
}

async function main() {
  console.log(`Seeding admin-info content into Sanity project ${projectId}/${dataset}`);
  await seedExecutives();
  await seedTeamReps();
  await seedDocuments();
  await seedHeroImage();
  console.log("\nDone.");
}

main().catch((err) => {
  console.error("\nMigration failed:", err);
  process.exit(1);
});

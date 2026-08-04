"use strict";

/**
 * Migrates live data from the Emergent MongoDB database into Sanity.
 *
 * IMPORTANT — this script must be run OUTSIDE the sandboxed agent shell
 * (e.g. via the `!` prefix in the chat, or a normal terminal) because
 * MongoDB's wire-protocol port (27017) is blocked from that sandbox's
 * network. DNS + HTTPS work fine there; only the raw Mongo port is blocked.
 *
 * Two modes:
 *   node scripts/migrate-from-mongodb-live.js            -> EXPLORE ONLY
 *     Connects read-only, lists every collection in the target database,
 *     prints a doc count and one sample document per collection. Writes
 *     nothing to Sanity. Use this first to confirm the real field names —
 *     the transform functions below were written without ever seeing a
 *     real document (this sandbox can't reach the DB), so they guess at
 *     common field-name variants. Sample output should be used to correct
 *     any wrong guesses before running --migrate.
 *
 *   node scripts/migrate-from-mongodb-live.js --migrate  -> ACTUALLY MIGRATE
 *     Reads every document in the 12 target collections, transforms each
 *     into the matching Sanity document, downloads any image/file URLs and
 *     re-uploads them as real Sanity assets (never hotlinks an external
 *     URL), and writes via createOrReplace using the SAME deterministic
 *     _id scheme as the existing migration scripts in this folder, so a
 *     previously-migrated document is replaced in place rather than
 *     duplicated. Prints running progress and a final per-collection
 *     report (migrated / skipped / failed counts).
 *
 * Collections migrated: teams, seasons, games, standings, news, awards,
 * gallery, subscribers, important_dates, registrations, contacts, documents.
 */

const path = require("path");
const { MongoClient } = require("mongodb");
const { createClient } = require("@sanity/client");

try {
  process.loadEnvFile(path.join(__dirname, "..", ".env.local"));
} catch {
  // no .env.local on disk — assume env vars are already set in the shell
}

const MONGO_URI =
  "mongodb+srv://league-hub-32:d92ihjtvkjic73etn1lg@customer-apps.xifr0d.mongodb.net/?retryWrites=true&w=majority&appName=league-hub-32&maxPoolSize=5";

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

const MIGRATE = process.argv.includes("--migrate");

// --- generic helpers ---------------------------------------------------

function slugify(str) {
  return String(str || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Returns the first defined, non-null value among the given keys on obj. */
function pick(obj, ...keys) {
  for (const k of keys) {
    if (obj && obj[k] !== undefined && obj[k] !== null && obj[k] !== "") return obj[k];
  }
  return undefined;
}

function mongoDocId(doc) {
  return String(pick(doc, "id") ?? doc._id);
}

function toISODate(value) {
  if (!value) return undefined;
  if (typeof value === "string") return value.slice(0, 10);
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === "object" && value.$date) return new Date(value.$date).toISOString().slice(0, 10);
  return undefined;
}

function toISODateTime(value) {
  if (!value) return undefined;
  if (typeof value === "string") return new Date(value).toISOString();
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object" && value.$date) return new Date(value.$date).toISOString();
  return undefined;
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

// Cache so the same source URL is only downloaded/uploaded once per run.
const assetCache = new Map();

async function uploadAssetIfUrl(url, kind /* "image" | "file" */) {
  if (!url || typeof url !== "string" || !/^https?:\/\//.test(url)) return null;
  if (assetCache.has(url)) return assetCache.get(url);
  try {
    const buffer = await fetchWithRetry(url);
    const filename = path.basename(new URL(url).pathname) || `asset-${Date.now()}`;
    const asset = await sanity.assets.upload(kind, buffer, { filename });
    const ref = { _type: kind, asset: { _type: "reference", _ref: asset._id } };
    assetCache.set(url, ref);
    return ref;
  } catch (err) {
    console.warn(`    [asset upload failed] ${url}: ${err.message}`);
    return null;
  }
}

const report = {}; // { collectionName: { total, migrated, skipped, failed } }
function recordStart(name, total) {
  report[name] = { total, migrated: 0, skipped: 0, failed: 0 };
}

// --- per-collection transforms ------------------------------------------
// Field names are best-effort guesses (camelCase / snake_case variants).
// Run in explore mode first and correct these against real sample docs.

async function migrateTeams(db) {
  const docs = await db.collection("teams").find().toArray();
  recordStart("teams", docs.length);
  const idMap = new Map(); // mongo name -> sanity _id, used by games/standings/awards below
  for (const doc of docs) {
    const name = pick(doc, "name", "team_name", "teamName");
    if (!name) {
      report.teams.skipped++;
      continue;
    }
    const _id = `team-${slugify(name)}`;
    const logoUrl = pick(doc, "logo", "logoUrl", "logo_url", "image");
    const logo = await uploadAssetIfUrl(logoUrl, "image");
    try {
      await sanity.createOrReplace({
        _id,
        _type: "team",
        name,
        shortName: pick(doc, "shortName", "short_name", "abbreviation") || undefined,
        division: pick(doc, "division") || undefined,
        color: pick(doc, "color", "colour") || undefined,
        ...(logo ? { logo } : {}),
      });
      idMap.set(name, _id);
      report.teams.migrated++;
    } catch (err) {
      console.warn(`    [fail] team "${name}": ${err.message}`);
      report.teams.failed++;
    }
  }
  return idMap;
}

async function migrateSeasons(db) {
  const docs = await db.collection("seasons").find().toArray();
  recordStart("seasons", docs.length);
  for (const doc of docs) {
    const year = Number(pick(doc, "year"));
    if (!year) {
      report.seasons.skipped++;
      continue;
    }
    try {
      await sanity.createOrReplace({
        _id: `season-${year}`,
        _type: "season",
        year,
        isActive: Boolean(pick(doc, "isActive", "is_active", "active")),
        regularSeasonStart: toISODate(pick(doc, "regularSeasonStart", "regular_season_start", "seasonStart")),
        regularSeasonEnd: toISODate(pick(doc, "regularSeasonEnd", "regular_season_end", "seasonEnd")),
        playoffCutoff: Number(pick(doc, "playoffCutoff", "playoff_cutoff")) || 8,
      });
      report.seasons.migrated++;
    } catch (err) {
      console.warn(`    [fail] season ${year}: ${err.message}`);
      report.seasons.failed++;
    }
  }
}

async function migrateGames(db, teamIdMap) {
  const docs = await db.collection("games").find().toArray();
  recordStart("games", docs.length);
  for (const doc of docs) {
    const date = toISODate(pick(doc, "date"));
    const homeName = pick(doc, "homeTeam", "home_team", "home");
    const awayName = pick(doc, "awayTeam", "away_team", "away");
    const homeId = teamIdMap.get(homeName);
    const awayId = teamIdMap.get(awayName);
    if (!date || !homeId || !awayId) {
      report.games.skipped++;
      continue;
    }
    const year = Number(pick(doc, "year")) || Number(date.slice(0, 4));
    try {
      await sanity.createOrReplace({
        _id: `game-${year}-${mongoDocId(doc)}`,
        _type: "game",
        season: { _type: "reference", _ref: `season-${year}` },
        date,
        time: pick(doc, "time") || "",
        field: pick(doc, "field", "location", "park") || "",
        homeTeam: { _type: "reference", _ref: homeId },
        awayTeam: { _type: "reference", _ref: awayId },
        homeScore: numOrUndefined(pick(doc, "homeScore", "home_score")),
        awayScore: numOrUndefined(pick(doc, "awayScore", "away_score")),
        status: pick(doc, "status") || "scheduled",
      });
      report.games.migrated++;
    } catch (err) {
      console.warn(`    [fail] game ${mongoDocId(doc)}: ${err.message}`);
      report.games.failed++;
    }
  }
}

async function migrateStandings(db, teamIdMap) {
  const docs = await db.collection("standings").find().toArray();
  recordStart("standings", docs.length);
  for (const doc of docs) {
    const year = Number(pick(doc, "year", "season"));
    const teamName = pick(doc, "team", "teamName", "team_name");
    const teamId = teamIdMap.get(teamName);
    if (!year || !teamId) {
      report.standings.skipped++;
      continue;
    }
    try {
      await sanity.createOrReplace({
        _id: `standing-${year}-${teamId}`,
        _type: "standing",
        season: { _type: "reference", _ref: `season-${year}` },
        team: { _type: "reference", _ref: teamId },
        wins: numOrUndefined(pick(doc, "wins", "w")) ?? 0,
        losses: numOrUndefined(pick(doc, "losses", "l")) ?? 0,
        ties: numOrUndefined(pick(doc, "ties", "t")) ?? 0,
        runDifferential: numOrUndefined(pick(doc, "runDifferential", "run_differential", "diff")) ?? 0,
        defaults: numOrUndefined(pick(doc, "defaults")) ?? 0,
      });
      report.standings.migrated++;
    } catch (err) {
      console.warn(`    [fail] standing ${teamName} ${year}: ${err.message}`);
      report.standings.failed++;
    }
  }
}

async function migrateNews(db) {
  const docs = await db.collection("news").find().toArray();
  recordStart("news", docs.length);
  for (const doc of docs) {
    const title = pick(doc, "title");
    if (!title) {
      report.news.skipped++;
      continue;
    }
    const photoUrl = pick(doc, "photo", "image", "photoUrl");
    const photo = await uploadAssetIfUrl(photoUrl, "image");
    const bodyText = pick(doc, "body", "content", "text");
    try {
      await sanity.createOrReplace({
        _id: `news-${mongoDocId(doc)}`,
        _type: "news",
        title,
        slug: { _type: "slug", current: slugify(title) },
        date: toISODateTime(pick(doc, "date", "publishedAt", "published_at")) || new Date().toISOString(),
        tag: pick(doc, "tag", "category") || undefined,
        body: bodyText
          ? [{ _type: "block", _key: "body0", style: "normal", children: [{ _type: "span", _key: "span0", text: String(bodyText) }] }]
          : [],
        ...(photo ? { photo } : {}),
      });
      report.news.migrated++;
    } catch (err) {
      console.warn(`    [fail] news "${title}": ${err.message}`);
      report.news.failed++;
    }
  }
}

async function migrateAwards(db, teamIdMap) {
  const docs = await db.collection("awards").find().toArray();
  recordStart("awards", docs.length);
  for (const doc of docs) {
    const category = pick(doc, "category");
    const year = Number(pick(doc, "year"));
    const winner = pick(doc, "winner");
    if (!category || !year || !winner) {
      report.awards.skipped++;
      continue;
    }
    const photoUrl = pick(doc, "photo", "image");
    const photo = await uploadAssetIfUrl(photoUrl, "image");
    const teamId = teamIdMap.get(winner);
    try {
      await sanity.createOrReplace({
        _id: `award-${slugify(category)}-${year}`,
        _type: "award",
        year,
        category,
        winner,
        description: pick(doc, "description") || undefined,
        ...(teamId ? { team: { _type: "reference", _ref: teamId } } : {}),
        ...(photo ? { photo } : {}),
      });
      report.awards.migrated++;
    } catch (err) {
      console.warn(`    [fail] award ${category} ${year}: ${err.message}`);
      report.awards.failed++;
    }
  }
}

async function migrateGallery(db) {
  const docs = await db.collection("gallery").find().toArray();
  recordStart("gallery", docs.length);
  for (const doc of docs) {
    const imageUrl = pick(doc, "image", "photo", "url");
    const image = await uploadAssetIfUrl(imageUrl, "image");
    if (!image) {
      report.gallery.skipped++;
      continue;
    }
    try {
      await sanity.createOrReplace({
        _id: `galleryPhoto-${mongoDocId(doc)}`,
        _type: "galleryPhoto",
        image: { ...image, alt: pick(doc, "caption", "title") || "Gallery photo" },
        caption: pick(doc, "caption", "title") || undefined,
        date: toISODate(pick(doc, "date")) || undefined,
        category: pick(doc, "category") || undefined,
      });
      report.gallery.migrated++;
    } catch (err) {
      console.warn(`    [fail] gallery photo ${mongoDocId(doc)}: ${err.message}`);
      report.gallery.failed++;
    }
  }
}

async function migrateSubscribers(db) {
  const docs = await db.collection("subscribers").find().toArray();
  recordStart("subscribers", docs.length);
  for (const doc of docs) {
    const email = pick(doc, "email");
    if (!email) {
      report.subscribers.skipped++;
      continue;
    }
    try {
      await sanity.createOrReplace({
        _id: `subscriber-${slugify(email)}`,
        _type: "subscriber",
        email,
        name: pick(doc, "name") || undefined,
        subscribedAt: toISODateTime(pick(doc, "subscribedAt", "subscribed_at", "createdAt")) || new Date().toISOString(),
      });
      report.subscribers.migrated++;
    } catch (err) {
      console.warn(`    [fail] subscriber ${email}: ${err.message}`);
      report.subscribers.failed++;
    }
  }
}

async function migrateImportantDates(db) {
  const docs = await db.collection("important_dates").find().toArray();
  recordStart("important_dates", docs.length);
  for (const doc of docs) {
    const label = pick(doc, "label", "title");
    const date = toISODate(pick(doc, "date"));
    if (!label || !date) {
      report.important_dates.skipped++;
      continue;
    }
    try {
      await sanity.createOrReplace({
        _id: `importantDate-${date}-${slugify(label)}`,
        _type: "importantDate",
        label,
        date,
        endDate: toISODate(pick(doc, "endDate", "end_date")) || undefined,
        description: pick(doc, "description") || undefined,
        category: pick(doc, "category") || "Admin",
      });
      report.important_dates.migrated++;
    } catch (err) {
      console.warn(`    [fail] important date "${label}": ${err.message}`);
      report.important_dates.failed++;
    }
  }
}

async function migrateRegistrations(db) {
  const docs = await db.collection("registrations").find().toArray();
  recordStart("registrations", docs.length);
  for (const doc of docs) {
    const email = pick(doc, "email");
    if (!email) {
      report.registrations.skipped++;
      continue;
    }
    try {
      await sanity.createOrReplace({
        _id: `registration-mongo-${mongoDocId(doc)}`,
        _type: "registration",
        firstName: pick(doc, "firstName", "first_name") || "",
        lastName: pick(doc, "lastName", "last_name") || "",
        email,
        phone: pick(doc, "phone") || undefined,
        birthYear: pick(doc, "birthYear", "birth_year") ? String(pick(doc, "birthYear", "birth_year")) : undefined,
        experience: pick(doc, "experience") || undefined,
        position: pick(doc, "position") || undefined,
        emergencyContact: pick(doc, "emergencyContact", "emergency_contact") || undefined,
        emergencyPhone: pick(doc, "emergencyPhone", "emergency_phone") || undefined,
        status: pick(doc, "status") || "unpaid",
        emailStatus: pick(doc, "emailStatus", "email_status") || "sent",
        submittedAt: toISODateTime(pick(doc, "submittedAt", "submitted_at", "createdAt")) || new Date().toISOString(),
      });
      report.registrations.migrated++;
    } catch (err) {
      console.warn(`    [fail] registration ${email}: ${err.message}`);
      report.registrations.failed++;
    }
  }
}

async function migrateContacts(db) {
  const docs = await db.collection("contacts").find().toArray();
  recordStart("contacts", docs.length);
  for (const doc of docs) {
    const email = pick(doc, "email");
    const message = pick(doc, "message");
    if (!email || !message) {
      report.contacts.skipped++;
      continue;
    }
    try {
      await sanity.createOrReplace({
        _id: `contactSubmission-mongo-${mongoDocId(doc)}`,
        _type: "contactSubmission",
        name: pick(doc, "name") || "",
        email,
        subject: pick(doc, "subject") || undefined,
        message,
        status: pick(doc, "status") || "new",
        submittedAt: toISODateTime(pick(doc, "submittedAt", "submitted_at", "createdAt")) || new Date().toISOString(),
      });
      report.contacts.migrated++;
    } catch (err) {
      console.warn(`    [fail] contact ${email}: ${err.message}`);
      report.contacts.failed++;
    }
  }
}

async function migrateDocuments(db) {
  const docs = await db.collection("documents").find().toArray();
  recordStart("documents", docs.length);
  for (const doc of docs) {
    const title = pick(doc, "title");
    if (!title) {
      report.documents.skipped++;
      continue;
    }
    const fileUrl = pick(doc, "url", "fileUrl", "file_url");
    const file = await uploadAssetIfUrl(fileUrl, "file");
    try {
      await sanity.createOrReplace({
        // Same id scheme as scripts/migrate-admin-info.js, so this correctly
        // updates the 6 documents already seeded there (e.g. fills in the
        // house-rules PDF if Mongo has a working copy).
        _id: `leagueDocument-${slugify(title)}`,
        _type: "leagueDocument",
        title,
        description: pick(doc, "description") || undefined,
        category: pick(doc, "category") || "General",
        badge: pick(doc, "badge") || undefined,
        order: numOrUndefined(pick(doc, "order")) ?? 0,
        ...(file ? { file } : {}),
      });
      report.documents.migrated++;
    } catch (err) {
      console.warn(`    [fail] document "${title}": ${err.message}`);
      report.documents.failed++;
    }
  }
}

function numOrUndefined(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

// --- explore mode ---------------------------------------------------------

const TARGET_COLLECTIONS = [
  "teams",
  "seasons",
  "games",
  "standings",
  "news",
  "awards",
  "gallery",
  "subscribers",
  "important_dates",
  "registrations",
  "contacts",
  "documents",
];

async function explore(db) {
  const collections = await db.listCollections().toArray();
  console.log(`\nDatabase "${db.databaseName}" has ${collections.length} collections:`);
  console.log("  " + collections.map((c) => c.name).join(", "));

  for (const name of TARGET_COLLECTIONS) {
    const exists = collections.some((c) => c.name === name);
    console.log(`\n--- ${name} ${exists ? "" : "(NOT FOUND in this database)"} ---`);
    if (!exists) continue;
    const coll = db.collection(name);
    const count = await coll.countDocuments();
    console.log(`  ${count} documents`);
    const sample = await coll.find().limit(1).toArray();
    if (sample[0]) {
      console.log("  Sample doc:");
      console.log(
        JSON.stringify(sample[0], null, 2)
          .split("\n")
          .map((l) => "    " + l)
          .join("\n")
      );
    }
  }

  console.log(
    "\nExplore complete — no data was written to Sanity.\n" +
      "Review the field names above, fix any mismatches in the pick(...) calls\n" +
      "in this script if needed, then re-run with --migrate to actually migrate."
  );
}

// --- main -------------------------------------------------------------

async function main() {
  console.log(`Connecting to MongoDB...`);
  const client = new MongoClient(MONGO_URI);
  await client.connect();
  console.log("Connected.");

  const db = client.db(); // uses the db specified in the URI, or MongoDB's default

  if (!MIGRATE) {
    await explore(db);
    await client.close();
    return;
  }

  console.log(`\nMigrating into Sanity project ${projectId}/${dataset}\n`);

  console.log("Teams...");
  const teamIdMap = await migrateTeams(db);
  console.log(`  ${report.teams.migrated} migrated, ${report.teams.skipped} skipped, ${report.teams.failed} failed`);

  console.log("Seasons...");
  await migrateSeasons(db);
  console.log(`  ${report.seasons.migrated} migrated, ${report.seasons.skipped} skipped, ${report.seasons.failed} failed`);

  console.log("Games...");
  await migrateGames(db, teamIdMap);
  console.log(`  ${report.games.migrated} migrated, ${report.games.skipped} skipped, ${report.games.failed} failed`);

  console.log("Standings...");
  await migrateStandings(db, teamIdMap);
  console.log(`  ${report.standings.migrated} migrated, ${report.standings.skipped} skipped, ${report.standings.failed} failed`);

  console.log("News...");
  await migrateNews(db);
  console.log(`  ${report.news.migrated} migrated, ${report.news.skipped} skipped, ${report.news.failed} failed`);

  console.log("Awards...");
  await migrateAwards(db, teamIdMap);
  console.log(`  ${report.awards.migrated} migrated, ${report.awards.skipped} skipped, ${report.awards.failed} failed`);

  console.log("Gallery...");
  await migrateGallery(db);
  console.log(`  ${report.gallery.migrated} migrated, ${report.gallery.skipped} skipped, ${report.gallery.failed} failed`);

  console.log("Subscribers...");
  await migrateSubscribers(db);
  console.log(`  ${report.subscribers.migrated} migrated, ${report.subscribers.skipped} skipped, ${report.subscribers.failed} failed`);

  console.log("Important Dates...");
  await migrateImportantDates(db);
  console.log(
    `  ${report.important_dates.migrated} migrated, ${report.important_dates.skipped} skipped, ${report.important_dates.failed} failed`
  );

  console.log("Registrations...");
  await migrateRegistrations(db);
  console.log(
    `  ${report.registrations.migrated} migrated, ${report.registrations.skipped} skipped, ${report.registrations.failed} failed`
  );

  console.log("Contacts...");
  await migrateContacts(db);
  console.log(`  ${report.contacts.migrated} migrated, ${report.contacts.skipped} skipped, ${report.contacts.failed} failed`);

  console.log("Documents...");
  await migrateDocuments(db);
  console.log(`  ${report.documents.migrated} migrated, ${report.documents.skipped} skipped, ${report.documents.failed} failed`);

  await client.close();

  console.log("\n=== Migration report ===");
  console.table(report);
}

main().catch((err) => {
  console.error("\nMigration failed:", err);
  process.exit(1);
});

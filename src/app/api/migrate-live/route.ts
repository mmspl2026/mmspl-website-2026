import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { MongoClient, type Db } from "mongodb";
import { writeClient } from "@/lib/sanity/client";

// Long-running, one-off ops endpoint — never statically optimized/cached,
// and needs the full Vercel function duration budget (still capped at 60s
// on Hobby regardless of this setting; use ?collections= to split up calls
// if a full run times out).
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

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
] as const;
type CollectionName = (typeof TARGET_COLLECTIONS)[number];

function isAuthorized(req: NextRequest): boolean {
  const expected = process.env.MIGRATION_SECRET;
  if (!expected) return false; // fail closed if not configured
  const provided = req.headers.get("x-migration-secret") || "";
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

// --- generic helpers (identical logic to scripts/migrate-from-mongodb-live.js) ---

function slugify(str: unknown): string {
  return String(str || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function pick(obj: Record<string, unknown> | null | undefined, ...keys: string[]): unknown {
  for (const k of keys) {
    const v = obj?.[k];
    if (v !== undefined && v !== null && v !== "") return v;
  }
  return undefined;
}

function mongoDocId(doc: Record<string, unknown>): string {
  const id = pick(doc, "id");
  if (id !== undefined) return String(id);
  return String((doc as { _id: unknown })._id);
}

function toISODate(value: unknown): string | undefined {
  if (!value) return undefined;
  if (typeof value === "string") return value.slice(0, 10);
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === "object" && value !== null && "$date" in value) {
    return new Date((value as { $date: string }).$date).toISOString().slice(0, 10);
  }
  return undefined;
}

function toISODateTime(value: unknown): string | undefined {
  if (!value) return undefined;
  if (typeof value === "string") return new Date(value).toISOString();
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object" && value !== null && "$date" in value) {
    return new Date((value as { $date: string }).$date).toISOString();
  }
  return undefined;
}

function numOrUndefined(v: unknown): number | undefined {
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

async function fetchWithRetry(url: string, attempts = 3): Promise<Buffer> {
  let lastErr: unknown;
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

type AssetRef = { _type: "image" | "file"; asset: { _type: "reference"; _ref: string } };

async function uploadAssetIfUrl(
  url: unknown,
  kind: "image" | "file",
  cache: Map<string, AssetRef>
): Promise<AssetRef | null> {
  if (!url || typeof url !== "string" || !/^https?:\/\//.test(url)) return null;
  const cached = cache.get(url);
  if (cached) return cached;
  try {
    const buffer = await fetchWithRetry(url);
    const filename = new URL(url).pathname.split("/").pop() || `asset-${Date.now()}`;
    const asset = await writeClient.assets.upload(kind, buffer, { filename });
    const ref: AssetRef = { _type: kind, asset: { _type: "reference", _ref: asset._id } };
    cache.set(url, ref);
    return ref;
  } catch (err) {
    console.warn(`[asset upload failed] ${url}:`, err instanceof Error ? err.message : err);
    return null;
  }
}

interface CollectionReport {
  total: number;
  migrated: number;
  skipped: number;
  failed: number;
}

type Report = Partial<Record<CollectionName, CollectionReport>>;

// --- per-collection transforms (same field-name guesses + _id schemes as the local script) ---

async function migrateTeams(db: Db, report: Report, assetCache: Map<string, AssetRef>) {
  const docs = await db.collection("teams").find().toArray();
  const r: CollectionReport = { total: docs.length, migrated: 0, skipped: 0, failed: 0 };
  const idMap = new Map<string, string>();
  for (const doc of docs) {
    const name = pick(doc, "name", "team_name", "teamName") as string | undefined;
    if (!name) {
      r.skipped++;
      continue;
    }
    const _id = `team-${slugify(name)}`;
    const logo = await uploadAssetIfUrl(pick(doc, "logo", "logoUrl", "logo_url", "image"), "image", assetCache);
    try {
      await writeClient.createOrReplace({
        _id,
        _type: "team",
        name,
        shortName: (pick(doc, "shortName", "short_name", "abbreviation") as string) || undefined,
        division: (pick(doc, "division") as string) || undefined,
        color: (pick(doc, "color", "colour") as string) || undefined,
        ...(logo ? { logo } : {}),
      });
      idMap.set(name, _id);
      r.migrated++;
    } catch {
      r.failed++;
    }
  }
  report.teams = r;
  return idMap;
}

async function migrateSeasons(db: Db, report: Report) {
  const docs = await db.collection("seasons").find().toArray();
  const r: CollectionReport = { total: docs.length, migrated: 0, skipped: 0, failed: 0 };
  for (const doc of docs) {
    const year = Number(pick(doc, "year"));
    if (!year) {
      r.skipped++;
      continue;
    }
    try {
      await writeClient.createOrReplace({
        _id: `season-${year}`,
        _type: "season",
        year,
        isActive: Boolean(pick(doc, "isActive", "is_active", "active")),
        regularSeasonStart: toISODate(pick(doc, "regularSeasonStart", "regular_season_start", "seasonStart")),
        regularSeasonEnd: toISODate(pick(doc, "regularSeasonEnd", "regular_season_end", "seasonEnd")),
        playoffCutoff: Number(pick(doc, "playoffCutoff", "playoff_cutoff")) || 8,
      });
      r.migrated++;
    } catch {
      r.failed++;
    }
  }
  report.seasons = r;
}

async function migrateGames(db: Db, report: Report, teamIdMap: Map<string, string>) {
  const docs = await db.collection("games").find().toArray();
  const r: CollectionReport = { total: docs.length, migrated: 0, skipped: 0, failed: 0 };
  for (const doc of docs) {
    const date = toISODate(pick(doc, "date"));
    const homeName = pick(doc, "homeTeam", "home_team", "home") as string | undefined;
    const awayName = pick(doc, "awayTeam", "away_team", "away") as string | undefined;
    const homeId = homeName ? teamIdMap.get(homeName) : undefined;
    const awayId = awayName ? teamIdMap.get(awayName) : undefined;
    if (!date || !homeId || !awayId) {
      r.skipped++;
      continue;
    }
    const year = Number(pick(doc, "year")) || Number(date.slice(0, 4));
    try {
      await writeClient.createOrReplace({
        _id: `game-${year}-${mongoDocId(doc)}`,
        _type: "game",
        season: { _type: "reference", _ref: `season-${year}` },
        date,
        time: (pick(doc, "time") as string) || "",
        field: (pick(doc, "field", "location", "park") as string) || "",
        homeTeam: { _type: "reference", _ref: homeId },
        awayTeam: { _type: "reference", _ref: awayId },
        homeScore: numOrUndefined(pick(doc, "homeScore", "home_score")),
        awayScore: numOrUndefined(pick(doc, "awayScore", "away_score")),
        status: (pick(doc, "status") as string) || "scheduled",
      });
      r.migrated++;
    } catch {
      r.failed++;
    }
  }
  report.games = r;
}

async function migrateStandings(db: Db, report: Report, teamIdMap: Map<string, string>) {
  const docs = await db.collection("standings").find().toArray();
  const r: CollectionReport = { total: docs.length, migrated: 0, skipped: 0, failed: 0 };
  for (const doc of docs) {
    const year = Number(pick(doc, "year", "season"));
    const teamName = pick(doc, "team", "teamName", "team_name") as string | undefined;
    const teamId = teamName ? teamIdMap.get(teamName) : undefined;
    if (!year || !teamId) {
      r.skipped++;
      continue;
    }
    try {
      await writeClient.createOrReplace({
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
      r.migrated++;
    } catch {
      r.failed++;
    }
  }
  report.standings = r;
}

async function migrateNews(db: Db, report: Report, assetCache: Map<string, AssetRef>) {
  const docs = await db.collection("news").find().toArray();
  const r: CollectionReport = { total: docs.length, migrated: 0, skipped: 0, failed: 0 };
  for (const doc of docs) {
    const title = pick(doc, "title") as string | undefined;
    if (!title) {
      r.skipped++;
      continue;
    }
    const photo = await uploadAssetIfUrl(pick(doc, "photo", "image", "photoUrl"), "image", assetCache);
    const bodyText = pick(doc, "body", "content", "text");
    try {
      await writeClient.createOrReplace({
        _id: `news-${mongoDocId(doc)}`,
        _type: "news",
        title,
        slug: { _type: "slug", current: slugify(title) },
        date: toISODateTime(pick(doc, "date", "publishedAt", "published_at")) || new Date().toISOString(),
        tag: (pick(doc, "tag", "category") as string) || undefined,
        body: bodyText
          ? [{ _type: "block", _key: "body0", style: "normal", children: [{ _type: "span", _key: "span0", text: String(bodyText) }] }]
          : [],
        ...(photo ? { photo } : {}),
      });
      r.migrated++;
    } catch {
      r.failed++;
    }
  }
  report.news = r;
}

async function migrateAwards(db: Db, report: Report, teamIdMap: Map<string, string>, assetCache: Map<string, AssetRef>) {
  const docs = await db.collection("awards").find().toArray();
  const r: CollectionReport = { total: docs.length, migrated: 0, skipped: 0, failed: 0 };
  for (const doc of docs) {
    const category = pick(doc, "category") as string | undefined;
    const year = Number(pick(doc, "year"));
    const winner = pick(doc, "winner") as string | undefined;
    if (!category || !year || !winner) {
      r.skipped++;
      continue;
    }
    const photo = await uploadAssetIfUrl(pick(doc, "photo", "image"), "image", assetCache);
    const teamId = teamIdMap.get(winner);
    try {
      await writeClient.createOrReplace({
        _id: `award-${slugify(category)}-${year}`,
        _type: "award",
        year,
        category,
        winner,
        description: (pick(doc, "description") as string) || undefined,
        ...(teamId ? { team: { _type: "reference", _ref: teamId } } : {}),
        ...(photo ? { photo } : {}),
      });
      r.migrated++;
    } catch {
      r.failed++;
    }
  }
  report.awards = r;
}

async function migrateGallery(db: Db, report: Report, assetCache: Map<string, AssetRef>) {
  const docs = await db.collection("gallery").find().toArray();
  const r: CollectionReport = { total: docs.length, migrated: 0, skipped: 0, failed: 0 };
  for (const doc of docs) {
    const image = await uploadAssetIfUrl(pick(doc, "image", "photo", "url"), "image", assetCache);
    if (!image) {
      r.skipped++;
      continue;
    }
    try {
      await writeClient.createOrReplace({
        _id: `galleryPhoto-${mongoDocId(doc)}`,
        _type: "galleryPhoto",
        image: { ...image, alt: (pick(doc, "caption", "title") as string) || "Gallery photo" },
        caption: (pick(doc, "caption", "title") as string) || undefined,
        date: toISODate(pick(doc, "date")) || undefined,
        category: (pick(doc, "category") as string) || undefined,
      });
      r.migrated++;
    } catch {
      r.failed++;
    }
  }
  report.gallery = r;
}

async function migrateSubscribers(db: Db, report: Report) {
  const docs = await db.collection("subscribers").find().toArray();
  const r: CollectionReport = { total: docs.length, migrated: 0, skipped: 0, failed: 0 };
  for (const doc of docs) {
    const email = pick(doc, "email") as string | undefined;
    if (!email) {
      r.skipped++;
      continue;
    }
    try {
      await writeClient.createOrReplace({
        _id: `subscriber-${slugify(email)}`,
        _type: "subscriber",
        email,
        name: (pick(doc, "name") as string) || undefined,
        subscribedAt: toISODateTime(pick(doc, "subscribedAt", "subscribed_at", "createdAt")) || new Date().toISOString(),
      });
      r.migrated++;
    } catch {
      r.failed++;
    }
  }
  report.subscribers = r;
}

async function migrateImportantDates(db: Db, report: Report) {
  const docs = await db.collection("important_dates").find().toArray();
  const r: CollectionReport = { total: docs.length, migrated: 0, skipped: 0, failed: 0 };
  for (const doc of docs) {
    const label = pick(doc, "label", "title") as string | undefined;
    const date = toISODate(pick(doc, "date"));
    if (!label || !date) {
      r.skipped++;
      continue;
    }
    try {
      await writeClient.createOrReplace({
        _id: `importantDate-${date}-${slugify(label)}`,
        _type: "importantDate",
        label,
        date,
        endDate: toISODate(pick(doc, "endDate", "end_date")) || undefined,
        description: (pick(doc, "description") as string) || undefined,
        category: (pick(doc, "category") as string) || "Admin",
      });
      r.migrated++;
    } catch {
      r.failed++;
    }
  }
  report.important_dates = r;
}

async function migrateRegistrations(db: Db, report: Report) {
  const docs = await db.collection("registrations").find().toArray();
  const r: CollectionReport = { total: docs.length, migrated: 0, skipped: 0, failed: 0 };
  for (const doc of docs) {
    const email = pick(doc, "email") as string | undefined;
    if (!email) {
      r.skipped++;
      continue;
    }
    try {
      await writeClient.createOrReplace({
        _id: `registration-mongo-${mongoDocId(doc)}`,
        _type: "registration",
        firstName: (pick(doc, "firstName", "first_name") as string) || "",
        lastName: (pick(doc, "lastName", "last_name") as string) || "",
        email,
        phone: (pick(doc, "phone") as string) || undefined,
        birthYear: pick(doc, "birthYear", "birth_year") ? String(pick(doc, "birthYear", "birth_year")) : undefined,
        experience: (pick(doc, "experience") as string) || undefined,
        position: (pick(doc, "position") as string) || undefined,
        emergencyContact: (pick(doc, "emergencyContact", "emergency_contact") as string) || undefined,
        emergencyPhone: (pick(doc, "emergencyPhone", "emergency_phone") as string) || undefined,
        status: (pick(doc, "status") as string) || "unpaid",
        emailStatus: (pick(doc, "emailStatus", "email_status") as string) || "sent",
        submittedAt: toISODateTime(pick(doc, "submittedAt", "submitted_at", "createdAt")) || new Date().toISOString(),
      });
      r.migrated++;
    } catch {
      r.failed++;
    }
  }
  report.registrations = r;
}

async function migrateContacts(db: Db, report: Report) {
  const docs = await db.collection("contacts").find().toArray();
  const r: CollectionReport = { total: docs.length, migrated: 0, skipped: 0, failed: 0 };
  for (const doc of docs) {
    const email = pick(doc, "email") as string | undefined;
    const message = pick(doc, "message") as string | undefined;
    if (!email || !message) {
      r.skipped++;
      continue;
    }
    try {
      await writeClient.createOrReplace({
        _id: `contactSubmission-mongo-${mongoDocId(doc)}`,
        _type: "contactSubmission",
        name: (pick(doc, "name") as string) || "",
        email,
        subject: (pick(doc, "subject") as string) || undefined,
        message,
        status: (pick(doc, "status") as string) || "new",
        submittedAt: toISODateTime(pick(doc, "submittedAt", "submitted_at", "createdAt")) || new Date().toISOString(),
      });
      r.migrated++;
    } catch {
      r.failed++;
    }
  }
  report.contacts = r;
}

async function migrateDocuments(db: Db, report: Report, assetCache: Map<string, AssetRef>) {
  const docs = await db.collection("documents").find().toArray();
  const r: CollectionReport = { total: docs.length, migrated: 0, skipped: 0, failed: 0 };
  for (const doc of docs) {
    const title = pick(doc, "title") as string | undefined;
    if (!title) {
      r.skipped++;
      continue;
    }
    const file = await uploadAssetIfUrl(pick(doc, "url", "fileUrl", "file_url"), "file", assetCache);
    try {
      await writeClient.createOrReplace({
        // Same id scheme as scripts/migrate-admin-info.js — updates the
        // 6 documents seeded there rather than duplicating them.
        _id: `leagueDocument-${slugify(title)}`,
        _type: "leagueDocument",
        title,
        description: (pick(doc, "description") as string) || undefined,
        category: (pick(doc, "category") as string) || "General",
        badge: (pick(doc, "badge") as string) || undefined,
        order: numOrUndefined(pick(doc, "order")) ?? 0,
        ...(file ? { file } : {}),
      });
      r.migrated++;
    } catch {
      r.failed++;
    }
  }
  report.documents = r;
}

// --- explore mode ---------------------------------------------------------

async function explore(db: Db, only: CollectionName[] | null) {
  const collections = await db.listCollections().toArray();
  const names = collections.map((c) => c.name);
  const targets = only ?? TARGET_COLLECTIONS;

  const perCollection: Record<string, { found: boolean; count?: number; sample?: unknown }> = {};
  for (const name of targets) {
    const found = names.includes(name);
    if (!found) {
      perCollection[name] = { found: false };
      continue;
    }
    const coll = db.collection(name);
    const count = await coll.countDocuments();
    const [sample] = await coll.find().limit(1).toArray();
    perCollection[name] = { found: true, count, sample: sample ?? null };
  }

  return { allCollectionsInDb: names, target: perCollection };
}

// --- migrate mode -----------------------------------------------------

async function migrate(db: Db, only: CollectionName[] | null): Promise<Report> {
  const report: Report = {};
  const assetCache = new Map<string, AssetRef>();
  const run = (name: CollectionName) => !only || only.includes(name);

  // teams must run first — every other collection's transform looks up
  // team references by name from the map it returns.
  const teamIdMap = run("teams") ? await migrateTeams(db, report, assetCache) : new Map<string, string>();

  if (run("seasons")) await migrateSeasons(db, report);
  if (run("games")) await migrateGames(db, report, teamIdMap);
  if (run("standings")) await migrateStandings(db, report, teamIdMap);
  if (run("news")) await migrateNews(db, report, assetCache);
  if (run("awards")) await migrateAwards(db, report, teamIdMap, assetCache);
  if (run("gallery")) await migrateGallery(db, report, assetCache);
  if (run("subscribers")) await migrateSubscribers(db, report);
  if (run("important_dates")) await migrateImportantDates(db, report);
  if (run("registrations")) await migrateRegistrations(db, report);
  if (run("contacts")) await migrateContacts(db, report);
  if (run("documents")) await migrateDocuments(db, report, assetCache);

  return report;
}

// --- route handler ------------------------------------------------------

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    return NextResponse.json({ error: "MONGODB_URI is not configured." }, { status: 500 });
  }

  const body = await req.json().catch(() => ({}));
  const mode = body?.mode === "migrate" ? "migrate" : "explore"; // defaults to the safe, read-only mode
  const collectionsParam: unknown = body?.collections;
  const only: CollectionName[] | null =
    Array.isArray(collectionsParam) && collectionsParam.length > 0
      ? (collectionsParam.filter((c): c is CollectionName => TARGET_COLLECTIONS.includes(c)) as CollectionName[])
      : null;

  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db();

    if (mode === "explore") {
      const result = await explore(db, only);
      return NextResponse.json({ mode, database: db.databaseName, ...result });
    }

    const report = await migrate(db, only);
    return NextResponse.json({ mode, database: db.databaseName, report });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Migration failed." }, { status: 500 });
  } finally {
    await client.close();
  }
}

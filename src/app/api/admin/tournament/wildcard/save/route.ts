import { NextRequest, NextResponse } from "next/server";
import { requireAdminApiAuth } from "@/lib/admin-auth";
import { writeClient } from "@/lib/sanity/client";
import { wildCardRankingsQuery } from "@/lib/sanity/queries";
import type { TournamentType, WildCardRanking } from "@/lib/types";

function isTournamentType(value: unknown): value is TournamentType {
  return value === "charity" || value === "mcgregor";
}

interface IncomingEntry {
  rank: number;
  teamName: string;
  pool?: string;
  wins: number;
  losses: number;
  ties: number;
  runDifferential: number;
  advanced: boolean;
}

function isValidEntry(e: unknown): e is IncomingEntry {
  if (!e || typeof e !== "object") return false;
  const r = e as Record<string, unknown>;
  return (
    typeof r.rank === "number" &&
    typeof r.teamName === "string" &&
    typeof r.wins === "number" &&
    typeof r.losses === "number" &&
    typeof r.ties === "number" &&
    typeof r.runDifferential === "number" &&
    typeof r.advanced === "boolean"
  );
}

// Commits a reviewed Wild Card ranking (from /wildcard/compute, possibly
// hand-reordered by the admin to resolve a coin-flip tie) as real
// wildCardRanking documents — replaces whatever was saved before for this
// year/type, since this can be re-run as Thu-Sat scores get corrected.
export async function POST(req: NextRequest) {
  const auth = await requireAdminApiAuth(req);
  if ("response" in auth) return auth.response;

  const body = await req.json().catch(() => null);
  const year = Number(body?.year);
  const type = body?.type;
  const entries = Array.isArray(body?.wildCard) ? body.wildCard : null;
  if (!Number.isInteger(year) || !isTournamentType(type) || !entries || entries.length === 0) {
    return NextResponse.json({ error: "Missing or invalid year/type/wildCard." }, { status: 400 });
  }
  if (!entries.every(isValidEntry)) {
    return NextResponse.json({ error: "Malformed ranking entry." }, { status: 400 });
  }

  const existing = await writeClient.fetch<{ _id: string }[]>(
    `*[_type == "wildCardRanking" && year == $year && type == $type]{_id}`,
    { year, type }
  );

  const tx = writeClient.transaction();
  for (const doc of existing) tx.delete(doc._id);
  for (const entry of entries as IncomingEntry[]) {
    tx.create({
      _type: "wildCardRanking",
      year,
      type,
      rank: entry.rank,
      teamName: entry.teamName,
      pool: entry.pool,
      points: entry.wins * 2 + entry.ties,
      wins: entry.wins,
      losses: entry.losses,
      ties: entry.ties,
      runDifferential: entry.runDifferential,
      advanced: entry.advanced,
    });
  }
  await tx.commit();

  const saved = await writeClient.fetch<WildCardRanking[]>(wildCardRankingsQuery, { year, type });
  return NextResponse.json({ wildCardRankings: saved });
}

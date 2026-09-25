import { NextRequest, NextResponse } from "next/server";
import { hasFreshStepUp, requireAdminApiAuth } from "@/lib/admin-auth";
import { writeClient } from "@/lib/sanity/client";
import { adminUserNameQuery, seasonByYearQuery, standingsBySeasonQuery } from "@/lib/sanity/queries";
import { isStandingsLocked } from "@/lib/standingsLock";
import { getTodayEastern } from "@/utils/timezone";
import { logAdminAction, getClientIp } from "@/lib/auditLog";
import type { Standing } from "@/lib/types";

interface RowEdit {
  _id: string;
  wins: number;
  losses: number;
  ties: number;
}

export async function POST(req: NextRequest) {
  const auth = await requireAdminApiAuth(req);
  if ("response" in auth) return auth.response;
  const { session } = auth;

  const body = await req.json().catch(() => null);
  const rows: RowEdit[] = Array.isArray(body?.rows) ? body.rows : [];
  const seasonYear = Number(body?.seasonYear);

  if (rows.length === 0 || !Number.isFinite(seasonYear)) {
    return NextResponse.json({ error: "Missing rows or seasonYear." }, { status: 400 });
  }

  for (const row of rows) {
    if (!row._id || [row.wins, row.losses, row.ties].some((n) => !Number.isFinite(n) || n < 0)) {
      return NextResponse.json({ error: "Each row needs a valid id and non-negative W/L/T." }, { status: 400 });
    }
  }

  const season = await writeClient.fetch<{ _id: string; isActive?: boolean; regularSeasonEnd?: string } | null>(
    seasonByYearQuery,
    { year: seasonYear }
  );
  if (season && isStandingsLocked(season, getTodayEastern()) && !hasFreshStepUp(session)) {
    return NextResponse.json(
      { error: `${seasonYear} standings are locked (season complete). Unlock to edit.`, locked: true },
      { status: 423 }
    );
  }

  const before = await writeClient.fetch<Standing[]>(standingsBySeasonQuery, { year: seasonYear });
  const beforeById = new Map(before.map((s) => [s._id, s]));

  const tx = writeClient.transaction();
  for (const row of rows) {
    tx.patch(row._id, (p) => p.set({ wins: row.wins, losses: row.losses, ties: row.ties }));
  }
  await tx.commit();

  const changes = rows
    .map((row) => {
      const prev = beforeById.get(row._id);
      if (!prev) return null;
      const changed = prev.wins !== row.wins || prev.losses !== row.losses || prev.ties !== row.ties;
      if (!changed) return null;
      return `${prev.team.name}: W ${prev.wins}→${row.wins}, L ${prev.losses}→${row.losses}, T ${prev.ties}→${row.ties}`;
    })
    .filter((s): s is string => Boolean(s));

  if (changes.length > 0) {
    const user = await writeClient.fetch<{ name: string } | null>(adminUserNameQuery, { id: session.uid });
    await logAdminAction({
      action: "standings.save",
      performedByUid: session.uid,
      performedByName: user?.name || "(unknown)",
      seasonYear,
      summary: changes.join("; "),
      ip: getClientIp(req),
    });
  }

  const standings = await writeClient.fetch<Standing[]>(standingsBySeasonQuery, { year: seasonYear });
  return NextResponse.json({ standings });
}

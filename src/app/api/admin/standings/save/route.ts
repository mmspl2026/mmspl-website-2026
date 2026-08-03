import { NextRequest, NextResponse } from "next/server";
import { requireAdminApiAuth } from "@/lib/admin-auth";
import { writeClient } from "@/lib/sanity/client";
import { standingsBySeasonQuery } from "@/lib/sanity/queries";
import type { Standing } from "@/lib/types";

interface RowEdit {
  _id: string;
  wins: number;
  losses: number;
  ties: number;
}

export async function POST(req: NextRequest) {
  const auth = requireAdminApiAuth(req);
  if ("response" in auth) return auth.response;

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

  const tx = writeClient.transaction();
  for (const row of rows) {
    tx.patch(row._id, (p) => p.set({ wins: row.wins, losses: row.losses, ties: row.ties }));
  }
  await tx.commit();

  const standings = await writeClient.fetch<Standing[]>(standingsBySeasonQuery, { year: seasonYear });
  return NextResponse.json({ standings });
}

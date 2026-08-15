import { NextRequest, NextResponse } from "next/server";
import { requireAdminApiAuth } from "@/lib/admin-auth";
import { writeClient } from "@/lib/sanity/client";
import { allAwardsQuery } from "@/lib/sanity/queries";
import type { Award } from "@/lib/types";

export async function GET(req: NextRequest) {
  const auth = await requireAdminApiAuth(req);
  if ("response" in auth) return auth.response;

  const awards = await writeClient.fetch<Award[]>(allAwardsQuery);
  return NextResponse.json({ awards });
}

export async function POST(req: NextRequest) {
  const auth = await requireAdminApiAuth(req);
  if ("response" in auth) return auth.response;

  const body = await req.json().catch(() => null);
  if (!body?.category || !body?.year || !body?.winner) {
    return NextResponse.json({ error: "Category, year, and winner are required." }, { status: 400 });
  }

  const doc = await writeClient.create({
    _type: "award",
    category: body.category,
    year: Number(body.year),
    winner: body.winner,
  });

  return NextResponse.json({ award: doc });
}

import { NextRequest, NextResponse } from "next/server";
import { requireAdminApiAuth } from "@/lib/admin-auth";
import { writeClient } from "@/lib/sanity/client";
import { allLeagueDocumentsAdminQuery } from "@/lib/sanity/queries";
import type { LeagueDocument } from "@/lib/types";

const CATEGORIES = ["Rules & Regulations", "AGM Documents", "General"];
const BADGES = ["PASSED", "FAILED", "NA"];

export async function GET(req: NextRequest) {
  const auth = await requireAdminApiAuth(req);
  if ("response" in auth) return auth.response;

  const documents = await writeClient.fetch<LeagueDocument[]>(allLeagueDocumentsAdminQuery);
  return NextResponse.json({ documents });
}

export async function POST(req: NextRequest) {
  const auth = await requireAdminApiAuth(req);
  if ("response" in auth) return auth.response;

  const body = await req.json().catch(() => null);
  const title = typeof body?.title === "string" ? body.title.trim() : "";
  const category = typeof body?.category === "string" ? body.category : "";
  const description = typeof body?.description === "string" ? body.description.trim() : "";
  const year = Number.isFinite(Number(body?.year)) ? Number(body.year) : undefined;
  const badge = typeof body?.badge === "string" ? body.badge : "";
  const file = body?.file;

  if (!title) {
    return NextResponse.json({ error: "Title is required." }, { status: 400 });
  }
  if (!CATEGORIES.includes(category)) {
    return NextResponse.json({ error: "A valid category is required." }, { status: 400 });
  }
  if (badge && !BADGES.includes(badge)) {
    return NextResponse.json({ error: "Invalid status." }, { status: 400 });
  }

  const doc = await writeClient.create({
    _type: "leagueDocument",
    title,
    category,
    description: description || undefined,
    year,
    badge: category === "AGM Documents" && badge ? badge : undefined,
    file: file || undefined,
    order: 0,
  });

  return NextResponse.json({ document: doc });
}

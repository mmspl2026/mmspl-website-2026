import { NextRequest, NextResponse } from "next/server";
import { requireAdminApiAuth } from "@/lib/admin-auth";
import { writeClient } from "@/lib/sanity/client";
import { allLeagueDocumentsAdminQuery } from "@/lib/sanity/queries";
import { plainTextToBlocks } from "@/lib/newsBody";
import type { LeagueDocument } from "@/lib/types";

const CATEGORIES = ["Rules & Regulations", "AGM Documents", "General"];
const BADGES = ["PASSED", "FAILED", "NA"];

function slugify(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 96);
}

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
  const contentType = body?.contentType === "page" ? "page" : "file";
  const pageText = typeof body?.pageBody === "string" ? body.pageBody.trim() : "";

  if (!title) {
    return NextResponse.json({ error: "Title is required." }, { status: 400 });
  }
  if (!CATEGORIES.includes(category)) {
    return NextResponse.json({ error: "A valid category is required." }, { status: 400 });
  }
  if (badge && !BADGES.includes(badge)) {
    return NextResponse.json({ error: "Invalid status." }, { status: 400 });
  }
  if (contentType === "page" && !pageText) {
    return NextResponse.json({ error: "Page content is required for a Written Page." }, { status: 400 });
  }

  let slug: { _type: "slug"; current: string } | undefined;
  if (contentType === "page") {
    const base = slugify(title);
    const existing = await writeClient.fetch<number>(
      `count(*[_type == "leagueDocument" && slug.current == $slug])`,
      { slug: base }
    );
    slug = { _type: "slug", current: existing > 0 ? `${base}-${Date.now().toString(36)}` : base };
  }

  const doc = await writeClient.create({
    _type: "leagueDocument",
    title,
    category,
    description: description || undefined,
    year,
    badge: category === "AGM Documents" && badge ? badge : undefined,
    contentType,
    slug,
    pageBody: contentType === "page" ? plainTextToBlocks(pageText) : undefined,
    file: contentType === "file" ? file || undefined : undefined,
    order: 0,
  });

  return NextResponse.json({ document: doc });
}

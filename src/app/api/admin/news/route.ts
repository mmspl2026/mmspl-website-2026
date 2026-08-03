import { NextRequest, NextResponse } from "next/server";
import { requireAdminApiAuth } from "@/lib/admin-auth";
import { writeClient } from "@/lib/sanity/client";
import { allNewsAdminQuery } from "@/lib/sanity/queries";
import type { NewsItem } from "@/lib/types";

function slugify(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 96);
}

export async function GET(req: NextRequest) {
  const auth = requireAdminApiAuth(req);
  if ("response" in auth) return auth.response;

  const news = await writeClient.fetch<NewsItem[]>(allNewsAdminQuery);
  return NextResponse.json({ news });
}

export async function POST(req: NextRequest) {
  const auth = requireAdminApiAuth(req);
  if ("response" in auth) return auth.response;

  const body = await req.json().catch(() => null);
  if (!body?.title || !body?.body) {
    return NextResponse.json({ error: "Title and body are required." }, { status: 400 });
  }

  const slug = slugify(body.title);
  const existing = await writeClient.fetch<number>(`count(*[_type == "news" && slug.current == $slug])`, { slug });
  const uniqueSlug = existing > 0 ? `${slug}-${Date.now().toString(36)}` : slug;

  const doc = await writeClient.create({
    _type: "news",
    title: body.title,
    slug: { _type: "slug", current: uniqueSlug },
    body: [{ _type: "block", _key: "body0", style: "normal", children: [{ _type: "span", _key: "span0", text: body.body }] }],
    photo: body.photo || undefined,
    date: body.date || new Date().toISOString(),
    tag: body.tag || undefined,
  });

  return NextResponse.json({ news: doc });
}

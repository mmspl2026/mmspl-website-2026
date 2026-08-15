import { NextRequest, NextResponse } from "next/server";
import { sanityFetch } from "@/lib/sanity/client";
import { leagueDocumentFileByIdQuery } from "@/lib/sanity/queries";

interface DocumentFile {
  url?: string;
  filename?: string;
  mimeType?: string;
}

/**
 * Streams a league document's file through our own domain instead of
 * linking straight to the Sanity CDN — visitors never see a sanity.io URL,
 * on hover, on click, or in the address bar after opening/downloading it.
 */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const doc = await sanityFetch<DocumentFile | null>(leagueDocumentFileByIdQuery, { id: params.id }, null);
  if (!doc?.url) {
    return NextResponse.json({ error: "Document not found." }, { status: 404 });
  }

  // Opt this out of Next.js's own fetch data-cache (which caps cached items
  // at 2MB and would warn/skip on larger documents) — the Cache-Control
  // header below already handles caching at the browser/edge layer, which
  // is the right place for this, not Next's per-request data cache.
  const upstream = await fetch(doc.url, { cache: "no-store" });
  if (!upstream.ok || !upstream.body) {
    return NextResponse.json({ error: "Failed to load document." }, { status: 502 });
  }

  const download = req.nextUrl.searchParams.get("dl") === "1";
  const filename = (doc.filename || "document").replace(/"/g, "");

  const headers = new Headers();
  headers.set("Content-Type", doc.mimeType || upstream.headers.get("content-type") || "application/octet-stream");
  const contentLength = upstream.headers.get("content-length");
  if (contentLength) headers.set("Content-Length", contentLength);
  headers.set("Content-Disposition", `${download ? "attachment" : "inline"}; filename="${filename}"`);
  // s-maxage tells Vercel's edge network to cache the response itself, so
  // only the very first request per document (per hour) actually hits this
  // function and fetches from Sanity — everyone after that is served
  // straight from the edge, same speed as linking to the CDN directly.
  // stale-while-revalidate keeps it instant even past that, refreshing in
  // the background instead of making a visitor wait.
  headers.set("Cache-Control", "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800");

  return new NextResponse(upstream.body, { headers });
}

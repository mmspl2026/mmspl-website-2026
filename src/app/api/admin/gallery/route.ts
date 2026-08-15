import { NextRequest, NextResponse } from "next/server";
import { requireAdminApiAuth } from "@/lib/admin-auth";
import { writeClient } from "@/lib/sanity/client";
import { allGalleryPhotosQuery } from "@/lib/sanity/queries";
import type { GalleryPhoto } from "@/lib/types";

export async function GET(req: NextRequest) {
  const auth = await requireAdminApiAuth(req);
  if ("response" in auth) return auth.response;

  const photos = await writeClient.fetch<GalleryPhoto[]>(allGalleryPhotosQuery);
  return NextResponse.json({ photos });
}

export async function POST(req: NextRequest) {
  const auth = await requireAdminApiAuth(req);
  if ("response" in auth) return auth.response;

  const body = await req.json().catch(() => null);
  if (!body?.image) {
    return NextResponse.json({ error: "Image is required." }, { status: 400 });
  }

  const doc = await writeClient.create({
    _type: "galleryPhoto",
    image: { ...body.image, alt: body.caption || "Gallery photo" },
    caption: body.caption || undefined,
    date: body.date || undefined,
    category: body.category || undefined,
  });

  return NextResponse.json({ photo: doc });
}

import { NextRequest, NextResponse } from "next/server";
import { requireAdminApiAuth } from "@/lib/admin-auth";
import { writeClient } from "@/lib/sanity/client";
import { galleryCategoriesQuery } from "@/lib/sanity/queries";

async function getOrCreateSettingsId(): Promise<string> {
  const existing = await writeClient.fetch<{ _id: string } | null>(`*[_type == "adminSettings"][0]{_id}`);
  if (existing) return existing._id;
  const created = await writeClient.create({ _type: "adminSettings" });
  return created._id;
}

export async function GET(req: NextRequest) {
  const auth = requireAdminApiAuth(req);
  if ("response" in auth) return auth.response;

  const categories = await writeClient.fetch<string[] | null>(galleryCategoriesQuery);
  return NextResponse.json({ categories: categories ?? [] });
}

export async function PATCH(req: NextRequest) {
  const auth = requireAdminApiAuth(req);
  if ("response" in auth) return auth.response;

  const body = await req.json().catch(() => null);
  if (!Array.isArray(body?.categories)) {
    return NextResponse.json({ error: "categories must be an array." }, { status: 400 });
  }

  const id = await getOrCreateSettingsId();
  await writeClient.patch(id).set({ galleryCategories: body.categories }).commit();
  return NextResponse.json({ categories: body.categories });
}

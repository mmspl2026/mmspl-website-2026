import { NextRequest, NextResponse } from "next/server";
import { requireAdminApiAuth } from "@/lib/admin-auth";
import { writeClient } from "@/lib/sanity/client";
import { allSeasonsQuery } from "@/lib/sanity/queries";
import type { Season } from "@/lib/types";

export async function GET(req: NextRequest) {
  const auth = await requireAdminApiAuth(req);
  if ("response" in auth) return auth.response;

  const seasons = await writeClient.fetch<Season[]>(allSeasonsQuery);
  return NextResponse.json({ seasons });
}

import { NextRequest, NextResponse } from "next/server";
import { requireAdminApiAuth } from "@/lib/admin-auth";
import { writeClient } from "@/lib/sanity/client";
import { activeSeasonDatesQuery } from "@/lib/sanity/queries";

export async function GET(req: NextRequest) {
  const auth = await requireAdminApiAuth(req);
  if ("response" in auth) return auth.response;

  const dates = await writeClient.fetch<string[]>(activeSeasonDatesQuery);
  return NextResponse.json({ dates });
}

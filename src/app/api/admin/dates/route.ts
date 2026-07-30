import { NextRequest, NextResponse } from "next/server";
import { requireAdminApiAuth } from "@/lib/admin-auth";
import { writeClient } from "@/lib/sanity/client";
import { activeSeasonDatesQuery } from "@/lib/sanity/queries";

export async function GET(req: NextRequest) {
  const unauthorized = requireAdminApiAuth(req);
  if (unauthorized) return unauthorized;

  const dates = await writeClient.fetch<string[]>(activeSeasonDatesQuery);
  return NextResponse.json({ dates });
}

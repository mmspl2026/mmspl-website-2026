import { NextRequest, NextResponse } from "next/server";
import { requireAdminApiAuth } from "@/lib/admin-auth";
import { writeClient } from "@/lib/sanity/client";
import { gamesByDateForActiveSeasonQuery } from "@/lib/sanity/queries";
import type { AdminGame } from "@/lib/types";

export async function GET(req: NextRequest) {
  const auth = requireAdminApiAuth(req);
  if ("response" in auth) return auth.response;

  const date = req.nextUrl.searchParams.get("date");
  if (!date) {
    return NextResponse.json({ error: "Missing date parameter." }, { status: 400 });
  }

  const games = await writeClient.fetch<AdminGame[]>(gamesByDateForActiveSeasonQuery, { date });
  return NextResponse.json({ games });
}

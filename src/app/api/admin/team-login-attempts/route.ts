import { NextRequest, NextResponse } from "next/server";
import { requireAdminApiAuth } from "@/lib/admin-auth";
import { writeClient } from "@/lib/sanity/client";
import { recentTeamLoginAttemptsQuery } from "@/lib/sanity/queries";
import type { TeamLoginAttempt } from "@/lib/types";

export async function GET(req: NextRequest) {
  const auth = await requireAdminApiAuth(req);
  if ("response" in auth) return auth.response;

  const attempts = await writeClient.fetch<TeamLoginAttempt[]>(recentTeamLoginAttemptsQuery);
  return NextResponse.json({ attempts });
}

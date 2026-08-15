import { NextRequest, NextResponse } from "next/server";
import { requireAdminApiAuth } from "@/lib/admin-auth";
import { writeClient } from "@/lib/sanity/client";
import { recentLoginAttemptsQuery } from "@/lib/sanity/queries";
import type { LoginAttempt } from "@/lib/types";

export async function GET(req: NextRequest) {
  const auth = await requireAdminApiAuth(req);
  if ("response" in auth) return auth.response;
  if (auth.session.role !== "superadmin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const attempts = await writeClient.fetch<LoginAttempt[]>(recentLoginAttemptsQuery);
  return NextResponse.json({ attempts });
}

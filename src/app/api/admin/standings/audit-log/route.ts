import { NextRequest, NextResponse } from "next/server";
import { requireAdminApiAuth } from "@/lib/admin-auth";
import { writeClient } from "@/lib/sanity/client";
import { standingsAuditLogQuery } from "@/lib/sanity/queries";

interface AuditLogRow {
  _id: string;
  action: string;
  performedByName: string;
  summary: string;
  createdAt: string;
}

export async function GET(req: NextRequest) {
  const auth = await requireAdminApiAuth(req);
  if ("response" in auth) return auth.response;

  const year = Number(req.nextUrl.searchParams.get("year"));
  if (!Number.isFinite(year)) {
    return NextResponse.json({ error: "Missing year." }, { status: 400 });
  }

  const entries = await writeClient.fetch<AuditLogRow[]>(standingsAuditLogQuery, { year });
  return NextResponse.json({ entries });
}

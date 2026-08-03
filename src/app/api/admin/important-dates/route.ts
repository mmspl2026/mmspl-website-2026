import { NextRequest, NextResponse } from "next/server";
import { requireAdminApiAuth } from "@/lib/admin-auth";
import { writeClient } from "@/lib/sanity/client";
import { allImportantDatesQuery } from "@/lib/sanity/queries";
import type { ImportantDate } from "@/lib/types";

export async function GET(req: NextRequest) {
  const auth = requireAdminApiAuth(req);
  if ("response" in auth) return auth.response;

  const dates = await writeClient.fetch<ImportantDate[]>(allImportantDatesQuery);
  return NextResponse.json({ dates });
}

export async function POST(req: NextRequest) {
  const auth = requireAdminApiAuth(req);
  if ("response" in auth) return auth.response;

  const body = await req.json().catch(() => null);
  if (!body?.label || !body?.date) {
    return NextResponse.json({ error: "Label and date are required." }, { status: 400 });
  }

  const doc = await writeClient.create({
    _type: "importantDate",
    label: body.label,
    date: body.date,
    endDate: body.endDate || undefined,
    description: body.description || undefined,
    category: body.category || "Admin",
  });

  return NextResponse.json({ date: doc });
}

import { NextRequest, NextResponse } from "next/server";
import { requireAdminApiAuth } from "@/lib/admin-auth";
import { writeClient } from "@/lib/sanity/client";
import { allContactSubmissionsQuery } from "@/lib/sanity/queries";
import type { ContactSubmission } from "@/lib/types";

export async function GET(req: NextRequest) {
  const auth = await requireAdminApiAuth(req);
  if ("response" in auth) return auth.response;

  const submissions = await writeClient.fetch<ContactSubmission[]>(allContactSubmissionsQuery);
  return NextResponse.json({ submissions });
}

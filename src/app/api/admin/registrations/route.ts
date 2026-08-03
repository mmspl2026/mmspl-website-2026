import { NextRequest, NextResponse } from "next/server";
import { requireAdminApiAuth } from "@/lib/admin-auth";
import { writeClient } from "@/lib/sanity/client";
import { allRegistrationsQuery } from "@/lib/sanity/queries";
import type { Registration } from "@/lib/types";

export async function GET(req: NextRequest) {
  const auth = requireAdminApiAuth(req);
  if ("response" in auth) return auth.response;

  const registrations = await writeClient.fetch<Registration[]>(allRegistrationsQuery);
  return NextResponse.json({ registrations });
}

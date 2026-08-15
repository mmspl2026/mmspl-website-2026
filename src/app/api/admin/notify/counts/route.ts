import { NextRequest, NextResponse } from "next/server";
import { requireAdminApiAuth } from "@/lib/admin-auth";
import { writeClient } from "@/lib/sanity/client";
import { subscriberCountQuery, pushSubscriptionCountQuery } from "@/lib/sanity/queries";

export async function GET(req: NextRequest) {
  const auth = await requireAdminApiAuth(req);
  if ("response" in auth) return auth.response;

  const [emailCount, pushCount] = await Promise.all([
    writeClient.fetch<number>(subscriberCountQuery),
    writeClient.fetch<number>(pushSubscriptionCountQuery),
  ]);

  return NextResponse.json({ emailCount, pushCount });
}

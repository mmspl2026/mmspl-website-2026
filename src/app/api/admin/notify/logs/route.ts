import { NextRequest, NextResponse } from "next/server";
import { requireAdminApiAuth } from "@/lib/admin-auth";
import { writeClient } from "@/lib/sanity/client";
import { allNotificationLogsQuery } from "@/lib/sanity/queries";
import type { NotificationLog } from "@/lib/types";

export async function GET(req: NextRequest) {
  const auth = requireAdminApiAuth(req);
  if ("response" in auth) return auth.response;

  const logs = await writeClient.fetch<NotificationLog[]>(allNotificationLogsQuery);
  return NextResponse.json({ logs });
}

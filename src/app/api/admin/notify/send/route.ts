import { NextRequest, NextResponse } from "next/server";
import { requireAdminApiAuth } from "@/lib/admin-auth";
import { writeClient } from "@/lib/sanity/client";
import { subscribersWithTokenQuery } from "@/lib/sanity/queries";
import { sendBroadcastEmail } from "@/lib/resend";
import { sendPushToAll } from "@/lib/push";
import type { SubscriberRecipient } from "@/lib/types";

// Notifying subscribers can involve dozens of individual emails plus push
// sends within the same request — give it more headroom than the default
// serverless function timeout, which is easy to exceed silently otherwise.
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const auth = await requireAdminApiAuth(req);
  if ("response" in auth) return auth.response;

  const body = await req.json().catch(() => null);
  if (!body?.title || !body?.message) {
    return NextResponse.json({ error: "Title and message are required." }, { status: 400 });
  }

  const emails = await writeClient.fetch<SubscriberRecipient[]>(subscribersWithTokenQuery);
  const emailResult = await sendBroadcastEmail(emails, body.title, body.message);
  const emailCount = "sent" in emailResult ? (emailResult.sent ?? 0) : 0;
  const emailError = "error" in emailResult ? emailResult.error : undefined;
  if (emailError) console.error("Notify send: email error:", emailError);

  const pushResult = await sendPushToAll({ title: body.title, body: body.message });
  const pushCount = "sent" in pushResult ? pushResult.sent : 0;

  await writeClient.create({
    _type: "notificationLog",
    title: body.title,
    message: body.message,
    emailCount,
    pushCount,
    sentAt: new Date().toISOString(),
  });

  return NextResponse.json({ emailCount, pushCount });
}

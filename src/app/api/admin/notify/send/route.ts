import { NextRequest, NextResponse } from "next/server";
import { requireAdminApiAuth } from "@/lib/admin-auth";
import { writeClient } from "@/lib/sanity/client";
import { subscriberEmailsQuery } from "@/lib/sanity/queries";
import { sendBroadcastEmail, wasEmailSent } from "@/lib/resend";
import { sendPushToAll } from "@/lib/push";

export async function POST(req: NextRequest) {
  const auth = requireAdminApiAuth(req);
  if ("response" in auth) return auth.response;

  const body = await req.json().catch(() => null);
  if (!body?.title || !body?.message) {
    return NextResponse.json({ error: "Title and message are required." }, { status: 400 });
  }

  const emails = await writeClient.fetch<string[]>(subscriberEmailsQuery);
  const emailResult = await sendBroadcastEmail(emails, body.title, body.message);
  const emailCount = wasEmailSent(emailResult) ? emails.length : 0;

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

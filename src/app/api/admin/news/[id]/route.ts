import { NextRequest, NextResponse } from "next/server";
import { requireAdminApiAuth } from "@/lib/admin-auth";
import { writeClient } from "@/lib/sanity/client";
import { subscribersWithTokenQuery } from "@/lib/sanity/queries";
import { plainTextToBlocks } from "@/lib/newsBody";
import { sendNewsAnnouncement } from "@/lib/resend";
import { sendPushToAll } from "@/lib/push";
import type { SubscriberRecipient } from "@/lib/types";

// Notifying subscribers can involve dozens of individual emails plus push
// sends within the same request — give it more headroom than the default
// serverless function timeout, which is easy to exceed silently otherwise.
export const maxDuration = 60;

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdminApiAuth(req);
  if ("response" in auth) return auth.response;

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid body." }, { status: 400 });
  }

  const patch: Record<string, unknown> = {};
  if ("title" in body) patch.title = body.title;
  if ("date" in body) patch.date = body.date;
  if ("tag" in body) patch.tag = body.tag;
  if ("photo" in body) patch.photo = body.photo;
  if ("body" in body && typeof body.body === "string") {
    patch.body = plainTextToBlocks(body.body);
  }

  await writeClient.patch(params.id).set(patch).commit();

  let notified:
    | {
        emailCount: number;
        pushCount: number;
        emailSkippedReason?: string;
        emailError?: string;
        emailSkippedInvalid?: number;
      }
    | undefined;
  if (body.notifySubscribers && typeof body.slug === "string" && body.slug) {
    let emailCount = 0;
    let emailSkippedReason: string | undefined;
    let emailError: string | undefined;
    let emailSkippedInvalid: number | undefined;
    try {
      const emails = await writeClient.fetch<SubscriberRecipient[]>(subscribersWithTokenQuery);
      const emailResult = await sendNewsAnnouncement(emails, body.title, body.slug);
      emailCount = "sent" in emailResult ? (emailResult.sent ?? 0) : 0;
      emailSkippedReason = "reason" in emailResult ? emailResult.reason : undefined;
      emailError = "error" in emailResult ? emailResult.error : undefined;
      emailSkippedInvalid = "skippedInvalid" in emailResult ? emailResult.skippedInvalid : undefined;
    } catch (err) {
      emailError = err instanceof Error ? err.message : String(err);
      console.error("News notify: failed to fetch subscribers or send email:", err);
    }
    const pushResult = await sendPushToAll({
      title: "MMSPL News",
      body: body.title,
      url: `/news/${body.slug}`,
    });
    const pushCount = "sent" in pushResult ? (pushResult.sent ?? 0) : 0;
    notified = { emailCount, pushCount, emailSkippedReason, emailError, emailSkippedInvalid };
  }

  return NextResponse.json({ ok: true, notified });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdminApiAuth(req);
  if ("response" in auth) return auth.response;

  await writeClient.delete(params.id);
  return NextResponse.json({ ok: true });
}

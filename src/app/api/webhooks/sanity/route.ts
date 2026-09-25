import { NextRequest, NextResponse } from "next/server";
import { assertValidSignature } from "@sanity/webhook";
import { client } from "@/lib/sanity/client";
import { subscribersWithTokenQuery } from "@/lib/sanity/queries";
import { sendGameCancellationAlert, sendNewsAnnouncement } from "@/lib/resend";
import { sendPushToAll } from "@/lib/push";
import type { SubscriberRecipient } from "@/lib/types";

// Notifying subscribers can involve dozens of individual emails plus push
// sends within the same request — give it more headroom than the default
// serverless function timeout, which is easy to exceed silently otherwise.
export const maxDuration = 60;

// Configure a Sanity webhook (Studio → API → Webhooks) pointing at
// https://<your-domain>/api/webhooks/sanity for the `game` and `news`
// document types, triggered on create + update, with SANITY_WEBHOOK_SECRET
// as the signing secret. See README for the exact GROQ projection to use.

interface GameWebhookPayload {
  _type: "game";
  status: "scheduled" | "live" | "final" | "forfeit" | "cancelled" | "postponed";
  notifyOnCancellation?: boolean;
  date: string;
  time: string;
  field: string;
  homeTeamName?: string;
  awayTeamName?: string;
}

interface NewsWebhookPayload {
  _type: "news";
  title: string;
  slug?: { current: string };
  notifySubscribers?: boolean;
}

export async function POST(req: NextRequest) {
  const signature = req.headers.get("sanity-webhook-signature") || "";
  const body = await req.text();

  const secret = process.env.SANITY_WEBHOOK_SECRET;
  if (secret) {
    try {
      await assertValidSignature(body, signature, secret);
    } catch {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }
  }

  const payload = JSON.parse(body) as GameWebhookPayload | NewsWebhookPayload;
  const emails = await client.fetch<SubscriberRecipient[]>(subscribersWithTokenQuery);

  if (payload._type === "game" && payload.notifyOnCancellation) {
    if (payload.status === "cancelled" || payload.status === "postponed") {
      const homeTeam = payload.homeTeamName || "Home";
      const awayTeam = payload.awayTeamName || "Away";
      const verb = payload.status === "postponed" ? "Postponed" : "Cancelled";

      await Promise.all([
        sendGameCancellationAlert(emails, [
          {
            homeTeam,
            awayTeam,
            date: payload.date,
            time: payload.time,
            field: payload.field,
            status: payload.status,
          },
        ]),
        sendPushToAll({
          title: `Game ${verb}`,
          body: `${homeTeam} vs ${awayTeam} — ${payload.time} at ${payload.field}`,
          url: "/schedule",
        }),
      ]);
    }
  }

  if (payload._type === "news" && payload.notifySubscribers && payload.slug) {
    await Promise.all([
      sendNewsAnnouncement(emails, payload.title, payload.slug.current),
      sendPushToAll({
        title: "MMSPL News",
        body: payload.title,
        url: `/news/${payload.slug.current}`,
      }),
    ]);
  }

  return NextResponse.json({ ok: true });
}

import { NextRequest, NextResponse } from "next/server";
import { requireAdminApiAuth } from "@/lib/admin-auth";
import { writeClient } from "@/lib/sanity/client";
import { allNewsAdminQuery, subscribersWithTokenQuery } from "@/lib/sanity/queries";
import type { NewsItem, SubscriberRecipient } from "@/lib/types";
import { plainTextToBlocks } from "@/lib/newsBody";
import { sendNewsAnnouncement } from "@/lib/resend";
import { sendPushToAll } from "@/lib/push";

function slugify(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 96);
}

export async function GET(req: NextRequest) {
  const auth = await requireAdminApiAuth(req);
  if ("response" in auth) return auth.response;

  const news = await writeClient.fetch<NewsItem[]>(allNewsAdminQuery);
  return NextResponse.json({ news });
}

export async function POST(req: NextRequest) {
  const auth = await requireAdminApiAuth(req);
  if ("response" in auth) return auth.response;

  const body = await req.json().catch(() => null);
  if (!body?.title || !body?.body) {
    return NextResponse.json({ error: "Title and body are required." }, { status: 400 });
  }

  const slug = slugify(body.title);
  const existing = await writeClient.fetch<number>(`count(*[_type == "news" && slug.current == $slug])`, { slug });
  const uniqueSlug = existing > 0 ? `${slug}-${Date.now().toString(36)}` : slug;

  const doc = await writeClient.create({
    _type: "news",
    title: body.title,
    slug: { _type: "slug", current: uniqueSlug },
    body: plainTextToBlocks(body.body),
    photo: body.photo || undefined,
    date: body.date || new Date().toISOString(),
    tag: body.tag || undefined,
  });

  let notified: { emailCount: number; pushCount: number } | undefined;
  if (body.notifySubscribers) {
    const emails = await writeClient.fetch<SubscriberRecipient[]>(subscribersWithTokenQuery);
    const emailResult = await sendNewsAnnouncement(emails, body.title, uniqueSlug);
    const emailCount = "sent" in emailResult ? (emailResult.sent ?? 0) : 0;
    const pushResult = await sendPushToAll({
      title: "MMSPL News",
      body: body.title,
      url: `/news/${uniqueSlug}`,
    });
    const pushCount = "sent" in pushResult ? (pushResult.sent ?? 0) : 0;
    notified = { emailCount, pushCount };
  }

  return NextResponse.json({ news: doc, notified });
}

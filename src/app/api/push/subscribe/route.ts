import { NextRequest, NextResponse } from "next/server";
import { writeClient } from "@/lib/sanity/client";
import { isSanityConfigured } from "@/lib/sanity/env";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const endpoint = typeof body?.endpoint === "string" ? body.endpoint : "";
  const p256dh = body?.keys?.p256dh;
  const auth = body?.keys?.auth;

  if (!endpoint || !p256dh || !auth) {
    return NextResponse.json({ error: "Invalid push subscription." }, { status: 400 });
  }

  if (!isSanityConfigured) {
    return NextResponse.json({ error: "Push notifications are not configured yet." }, { status: 503 });
  }

  const existing = await writeClient.fetch(
    `*[_type == "pushSubscription" && endpoint == $endpoint][0]{_id}`,
    { endpoint }
  );

  if (!existing) {
    await writeClient.create({
      _type: "pushSubscription",
      endpoint,
      p256dh,
      auth,
      subscribedAt: new Date().toISOString(),
    });
  }

  return NextResponse.json({ ok: true });
}

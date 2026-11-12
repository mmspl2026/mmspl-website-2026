import { NextRequest, NextResponse } from "next/server";
import { writeClient } from "@/lib/sanity/client";
import { isSanityConfigured } from "@/lib/sanity/env";

/**
 * Public route (no team-captain auth) — a player taps their personal
 * opt-in link (sent by email when added to the roster) and this ties the
 * resulting browser push subscription to their specific rosterPlayer doc,
 * so beer-list reminders can target them individually rather than
 * broadcasting to everyone subscribed league-wide.
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const endpoint = typeof body?.endpoint === "string" ? body.endpoint : "";
  const p256dh = body?.keys?.p256dh;
  const auth = body?.keys?.auth;
  const playerId = typeof body?.playerId === "string" ? body.playerId : "";

  if (!endpoint || !p256dh || !auth || !playerId) {
    return NextResponse.json({ error: "Invalid push subscription." }, { status: 400 });
  }
  if (!isSanityConfigured) {
    return NextResponse.json({ error: "Push notifications are not configured yet." }, { status: 503 });
  }

  const player = await writeClient.fetch<{ _id: string } | null>(`*[_type == "rosterPlayer" && _id == $playerId][0]{_id}`, { playerId });
  if (!player) {
    return NextResponse.json({ error: "Player not found." }, { status: 404 });
  }

  const existing = await writeClient.fetch<{ _id: string } | null>(
    `*[_type == "pushSubscription" && endpoint == $endpoint][0]{_id}`,
    { endpoint }
  );

  if (existing) {
    await writeClient.patch(existing._id).set({ rosterPlayer: { _type: "reference", _ref: playerId } }).commit();
  } else {
    await writeClient.create({
      _type: "pushSubscription",
      endpoint,
      p256dh,
      auth,
      subscribedAt: new Date().toISOString(),
      rosterPlayer: { _type: "reference", _ref: playerId },
    });
  }

  return NextResponse.json({ ok: true });
}

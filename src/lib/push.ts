import webpush from "web-push";
import { client } from "@/lib/sanity/client";
import { allPushSubscriptionsQuery, pushSubscriptionsByPlayerQuery, pushSubscriptionsByPlayersQuery } from "@/lib/sanity/queries";
import { isSanityConfigured } from "@/lib/sanity/env";
import type { PushSubscriptionRecord } from "@/lib/types";

export const isPushConfigured = Boolean(
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY
);

if (isPushConfigured) {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || "mailto:info@mmspl.ca",
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
  );
}

interface PushPayload {
  title: string;
  body: string;
  url?: string;
}

/**
 * Sends a push notification to every stored subscription. Skips silently
 * when VAPID keys or Sanity aren't configured (mirrors the Resend "no key,
 * no-op" behaviour), so local dev works without a full push setup.
 */
export async function sendPushToAll(payload: PushPayload) {
  if (!isPushConfigured || !isSanityConfigured) {
    console.warn("Push not configured — skipping push notification:", payload.title);
    return { skipped: true };
  }

  const subscriptions = await client.fetch<PushSubscriptionRecord[]>(allPushSubscriptionsQuery);
  if (subscriptions.length === 0) return { skipped: true, sent: 0 };

  const body = JSON.stringify(payload);

  const results = await Promise.allSettled(
    subscriptions.map((sub) =>
      webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        },
        body
      )
    )
  );

  const sent = results.filter((r) => r.status === "fulfilled").length;
  return { sent, total: subscriptions.length };
}

async function sendToSubscriptions(subscriptions: PushSubscriptionRecord[], payload: PushPayload) {
  if (subscriptions.length === 0) return { skipped: true as const, sent: 0 };
  const body = JSON.stringify(payload);
  const results = await Promise.allSettled(
    subscriptions.map((sub) =>
      webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, body)
    )
  );
  const sent = results.filter((r) => r.status === "fulfilled").length;
  return { sent, total: subscriptions.length };
}

/** Targets only the push subscription(s) tied to one specific roster player's opt-in link. */
export async function sendPushToPlayer(playerId: string, payload: PushPayload) {
  if (!isPushConfigured || !isSanityConfigured) return { skipped: true as const };
  const subscriptions = await client.fetch<PushSubscriptionRecord[]>(pushSubscriptionsByPlayerQuery, { playerId });
  return sendToSubscriptions(subscriptions, payload);
}

/** Targets every roster player in the list who has an opt-in push subscription (used by "Push-Notify Team"). */
export async function sendPushToPlayers(playerIds: string[], payload: PushPayload) {
  if (!isPushConfigured || !isSanityConfigured || playerIds.length === 0) return { skipped: true as const };
  const subscriptions = await client.fetch<PushSubscriptionRecord[]>(pushSubscriptionsByPlayersQuery, { playerIds });
  return sendToSubscriptions(subscriptions, payload);
}

import { NextRequest, NextResponse } from "next/server";
import { writeClient } from "@/lib/sanity/client";
import { isSanityConfigured } from "@/lib/sanity/env";
import { sendSubscriptionWelcome } from "@/lib/resend";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_SIGNUPS_PER_IP_PER_DAY = 3;

// Gmail (and Google Workspace on googlemail.com) ignores dots in the local
// part and everything after a "+" -- so "a.b.c+x@gmail.com" and "abc@gmail.com"
// are the same real inbox. A spam run previously abused this to register
// ~75 "unique" fake subscribers that were really just a handful of dot
// variations. Normalizing before the duplicate check closes that loophole.
function normalizeEmailForDedup(email: string): string {
  const [local, domain] = email.toLowerCase().split("@");
  if (domain === "gmail.com" || domain === "googlemail.com") {
    return `${local.split("+")[0].replace(/\./g, "")}@gmail.com`;
  }
  return `${local}@${domain}`;
}

function getClientIp(req: NextRequest): string | undefined {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return req.headers.get("x-real-ip") || undefined;
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const name = typeof body?.name === "string" ? body.name.trim() : undefined;

  // Honeypot: a field real visitors never see or fill in (see
  // EmailSubscribeForm). A bot that blindly fills every input on the page
  // trips this; report success without ever creating a record, so the bot
  // has no signal to adapt against.
  const honeypot = typeof body?.website === "string" ? body.website.trim() : "";
  if (honeypot) {
    return NextResponse.json({ ok: true });
  }

  if (!email || !EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "A valid email is required." }, { status: 400 });
  }

  if (!isSanityConfigured) {
    return NextResponse.json({ error: "Subscriptions are not configured yet." }, { status: 503 });
  }

  const ip = getClientIp(req);
  if (ip) {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const recentFromSameIp = await writeClient.fetch<number>(
      `count(*[_type == "subscriber" && ipAddress == $ip && subscribedAt > $since])`,
      { ip, since }
    );
    if (recentFromSameIp >= MAX_SIGNUPS_PER_IP_PER_DAY) {
      return NextResponse.json({ ok: true });
    }
  }

  const normalized = normalizeEmailForDedup(email);
  const allEmails = await writeClient.fetch<string[]>(`*[_type == "subscriber"].email`);
  const alreadySubscribed = allEmails.some((e) => normalizeEmailForDedup(e) === normalized);

  if (!alreadySubscribed) {
    const unsubscribeToken = crypto.randomUUID();
    await writeClient.create({
      _type: "subscriber",
      email,
      name,
      subscribedAt: new Date().toISOString(),
      unsubscribeToken,
      ipAddress: ip,
    });
    await sendSubscriptionWelcome(email, unsubscribeToken);
  }

  return NextResponse.json({ ok: true });
}

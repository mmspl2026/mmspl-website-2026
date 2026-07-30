import { NextRequest, NextResponse } from "next/server";
import { writeClient } from "@/lib/sanity/client";
import { isSanityConfigured } from "@/lib/sanity/env";
import { sendSubscriptionWelcome } from "@/lib/resend";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const name = typeof body?.name === "string" ? body.name.trim() : undefined;

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "A valid email is required." }, { status: 400 });
  }

  if (!isSanityConfigured) {
    return NextResponse.json({ error: "Subscriptions are not configured yet." }, { status: 503 });
  }

  const existing = await writeClient.fetch(`*[_type == "subscriber" && email == $email][0]{_id}`, {
    email,
  });

  if (!existing) {
    await writeClient.create({
      _type: "subscriber",
      email,
      name,
      subscribedAt: new Date().toISOString(),
    });
    await sendSubscriptionWelcome(email);
  }

  return NextResponse.json({ ok: true });
}

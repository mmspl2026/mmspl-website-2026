import { NextRequest, NextResponse } from "next/server";
import { sendRegistrationConfirmation, sendRegistrationAdminNotification, wasEmailSent } from "@/lib/resend";
import { writeClient } from "@/lib/sanity/client";
import { isSanityConfigured } from "@/lib/sanity/env";
import { activeSeasonQuery } from "@/lib/sanity/queries";
import type { Season } from "@/lib/types";

// Bots that fill out a form typically do it in well under a second — no
// human reads every field, types real values, and submits that fast, even
// with browser autofill on a form this long.
const MIN_SUBMIT_MS = 1200;

// Real submissions come from our own page via fetch(), which always sends
// an Origin header (even for same-origin POSTs, in every modern browser).
// A script hitting this endpoint directly typically won't set one at all,
// or won't set one matching our own host.
function isSameOrigin(req: NextRequest): boolean {
  const origin = req.headers.get("origin");
  const host = req.headers.get("host");
  if (!origin || !host) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

// Tier 2: Cloudflare Turnstile. Catches the bots that clear the Tier 1
// checks above by actually running a real (often headless) browser — that
// gets them a matching Origin and human-like timing, but Turnstile verifies
// the browser session itself, which is much harder for automation to fake.
async function verifyTurnstile(token: string, remoteIp: string | null): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    console.warn("TURNSTILE_SECRET_KEY not set — skipping Turnstile verification.");
    return true;
  }
  if (!token) return false;

  const params = new URLSearchParams({ secret, response: token });
  if (remoteIp) params.set("remoteip", remoteIp);

  try {
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body: params,
    });
    const data = await res.json();
    return Boolean(data.success);
  } catch {
    return false;
  }
}

interface RegistrationPayload {
  firstName: string;
  lastName: string;
  streetAddress: string;
  unit: string;
  city: string;
  postalCode: string;
  homeNumber: string;
  mobileNumber: string;
  email: string;
  alternateEmail: string;
  dateOfBirth: string;
  heardAbout: string;
  highestLevel: string;
  category: string;
  preferredPosition: string;
  yearsExperience: string;
  experienceComments: string;
  canPitch: string;
  yearsPitched: string;
  pitchingComments: string;
  website: string;
  loadedAt: number;
  turnstileToken: string;
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as Partial<RegistrationPayload> | null;

  const honeypot = typeof body?.website === "string" ? body.website.trim() : "";
  const loadedAt = typeof body?.loadedAt === "number" ? body.loadedAt : null;
  const turnstileToken = typeof body?.turnstileToken === "string" ? body.turnstileToken : "";

  // Spam bait fields tripped — pretend it worked so the bot doesn't adapt,
  // but skip sending any email, creating a subscriber, or writing a
  // registration record.
  const submittedTooFast = loadedAt === null || Date.now() - loadedAt < MIN_SUBMIT_MS;
  if (honeypot || submittedTooFast || !isSameOrigin(req)) {
    console.log("Registration submission blocked as spam", {
      reason: honeypot ? "honeypot" : submittedTooFast ? "too-fast" : "cross-origin",
    });
    return NextResponse.json({ ok: true });
  }

  const remoteIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip");
  if (!(await verifyTurnstile(turnstileToken, remoteIp))) {
    return NextResponse.json(
      { error: "We couldn't verify your submission. Please refresh the page and try again." },
      { status: 400 }
    );
  }

  if (
    !body?.firstName ||
    !body?.lastName ||
    !body?.email ||
    !body?.streetAddress ||
    !body?.city ||
    !body?.postalCode ||
    !body?.mobileNumber ||
    !body?.dateOfBirth ||
    !body?.heardAbout ||
    !body?.highestLevel ||
    !body?.category ||
    !body?.preferredPosition ||
    !body?.yearsExperience ||
    !body?.canPitch
  ) {
    return NextResponse.json({ error: "Please fill in all required fields." }, { status: 400 });
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) {
    return NextResponse.json({ error: "A valid email is required." }, { status: 400 });
  }

  const playerName = `${body.firstName} ${body.lastName}`;

  if (isSanityConfigured) {
    const existingSubscriber = await writeClient.fetch(`*[_type == "subscriber" && email == $email][0]{_id}`, {
      email: body.email,
    });
    if (!existingSubscriber) {
      await writeClient.create({
        _type: "subscriber",
        email: body.email,
        name: playerName,
        subscribedAt: new Date().toISOString(),
      });
    }
  }

  const [confirmationResult, adminResult] = await Promise.allSettled([
    sendRegistrationConfirmation(body.email, playerName),
    sendRegistrationAdminNotification({ playerName, email: body.email, category: body.category }),
  ]);
  const emailStatus =
    confirmationResult.status === "fulfilled" && wasEmailSent(confirmationResult.value) ? "sent" : "failed";

  // The admin notification failing is a distinct, operationally important
  // problem (the league exec never finds out someone registered) — the
  // "Confirmation Email" status field above only ever tracked the
  // player-facing email, so this failure was previously invisible.
  const adminNotificationSent = adminResult.status === "fulfilled" && wasEmailSent(adminResult.value);
  if (!adminNotificationSent) {
    console.error("Registration admin notification failed to send", {
      playerName,
      reason: adminResult.status === "rejected" ? adminResult.reason : "email not sent",
    });
  }

  if (isSanityConfigured) {
    const activeSeason = await writeClient.fetch<Season | null>(activeSeasonQuery).catch(() => null);
    await writeClient.create({
      _type: "registration",
      firstName: body.firstName,
      lastName: body.lastName,
      streetAddress: body.streetAddress,
      unit: body.unit || undefined,
      city: body.city,
      postalCode: body.postalCode,
      homeNumber: body.homeNumber || undefined,
      mobileNumber: body.mobileNumber,
      email: body.email,
      alternateEmail: body.alternateEmail || undefined,
      dateOfBirth: body.dateOfBirth,
      heardAbout: body.heardAbout,
      highestLevel: body.highestLevel,
      category: body.category,
      preferredPosition: body.preferredPosition,
      yearsExperience: body.yearsExperience,
      experienceComments: body.experienceComments || undefined,
      canPitch: body.canPitch,
      yearsPitched: body.yearsPitched || undefined,
      pitchingComments: body.pitchingComments || undefined,
      ...(activeSeason ? { season: { _type: "reference", _ref: activeSeason._id } } : {}),
      status: "unpaid",
      emailStatus,
      submittedAt: new Date().toISOString(),
    });
  }

  return NextResponse.json({ ok: true });
}

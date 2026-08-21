import { NextRequest, NextResponse } from "next/server";
import { sendContactNotification, sendContactConfirmation, wasEmailSent } from "@/lib/resend";
import { writeClient } from "@/lib/sanity/client";
import { isSanityConfigured } from "@/lib/sanity/env";

// Bots that fill out a form typically do it in well under a second — no
// human reads the fields, types a name/email/message, and submits that
// fast, even with browser autofill.
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

// Tier 2: Cloudflare Turnstile. This catches the bots that clear the Tier 1
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

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const email = typeof body?.email === "string" ? body.email.trim() : "";
  const subject = typeof body?.subject === "string" ? body.subject.trim() : "";
  const message = typeof body?.message === "string" ? body.message.trim() : "";
  const honeypot = typeof body?.website === "string" ? body.website.trim() : "";
  const loadedAt = typeof body?.loadedAt === "number" ? body.loadedAt : null;
  const turnstileToken = typeof body?.turnstileToken === "string" ? body.turnstileToken : "";

  // Spam bait fields tripped — pretend it worked so the bot doesn't adapt,
  // but skip sending any email or writing anything to Sanity.
  const submittedTooFast = loadedAt === null || Date.now() - loadedAt < MIN_SUBMIT_MS;
  if (honeypot || submittedTooFast || !isSameOrigin(req)) {
    console.log("Contact form submission blocked as spam", {
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

  if (!name || !message || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Please fill in your name, a valid email, and a message." }, { status: 400 });
  }

  const [emailResult] = await Promise.all([
    sendContactNotification({ name, email, subject, message }),
    sendContactConfirmation(email, name),
  ]);
  const emailSent = wasEmailSent(emailResult);

  if (isSanityConfigured) {
    await writeClient.create({
      _type: "contactSubmission",
      name,
      email,
      subject,
      message,
      status: emailSent ? "new" : "email-failed",
      submittedAt: new Date().toISOString(),
    });
  }

  return NextResponse.json({ ok: true });
}

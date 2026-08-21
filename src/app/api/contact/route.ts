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

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const email = typeof body?.email === "string" ? body.email.trim() : "";
  const subject = typeof body?.subject === "string" ? body.subject.trim() : "";
  const message = typeof body?.message === "string" ? body.message.trim() : "";
  const honeypot = typeof body?.website === "string" ? body.website.trim() : "";
  const loadedAt = typeof body?.loadedAt === "number" ? body.loadedAt : null;

  // Spam bait fields tripped — pretend it worked so the bot doesn't adapt,
  // but skip sending any email or writing anything to Sanity.
  const submittedTooFast = loadedAt === null || Date.now() - loadedAt < MIN_SUBMIT_MS;
  if (honeypot || submittedTooFast || !isSameOrigin(req)) {
    console.log("Contact form submission blocked as spam", {
      reason: honeypot ? "honeypot" : submittedTooFast ? "too-fast" : "cross-origin",
    });
    return NextResponse.json({ ok: true });
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

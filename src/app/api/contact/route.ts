import { NextRequest, NextResponse } from "next/server";
import { sendContactNotification, sendContactConfirmation, wasEmailSent } from "@/lib/resend";
import { writeClient } from "@/lib/sanity/client";
import { isSanityConfigured } from "@/lib/sanity/env";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const email = typeof body?.email === "string" ? body.email.trim() : "";
  const subject = typeof body?.subject === "string" ? body.subject.trim() : "";
  const message = typeof body?.message === "string" ? body.message.trim() : "";

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

import { NextRequest, NextResponse } from "next/server";
import { writeClient } from "@/lib/sanity/client";
import { subscriberByUnsubscribeTokenQuery, subscriberByEmailForUnsubscribeQuery } from "@/lib/sanity/queries";

function page(title: string, message: string) {
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title} — MMSPL</title>
  </head>
  <body style="margin:0; padding:0; background:#f4f4f4; font-family: Arial, Helvetica, sans-serif;">
    <div style="max-width:480px; margin:48px auto; background:#ffffff; border:1px solid #eee; border-radius:8px; overflow:hidden;">
      <div style="background:#000000; padding:24px; text-align:center;">
        <p style="margin:0; color:#ffffff; font-size:14px; font-weight:bold; letter-spacing:0.06em; text-transform:uppercase;">
          Markham Men&rsquo;s Slo-Pitch League
        </p>
      </div>
      <div style="height:4px; background:#AA1111;"></div>
      <div style="padding:32px; text-align:center;">
        <h1 style="font-size:20px; color:#AA1111; margin:0 0 12px;">${title}</h1>
        <p style="font-size:15px; line-height:1.6; color:#222222; margin:0 0 24px;">${message}</p>
        <a href="https://mmspl-website-2026.vercel.app/" style="display:inline-block; padding:10px 24px; font-size:14px; font-weight:bold; color:#ffffff; background:#AA1111; text-decoration:none; border-radius:4px;">
          Back to MMSPL
        </a>
      </div>
    </div>
  </body>
</html>`;
}

function respond(title: string, message: string, status = 200) {
  return new NextResponse(page(title, message), {
    status,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

interface UnsubscribeSubscriber {
  _id: string;
  email: string;
}

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) {
    return respond("Invalid Link", "This unsubscribe link is missing its token. Please use the link exactly as it appeared in the email.", 400);
  }

  const subscriber = await writeClient.fetch<UnsubscribeSubscriber | null>(subscriberByUnsubscribeTokenQuery, {
    unsubscribeToken: token,
  });

  if (!subscriber) {
    return respond(
      "Already Unsubscribed",
      "We couldn't find an active subscription for this link — you're either already unsubscribed, or the link has expired."
    );
  }

  await writeClient.delete(subscriber._id);

  return respond(
    "You're Unsubscribed",
    `${subscriber.email} won't receive any more email notifications from MMSPL. You can re-subscribe any time from the notifications page.`
  );
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Used by the /unsubscribe page: bulk emails are sent as one shared BCC'd
// copy (see sendBulk in src/lib/resend.ts), so there's no per-recipient
// token to put in the link -- the visitor confirms their own email instead.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";

  if (!email || !EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "A valid email is required." }, { status: 400 });
  }

  const subscriber = await writeClient.fetch<UnsubscribeSubscriber | null>(subscriberByEmailForUnsubscribeQuery, {
    email,
  });

  if (!subscriber) {
    return NextResponse.json({ ok: true, found: false });
  }

  await writeClient.delete(subscriber._id);
  return NextResponse.json({ ok: true, found: true });
}

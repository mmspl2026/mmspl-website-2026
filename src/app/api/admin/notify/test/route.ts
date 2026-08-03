import { NextRequest, NextResponse } from "next/server";
import { requireAdminApiAuth } from "@/lib/admin-auth";
import { sendBroadcastEmail, wasEmailSent } from "@/lib/resend";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: NextRequest) {
  const auth = requireAdminApiAuth(req);
  if ("response" in auth) return auth.response;

  const body = await req.json().catch(() => null);
  if (!body?.to || !EMAIL_RE.test(body.to) || !body?.title || !body?.message) {
    return NextResponse.json({ error: "A valid recipient, title, and message are required." }, { status: 400 });
  }

  const result = await sendBroadcastEmail([body.to], body.title, body.message);
  if (!wasEmailSent(result)) {
    return NextResponse.json({ error: "Failed to send test email. Check your Resend configuration." }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}

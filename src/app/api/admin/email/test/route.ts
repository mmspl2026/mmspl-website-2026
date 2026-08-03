import { NextRequest, NextResponse } from "next/server";
import { requireAdminApiAuth } from "@/lib/admin-auth";
import { sendTestEmail, wasEmailSent } from "@/lib/resend";

export async function POST(req: NextRequest) {
  const auth = requireAdminApiAuth(req);
  if ("response" in auth) return auth.response;

  const body = await req.json().catch(() => null);
  const to = typeof body?.to === "string" ? body.to.trim() : "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
    return NextResponse.json({ error: "A valid email address is required." }, { status: 400 });
  }

  const result = await sendTestEmail(to);
  if (!wasEmailSent(result)) {
    return NextResponse.json({ error: "Test email failed to send — check your API key and from address." }, { status: 502 });
  }
  return NextResponse.json({ ok: true });
}

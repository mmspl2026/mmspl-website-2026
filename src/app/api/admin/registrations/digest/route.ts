import { NextRequest, NextResponse } from "next/server";
import { requireAdminApiAuth } from "@/lib/admin-auth";
import { writeClient } from "@/lib/sanity/client";
import { sendCustomNotificationEmail, wasEmailSent } from "@/lib/resend";
import type { Registration } from "@/lib/types";

export async function POST(req: NextRequest) {
  const auth = requireAdminApiAuth(req);
  if ("response" in auth) return auth.response;

  const settings = await writeClient.fetch<{ contactRecipients?: string } | null>(
    `*[_type == "adminSettings"][0]{ contactRecipients }`
  );
  const recipients = (settings?.contactRecipients || process.env.MMSPL_ADMIN_EMAIL || "info@mmspl.ca")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const recent = await writeClient.fetch<Registration[]>(
    `*[_type == "registration" && submittedAt >= $since] | order(submittedAt desc){
      _id, firstName, lastName, email, status, submittedAt
    }`,
    { since: sevenDaysAgo }
  );

  if (recent.length === 0) {
    return NextResponse.json({ ok: true, count: 0, message: "No new registrations in the last 7 days." });
  }

  const message = recent
    .map((r) => `${r.firstName} ${r.lastName} (${r.email}) — ${r.status} — ${new Date(r.submittedAt).toLocaleDateString()}`)
    .join("\n");

  const result = await sendCustomNotificationEmail(
    recipients,
    `Weekly Registration Digest (${recent.length} new)`,
    message
  );

  if (!wasEmailSent(result)) {
    return NextResponse.json({ error: "Digest email failed to send." }, { status: 502 });
  }

  return NextResponse.json({ ok: true, count: recent.length });
}

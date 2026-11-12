import { NextRequest, NextResponse } from "next/server";
import { requireAdminApiAuth } from "@/lib/admin-auth";
import { writeClient } from "@/lib/sanity/client";
import { sendContactReply, wasEmailSent } from "@/lib/resend";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdminApiAuth(req);
  if ("response" in auth) return auth.response;

  const body = await req.json().catch(() => null);
  const replyBody = typeof body?.message === "string" ? body.message.trim() : "";
  if (!replyBody) {
    return NextResponse.json({ error: "Reply message is required." }, { status: 400 });
  }
  // Lets the admin redirect a reply to a different address than the one the
  // form was submitted with (e.g. a typo'd address, or forwarding to someone
  // else) -- falls back to the original submitter's email when left as-is.
  const toOverride = typeof body?.to === "string" ? body.to.trim() : "";
  if (toOverride && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(toOverride)) {
    return NextResponse.json({ error: "That doesn't look like a valid email address." }, { status: 400 });
  }

  const submission = await writeClient.fetch<{ name: string; email: string; subject?: string } | null>(
    `*[_type == "contactSubmission" && _id == $id][0]{ name, email, subject }`,
    { id: params.id }
  );
  if (!submission) {
    return NextResponse.json({ error: "Submission not found." }, { status: 404 });
  }

  const result = await sendContactReply({
    to: toOverride || submission.email,
    name: submission.name,
    subject: submission.subject,
    replyBody,
  });
  if (!wasEmailSent(result)) {
    return NextResponse.json({ error: "Failed to send reply." }, { status: 502 });
  }

  const repliedAt = new Date().toISOString();
  await writeClient.patch(params.id).set({ status: "replied", replyText: replyBody, repliedAt }).commit();

  return NextResponse.json({ ok: true, repliedAt });
}

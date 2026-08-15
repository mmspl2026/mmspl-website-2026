import { NextRequest, NextResponse } from "next/server";
import { requireAdminApiAuth } from "@/lib/admin-auth";
import { writeClient } from "@/lib/sanity/client";
import { sendContactNotification, wasEmailSent } from "@/lib/resend";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdminApiAuth(req);
  if ("response" in auth) return auth.response;

  const submission = await writeClient.fetch<{ name: string; email: string; subject?: string; message: string } | null>(
    `*[_type == "contactSubmission" && _id == $id][0]{ name, email, subject, message }`,
    { id: params.id }
  );
  if (!submission) {
    return NextResponse.json({ error: "Submission not found." }, { status: 404 });
  }

  const result = await sendContactNotification(submission);
  const sent = wasEmailSent(result);
  await writeClient.patch(params.id).set({ status: sent ? "new" : "email-failed" }).commit();

  if (!sent) {
    return NextResponse.json({ error: "Resend failed." }, { status: 502 });
  }
  return NextResponse.json({ ok: true });
}

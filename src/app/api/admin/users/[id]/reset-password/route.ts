import { NextRequest, NextResponse } from "next/server";
import { hashPassword, requireAdminApiAuth } from "@/lib/admin-auth";
import { generateStrongTempPassword } from "@/lib/passwordPolicy.server";
import { writeClient } from "@/lib/sanity/client";
import { sendAdminPasswordReset, wasEmailSent } from "@/lib/resend";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdminApiAuth(req);
  if ("response" in auth) return auth.response;
  if (auth.session.role !== "superadmin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const target = await writeClient.fetch<{ name: string; email: string } | null>(
    `*[_type == "adminUser" && _id == $id][0]{name, email}`,
    { id: params.id }
  );
  if (!target) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  const tempPassword = generateStrongTempPassword();
  await writeClient
    .patch(params.id)
    .set({
      passwordHash: hashPassword(tempPassword),
      mustChangePassword: true,
      tempPasswordExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      failedAttempts: 0,
    })
    .unset(["lockedUntil", "currentSessionId"])
    .commit();

  const result = await sendAdminPasswordReset(target.email, target.name, tempPassword);
  if (!wasEmailSent(result)) {
    return NextResponse.json(
      { error: "Password was reset, but the notification email failed to send. Check the Email settings tab." },
      { status: 502 }
    );
  }

  return NextResponse.json({ ok: true });
}

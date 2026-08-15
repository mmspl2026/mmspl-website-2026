import { NextRequest, NextResponse } from "next/server";
import { clearSessionCookie, requireAdminApiAuth } from "@/lib/admin-auth";
import { writeClient } from "@/lib/sanity/client";

export async function POST(req: NextRequest) {
  // Only clear currentSessionId when this cookie is still the account's
  // active session — an old, already-superseded tab logging out must not
  // wipe out a newer session started elsewhere.
  const auth = await requireAdminApiAuth(req);
  if ("session" in auth) {
    await writeClient.patch(auth.session.uid).unset(["currentSessionId"]).commit().catch(() => {});
  }

  const res = NextResponse.json({ ok: true });
  clearSessionCookie(res);
  return res;
}

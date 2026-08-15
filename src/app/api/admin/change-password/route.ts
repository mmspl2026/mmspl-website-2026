import { NextRequest, NextResponse } from "next/server";
import { hashPassword, requireAdminApiAuth } from "@/lib/admin-auth";
import { validatePasswordPolicy } from "@/lib/passwordPolicy";
import { writeClient } from "@/lib/sanity/client";

export async function POST(req: NextRequest) {
  const auth = await requireAdminApiAuth(req);
  if ("response" in auth) return auth.response;

  const body = await req.json().catch(() => null);
  const password = typeof body?.password === "string" ? body.password : "";

  const policy = validatePasswordPolicy(password);
  if (!policy.valid) {
    return NextResponse.json({ error: policy.errors.join(" ") }, { status: 400 });
  }

  await writeClient
    .patch(auth.session.uid)
    .set({ passwordHash: hashPassword(password), mustChangePassword: false, failedAttempts: 0 })
    .unset(["tempPasswordExpiresAt", "lockedUntil"])
    .commit();

  return NextResponse.json({ ok: true });
}

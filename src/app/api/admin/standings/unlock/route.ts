import { NextRequest, NextResponse } from "next/server";
import {
  ADMIN_SESSION_COOKIE,
  requireAdminApiAuth,
  setStepUpVerified,
  verifyPasswordHash,
  STEP_UP_WINDOW_MS,
} from "@/lib/admin-auth";
import { writeClient } from "@/lib/sanity/client";
import { adminUserPasswordHashQuery, recentFailedUnlockAttemptsQuery } from "@/lib/sanity/queries";
import { logAdminAction, getClientIp } from "@/lib/auditLog";

const GENERIC_ERROR = "Incorrect password.";
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const RATE_LIMIT_MAX_ATTEMPTS = 5;

interface AdminUserRow {
  _id: string;
  name: string;
  passwordHash?: string;
  active: boolean;
}

/**
 * Step-up re-authentication: an already-logged-in admin re-enters their own
 * password to temporarily unlock editing on a finished (locked) season's
 * standings. Separate from /api/admin/login -- this never issues a new
 * session, it just stamps the existing one with stepUpAt (see
 * setStepUpVerified in admin-auth.ts) for STEP_UP_WINDOW_MS.
 */
export async function POST(req: NextRequest) {
  const auth = await requireAdminApiAuth(req);
  if ("response" in auth) return auth.response;
  const { session } = auth;

  const ip = getClientIp(req);
  const since = new Date(Date.now() - RATE_LIMIT_WINDOW_MS).toISOString();
  const recentFailures = await writeClient.fetch<number>(recentFailedUnlockAttemptsQuery, { ip, since });
  if (recentFailures >= RATE_LIMIT_MAX_ATTEMPTS) {
    return NextResponse.json({ error: "Too many attempts. Try again in 15 minutes." }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const password = typeof body?.password === "string" ? body.password : "";

  const user = await writeClient.fetch<AdminUserRow | null>(adminUserPasswordHashQuery, { id: session.uid });

  async function fail() {
    await logAdminAction({
      action: "standings.unlock",
      performedByUid: session.uid,
      performedByName: user?.name || "(unknown)",
      summary: "Failed unlock attempt (incorrect password).",
      ip,
      success: false,
    });
    return NextResponse.json({ error: GENERIC_ERROR }, { status: 401 });
  }

  if (!user || !user.active || !password) return fail();
  if (!user.passwordHash || !verifyPasswordHash(password, user.passwordHash)) return fail();

  const token = req.cookies.get(ADMIN_SESSION_COOKIE)?.value;
  if (!token) return fail();
  setStepUpVerified(token);

  await logAdminAction({
    action: "standings.unlock",
    performedByUid: session.uid,
    performedByName: user.name,
    summary: "Unlocked standings editing.",
    ip,
    success: true,
  });

  return NextResponse.json({ ok: true, unlockedUntil: Date.now() + STEP_UP_WINDOW_MS });
}

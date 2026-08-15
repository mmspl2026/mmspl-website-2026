import { NextRequest, NextResponse } from "next/server";
import {
  generateSessionId,
  isAdminAuthConfigured,
  setSessionCookie,
  verifyPasswordHash,
} from "@/lib/admin-auth";
import { writeClient } from "@/lib/sanity/client";
import { isSanityConfigured } from "@/lib/sanity/env";
import { adminUserByUsernameQuery, recentFailedAttemptsByIpQuery } from "@/lib/sanity/queries";
import type { AdminRole } from "@/lib/types";

const GENERIC_ERROR = "Invalid username or password.";
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const RATE_LIMIT_MAX_ATTEMPTS = 5;
const ACCOUNT_LOCK_THRESHOLD = 5;
const ACCOUNT_LOCK_DURATION_MS = 15 * 60 * 1000;

interface AdminUserRow {
  _id: string;
  role: AdminRole;
  active: boolean;
  passwordHash?: string;
  mustChangePassword?: boolean;
  tempPasswordExpiresAt?: string;
  failedAttempts?: number;
  lockedUntil?: string;
}

function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "unknown";
}

async function logAttempt(username: string, ip: string, success: boolean, reason: string) {
  await writeClient
    .create({
      _type: "loginAttempt",
      username,
      ip,
      success,
      reason,
      createdAt: new Date().toISOString(),
    })
    .catch(() => {
      // Audit logging must never block or break the login flow itself.
    });
}

export async function POST(req: NextRequest) {
  if (!isAdminAuthConfigured || !isSanityConfigured) {
    return NextResponse.json(
      { error: "Admin login is not configured. Set ADMIN_SESSION_SECRET and Sanity env vars." },
      { status: 503 }
    );
  }

  const ip = getClientIp(req);
  const body = await req.json().catch(() => null);
  const username = typeof body?.username === "string" ? body.username.trim().toLowerCase() : "";
  const password = typeof body?.password === "string" ? body.password : "";

  // IP-scoped rate limit — checked before anything else, regardless of
  // whether the username even exists, so it can't be used to enumerate
  // accounts.
  const since = new Date(Date.now() - RATE_LIMIT_WINDOW_MS).toISOString();
  const recentFailures = await writeClient.fetch<number>(recentFailedAttemptsByIpQuery, { ip, since });
  if (recentFailures >= RATE_LIMIT_MAX_ATTEMPTS) {
    await logAttempt(username, ip, false, "rate_limited");
    return NextResponse.json({ error: "Too many attempts. Try again in 15 minutes." }, { status: 429 });
  }

  if (!username || !password) {
    return NextResponse.json({ error: "Username and password are required." }, { status: 400 });
  }

  const user = await writeClient.fetch<AdminUserRow | null>(adminUserByUsernameQuery, { username });

  async function fail(reason: string) {
    await logAttempt(username, ip, false, reason);
    if (user) {
      const nextFailedAttempts = (user.failedAttempts || 0) + 1;
      const patch = writeClient.patch(user._id).set({ failedAttempts: nextFailedAttempts });
      if (nextFailedAttempts >= ACCOUNT_LOCK_THRESHOLD) {
        patch.set({ lockedUntil: new Date(Date.now() + ACCOUNT_LOCK_DURATION_MS).toISOString() });
      }
      await patch.commit().catch(() => {});
    }
    return NextResponse.json({ error: GENERIC_ERROR }, { status: 401 });
  }

  if (!user || !user.active) {
    return fail(!user ? "invalid_credentials" : "account_inactive");
  }

  if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) {
    return fail("account_locked");
  }

  if (user.tempPasswordExpiresAt && user.mustChangePassword && new Date(user.tempPasswordExpiresAt) < new Date()) {
    return fail("temp_password_expired");
  }

  if (!user.passwordHash || !verifyPasswordHash(password, user.passwordHash)) {
    return fail("invalid_credentials");
  }

  const sid = generateSessionId();
  await writeClient
    .patch(user._id)
    .set({ currentSessionId: sid, lastLogin: new Date().toISOString(), failedAttempts: 0 })
    .unset(["lockedUntil"])
    .commit();
  await logAttempt(username, ip, true, "success");

  const res = NextResponse.json({ ok: true, mustChangePassword: Boolean(user.mustChangePassword) });
  setSessionCookie(res, { uid: user._id, role: user.role, sid });
  return res;
}

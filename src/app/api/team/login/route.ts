import { NextRequest, NextResponse } from "next/server";
import {
  generateSessionId,
  isTeamAuthConfigured,
  setTeamSessionCookie,
  verifyPasswordHash,
} from "@/lib/team-auth";
import { writeClient } from "@/lib/sanity/client";
import { isSanityConfigured } from "@/lib/sanity/env";
import { teamCaptainByUsernameQuery, recentFailedTeamAttemptsByIpQuery } from "@/lib/sanity/queries";

const GENERIC_ERROR = "Invalid username or password.";
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const RATE_LIMIT_MAX_ATTEMPTS = 5;
const ACCOUNT_LOCK_THRESHOLD = 5;
const ACCOUNT_LOCK_DURATION_MS = 15 * 60 * 1000;

interface TeamCaptainRow {
  _id: string;
  teamId: string;
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
    .create({ _type: "teamLoginAttempt", username, ip, success, reason, createdAt: new Date().toISOString() })
    .catch(() => {});
}

export async function POST(req: NextRequest) {
  if (!isTeamAuthConfigured || !isSanityConfigured) {
    return NextResponse.json({ error: "Team login is not configured." }, { status: 503 });
  }

  const ip = getClientIp(req);
  const body = await req.json().catch(() => null);
  const username = typeof body?.username === "string" ? body.username.trim().toLowerCase() : "";
  const password = typeof body?.password === "string" ? body.password : "";

  const since = new Date(Date.now() - RATE_LIMIT_WINDOW_MS).toISOString();
  const recentFailures = await writeClient.fetch<number>(recentFailedTeamAttemptsByIpQuery, { ip, since });
  if (recentFailures >= RATE_LIMIT_MAX_ATTEMPTS) {
    await logAttempt(username, ip, false, "rate_limited");
    return NextResponse.json({ error: "Too many attempts. Try again in 15 minutes." }, { status: 429 });
  }

  if (!username || !password) {
    return NextResponse.json({ error: "Username and password are required." }, { status: 400 });
  }

  const captain = await writeClient.fetch<TeamCaptainRow | null>(teamCaptainByUsernameQuery, { username });

  async function fail(reason: string) {
    await logAttempt(username, ip, false, reason);
    if (captain) {
      const nextFailedAttempts = (captain.failedAttempts || 0) + 1;
      const patch = writeClient.patch(captain._id).set({ failedAttempts: nextFailedAttempts });
      if (nextFailedAttempts >= ACCOUNT_LOCK_THRESHOLD) {
        patch.set({ lockedUntil: new Date(Date.now() + ACCOUNT_LOCK_DURATION_MS).toISOString() });
      }
      await patch.commit().catch(() => {});
    }
    return NextResponse.json({ error: GENERIC_ERROR }, { status: 401 });
  }

  if (!captain || !captain.active) {
    return fail(!captain ? "invalid_credentials" : "account_inactive");
  }
  if (captain.lockedUntil && new Date(captain.lockedUntil) > new Date()) {
    return fail("account_locked");
  }
  if (!captain.passwordHash || !verifyPasswordHash(password, captain.passwordHash)) {
    return fail("invalid_credentials");
  }

  const sid = generateSessionId();
  await writeClient
    .patch(captain._id)
    .set({ currentSessionId: sid, lastLogin: new Date().toISOString(), failedAttempts: 0 })
    .unset(["lockedUntil"])
    .commit();
  await logAttempt(username, ip, true, "success");

  const res = NextResponse.json({ ok: true, mustChangePassword: Boolean(captain.mustChangePassword) });
  setTeamSessionCookie(res, { captainId: captain._id, teamId: captain.teamId, sid });
  return res;
}

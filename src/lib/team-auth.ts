import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { NextRequest, NextResponse } from "next/server";
import { writeClient } from "./sanity/client";

// Deliberately separate from admin-auth.ts: its own cookie, its own session
// shape, its own verification path. A captain session should never be
// mistakable for (or escalate into) an admin session, even by accident --
// hashPassword/verifyPasswordHash are the only things shared, since those
// are generic crypto primitives, not session logic.
export { hashPassword, verifyPasswordHash } from "./admin-auth";

export const TEAM_SESSION_COOKIE = "mmspl_team_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24; // 24h absolute cap from login
const IDLE_TIMEOUT_MS = 8 * 60 * 60 * 1000;

const SESSION_SECRET = process.env.ADMIN_SESSION_SECRET || "";
export const isTeamAuthConfigured = Boolean(SESSION_SECRET);

export interface TeamSession {
  captainId: string;
  teamId: string;
  mustChangePassword: boolean;
}

interface TeamSessionPayload {
  captainId: string;
  teamId: string;
  sid: string;
  iat: number;
  lastActivityAt: number;
}

function sign(payload: string): string {
  return createHmac("sha256", SESSION_SECRET).update(`team:${payload}`).digest("hex");
}

export function generateSessionId(): string {
  return randomBytes(16).toString("hex");
}

export function generateShareToken(): string {
  return randomBytes(12).toString("base64url");
}

function encodeSessionToken(payload: TeamSessionPayload): string {
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${encoded}.${sign(encoded)}`;
}

function decodeSessionToken(token: string | undefined | null): TeamSessionPayload | null {
  if (!token || !isTeamAuthConfigured) return null;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;

  const expected = sign(payload);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  try {
    const decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (typeof decoded.captainId !== "string" || typeof decoded.teamId !== "string") return null;
    if (typeof decoded.sid !== "string" || typeof decoded.iat !== "number" || typeof decoded.lastActivityAt !== "number") {
      return null;
    }
    if (Date.now() - decoded.iat > SESSION_MAX_AGE_SECONDS * 1000) return null;
    if (Date.now() - decoded.lastActivityAt > IDLE_TIMEOUT_MS) return null;
    return decoded as TeamSessionPayload;
  } catch {
    return null;
  }
}

export async function verifyTeamSession(token: string | undefined | null): Promise<TeamSession | null> {
  const decoded = decodeSessionToken(token);
  if (!decoded) return null;

  const captain = await writeClient.fetch<{ active: boolean; currentSessionId?: string; mustChangePassword?: boolean; team?: { _ref: string } } | null>(
    `*[_type == "teamCaptain" && _id == $id][0]{ active, currentSessionId, mustChangePassword, "team": team }`,
    { id: decoded.captainId }
  );
  if (!captain || !captain.active || captain.currentSessionId !== decoded.sid) return null;

  return {
    captainId: decoded.captainId,
    teamId: decoded.teamId,
    mustChangePassword: Boolean(captain.mustChangePassword),
  };
}

function cookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  };
}

export function setTeamSessionCookie(res: NextResponse, session: { captainId: string; teamId: string; sid: string }) {
  const now = Date.now();
  const payload: TeamSessionPayload = { captainId: session.captainId, teamId: session.teamId, sid: session.sid, iat: now, lastActivityAt: now };
  res.cookies.set(TEAM_SESSION_COOKIE, encodeSessionToken(payload), cookieOptions());
}

export function clearTeamSessionCookie(res: NextResponse) {
  res.cookies.set(TEAM_SESSION_COOKIE, "", { ...cookieOptions(), maxAge: 0 });
}

function refreshActivityCookie(token: string) {
  const decoded = decodeSessionToken(token);
  if (!decoded) return;
  const refreshed: TeamSessionPayload = { ...decoded, lastActivityAt: Date.now() };
  cookies().set(TEAM_SESSION_COOKIE, encodeSessionToken(refreshed), cookieOptions());
}

/** Server Component guard for /team/* pages (not /admin/*). */
export async function requireTeamSession(path?: string): Promise<TeamSession> {
  const token = cookies().get(TEAM_SESSION_COOKIE)?.value;
  const session = await verifyTeamSession(token);
  if (!session) redirect(path ? `/team/login?next=${encodeURIComponent(path)}` : "/team/login");
  if (session.mustChangePassword && path !== "/team/change-password") {
    redirect("/team/change-password");
  }
  return session;
}

/** Route Handler guard for /api/team/* routes. */
export async function requireTeamApiAuth(
  req: NextRequest
): Promise<{ session: TeamSession } | { response: NextResponse }> {
  const token = req.cookies.get(TEAM_SESSION_COOKIE)?.value;
  const session = await verifyTeamSession(token);
  if (!session) {
    return { response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  if (token) refreshActivityCookie(token);
  return { session };
}

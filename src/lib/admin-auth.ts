import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { NextRequest, NextResponse } from "next/server";
import { writeClient } from "./sanity/client";
import { adminUserByIdQuery } from "./sanity/queries";
import type { AdminRole } from "./types";

export const ADMIN_SESSION_COOKIE = "mmspl_admin_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24; // 24h absolute cap from login
const IDLE_TIMEOUT_MS = 8 * 60 * 60 * 1000; // signed out after 8h of no admin API activity

const SESSION_SECRET = process.env.ADMIN_SESSION_SECRET || "";

export const isAdminAuthConfigured = Boolean(SESSION_SECRET);

export interface AdminSession {
  uid: string;
  role: AdminRole;
  mustChangePassword: boolean;
}

interface SessionPayload {
  uid: string;
  role: AdminRole;
  sid: string;
  iat: number;
  lastActivityAt: number;
}

// --- Password hashing ------------------------------------------------------
// New hashes are always bcrypt. Accounts created before this migration have
// scrypt hashes ("salt:hash" hex, no "$2" prefix) — verifyPasswordHash still
// accepts those so existing users aren't locked out; hashPassword never
// produces them.

const BCRYPT_ROUNDS = 12;

export function hashPassword(password: string): string {
  return bcrypt.hashSync(password, BCRYPT_ROUNDS);
}

function isBcryptHash(stored: string): boolean {
  return /^\$2[aby]?\$/.test(stored);
}

function verifyLegacyScryptHash(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const candidate = scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, "hex");
  if (candidate.length !== expected.length) return false;
  return timingSafeEqual(candidate, expected);
}

export function verifyPasswordHash(password: string, stored: string): boolean {
  if (!stored) return false;
  return isBcryptHash(stored) ? bcrypt.compareSync(password, stored) : verifyLegacyScryptHash(password, stored);
}

// --- Session tokens ----------------------------------------------------------

function sign(payload: string): string {
  return createHmac("sha256", SESSION_SECRET).update(payload).digest("hex");
}

export function generateSessionId(): string {
  return randomBytes(16).toString("hex");
}

function encodeSessionToken(payload: SessionPayload): string {
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${encoded}.${sign(encoded)}`;
}

function decodeSessionToken(token: string | undefined | null): SessionPayload | null {
  if (!token || !isAdminAuthConfigured) return null;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;

  const expected = sign(payload);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  try {
    const decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (typeof decoded.uid !== "string" || (decoded.role !== "superadmin" && decoded.role !== "exec")) return null;
    if (typeof decoded.sid !== "string" || typeof decoded.iat !== "number" || typeof decoded.lastActivityAt !== "number") {
      return null;
    }
    if (Date.now() - decoded.iat > SESSION_MAX_AGE_SECONDS * 1000) return null;
    if (Date.now() - decoded.lastActivityAt > IDLE_TIMEOUT_MS) return null;
    return decoded as SessionPayload;
  } catch {
    return null;
  }
}

/**
 * Lightweight, synchronous "does this look like a valid session" check —
 * signature + expiry only, no Sanity read. Only for the login page's
 * "already signed in, skip the form" redirect; every real access-control
 * decision goes through verifySession() below instead.
 */
export function readSessionToken(token: string | undefined | null): AdminSession | null {
  const decoded = decodeSessionToken(token);
  if (!decoded) return null;
  return { uid: decoded.uid, role: decoded.role, mustChangePassword: false };
}

/**
 * The real authority check: confirms the token is well-formed AND still the
 * account's current session (a newer sign-in elsewhere invalidates old
 * tokens) AND the account is still active — both require a live Sanity
 * read, so deactivating someone now takes effect immediately instead of on
 * their next sign-in.
 */
async function verifySession(token: string | undefined | null): Promise<AdminSession | null> {
  const decoded = decodeSessionToken(token);
  if (!decoded) return null;

  const user = await writeClient.fetch<{ active: boolean; currentSessionId?: string; mustChangePassword?: boolean } | null>(
    adminUserByIdQuery,
    { id: decoded.uid }
  );
  if (!user || !user.active || user.currentSessionId !== decoded.sid) return null;

  return { uid: decoded.uid, role: decoded.role, mustChangePassword: Boolean(user.mustChangePassword) };
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

/** Called once at login, after credentials are verified. */
export function setSessionCookie(res: NextResponse, session: { uid: string; role: AdminRole; sid: string }) {
  const now = Date.now();
  const payload: SessionPayload = { uid: session.uid, role: session.role, sid: session.sid, iat: now, lastActivityAt: now };
  res.cookies.set(ADMIN_SESSION_COOKIE, encodeSessionToken(payload), cookieOptions());
}

export function clearSessionCookie(res: NextResponse) {
  res.cookies.set(ADMIN_SESSION_COOKIE, "", { ...cookieOptions(), maxAge: 0 });
}

/** Sliding idle-timeout: bump lastActivityAt on every authenticated API call. */
function refreshActivityCookie(token: string) {
  const decoded = decodeSessionToken(token);
  if (!decoded) return;
  const refreshed: SessionPayload = { ...decoded, lastActivityAt: Date.now() };
  cookies().set(ADMIN_SESSION_COOKIE, encodeSessionToken(refreshed), cookieOptions());
}

/**
 * Server Component guard: redirects to /admin/login when the session is
 * invalid. Pass the calling page's own path (e.g. "/admin/data") so the
 * login page can send the user back there after signing in, instead of
 * always dropping them at the default /admin score-entry page. Also forces
 * a redirect to the password-change page when a temporary password hasn't
 * been changed yet, unless we're already there.
 */
export async function requireAdminSession(path?: string): Promise<AdminSession> {
  const token = cookies().get(ADMIN_SESSION_COOKIE)?.value;
  const session = await verifySession(token);
  if (!session) redirect(path ? `/admin/login?next=${encodeURIComponent(path)}` : "/admin/login");
  if (session.mustChangePassword && path !== "/admin/change-password") {
    redirect("/admin/change-password");
  }
  return session;
}

/** Server Component guard: like requireAdminSession, but also requires the superadmin role. */
export async function requireSuperAdminSession(path?: string): Promise<AdminSession> {
  const session = await requireAdminSession(path);
  if (session.role !== "superadmin") redirect("/admin");
  return session;
}

/** Route Handler guard: returns { session } or a 401 NextResponse to return immediately. */
export async function requireAdminApiAuth(
  req: NextRequest
): Promise<{ session: AdminSession } | { response: NextResponse }> {
  const token = req.cookies.get(ADMIN_SESSION_COOKIE)?.value;
  const session = await verifySession(token);
  if (!session) {
    return { response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  if (token) refreshActivityCookie(token);
  return { session };
}

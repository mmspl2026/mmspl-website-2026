import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { NextRequest, NextResponse } from "next/server";
import type { AdminRole } from "./types";

export const ADMIN_SESSION_COOKIE = "mmspl_admin_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24; // 24h — deactivating a user takes effect on next sign-in

/**
 * A dedicated session secret is strongly recommended (`ADMIN_SESSION_SECRET`).
 * Falling back to ADMIN_PASSWORD keeps existing deployments from breaking
 * immediately after this upgrade, but that password is no longer the only
 * thing gating admin access (individual user passwords are), so it's a
 * weaker secret than a purpose-built one.
 */
const SESSION_SECRET = process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_PASSWORD || "";

export const isAdminAuthConfigured = Boolean(SESSION_SECRET);

export interface AdminSession {
  uid: string;
  role: AdminRole;
}

// --- Password hashing (scrypt — no extra dependency needed) ---------------

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPasswordHash(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const candidate = scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, "hex");
  if (candidate.length !== expected.length) return false;
  return timingSafeEqual(candidate, expected);
}

// --- Session tokens ---------------------------------------------------------

function sign(payload: string): string {
  return createHmac("sha256", SESSION_SECRET).update(payload).digest("hex");
}

export function createSessionToken(session: AdminSession): string {
  const payload = Buffer.from(JSON.stringify({ ...session, iat: Date.now() })).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function readSessionToken(token: string | undefined | null): AdminSession | null {
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
    if (typeof decoded.iat !== "number" || Date.now() - decoded.iat > SESSION_MAX_AGE_SECONDS * 1000) return null;
    return { uid: decoded.uid, role: decoded.role };
  } catch {
    return null;
  }
}

/**
 * Server Component guard: redirects to /admin/login when the session is
 * invalid. Pass the calling page's own path (e.g. "/admin/data") so the
 * login page can send the user back there after signing in, instead of
 * always dropping them at the default /admin score-entry page.
 */
export function requireAdminSession(path?: string): AdminSession {
  const token = cookies().get(ADMIN_SESSION_COOKIE)?.value;
  const session = readSessionToken(token);
  if (!session) redirect(path ? `/admin/login?next=${encodeURIComponent(path)}` : "/admin/login");
  return session;
}

/** Server Component guard: like requireAdminSession, but also requires the superadmin role. */
export function requireSuperAdminSession(path?: string): AdminSession {
  const session = requireAdminSession(path);
  if (session.role !== "superadmin") redirect("/admin");
  return session;
}

/** Route Handler guard: returns { session } or a 401 NextResponse to return immediately. */
export function requireAdminApiAuth(req: NextRequest): { session: AdminSession } | { response: NextResponse } {
  const token = req.cookies.get(ADMIN_SESSION_COOKIE)?.value;
  const session = readSessionToken(token);
  if (!session) {
    return { response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  return { session };
}

export function setSessionCookie(res: NextResponse, session: AdminSession) {
  res.cookies.set(ADMIN_SESSION_COOKIE, createSessionToken(session), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

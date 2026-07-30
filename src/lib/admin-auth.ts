import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { NextRequest, NextResponse } from "next/server";

export const ADMIN_SESSION_COOKIE = "mmspl_admin_session";

export const isAdminAuthConfigured = Boolean(process.env.ADMIN_PASSWORD);

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

/**
 * The session token is an HMAC of today's date, keyed by ADMIN_PASSWORD.
 * That ties validity to the calendar day with no session store: the same
 * token only verifies on the day it was issued, so it naturally expires at
 * midnight UTC regardless of the cookie's own maxAge.
 */
export function createSessionToken(): string {
  return createHmac("sha256", process.env.ADMIN_PASSWORD || "").update(todayKey()).digest("hex");
}

export function isValidSessionToken(token: string | undefined | null): boolean {
  if (!token || !isAdminAuthConfigured) return false;
  const expected = createSessionToken();
  const a = Buffer.from(token);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function verifyPassword(password: string): boolean {
  if (!isAdminAuthConfigured || !password) return false;
  // Hash both sides to fixed-length digests first so timingSafeEqual never
  // throws on a length mismatch (which would itself leak timing info).
  const a = createHash("sha256").update(password).digest();
  const b = createHash("sha256").update(process.env.ADMIN_PASSWORD as string).digest();
  return timingSafeEqual(a, b);
}

/** Server Component guard: redirects to /admin/login when the session is invalid. */
export function requireAdminSession() {
  const token = cookies().get(ADMIN_SESSION_COOKIE)?.value;
  if (!isValidSessionToken(token)) {
    redirect("/admin/login");
  }
}

/** Route Handler guard: returns a 401 response when unauthorized, else null. */
export function requireAdminApiAuth(req: NextRequest): NextResponse | null {
  const token = req.cookies.get(ADMIN_SESSION_COOKIE)?.value;
  if (!isValidSessionToken(token)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

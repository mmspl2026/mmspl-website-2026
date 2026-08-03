import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthConfigured, setSessionCookie, verifyPasswordHash } from "@/lib/admin-auth";
import { writeClient } from "@/lib/sanity/client";
import { isSanityConfigured } from "@/lib/sanity/env";
import { adminUserByUsernameQuery } from "@/lib/sanity/queries";

interface AdminUserRow {
  _id: string;
  role: "superadmin" | "exec";
  active: boolean;
  passwordHash?: string;
}

export async function POST(req: NextRequest) {
  if (!isAdminAuthConfigured || !isSanityConfigured) {
    return NextResponse.json(
      { error: "Admin login is not configured. Set ADMIN_SESSION_SECRET and Sanity env vars." },
      { status: 503 }
    );
  }

  const body = await req.json().catch(() => null);
  const username = typeof body?.username === "string" ? body.username.trim().toLowerCase() : "";
  const password = typeof body?.password === "string" ? body.password : "";

  if (!username || !password) {
    return NextResponse.json({ error: "Username and password are required." }, { status: 400 });
  }

  const user = await writeClient.fetch<AdminUserRow | null>(adminUserByUsernameQuery, { username });

  if (!user || !user.active || !user.passwordHash || !verifyPasswordHash(password, user.passwordHash)) {
    return NextResponse.json({ error: "Incorrect username or password." }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  setSessionCookie(res, { uid: user._id, role: user.role });
  return res;
}

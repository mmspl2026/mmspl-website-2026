import { NextRequest, NextResponse } from "next/server";
import { hashPassword, requireAdminApiAuth } from "@/lib/admin-auth";
import { writeClient } from "@/lib/sanity/client";
import { allAdminUsersQuery } from "@/lib/sanity/queries";
import { validatePasswordPolicy } from "@/lib/passwordPolicy";
import type { AdminUser } from "@/lib/types";

const USERNAME_RE = /^[a-z0-9._-]+$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function GET(req: NextRequest) {
  const auth = await requireAdminApiAuth(req);
  if ("response" in auth) return auth.response;
  if (auth.session.role !== "superadmin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const users = await writeClient.fetch<AdminUser[]>(allAdminUsersQuery);
  return NextResponse.json({ users });
}

export async function POST(req: NextRequest) {
  const auth = await requireAdminApiAuth(req);
  if ("response" in auth) return auth.response;
  if (auth.session.role !== "superadmin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const username = (body?.username || "").toLowerCase().trim();
  if (!body?.name || !username || !body?.email || !body?.password) {
    return NextResponse.json({ error: "Name, username, email, and password are required." }, { status: 400 });
  }
  if (!USERNAME_RE.test(username)) {
    return NextResponse.json({ error: "Username can only contain lowercase letters, numbers, dots, dashes, and underscores." }, { status: 400 });
  }
  if (!EMAIL_RE.test(body.email)) {
    return NextResponse.json({ error: "Invalid email address." }, { status: 400 });
  }
  const policy = validatePasswordPolicy(body.password);
  if (!policy.valid) {
    return NextResponse.json({ error: policy.errors.join(" ") }, { status: 400 });
  }

  const existing = await writeClient.fetch<number>(`count(*[_type == "adminUser" && username == $username])`, { username });
  if (existing > 0) {
    return NextResponse.json({ error: "Username already taken." }, { status: 409 });
  }

  const doc = await writeClient.create({
    _type: "adminUser",
    name: body.name,
    username,
    email: body.email,
    role: body.role === "superadmin" ? "superadmin" : "exec",
    active: true,
    passwordHash: hashPassword(body.password),
    createdAt: new Date().toISOString(),
  });

  return NextResponse.json({ user: { _id: doc._id, name: doc.name, username: doc.username, email: doc.email, role: doc.role, active: doc.active } });
}

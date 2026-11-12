import { NextRequest, NextResponse } from "next/server";
import { hashPassword, requireAdminApiAuth } from "@/lib/admin-auth";
import { generateStrongTempPassword } from "@/lib/passwordPolicy.server";
import { writeClient } from "@/lib/sanity/client";
import { allTeamCaptainsQuery, allTeamsWithIdQuery } from "@/lib/sanity/queries";
import { sendTeamCaptainCredentials, wasEmailSent } from "@/lib/resend";
import type { TeamCaptain, Team } from "@/lib/types";

const USERNAME_RE = /^[a-z0-9._-]+$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function GET(req: NextRequest) {
  const auth = await requireAdminApiAuth(req);
  if ("response" in auth) return auth.response;

  const [captains, teams] = await Promise.all([
    writeClient.fetch<TeamCaptain[]>(allTeamCaptainsQuery),
    writeClient.fetch<Team[]>(allTeamsWithIdQuery),
  ]);
  return NextResponse.json({ captains, teams });
}

/** Creates the account and emails the captain a temporary password — admins never see or set the password directly. */
export async function POST(req: NextRequest) {
  const auth = await requireAdminApiAuth(req);
  if ("response" in auth) return auth.response;

  const body = await req.json().catch(() => null);
  const username = (body?.username || "").toLowerCase().trim();
  const teamId = typeof body?.teamId === "string" ? body.teamId : "";
  if (!body?.name || !username || !body?.email || !teamId) {
    return NextResponse.json({ error: "Name, username, email, and team are required." }, { status: 400 });
  }
  if (!USERNAME_RE.test(username)) {
    return NextResponse.json(
      { error: "Username can only contain lowercase letters, numbers, dots, dashes, and underscores." },
      { status: 400 }
    );
  }
  if (!EMAIL_RE.test(body.email)) {
    return NextResponse.json({ error: "Invalid email address." }, { status: 400 });
  }

  const existing = await writeClient.fetch<number>(`count(*[_type == "teamCaptain" && username == $username])`, { username });
  if (existing > 0) {
    return NextResponse.json({ error: "Username already taken." }, { status: 409 });
  }

  const tempPassword = generateStrongTempPassword();
  const doc = await writeClient.create({
    _type: "teamCaptain",
    name: body.name,
    username,
    email: body.email,
    team: { _type: "reference", _ref: teamId },
    active: true,
    passwordHash: hashPassword(tempPassword),
    mustChangePassword: true,
    tempPasswordExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date().toISOString(),
  });

  const teamName = await writeClient.fetch<string>(`*[_type == "team" && _id == $teamId][0].name`, { teamId });
  const result = await sendTeamCaptainCredentials(body.email, body.name, teamName || "your team", username, tempPassword);
  if (!wasEmailSent(result)) {
    return NextResponse.json(
      { error: "Account created, but the credentials email failed to send. Use Reset Password to resend." },
      { status: 502 }
    );
  }

  return NextResponse.json({ ok: true, id: doc._id });
}

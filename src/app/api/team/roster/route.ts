import { NextRequest, NextResponse } from "next/server";
import { requireTeamApiAuth } from "@/lib/team-auth";
import { writeClient } from "@/lib/sanity/client";
import { rosterByTeamQuery } from "@/lib/sanity/queries";
import type { RosterPlayer } from "@/lib/types";

export async function GET(req: NextRequest) {
  const auth = await requireTeamApiAuth(req);
  if ("response" in auth) return auth.response;

  const roster = await writeClient.fetch<RosterPlayer[]>(rosterByTeamQuery, { teamId: auth.session.teamId });
  return NextResponse.json({ roster });
}

export async function POST(req: NextRequest) {
  const auth = await requireTeamApiAuth(req);
  if ("response" in auth) return auth.response;

  const body = await req.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  if (!name) {
    return NextResponse.json({ error: "Name is required." }, { status: 400 });
  }

  const doc = await writeClient.create({
    _type: "rosterPlayer",
    team: { _type: "reference", _ref: auth.session.teamId },
    name,
    jerseyNumber: typeof body?.jerseyNumber === "string" ? body.jerseyNumber.trim() : undefined,
    position: typeof body?.position === "string" ? body.position : undefined,
    isPitcher: Boolean(body?.isPitcher),
    status: body?.status === "injured" ? "injured" : "active",
    email: typeof body?.email === "string" ? body.email.trim() : undefined,
  });

  return NextResponse.json({ ok: true, id: doc._id });
}

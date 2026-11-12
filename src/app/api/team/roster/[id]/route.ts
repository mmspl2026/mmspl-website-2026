import { NextRequest, NextResponse } from "next/server";
import { requireTeamApiAuth } from "@/lib/team-auth";
import { writeClient } from "@/lib/sanity/client";

async function assertOwnedByTeam(id: string, teamId: string) {
  const owner = await writeClient.fetch<string | null>(`*[_type == "rosterPlayer" && _id == $id][0].team._ref`, { id });
  return owner === teamId;
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireTeamApiAuth(req);
  if ("response" in auth) return auth.response;
  if (!(await assertOwnedByTeam(params.id, auth.session.teamId))) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  const patch: Record<string, unknown> = {};
  if (typeof body?.name === "string") patch.name = body.name.trim();
  if (typeof body?.jerseyNumber === "string") patch.jerseyNumber = body.jerseyNumber.trim();
  if (typeof body?.position === "string") patch.position = body.position;
  if (typeof body?.isPitcher === "boolean") patch.isPitcher = body.isPitcher;
  if (body?.status === "active" || body?.status === "injured") patch.status = body.status;
  if (typeof body?.email === "string") patch.email = body.email.trim();

  await writeClient.patch(params.id).set(patch).commit();
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireTeamApiAuth(req);
  if ("response" in auth) return auth.response;
  if (!(await assertOwnedByTeam(params.id, auth.session.teamId))) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  await writeClient.delete(params.id);
  return NextResponse.json({ ok: true });
}

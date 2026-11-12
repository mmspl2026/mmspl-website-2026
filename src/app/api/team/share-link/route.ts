import { NextRequest, NextResponse } from "next/server";
import { requireTeamApiAuth, generateShareToken } from "@/lib/team-auth";
import { writeClient } from "@/lib/sanity/client";

export async function POST(req: NextRequest) {
  const auth = await requireTeamApiAuth(req);
  if ("response" in auth) return auth.response;

  const token = generateShareToken();
  await writeClient.patch(auth.session.captainId).set({ shareToken: token }).commit();
  return NextResponse.json({ ok: true, token });
}

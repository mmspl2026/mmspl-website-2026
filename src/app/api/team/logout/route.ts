import { NextResponse } from "next/server";
import { clearTeamSessionCookie } from "@/lib/team-auth";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  clearTeamSessionCookie(res);
  return res;
}

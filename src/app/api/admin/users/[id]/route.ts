import { NextRequest, NextResponse } from "next/server";
import { requireAdminApiAuth } from "@/lib/admin-auth";
import { writeClient } from "@/lib/sanity/client";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = requireAdminApiAuth(req);
  if ("response" in auth) return auth.response;
  if (auth.session.role !== "superadmin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (params.id === auth.session.uid) {
    return NextResponse.json({ error: "You cannot deactivate your own account." }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body.active !== "boolean") {
    return NextResponse.json({ error: "active (boolean) is required." }, { status: 400 });
  }

  await writeClient.patch(params.id).set({ active: body.active }).commit();
  return NextResponse.json({ ok: true });
}

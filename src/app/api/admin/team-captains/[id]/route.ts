import { NextRequest, NextResponse } from "next/server";
import { requireAdminApiAuth } from "@/lib/admin-auth";
import { writeClient } from "@/lib/sanity/client";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdminApiAuth(req);
  if ("response" in auth) return auth.response;

  const body = await req.json().catch(() => null);
  if (!body || typeof body.active !== "boolean") {
    return NextResponse.json({ error: "active (boolean) is required." }, { status: 400 });
  }

  const patch = writeClient.patch(params.id).set({ active: body.active });
  if (!body.active) patch.unset(["currentSessionId"]);
  await patch.commit();
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdminApiAuth(req);
  if ("response" in auth) return auth.response;

  const target = await writeClient.fetch<{ _id: string } | null>(`*[_type == "teamCaptain" && _id == $id][0]{_id}`, { id: params.id });
  if (!target) {
    return NextResponse.json({ error: "Captain not found." }, { status: 404 });
  }

  await writeClient.delete(params.id);
  return NextResponse.json({ ok: true });
}

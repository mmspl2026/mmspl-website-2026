import { NextRequest, NextResponse } from "next/server";
import { requireAdminApiAuth } from "@/lib/admin-auth";
import { writeClient } from "@/lib/sanity/client";
import { plainTextToBlocks } from "@/lib/newsBody";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdminApiAuth(req);
  if ("response" in auth) return auth.response;

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid body." }, { status: 400 });
  }

  const patch: Record<string, unknown> = {};
  if ("title" in body) patch.title = body.title;
  if ("date" in body) patch.date = body.date;
  if ("tag" in body) patch.tag = body.tag;
  if ("photo" in body) patch.photo = body.photo;
  if ("body" in body && typeof body.body === "string") {
    patch.body = plainTextToBlocks(body.body);
  }

  await writeClient.patch(params.id).set(patch).commit();
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdminApiAuth(req);
  if ("response" in auth) return auth.response;

  await writeClient.delete(params.id);
  return NextResponse.json({ ok: true });
}

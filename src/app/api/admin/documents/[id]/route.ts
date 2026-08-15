import { NextRequest, NextResponse } from "next/server";
import { requireAdminApiAuth } from "@/lib/admin-auth";
import { writeClient } from "@/lib/sanity/client";

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdminApiAuth(req);
  if ("response" in auth) return auth.response;

  const doc = await writeClient.fetch<{ assetId?: string }>(
    `*[_type == "leagueDocument" && _id == $id][0]{ "assetId": file.asset->_id }`,
    { id: params.id }
  );

  await writeClient.delete(params.id);

  // Also remove the underlying PDF asset — a leagueDocument's file is never
  // shared with another document, so nothing else can be left dangling.
  if (doc?.assetId) {
    await writeClient.delete(doc.assetId).catch(() => {
      // Asset may already be gone (e.g. re-uploaded during editing) — the
      // document itself is deleted either way, so this isn't fatal.
    });
  }

  return NextResponse.json({ ok: true });
}

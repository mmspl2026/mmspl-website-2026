import { NextRequest, NextResponse } from "next/server";
import { requireAdminApiAuth } from "@/lib/admin-auth";
import { writeClient } from "@/lib/sanity/client";
import { isAcceptedDocumentFile } from "@/lib/documentUpload";

export async function POST(req: NextRequest) {
  const auth = await requireAdminApiAuth(req);
  if ("response" in auth) return auth.response;

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "No file provided." }, { status: 400 });
  }
  if (!isAcceptedDocumentFile(file)) {
    return NextResponse.json({ error: "Only PDF, TXT, DOC, and DOCX files are accepted." }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const asset = await writeClient.assets.upload("file", buffer, {
    filename: file.name,
    contentType: file.type || "application/octet-stream",
  });

  return NextResponse.json({
    file: { _type: "file", asset: { _type: "reference", _ref: asset._id } },
    url: asset.url,
    originalFilename: asset.originalFilename,
  });
}

import { NextRequest, NextResponse } from "next/server";
import { requireAdminApiAuth } from "@/lib/admin-auth";
import { writeClient } from "@/lib/sanity/client";
import { adminSettingsFullQuery } from "@/lib/sanity/queries";
import type { AdminSettings } from "@/lib/types";

const EDITABLE_FIELDS = [
  "registrationOpen",
  "registrationFee",
  "registrationClosedMessage",
  "fromAddress",
  "registrationRecipients",
  "contactRecipients",
  "resendApiKey",
] as const;

async function getOrCreateSettingsId(): Promise<string> {
  const existing = await writeClient.fetch<{ _id: string } | null>(`*[_type == "adminSettings"][0]{_id}`);
  if (existing) return existing._id;
  const created = await writeClient.create({ _type: "adminSettings" });
  return created._id;
}

export async function GET(req: NextRequest) {
  const auth = requireAdminApiAuth(req);
  if ("response" in auth) return auth.response;

  const settings = await writeClient.fetch<AdminSettings | null>(adminSettingsFullQuery);
  const { resendApiKey, ...rest } = settings ?? {};
  return NextResponse.json({
    settings: rest,
    resendApiKeyConfigured: Boolean(resendApiKey) || Boolean(process.env.RESEND_API_KEY),
  });
}

export async function PATCH(req: NextRequest) {
  const auth = requireAdminApiAuth(req);
  if ("response" in auth) return auth.response;

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid body." }, { status: 400 });
  }

  const patch: Record<string, unknown> = {};
  for (const key of EDITABLE_FIELDS) {
    if (key in body) patch[key] = body[key];
  }
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "No editable fields provided." }, { status: 400 });
  }

  const id = await getOrCreateSettingsId();
  await writeClient.patch(id).set(patch).commit();

  const settings = await writeClient.fetch<AdminSettings | null>(adminSettingsFullQuery);
  const { resendApiKey, ...rest } = settings ?? {};
  return NextResponse.json({
    settings: rest,
    resendApiKeyConfigured: Boolean(resendApiKey) || Boolean(process.env.RESEND_API_KEY),
  });
}

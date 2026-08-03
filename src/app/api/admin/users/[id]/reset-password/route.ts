import { NextRequest, NextResponse } from "next/server";
import { hashPassword, requireAdminApiAuth } from "@/lib/admin-auth";
import { writeClient } from "@/lib/sanity/client";

function generateTempPassword(): string {
  return Math.random().toString(36).slice(-5) + Math.random().toString(36).slice(-5);
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = requireAdminApiAuth(req);
  if ("response" in auth) return auth.response;
  if (auth.session.role !== "superadmin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const tempPassword = generateTempPassword();
  await writeClient.patch(params.id).set({ passwordHash: hashPassword(tempPassword) }).commit();

  return NextResponse.json({ tempPassword });
}

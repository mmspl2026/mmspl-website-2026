import { NextRequest, NextResponse } from "next/server";
import { sendRegistrationConfirmation } from "@/lib/resend";
import { writeClient } from "@/lib/sanity/client";
import { isSanityConfigured } from "@/lib/sanity/env";

interface RegistrationPayload {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  birthYear: string;
  experience: string;
  position: string;
  emergencyContact: string;
  emergencyPhone: string;
  agreeToTerms: boolean;
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as Partial<RegistrationPayload> | null;

  if (!body?.firstName || !body?.lastName || !body?.email || !body?.agreeToTerms) {
    return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) {
    return NextResponse.json({ error: "A valid email is required." }, { status: 400 });
  }

  const playerName = `${body.firstName} ${body.lastName}`;

  if (isSanityConfigured) {
    const existing = await writeClient.fetch(`*[_type == "subscriber" && email == $email][0]{_id}`, {
      email: body.email,
    });
    if (!existing) {
      await writeClient.create({
        _type: "subscriber",
        email: body.email,
        name: playerName,
        subscribedAt: new Date().toISOString(),
      });
    }
  }

  await sendRegistrationConfirmation(body.email, playerName);

  return NextResponse.json({ ok: true });
}

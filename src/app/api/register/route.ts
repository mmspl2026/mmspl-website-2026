import { NextRequest, NextResponse } from "next/server";
import { sendRegistrationConfirmation, wasEmailSent } from "@/lib/resend";
import { writeClient } from "@/lib/sanity/client";
import { isSanityConfigured } from "@/lib/sanity/env";
import { activeSeasonQuery } from "@/lib/sanity/queries";
import type { Season } from "@/lib/types";

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
    const existingSubscriber = await writeClient.fetch(`*[_type == "subscriber" && email == $email][0]{_id}`, {
      email: body.email,
    });
    if (!existingSubscriber) {
      await writeClient.create({
        _type: "subscriber",
        email: body.email,
        name: playerName,
        subscribedAt: new Date().toISOString(),
      });
    }
  }

  const emailResult = await sendRegistrationConfirmation(body.email, playerName);
  const emailStatus = wasEmailSent(emailResult) ? "sent" : "failed";

  if (isSanityConfigured) {
    const activeSeason = await writeClient.fetch<Season | null>(activeSeasonQuery).catch(() => null);
    await writeClient.create({
      _type: "registration",
      firstName: body.firstName,
      lastName: body.lastName,
      email: body.email,
      phone: body.phone,
      birthYear: body.birthYear,
      experience: body.experience,
      position: body.position,
      emergencyContact: body.emergencyContact,
      emergencyPhone: body.emergencyPhone,
      ...(activeSeason ? { season: { _type: "reference", _ref: activeSeason._id } } : {}),
      status: "unpaid",
      emailStatus,
      submittedAt: new Date().toISOString(),
    });
  }

  return NextResponse.json({ ok: true });
}

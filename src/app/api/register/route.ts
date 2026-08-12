import { NextRequest, NextResponse } from "next/server";
import { sendRegistrationConfirmation, sendRegistrationAdminNotification, wasEmailSent } from "@/lib/resend";
import { writeClient } from "@/lib/sanity/client";
import { isSanityConfigured } from "@/lib/sanity/env";
import { activeSeasonQuery } from "@/lib/sanity/queries";
import type { Season } from "@/lib/types";

interface RegistrationPayload {
  firstName: string;
  lastName: string;
  streetAddress: string;
  unit: string;
  city: string;
  postalCode: string;
  homeNumber: string;
  mobileNumber: string;
  email: string;
  alternateEmail: string;
  dateOfBirth: string;
  heardAbout: string;
  highestLevel: string;
  category: string;
  preferredPosition: string;
  yearsExperience: string;
  experienceComments: string;
  canPitch: string;
  yearsPitched: string;
  pitchingComments: string;
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as Partial<RegistrationPayload> | null;

  if (
    !body?.firstName ||
    !body?.lastName ||
    !body?.email ||
    !body?.streetAddress ||
    !body?.city ||
    !body?.postalCode ||
    !body?.mobileNumber ||
    !body?.dateOfBirth ||
    !body?.heardAbout ||
    !body?.highestLevel ||
    !body?.category ||
    !body?.preferredPosition ||
    !body?.yearsExperience ||
    !body?.canPitch
  ) {
    return NextResponse.json({ error: "Please fill in all required fields." }, { status: 400 });
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

  const [emailResult] = await Promise.all([
    sendRegistrationConfirmation(body.email, playerName),
    sendRegistrationAdminNotification({ playerName, email: body.email, category: body.category }),
  ]);
  const emailStatus = wasEmailSent(emailResult) ? "sent" : "failed";

  if (isSanityConfigured) {
    const activeSeason = await writeClient.fetch<Season | null>(activeSeasonQuery).catch(() => null);
    await writeClient.create({
      _type: "registration",
      firstName: body.firstName,
      lastName: body.lastName,
      streetAddress: body.streetAddress,
      unit: body.unit || undefined,
      city: body.city,
      postalCode: body.postalCode,
      homeNumber: body.homeNumber || undefined,
      mobileNumber: body.mobileNumber,
      email: body.email,
      alternateEmail: body.alternateEmail || undefined,
      dateOfBirth: body.dateOfBirth,
      heardAbout: body.heardAbout,
      highestLevel: body.highestLevel,
      category: body.category,
      preferredPosition: body.preferredPosition,
      yearsExperience: body.yearsExperience,
      experienceComments: body.experienceComments || undefined,
      canPitch: body.canPitch,
      yearsPitched: body.yearsPitched || undefined,
      pitchingComments: body.pitchingComments || undefined,
      ...(activeSeason ? { season: { _type: "reference", _ref: activeSeason._id } } : {}),
      status: "unpaid",
      emailStatus,
      submittedAt: new Date().toISOString(),
    });
  }

  return NextResponse.json({ ok: true });
}

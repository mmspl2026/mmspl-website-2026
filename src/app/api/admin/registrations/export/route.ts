import { NextRequest, NextResponse } from "next/server";
import { requireAdminApiAuth } from "@/lib/admin-auth";
import { writeClient } from "@/lib/sanity/client";
import { allRegistrationsQuery } from "@/lib/sanity/queries";
import type { Registration } from "@/lib/types";

function csvCell(value: unknown) {
  const str = String(value ?? "");
  return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

export async function GET(req: NextRequest) {
  const auth = await requireAdminApiAuth(req);
  if ("response" in auth) return auth.response;

  const registrations = await writeClient.fetch<Registration[]>(allRegistrationsQuery);

  const headers = [
    "First Name",
    "Last Name",
    "Street Address",
    "Unit",
    "City",
    "Postal Code",
    "Home Number",
    "Mobile Number",
    "Email",
    "Alternate Email",
    "Date of Birth",
    "Heard About",
    "Highest Level Played",
    "Category",
    "Preferred Position",
    "Years of Experience",
    "Experience Comments",
    "Can Pitch",
    "Years Pitched",
    "Pitching Comments",
    "Season",
    "Status",
    "Email Status",
    "Submitted At",
  ];
  const rows = registrations.map((r) =>
    [
      r.firstName,
      r.lastName,
      r.streetAddress,
      r.unit,
      r.city,
      r.postalCode,
      r.homeNumber,
      r.mobileNumber,
      r.email,
      r.alternateEmail,
      r.dateOfBirth,
      r.heardAbout,
      r.highestLevel,
      r.category,
      r.preferredPosition,
      r.yearsExperience,
      r.experienceComments,
      r.canPitch,
      r.yearsPitched,
      r.pitchingComments,
      r.season?.year,
      r.status,
      r.emailStatus,
      r.submittedAt,
    ]
      .map(csvCell)
      .join(",")
  );
  const csv = [headers.join(","), ...rows].join("\r\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="mmspl-registrations.csv"`,
    },
  });
}

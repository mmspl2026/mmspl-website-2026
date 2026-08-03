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
  const auth = requireAdminApiAuth(req);
  if ("response" in auth) return auth.response;

  const registrations = await writeClient.fetch<Registration[]>(allRegistrationsQuery);

  const headers = [
    "First Name",
    "Last Name",
    "Email",
    "Phone",
    "Birth Year",
    "Experience",
    "Position",
    "Emergency Contact",
    "Emergency Phone",
    "Season",
    "Status",
    "Email Status",
    "Submitted At",
  ];
  const rows = registrations.map((r) =>
    [
      r.firstName,
      r.lastName,
      r.email,
      r.phone,
      r.birthYear,
      r.experience,
      r.position,
      r.emergencyContact,
      r.emergencyPhone,
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

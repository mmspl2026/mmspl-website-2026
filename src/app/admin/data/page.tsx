import type { Metadata } from "next";
import { requireAdminSession } from "@/lib/admin-auth";
import { isSanityConfigured } from "@/lib/sanity/env";
import { writeClient } from "@/lib/sanity/client";
import { adminUserByIdQuery } from "@/lib/sanity/queries";
import type { AdminUser } from "@/lib/types";
import DataManagerShell from "@/components/admin/data/DataManagerShell";

export const metadata: Metadata = { title: "Admin — Data Manager" };

export default async function AdminDataPage() {
  const session = requireAdminSession("/admin/data");

  if (!isSanityConfigured) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 text-center">
        <p className="max-w-sm text-gray-600">
          Sanity isn&rsquo;t configured yet — add <code>NEXT_PUBLIC_SANITY_PROJECT_ID</code> and friends to{" "}
          <code>.env.local</code> before using the Data Manager.
        </p>
      </div>
    );
  }

  const user = await writeClient.fetch<AdminUser | null>(adminUserByIdQuery, { id: session.uid });

  return <DataManagerShell user={user} role={session.role} />;
}

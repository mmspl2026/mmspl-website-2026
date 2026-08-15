import type { Metadata } from "next";
import { requireAdminSession } from "@/lib/admin-auth";
import { isSanityConfigured } from "@/lib/sanity/env";
import { writeClient } from "@/lib/sanity/client";
import { adminUserByIdQuery } from "@/lib/sanity/queries";
import type { AdminUser } from "@/lib/types";
import AdminDashboard from "@/components/admin/AdminDashboard";

export const metadata: Metadata = { title: "Admin — Score Entry" };

export default async function AdminPage() {
  const session = await requireAdminSession();

  if (!isSanityConfigured) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black px-4 text-center">
        <p className="max-w-sm text-white/70">
          Sanity isn&rsquo;t configured yet — add <code>NEXT_PUBLIC_SANITY_PROJECT_ID</code> and
          friends to <code>.env.local</code> before using score entry.
        </p>
      </div>
    );
  }

  const user = await writeClient.fetch<AdminUser | null>(adminUserByIdQuery, { id: session.uid });

  return <AdminDashboard displayName={user?.name || "Admin"} />;
}

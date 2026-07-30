import type { Metadata } from "next";
import { requireAdminSession } from "@/lib/admin-auth";
import { isSanityConfigured } from "@/lib/sanity/env";
import AdminDashboard from "@/components/admin/AdminDashboard";

export const metadata: Metadata = { title: "Admin — Score Entry" };

export default function AdminPage() {
  requireAdminSession();

  if (!isSanityConfigured) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#111111] px-4 text-center">
        <p className="max-w-sm text-white/70">
          Sanity isn&rsquo;t configured yet — add <code>NEXT_PUBLIC_SANITY_PROJECT_ID</code> and
          friends to <code>.env.local</code> before using score entry.
        </p>
      </div>
    );
  }

  return <AdminDashboard />;
}

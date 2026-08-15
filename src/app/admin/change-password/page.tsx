import type { Metadata } from "next";
import { requireAdminSession } from "@/lib/admin-auth";
import ChangePasswordForm from "@/components/admin/ChangePasswordForm";

export const metadata: Metadata = { title: "Change Password" };

export default async function ChangePasswordPage() {
  await requireAdminSession("/admin/change-password");

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#111111] px-4 py-16">
      <ChangePasswordForm />
    </div>
  );
}

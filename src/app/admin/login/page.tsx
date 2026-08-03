import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { ADMIN_SESSION_COOKIE, readSessionToken } from "@/lib/admin-auth";
import LoginForm from "@/components/admin/LoginForm";

export const metadata: Metadata = { title: "Admin Login" };

export default function AdminLoginPage() {
  const token = cookies().get(ADMIN_SESSION_COOKIE)?.value;
  if (readSessionToken(token)) redirect("/admin");

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#111111] px-4 py-16">
      <LoginForm />
    </div>
  );
}

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { ADMIN_SESSION_COOKIE, readSessionToken } from "@/lib/admin-auth";
import LoginForm from "@/components/admin/LoginForm";

export const metadata: Metadata = { title: "Admin Login" };

// Only ever send people back into /admin/* — guards against this becoming
// an open redirect via a crafted ?next= value.
function safeNext(next: string | undefined): string {
  if (next && next.startsWith("/admin/") && next !== "/admin/login") return next;
  return "/admin";
}

export default function AdminLoginPage({ searchParams }: { searchParams: { next?: string } }) {
  const token = cookies().get(ADMIN_SESSION_COOKIE)?.value;
  const next = safeNext(searchParams.next);
  if (readSessionToken(token)) redirect(next);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#111111] px-4 py-16">
      <LoginForm next={next} />
    </div>
  );
}

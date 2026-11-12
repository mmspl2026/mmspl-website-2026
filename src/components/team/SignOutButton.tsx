"use client";

import { useRouter } from "next/navigation";

export default function SignOutButton() {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/team/logout", { method: "POST" });
    router.replace("/team/login");
    router.refresh();
  }

  return (
    <button type="button" onClick={handleLogout} className="text-xs text-white/50 transition-colors hover:text-white">
      Sign Out
    </button>
  );
}

"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, LogOut } from "lucide-react";
import { LEAGUE_FOUNDING_YEAR } from "@/lib/seed-content";

export default function AdminHeader() {
  async function handleLogout() {
    await fetch("/api/admin/logout", { method: "POST" });
    window.location.href = "/admin/login";
  }

  return (
    <header className="bg-black text-white shadow-md">
      <div className="container-page flex items-center justify-between gap-4 py-2">
        <Link href="/" className="flex flex-col items-center" aria-label="MMSPL home">
          <Image
            src="/mmspl-logo.png"
            alt="Markham Men's Slo-Pitch League logo"
            width={110}
            height={64}
            priority
          />
          <span className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/50">
            Est. {LEAGUE_FOUNDING_YEAR}
          </span>
        </Link>

        <div className="flex items-center gap-1 sm:gap-3">
          <Link
            href="/"
            className="flex items-center gap-1.5 rounded px-2 py-2 text-sm font-semibold text-white/80 transition-colors hover:bg-white/10 hover:text-white sm:px-3"
          >
            <ArrowLeft size={16} aria-hidden="true" />
            <span className="hidden sm:inline">Back to Site</span>
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            aria-label="Log out"
            className="rounded p-2 text-white/50 transition-colors hover:bg-white/10 hover:text-white"
          >
            <LogOut size={18} aria-hidden="true" />
          </button>
        </div>
      </div>
    </header>
  );
}

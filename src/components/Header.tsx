"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, X, Bell } from "lucide-react";
import clsx from "clsx";
import { LEAGUE_FOUNDING_YEAR } from "@/lib/seed-content";

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/standings", label: "Standings" },
  { href: "/schedule", label: "Schedule" },
  { href: "/gallery", label: "Gallery" },
  { href: "/awards", label: "Awards" },
  { href: "/admin-info", label: "Admin" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

export default function Header() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b-2 border-brand bg-black text-white shadow-md">
      <div className="container-page flex items-center justify-between gap-2 py-1.5 sm:py-2">
        <Link
          href="/"
          className="flex items-center gap-2 lg:flex-col lg:items-center lg:gap-0"
          aria-label="MMSPL home"
        >
          <Image
            src="/mmspl-logo.png"
            alt="Markham Men's Slo-Pitch League logo"
            width={110}
            height={64}
            priority
            className="h-14 w-auto lg:h-16"
          />
          <span className="text-[9px] font-semibold uppercase tracking-[0.15em] text-white/50 lg:mt-0.5 lg:text-[10px] lg:tracking-[0.2em]">
            Est. {LEAGUE_FOUNDING_YEAR}
          </span>
        </Link>

        <nav aria-label="Primary" className="hidden lg:block">
          <ul className="flex items-center gap-6">
            {NAV_LINKS.map((link) => {
              const isActive =
                link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
              return (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    aria-current={isActive ? "page" : undefined}
                    className="nav-link"
                  >
                    {link.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          <Link
            href="/notifications"
            aria-label="Notifications"
            aria-current={pathname === "/notifications" ? "page" : undefined}
            className="rounded-full p-2 text-white/70 transition-colors hover:bg-white/10 hover:text-white aria-[current=page]:text-brand"
          >
            <Bell size={20} aria-hidden="true" />
          </Link>
          <Link href="/register" className="btn-primary">
            Register Now
          </Link>
        </div>

        <div className="flex items-center gap-1 lg:hidden">
          <Link
            href="/notifications"
            aria-label="Notifications"
            aria-current={pathname === "/notifications" ? "page" : undefined}
            className="rounded-full p-2 text-white/70 transition-colors hover:bg-white/10 hover:text-white aria-[current=page]:text-brand"
          >
            <Bell size={20} aria-hidden="true" />
          </Link>
          <button
            type="button"
            className="rounded p-2 text-white"
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X size={24} aria-hidden="true" /> : <Menu size={24} aria-hidden="true" />}
          </button>
        </div>
      </div>

      {open && (
        <nav id="mobile-nav" aria-label="Primary mobile" className="border-t border-white/10 lg:hidden">
          <ul className="container-page flex flex-col py-2">
            {NAV_LINKS.map((link) => {
              const isActive =
                link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
              return (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    aria-current={isActive ? "page" : undefined}
                    onClick={() => setOpen(false)}
                    className={clsx(
                      "block rounded px-3 py-3 text-base font-semibold uppercase tracking-wide",
                      isActive ? "bg-brand text-white" : "text-white/80 hover:bg-white/10 hover:text-white"
                    )}
                  >
                    {link.label}
                  </Link>
                </li>
              );
            })}
            <li>
              <Link
                href="/notifications"
                aria-current={pathname === "/notifications" ? "page" : undefined}
                onClick={() => setOpen(false)}
                className={clsx(
                  "flex items-center gap-2 rounded px-3 py-3 text-base font-semibold uppercase tracking-wide",
                  pathname === "/notifications"
                    ? "bg-brand text-white"
                    : "text-white/80 hover:bg-white/10 hover:text-white"
                )}
              >
                <Bell size={18} aria-hidden="true" />
                Notifications
              </Link>
            </li>
            <li className="px-3 pb-2 pt-3">
              <Link
                href="/register"
                onClick={() => setOpen(false)}
                className="btn-primary w-full"
              >
                Register Now
              </Link>
            </li>
          </ul>
        </nav>
      )}
    </header>
  );
}

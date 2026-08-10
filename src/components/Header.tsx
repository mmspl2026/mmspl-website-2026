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
  { href: "/news", label: "News" },
  { href: "/awards", label: "Awards" },
  { href: "/admin-info", label: "Admin" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

const MOBILE_NAV_GROUPS: { label: string | null; links: { name: string; path: string }[] }[] = [
  { label: null, links: [{ name: "Home", path: "/" }] },
  {
    label: "Play",
    links: [
      { name: "Schedule", path: "/schedule" },
      { name: "Standings", path: "/standings" },
    ],
  },
  {
    label: "Community",
    links: [
      { name: "News", path: "/news" },
      { name: "Awards", path: "/awards" },
    ],
  },
  {
    label: "League",
    links: [
      { name: "About", path: "/about" },
      { name: "Admin", path: "/admin-info" },
      { name: "Contact", path: "/contact" },
    ],
  },
];

export default function Header() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b-2 border-brand bg-black text-white shadow-md">
      <div className="container-page flex items-center justify-between gap-2 py-1.5 sm:py-2">
        <Link href="/" className="flex items-center gap-2 sm:gap-3" aria-label="MMSPL home">
          <Image
            src="/mmspl-logo.png"
            alt="Markham Men's Slo-Pitch League logo"
            width={110}
            height={64}
            priority
            className="h-14 w-auto lg:h-16"
          />
          <div className="flex flex-col justify-center">
            <span className="font-mono-brand text-[9.5px] uppercase leading-tight tracking-[0.12em] text-[#9a968f]">
              Est. {LEAGUE_FOUNDING_YEAR}
            </span>
          </div>
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

      <div
        className={clsx(
          "fixed inset-0 z-40 bg-black/55 transition-opacity duration-300 lg:hidden",
          open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        )}
        onClick={() => setOpen(false)}
        aria-hidden="true"
      />

      <div
        id="mobile-nav"
        className={clsx(
          "fixed right-0 top-0 z-50 flex h-full flex-col transition-transform duration-300 ease-in-out lg:hidden",
          open ? "translate-x-0" : "translate-x-full"
        )}
        style={{
          width: "82%",
          maxWidth: "340px",
          background: "#0d0d0e",
          boxShadow: "-20px 0 40px rgba(0,0,0,.4)",
          visibility: open ? "visible" : "hidden",
        }}
      >
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <Image src="/mmspl-logo.png" alt="MMSPL" width={110} height={64} className="h-9 w-auto object-contain" />
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="text-white/70 transition-colors hover:text-white"
            aria-label="Close menu"
          >
            <X size={22} aria-hidden="true" />
          </button>
        </div>

        <nav aria-label="Primary mobile" className="flex-1 overflow-y-auto py-2">
          {MOBILE_NAV_GROUPS.map((group, i) => (
            <div key={i}>
              {group.label && (
                <p
                  style={{
                    fontFamily: "var(--font-space-mono)",
                    fontSize: "10px",
                    letterSpacing: ".14em",
                    textTransform: "uppercase",
                    color: "#7a7a7d",
                    padding: "14px 20px 6px",
                  }}
                >
                  {group.label}
                </p>
              )}
              {group.links.map((link) => {
                const isActive = link.path === "/" ? pathname === "/" : pathname.startsWith(link.path);
                return (
                  <Link
                    key={link.path}
                    href={link.path}
                    onClick={() => setOpen(false)}
                    aria-current={isActive ? "page" : undefined}
                    style={{
                      display: "block",
                      padding: "11px 20px 11px 24px",
                      color: isActive ? "#fff" : "#e6e6e6",
                      textDecoration: "none",
                      fontFamily: "var(--font-inter)",
                      fontSize: "15px",
                      fontWeight: isActive ? 700 : 500,
                      borderLeft: isActive ? "3px solid #c8202b" : "3px solid transparent",
                      background: isActive ? "rgba(200,32,43,.14)" : "transparent",
                      transition: "background .15s",
                    }}
                  >
                    {link.name}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="border-t border-white/10 px-4 py-4">
          <Link
            href="/register"
            onClick={() => setOpen(false)}
            style={{
              display: "block",
              width: "100%",
              background: "#c8202b",
              color: "#fff",
              textAlign: "center",
              padding: "14px",
              borderRadius: "3px",
              fontFamily: "var(--font-inter)",
              fontWeight: 700,
              fontSize: "14.5px",
              letterSpacing: ".02em",
              textDecoration: "none",
            }}
          >
            Register Now
          </Link>
        </div>
      </div>
    </header>
  );
}

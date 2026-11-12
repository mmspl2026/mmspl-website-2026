import Link from "next/link";
import Image from "next/image";
import SignOutButton from "./SignOutButton";

const TABS = [
  { href: "/team", label: "Dashboard" },
  { href: "/team/roster", label: "Roster" },
  { href: "/team/stats", label: "Stats" },
  { href: "/team/beer-list", label: "Beer List" },
] as const;

export default function TeamShell({
  active,
  teamName,
  children,
}: {
  active: (typeof TABS)[number]["href"];
  teamName: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50 text-black">
      <div className="sticky top-0 z-40 border-b border-white/10 bg-black text-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-3">
            <Image src="/mmspl-logo.png" alt="" width={36} height={21} aria-hidden="true" />
            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-white/40">Team Portal</p>
              <p className="text-sm font-semibold">{teamName}</p>
            </div>
          </div>
          <SignOutButton />
        </div>
        <nav className="mx-auto flex max-w-4xl gap-1 px-4 pb-1">
          {TABS.map((tab) => (
            <Link
              key={tab.href}
              href={tab.href}
              className={`rounded-t px-3 py-2 text-xs font-semibold uppercase tracking-wide transition-colors ${
                active === tab.href ? "border-b-2 border-brand text-white" : "text-white/40 hover:text-white/70"
              }`}
            >
              {tab.label}
            </Link>
          ))}
        </nav>
      </div>
      <main className="mx-auto max-w-4xl px-4 py-6 pb-24">{children}</main>
    </div>
  );
}

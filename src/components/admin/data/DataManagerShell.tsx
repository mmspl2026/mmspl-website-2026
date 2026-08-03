"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import {
  BarChart3,
  CalendarClock,
  ClipboardList,
  Mail,
  MailOpen,
  CalendarDays,
  Trophy,
  Newspaper,
  Image as ImageIcon,
  Bell,
  Users,
} from "lucide-react";
import type { AdminRole, AdminUser } from "@/lib/types";
import { LEAGUE_FOUNDING_YEAR } from "@/lib/seed-content";
import StandingsTab from "./tabs/StandingsTab";
import ScoresTab from "./tabs/ScoresTab";
import RegistrationsTab from "./tabs/RegistrationsTab";
import ContactsTab from "./tabs/ContactsTab";
import EmailTab from "./tabs/EmailTab";
import KeyDatesTab from "./tabs/KeyDatesTab";
import AwardsTab from "./tabs/AwardsTab";
import NewsTab from "./tabs/NewsTab";
import GalleryTab from "./tabs/GalleryTab";
import NotifyTab from "./tabs/NotifyTab";
import UsersTab from "./tabs/UsersTab";

const TABS = [
  { id: "standings", label: "Standings", icon: BarChart3 },
  { id: "scores", label: "Scores", icon: CalendarClock },
  { id: "registrations", label: "Registrations", icon: ClipboardList },
  { id: "contacts", label: "Contacts", icon: Mail },
  { id: "email", label: "Email", icon: MailOpen },
  { id: "dates", label: "Key Dates", icon: CalendarDays },
  { id: "awards", label: "Awards", icon: Trophy },
  { id: "news", label: "News", icon: Newspaper },
  { id: "gallery", label: "Gallery", icon: ImageIcon },
  { id: "notify", label: "Notify", icon: Bell },
  { id: "users", label: "Users", icon: Users },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default function DataManagerShell({ user, role }: { user: AdminUser | null; role: AdminRole }) {
  const router = useRouter();
  const [tab, setTab] = useState<TabId>("standings");

  async function handleLogout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.replace("/admin/login");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-40 bg-black text-white">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-4 px-4 py-2.5 sm:px-6">
          <div className="flex items-center gap-3">
            <Image src="/mmspl-logo.png" alt="MMSPL logo" width={40} height={23} className="h-8 w-auto" />
            <div className="flex flex-col leading-none">
              <span className="font-heading text-sm uppercase tracking-wide">Data Manager</span>
              <span className="font-mono-brand text-[9px] uppercase tracking-[0.12em] text-white/45">
                Est. {LEAGUE_FOUNDING_YEAR}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3 text-sm">
            {user && (
              <span className="hidden text-white/70 sm:inline">
                {user.name} <span className="text-white/40">· {role}</span>
              </span>
            )}
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-[3px] border border-white/20 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-white/80 transition-colors hover:border-brand hover:text-white"
            >
              Sign Out
            </button>
          </div>
        </div>

        <div className="scrollbar-none overflow-x-auto border-t border-white/10">
          <div className="mx-auto flex max-w-[1400px] gap-1 px-4 sm:px-6">
            {TABS.map((t) => {
              const Icon = t.icon;
              const active = tab === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTab(t.id)}
                  className={clsx(
                    "flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors",
                    active ? "border-brand text-white" : "border-transparent text-white/60 hover:text-white"
                  )}
                >
                  <Icon size={15} aria-hidden="true" />
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6">
        {tab === "standings" && <StandingsTab />}
        {tab === "scores" && <ScoresTab />}
        {tab === "registrations" && <RegistrationsTab />}
        {tab === "contacts" && <ContactsTab />}
        {tab === "email" && <EmailTab />}
        {tab === "dates" && <KeyDatesTab />}
        {tab === "awards" && <AwardsTab />}
        {tab === "news" && <NewsTab />}
        {tab === "gallery" && <GalleryTab />}
        {tab === "notify" && <NotifyTab />}
        {tab === "users" && <UsersTab role={role} />}
      </main>
    </div>
  );
}

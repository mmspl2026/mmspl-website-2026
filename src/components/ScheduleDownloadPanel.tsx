"use client";

import { useMemo, useState } from "react";
import { Download, ChevronDown } from "lucide-react";
import clsx from "clsx";
import type { Game } from "@/lib/types";
import { getTeamOptions, buildDownloadUrl } from "@/lib/scheduleExport";

function DownloadLink({
  href,
  disabled,
  children,
}: {
  href?: string;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <a
      href={disabled ? undefined : href}
      aria-disabled={disabled}
      className={clsx(
        "flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold transition-colors",
        disabled
          ? "pointer-events-none border-white/5 bg-white/[0.02] text-white/30"
          : "border-white/10 bg-white/5 text-white hover:border-brand/60 hover:bg-white/10"
      )}
    >
      {children}
    </a>
  );
}

export default function ScheduleDownloadPanel({ games, year }: { games: Game[]; year: number }) {
  const [open, setOpen] = useState(false);
  const [team, setTeam] = useState("");

  const teamOptions = useMemo(() => getTeamOptions(games), [games]);
  const downloadUrl = (format: "ics" | "csv", teamSlug?: string) => buildDownloadUrl(year, format, teamSlug);

  if (games.length === 0) return null;

  // Desktop only — mobile gets a dedicated full-width button + bottom sheet
  // (ScheduleDownloadMobileSheet), positioned below the filter bar instead.
  return (
    <div className="relative hidden md:block">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="inline-flex h-9 items-center justify-center gap-2 whitespace-nowrap rounded-[3px] bg-brand px-4 text-sm font-semibold text-white shadow transition-colors hover:bg-brand-700"
      >
        <Download size={16} aria-hidden="true" />
        Download Schedule
        <ChevronDown size={14} className={clsx("transition-transform", open && "rotate-180")} aria-hidden="true" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} aria-hidden="true" />
          <div className="absolute right-0 z-20 mt-2 w-[min(92vw,360px)] overflow-hidden rounded-xl border border-white/10 bg-[#0d0d0e] text-white shadow-xl">
            <div className="p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand">Master Schedule</p>
              <div className="mt-3 flex flex-col gap-2">
                <DownloadLink href={downloadUrl("csv")}>📊 Download as Excel/CSV</DownloadLink>
                <DownloadLink href={downloadUrl("ics")}>📅 Download as Calendar (.ics)</DownloadLink>
              </div>
            </div>

            <div className="border-t border-white/10 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand">By Team</p>
              <select
                value={team}
                onChange={(e) => setTeam(e.target.value)}
                className="mt-3 h-9 w-full rounded-md border border-white/20 bg-black/40 px-2 text-sm text-white focus:border-brand focus:outline-none"
              >
                <option value="" className="text-black">
                  Select a team&hellip;
                </option>
                {teamOptions.map((t) => (
                  <option key={t.slug} value={t.slug} className="text-black">
                    {t.name}
                  </option>
                ))}
              </select>
              <div className="mt-3 flex flex-col gap-2">
                <DownloadLink href={team ? downloadUrl("csv", team) : undefined} disabled={!team}>
                  📊 Excel/CSV
                </DownloadLink>
                <DownloadLink href={team ? downloadUrl("ics", team) : undefined} disabled={!team}>
                  📅 Calendar (.ics)
                </DownloadLink>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

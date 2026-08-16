"use client";

import { useMemo, useState } from "react";
import { X } from "lucide-react";
import clsx from "clsx";
import type { Game } from "@/lib/types";
import { getTeamOptions, buildDownloadUrl } from "@/lib/scheduleExport";

function SheetButton({ href, disabled, children }: { href?: string; disabled?: boolean; children: React.ReactNode }) {
  return (
    <a
      href={disabled ? undefined : href}
      aria-disabled={disabled}
      className={clsx(
        "flex w-full items-center justify-center gap-2 rounded-lg border-2 px-4 py-3 text-sm font-semibold transition-colors",
        disabled
          ? "pointer-events-none border-white/10 text-white/30"
          : "border-white/25 text-white hover:border-brand hover:bg-white/5"
      )}
    >
      {children}
    </a>
  );
}

export default function ScheduleDownloadMobileSheet({ games, year }: { games: Game[]; year: number }) {
  const [open, setOpen] = useState(false);
  const [team, setTeam] = useState("");

  const teamOptions = useMemo(() => getTeamOptions(games), [games]);
  const downloadUrl = (format: "ics" | "csv", teamSlug?: string) => buildDownloadUrl(year, format, teamSlug);

  if (games.length === 0) return null;

  return (
    <div className="md:hidden">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center justify-center gap-2 rounded-md bg-brand px-4 py-3.5 text-base font-bold text-white shadow transition-colors hover:bg-brand-700"
      >
        📅 Download Schedule
      </button>

      <div
        className={clsx(
          "fixed inset-0 z-50 bg-black/60 transition-opacity duration-300",
          open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        )}
        onClick={() => setOpen(false)}
        aria-hidden="true"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Download schedule"
        className={clsx(
          "fixed inset-x-0 bottom-0 z-50 flex max-h-[85vh] flex-col rounded-t-2xl bg-[#0d0d0e] text-white shadow-xl transition-transform duration-300 ease-out",
          open ? "translate-y-0" : "translate-y-full"
        )}
        style={{ visibility: open ? "visible" : "hidden" }}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-white/10 px-5 py-4">
          <p className="font-heading text-lg uppercase tracking-[0.01em] text-white">Download Schedule</p>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close"
            className="rounded-full p-1.5 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        <div
          className="flex-1 overflow-y-auto px-5 pt-5"
          style={{ paddingBottom: "max(1.25rem, env(safe-area-inset-bottom))" }}
        >
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand">Master Schedule</p>
          <div className="mt-3 flex flex-col gap-2.5">
            <SheetButton href={downloadUrl("csv")}>📊 Download CSV</SheetButton>
            <SheetButton href={downloadUrl("ics")}>📅 Download Calendar (.ics)</SheetButton>
          </div>

          <div className="my-5 h-px bg-white/10" />

          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand">By Team</p>
          <select
            value={team}
            onChange={(e) => setTeam(e.target.value)}
            className="mt-3 h-11 w-full rounded-md border border-white/20 bg-black/40 px-3 text-sm text-white focus:border-brand focus:outline-none"
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
          <div className="mt-3 flex flex-col gap-2.5">
            <SheetButton href={team ? downloadUrl("csv", team) : undefined} disabled={!team}>
              📊 Team CSV
            </SheetButton>
            <SheetButton href={team ? downloadUrl("ics", team) : undefined} disabled={!team}>
              📅 Team Calendar
            </SheetButton>
          </div>

          <button
            type="button"
            onClick={() => setOpen(false)}
            className="mt-6 w-full rounded-md border border-white/20 py-3 text-sm font-semibold text-white/70 transition-colors hover:bg-white/5 hover:text-white"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

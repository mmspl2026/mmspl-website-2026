"use client";

import { useState } from "react";
import Link from "next/link";
import { CalendarDays, Info, X } from "lucide-react";
import clsx from "clsx";
import type { TournamentResult } from "@/lib/types";
import SeasonDropdown, { type SeasonOption } from "./SeasonDropdown";
import { TournamentSheetCards } from "./TournamentCards";

// Mobile-only topbar for the Standings page, matching the format of the
// Schedule page's mobile topbar. The "Filter" button there becomes a plain
// link to the Schedule page here (standings has no filters to open), and the
// info sheet is trimmed down to the two things this page actually needs
// explaining: switching seasons and the tournament button.
export default function StandingsMobileBar({
  seasons,
  selectedYear,
  charityResult,
  mcgregorResult,
}: {
  seasons: SeasonOption[];
  selectedYear: number;
  charityResult: TournamentResult | null;
  mcgregorResult: TournamentResult | null;
}) {
  const [tournamentSheetOpen, setTournamentSheetOpen] = useState(false);
  const [infoSheetOpen, setInfoSheetOpen] = useState(false);

  return (
    <div className="md:hidden">
      <div className="sticky top-[56px] z-30 flex items-center gap-2 rounded-xl border bg-white p-2.5 text-black shadow">
        <SeasonDropdown seasons={seasons} selected={selectedYear} className="flex-1" />
        <Link
          href="/schedule"
          className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-md bg-[#1a1a1a] px-3 text-sm font-semibold text-white"
        >
          <CalendarDays size={15} aria-hidden="true" />
          Results
        </Link>
        <button
          type="button"
          onClick={() => setTournamentSheetOpen(true)}
          aria-label="Tournaments"
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-[#1a1a1a] text-white"
        >
          <span aria-hidden="true">🏆</span>
        </button>
        <button
          type="button"
          onClick={() => setInfoSheetOpen(true)}
          aria-label="How to use this page"
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-white text-[#555555]"
          style={{ border: "1px solid #999999" }}
        >
          <Info size={16} aria-hidden="true" />
        </button>
      </div>

      {/* Tournaments bottom sheet */}
      <div
        className={clsx(
          "fixed inset-0 z-50 bg-black/60 transition-opacity duration-300",
          tournamentSheetOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        )}
        onClick={() => setTournamentSheetOpen(false)}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Tournaments"
        className={clsx(
          "fixed inset-x-0 bottom-0 z-50 flex max-h-[88vh] flex-col rounded-t-2xl bg-white text-black shadow-xl transition-transform duration-300 ease-out",
          tournamentSheetOpen ? "translate-y-0" : "translate-y-full"
        )}
        style={{ visibility: tournamentSheetOpen ? "visible" : "hidden" }}
      >
        <div className="flex shrink-0 justify-center pt-3">
          <div className="h-1.5 w-10 rounded-full bg-gray-300" />
        </div>
        <div className="flex shrink-0 items-center justify-between px-5 pb-3 pt-2">
          <p className="font-heading text-lg uppercase tracking-[0.01em] text-black">{selectedYear} Tournaments</p>
          <button
            type="button"
            onClick={() => setTournamentSheetOpen(false)}
            aria-label="Close"
            className="rounded-full p-1.5 text-gray-500 transition-colors hover:bg-gray-100"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>
        <div
          className="flex-1 overflow-y-auto px-5"
          style={{ paddingBottom: "max(1.5rem, env(safe-area-inset-bottom))" }}
        >
          <TournamentSheetCards year={selectedYear} charity={charityResult} mcgregor={mcgregorResult} />
        </div>
      </div>

      {/* Info bottom sheet */}
      <div
        className={clsx(
          "fixed inset-0 z-50 bg-black/60 transition-opacity duration-300",
          infoSheetOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        )}
        onClick={() => setInfoSheetOpen(false)}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="How to use this page"
        className={clsx(
          "fixed inset-x-0 bottom-0 z-50 flex max-h-[88vh] flex-col rounded-t-2xl bg-white text-black shadow-xl transition-transform duration-300 ease-out",
          infoSheetOpen ? "translate-y-0" : "translate-y-full"
        )}
        style={{ visibility: infoSheetOpen ? "visible" : "hidden" }}
      >
        <div className="flex shrink-0 justify-center pt-3">
          <div className="h-1.5 w-10 rounded-full bg-gray-300" />
        </div>
        <div className="flex shrink-0 items-center justify-between px-5 pb-2 pt-2">
          <p className="font-heading text-lg uppercase tracking-[0.01em] text-black">How to use this page</p>
          <button
            type="button"
            onClick={() => setInfoSheetOpen(false)}
            aria-label="Close"
            className="rounded-full p-1.5 text-gray-500 transition-colors hover:bg-gray-100"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto" style={{ padding: "16px 14px 32px" }}>
          <InfoRow icon="🗓️" title="Previous Seasons">
            Use the season dropdown above to view standings from any past season.
          </InfoRow>
          <InfoRow icon="🏆" title="Tournament Results" last>
            Tap the 🏆 button to see Charity and McGregor tournament results for the selected season.
          </InfoRow>
        </div>
      </div>
    </div>
  );
}

function InfoRow({
  icon,
  title,
  last,
  children,
}: {
  icon: string;
  title: string;
  last?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className="flex items-start gap-2.5"
      style={{ padding: "10px 0", borderBottom: last ? "none" : "1px solid #f0f0f0" }}
    >
      <span className="flex shrink-0 items-center justify-center" style={{ width: 32, fontSize: 22 }} aria-hidden="true">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-bold text-black" style={{ fontSize: 12 }}>
          {title}
        </p>
        <div className="mt-0.5 text-gray-500" style={{ fontSize: 11 }}>
          {children}
        </div>
      </div>
    </div>
  );
}

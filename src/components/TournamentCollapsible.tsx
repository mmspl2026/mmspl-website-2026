import { ChevronDown } from "lucide-react";
import clsx from "clsx";
import type { TournamentResult } from "@/lib/types";
import { DesktopCard, getCardState } from "./TournamentCards";

function Segment({ label, year, result }: { label: string; year: number; result: TournamentResult | null }) {
  const state = getCardState(year, result);
  return (
    <span>
      {label}:{" "}
      <span className={clsx(state.hasChampion ? "font-bold text-[#e2514f]" : "italic text-white/50")}>
        {state.notHeld ? "Not held" : state.hasChampion ? state.championText : state.pendingLong}
      </span>
    </span>
  );
}

// Desktop-only (md: and above, same breakpoint as the rest of the schedule
// page's mobile/desktop split) -- collapsed by default via native
// <details>/<summary> (same pattern as the "How the rankings work"
// explainer on the tournament pages), so no client JS is needed. The closed
// summary row names both champions so nothing is hidden at a glance;
// expanding reveals the exact same full-detail DesktopCard pair as before.
// Mobile is untouched -- it keeps its own 🏆 topbar button + bottom sheet.
export default function TournamentCollapsible({
  year,
  charity,
  mcgregor,
}: {
  year: number;
  charity: TournamentResult | null;
  mcgregor: TournamentResult | null;
}) {
  return (
    <details className="group hidden md:block">
      <summary className="flex cursor-pointer list-none flex-wrap items-center gap-2.5 rounded-lg border-l-4 border-brand bg-[#1a1a1a] px-4 py-2.5 text-sm text-white">
        <span aria-hidden="true">🏆</span>
        <span className="font-semibold">{year}</span>
        <span className="text-white/30">&middot;</span>
        <Segment label="Charity" year={year} result={charity} />
        <span className="text-white/20">|</span>
        <Segment label="McGregor" year={year} result={mcgregor} />
        <ChevronDown
          size={16}
          className="ml-auto shrink-0 text-white/50 transition-transform group-open:rotate-180"
          aria-hidden="true"
        />
      </summary>
      <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
        <DesktopCard year={year} type="charity" result={charity} />
        <DesktopCard year={year} type="mcgregor" result={mcgregor} />
      </div>
    </details>
  );
}

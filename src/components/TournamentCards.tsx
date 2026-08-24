import Link from "next/link";
import clsx from "clsx";
import type { TournamentResult, TournamentType } from "@/lib/types";
import { TOURNAMENT_LABELS, formatDateRange } from "@/lib/tournamentDisplay";

// 2020 was cancelled league-wide, and the 2021 McGregor tournamentResult was
// never explicitly marked cancelled in Sanity (that season only played an
// unofficial, shortened schedule) — force both COVID years to the same
// "Not held" treatment regardless of what's actually stored.
export function isCovidYear(year: number) {
  return year === 2020 || year === 2021;
}

export interface CardState {
  notHeld: boolean;
  hasChampion: boolean;
  championText?: string;
  pendingLong?: string;
}

export function getCardState(year: number, result: TournamentResult | null): CardState {
  if (isCovidYear(year) || result?.cancelled) {
    return { notHeld: true, hasChampion: false };
  }
  if (result?.champion) {
    return { notHeld: false, hasChampion: true, championText: result.champion };
  }
  if (result?.plannedStart) {
    return {
      notHeld: false,
      hasChampion: false,
      pendingLong: formatDateRange(result.plannedEnd ? [result.plannedStart, result.plannedEnd] : [result.plannedStart], year),
    };
  }
  // A past season with no result on file is a data gap, not something still
  // to come — "Pending" would wrongly imply the tournament hasn't happened yet.
  const isPastSeason = year < new Date().getFullYear();
  return { notHeld: false, hasChampion: false, pendingLong: isPastSeason ? "Record not available" : "Pending" };
}

function DesktopCard({ year, type, result }: { year: number; type: TournamentType; result: TournamentResult | null }) {
  const label = TOURNAMENT_LABELS[type];
  const state = getCardState(year, result);
  const title = state.hasChampion ? `${year} Champions` : `${year} Tournament`;
  const href = `/schedule/tournament/${year}/${type}`;

  return (
    <div
      className={clsx(
        "flex items-center gap-3 rounded-lg border-l-4 bg-[#1a1a1a] px-4 py-3.5 sm:px-5 sm:py-4",
        state.hasChampion ? "border-brand" : "border-gray-500"
      )}
    >
      <span className="shrink-0 leading-none" style={{ fontSize: 28 }} aria-hidden="true">
        🏆
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-mono-brand text-[9.5px] uppercase tracking-[0.14em] text-white/50">{label.full}</p>
        <h3 className="mt-1 font-heading text-base uppercase leading-tight tracking-[0.01em] text-white sm:text-lg">
          {title}
        </h3>

        {state.notHeld ? (
          <p className="mt-2 text-sm italic text-gray-400">Not held &mdash; COVID</p>
        ) : state.hasChampion ? (
          <p className="mt-2 text-base font-bold text-brand sm:text-lg">{state.championText}</p>
        ) : (
          <p className="mt-2 text-sm italic text-gray-400">{state.pendingLong}</p>
        )}

        {state.notHeld ? (
          <span className="mt-2.5 inline-block text-sm text-gray-500">&mdash;</span>
        ) : state.hasChampion ? (
          <Link href={href} className="mt-2.5 inline-flex items-center gap-1 text-sm font-semibold text-brand hover:underline">
            View full results &rarr;
          </Link>
        ) : (
          <Link href={href} className="mt-2.5 inline-flex items-center gap-1 text-sm font-semibold text-gray-400 hover:underline">
            View schedule &rarr;
          </Link>
        )}
      </div>
    </div>
  );
}

/** Full-detail card used inside the mobile "Tournaments" bottom sheet — the
 * whole card is the tap target (no nested link), with a larger 32px icon. */
function SheetCard({ year, type, result }: { year: number; type: TournamentType; result: TournamentResult | null }) {
  const label = TOURNAMENT_LABELS[type];
  const state = getCardState(year, result);
  const title = state.hasChampion ? `${year} Champions` : `${year} Tournament`;
  const href = `/schedule/tournament/${year}/${type}`;
  const linkText = state.hasChampion ? "View full results →" : "View schedule →";

  const className = clsx(
    "flex items-center gap-3 rounded-lg border-l-4 bg-[#1a1a1a] px-4 py-4",
    state.hasChampion ? "border-brand" : "border-gray-500"
  );

  const content = (
    <>
      <span className="shrink-0 leading-none" style={{ fontSize: 32 }} aria-hidden="true">
        🏆
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-mono-brand text-[9.5px] uppercase tracking-[0.14em] text-white/50">{label.full}</p>
        <h3 className="mt-1 font-heading text-base uppercase leading-tight tracking-[0.01em] text-white">{title}</h3>

        {state.notHeld ? (
          <p className="mt-2 text-sm italic text-gray-400">Not held &mdash; COVID</p>
        ) : state.hasChampion ? (
          <p className="mt-2 text-base font-bold text-brand">{state.championText}</p>
        ) : (
          <p className="mt-2 text-sm italic text-gray-400">{state.pendingLong}</p>
        )}

        {state.notHeld ? (
          <span className="mt-2.5 inline-block text-sm text-gray-500">&mdash;</span>
        ) : (
          <span
            className={clsx(
              "mt-2.5 inline-flex items-center gap-1 text-sm font-semibold",
              state.hasChampion ? "text-brand" : "text-gray-400"
            )}
          >
            {linkText}
          </span>
        )}
      </div>
    </>
  );

  if (state.notHeld) {
    return <div className={className}>{content}</div>;
  }
  return (
    <Link href={href} className={className}>
      {content}
    </Link>
  );
}

/** Both tournaments, full detail, stacked — for the mobile bottom sheet. */
export function TournamentSheetCards({
  year,
  charity,
  mcgregor,
}: {
  year: number;
  charity: TournamentResult | null;
  mcgregor: TournamentResult | null;
}) {
  return (
    <div className="space-y-3">
      <SheetCard year={year} type="charity" result={charity} />
      <SheetCard year={year} type="mcgregor" result={mcgregor} />
    </div>
  );
}

// Desktop-only (md: and above) — mobile shows a 🏆 topbar button that opens
// TournamentSheetCards in a bottom sheet instead. Matches the md: breakpoint
// the rest of the schedule page's mobile/desktop split uses.
export default function TournamentCards({
  year,
  charity,
  mcgregor,
}: {
  year: number;
  charity: TournamentResult | null;
  mcgregor: TournamentResult | null;
}) {
  return (
    <div className="hidden grid-cols-1 gap-3 md:grid md:grid-cols-2">
      <DesktopCard year={year} type="charity" result={charity} />
      <DesktopCard year={year} type="mcgregor" result={mcgregor} />
    </div>
  );
}

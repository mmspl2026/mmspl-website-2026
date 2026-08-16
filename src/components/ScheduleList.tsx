"use client";

import { useMemo, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Settings2, CalendarDays, X, ChevronDown } from "lucide-react";
import clsx from "clsx";
import type { Game, TournamentResult } from "@/lib/types";
import { getParkAbbrev, buildDownloadUrl, slugifyTeamName } from "@/lib/scheduleExport";
import TournamentCards from "./TournamentCards";

const PARKS = ["Centennial Park", "Mintleaf Park"] as const;
const MONTHS = [
  { value: "05", label: "May" },
  { value: "06", label: "Jun" },
  { value: "07", label: "Jul" },
  { value: "08", label: "Aug" },
  { value: "09", label: "Sep" },
];

function pillClass(active: boolean) {
  return clsx(
    "shrink-0 rounded-full border-2 px-3 py-1.5 text-sm font-semibold transition-all",
    active ? "border-brand bg-brand text-white" : "border-gray-300 bg-white text-gray-600 hover:border-brand/60"
  );
}

function StatusBadge({ status }: { status: Game["status"] }) {
  if (status === "cancelled" || status === "postponed") {
    return (
      <span className="rounded-full bg-brand/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-brand">
        {status === "postponed" ? "Postponed" : "Cancelled"}
      </span>
    );
  }
  if (status === "final" || status === "forfeit" || status === "live") {
    return (
      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-gray-600">
        {status === "live" ? "Live" : "Final"}
      </span>
    );
  }
  return (
    <span className="rounded-full border border-gray-300 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-gray-500">
      Upcoming
    </span>
  );
}

// Forfeits are shown as a synthesized 1-0 result (forfeiting team = 0)
// regardless of whatever raw score happens to be stored for that game.
function effectiveScores(game: Game): { home?: number; away?: number } {
  if (game.status === "forfeit") {
    return { home: game.forfeitingTeam === "home" ? 0 : 1, away: game.forfeitingTeam === "away" ? 0 : 1 };
  }
  if (game.status === "final" || game.status === "live") {
    return { home: game.homeScore, away: game.awayScore };
  }
  return {};
}

function ScheduleGameCard({ game }: { game: Game }) {
  const { home: homeScore, away: awayScore } = effectiveScores(game);
  const showScores = typeof homeScore === "number" && typeof awayScore === "number";
  const isTie = showScores && homeScore === awayScore;
  const homeWon = showScores && !isTie && homeScore! > awayScore!;
  const awayWon = showScores && !isTie && awayScore! > homeScore!;
  const park = getParkAbbrev(game.field);

  function nameClass(won: boolean, lost: boolean) {
    if (won) return "font-bold text-[#111111]";
    if (lost) return "text-[#444444]";
    return "font-semibold text-[#111111]";
  }
  function scoreClass(won: boolean, lost: boolean) {
    if (won) return "font-bold text-brand";
    if (lost) return "text-[#cccccc]";
    return "text-gray-400";
  }

  return (
    <div className="flex items-stretch gap-3 rounded-xl bg-white px-4 py-3 shadow transition-shadow hover:shadow-md">
      <div className="flex w-14 shrink-0 flex-col items-center justify-center text-center">
        <span className="text-xs font-semibold text-gray-700">{game.time}</span>
        {park && <span className="font-mono-brand mt-0.5 text-[10px] text-gray-400">{park}</span>}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2 py-1">
          <span className="flex min-w-0 items-baseline gap-1.5">
            <span className="font-mono-brand hidden shrink-0 text-[9px] uppercase tracking-[0.1em] text-gray-400 sm:inline">
              AWAY
            </span>
            <span className={clsx("truncate text-sm", nameClass(awayWon, homeWon))}>{game.awayTeam.name}</span>
          </span>
          {showScores && (
            <span className={clsx("font-mono-brand shrink-0 text-base", scoreClass(awayWon, homeWon))}>
              {awayScore}
            </span>
          )}
        </div>
        <div className="border-t border-gray-100" />
        <div className="flex items-center justify-between gap-2 py-1">
          <span className="flex min-w-0 items-baseline gap-1.5">
            <span className="font-mono-brand hidden shrink-0 text-[9px] uppercase tracking-[0.1em] text-gray-400 sm:inline">
              HOME
            </span>
            <span className={clsx("truncate text-sm", nameClass(homeWon, awayWon))}>{game.homeTeam.name}</span>
          </span>
          {showScores && (
            <span className={clsx("font-mono-brand shrink-0 text-base", scoreClass(homeWon, awayWon))}>
              {homeScore}
            </span>
          )}
        </div>
      </div>

      <div className="flex shrink-0 items-center">
        <StatusBadge status={game.status} />
      </div>
    </div>
  );
}

interface SeasonOption {
  year: number;
  isActive: boolean;
}

function SeasonDropdown({
  seasons,
  selected,
  className,
}: {
  seasons: SeasonOption[];
  selected: number;
  className?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const current = seasons.filter((s) => s.isActive);
  const previous = seasons.filter((s) => !s.isActive);

  function handleChange(year: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("season", year);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className={clsx("relative", className)}>
      <select
        aria-label="Season"
        value={selected}
        onChange={(e) => handleChange(e.target.value)}
        className="h-9 w-full appearance-none rounded-md border-2 border-brand bg-transparent pl-3 pr-8 text-sm font-semibold text-black focus:outline-none focus:ring-1 focus:ring-brand"
      >
        {current.length > 0 && (
          <optgroup label="Current">
            {current.map((s) => (
              <option key={s.year} value={s.year}>
                {s.year} Season
              </option>
            ))}
          </optgroup>
        )}
        {previous.length > 0 && (
          <optgroup label="Previous">
            {previous.map((s) => (
              <option key={s.year} value={s.year}>
                {s.year} Season
              </option>
            ))}
          </optgroup>
        )}
      </select>
      <ChevronDown
        size={16}
        className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-black/60"
        aria-hidden="true"
      />
    </div>
  );
}

export default function ScheduleList({
  games,
  seasons,
  selectedYear,
  charityResult,
  mcgregorResult,
}: {
  games: Game[];
  seasons: SeasonOption[];
  selectedYear: number;
  charityResult: TournamentResult | null;
  mcgregorResult: TournamentResult | null;
}) {
  const [team, setTeam] = useState("all");
  const [park, setPark] = useState("all");
  const [month, setMonth] = useState("all");
  const [sheetOpen, setSheetOpen] = useState(false);

  const teamOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const g of games) {
      map.set(g.homeTeam._id, g.homeTeam.name);
      map.set(g.awayTeam._id, g.awayTeam.name);
    }
    return Array.from(map.entries())
      .map(([_id, name]) => ({ _id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [games]);

  const filtered = useMemo(() => {
    return games.filter((g) => {
      if (team !== "all" && g.homeTeam._id !== team && g.awayTeam._id !== team) return false;
      if (park !== "all" && g.field !== park) return false;
      if (month !== "all" && g.date.slice(5, 7) !== month) return false;
      return true;
    });
  }, [games, team, park, month]);

  function clearFilters() {
    setTeam("all");
    setPark("all");
    setMonth("all");
  }

  const selectedTeamName = team !== "all" ? teamOptions.find((t) => t._id === team)?.name : undefined;
  const teamSlug = selectedTeamName ? slugifyTeamName(selectedTeamName) : undefined;
  const downloadLabel = selectedTeamName ? `${selectedTeamName}:` : "Master Schedule:";
  const csvUrl = games.length > 0 ? buildDownloadUrl(selectedYear, "csv", teamSlug) : undefined;
  const icsUrl = games.length > 0 ? buildDownloadUrl(selectedYear, "ics", teamSlug) : undefined;

  const hasTeamFilter = team !== "all";

  return (
    <div>
      {/* Desktop filter bar */}
      <div className="sticky top-[64px] z-30 hidden rounded-xl border bg-white p-3 text-black shadow md:block">
        <div className="flex flex-wrap items-center gap-3">
          <SeasonDropdown seasons={seasons} selected={selectedYear} className="w-40 shrink-0" />

          <select
            aria-label="Team"
            value={team}
            onChange={(e) => setTeam(e.target.value)}
            className="h-9 w-56 shrink-0 rounded-md border-2 border-gray-300 bg-transparent px-3 text-sm font-semibold focus:border-brand focus:outline-none"
          >
            <option value="all">All Teams</option>
            {teamOptions.map((t) => (
              <option key={t._id} value={t._id}>
                {t.name}
              </option>
            ))}
          </select>

          <div className="flex shrink-0 gap-1.5">
            <button type="button" onClick={() => setPark("all")} className={pillClass(park === "all")}>
              All
            </button>
            {PARKS.map((p) => (
              <button key={p} type="button" onClick={() => setPark(p)} className={pillClass(park === p)}>
                {p.replace(" Park", "")}
              </button>
            ))}
          </div>

          <div className="flex shrink-0 gap-1.5">
            <button type="button" onClick={() => setMonth("all")} className={pillClass(month === "all")}>
              All
            </button>
            {MONTHS.map((m) => (
              <button key={m.value} type="button" onClick={() => setMonth(m.value)} className={pillClass(month === m.value)}>
                {m.label}
              </button>
            ))}
          </div>

          <div className="ml-auto flex shrink-0 items-center gap-2">
            <span className="whitespace-nowrap text-xs font-semibold text-gray-500">{downloadLabel}</span>
            {csvUrl && (
              <a
                href={csvUrl}
                className="inline-flex h-9 items-center gap-1.5 whitespace-nowrap rounded-md border-2 border-gray-300 px-3 text-sm font-semibold text-gray-700 transition-colors hover:border-brand hover:text-brand"
              >
                📊 CSV
              </a>
            )}
            {icsUrl && (
              <a
                href={icsUrl}
                className="inline-flex h-9 items-center gap-1.5 whitespace-nowrap rounded-md bg-brand px-3 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
              >
                📅 Calendar (.ics)
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Mobile topbar */}
      <div className="sticky top-[56px] z-30 flex items-center gap-2 rounded-xl border bg-white p-2.5 text-black shadow md:hidden">
        <SeasonDropdown seasons={seasons} selected={selectedYear} className="flex-1" />
        <button
          type="button"
          onClick={() => setSheetOpen(true)}
          className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-md bg-[#1a1a1a] px-3 text-sm font-semibold text-white"
        >
          <Settings2 size={15} aria-hidden="true" />
          Filter
        </button>
        {icsUrl && (
          <a
            href={icsUrl}
            aria-label="Download calendar"
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border-2 border-brand text-brand"
          >
            <CalendarDays size={16} aria-hidden="true" />
          </a>
        )}
      </div>

      <div className="mt-4">
        <TournamentCards year={selectedYear} charity={charityResult} mcgregor={mcgregorResult} />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <span className="text-sm font-semibold text-black">
          {filtered.length} games &middot; {selectedYear} Regular Season
        </span>
        {hasTeamFilter && (
          <button type="button" onClick={clearFilters} className="text-xs font-semibold text-brand hover:underline">
            &#10005; Clear filters
          </button>
        )}
      </div>

      <div className="mt-4">
        {filtered.length === 0 ? (
          <p className="py-8 text-center text-sm text-black/60">No games match these filters.</p>
        ) : (
          <div className="space-y-2">
            {filtered.map((game) => (
              <ScheduleGameCard key={game._id} game={game} />
            ))}
          </div>
        )}
      </div>

      {/* Mobile filter & download bottom sheet */}
      <div
        className={clsx(
          "fixed inset-0 z-50 bg-black/60 transition-opacity duration-300 md:hidden",
          sheetOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        )}
        onClick={() => setSheetOpen(false)}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Filter and download"
        className={clsx(
          "fixed inset-x-0 bottom-0 z-50 flex max-h-[88vh] flex-col rounded-t-2xl bg-white text-black shadow-xl transition-transform duration-300 ease-out md:hidden",
          sheetOpen ? "translate-y-0" : "translate-y-full"
        )}
        style={{ visibility: sheetOpen ? "visible" : "hidden" }}
      >
        <div className="flex shrink-0 justify-center pt-3">
          <div className="h-1.5 w-10 rounded-full bg-gray-300" />
        </div>
        <div className="flex shrink-0 items-center justify-between px-5 pb-3 pt-2">
          <p className="font-heading text-lg uppercase tracking-[0.01em] text-black">Filter &amp; Download</p>
          <button
            type="button"
            onClick={() => setSheetOpen(false)}
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
          <label className="mb-1 block text-xs font-semibold text-gray-600">Team</label>
          <select
            value={team}
            onChange={(e) => setTeam(e.target.value)}
            className="h-11 w-full rounded-md border-2 border-gray-300 bg-transparent px-3 text-sm font-semibold focus:border-brand focus:outline-none"
          >
            <option value="all">All Teams</option>
            {teamOptions.map((t) => (
              <option key={t._id} value={t._id}>
                {t.name}
              </option>
            ))}
          </select>

          <p className="mb-1.5 mt-4 text-xs font-semibold text-gray-600">Park</p>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => setPark("all")} className={pillClass(park === "all")}>
              All
            </button>
            {PARKS.map((p) => (
              <button key={p} type="button" onClick={() => setPark(p)} className={pillClass(park === p)}>
                {p.replace(" Park", "")}
              </button>
            ))}
          </div>

          <p className="mb-1.5 mt-4 text-xs font-semibold text-gray-600">Month</p>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => setMonth("all")} className={pillClass(month === "all")}>
              All
            </button>
            {MONTHS.map((m) => (
              <button key={m.value} type="button" onClick={() => setMonth(m.value)} className={pillClass(month === m.value)}>
                {m.label}
              </button>
            ))}
          </div>

          <div className="my-5 h-px bg-gray-200" />

          <p className="text-sm text-gray-500">
            Downloading: <span className="font-semibold text-black">{downloadLabel.replace(/:$/, "")}</span>
            {selectedTeamName ? ` — ${selectedYear} only` : " — all games"}
          </p>
          <div className="mt-3 flex flex-col gap-2.5">
            {csvUrl && (
              <a
                href={csvUrl}
                className="flex w-full items-center justify-center gap-2 rounded-md border-2 border-gray-300 px-4 py-3 text-sm font-semibold text-gray-700"
              >
                📊 CSV / Excel
              </a>
            )}
            {icsUrl && (
              <a
                href={icsUrl}
                className="flex w-full items-center justify-center gap-2 rounded-md border-2 border-brand px-4 py-3 text-sm font-semibold text-brand"
              >
                📅 Calendar (.ics)
              </a>
            )}
          </div>
          {!selectedTeamName && (
            <p className="mt-2.5 text-xs text-gray-400">Select a team above to download that team&rsquo;s schedule only.</p>
          )}

          <button
            type="button"
            onClick={() => setSheetOpen(false)}
            className="mt-6 w-full rounded-md bg-brand py-3 text-sm font-bold text-white transition-colors hover:bg-brand-700"
          >
            {selectedTeamName ? `Show ${selectedTeamName} Games` : `Show All ${filtered.length} Games`}
          </button>
          <button
            type="button"
            onClick={clearFilters}
            className="mt-2.5 w-full rounded-md border-2 border-gray-300 py-3 text-sm font-semibold text-gray-600 transition-colors hover:border-gray-400"
          >
            Clear All Filters
          </button>
        </div>
      </div>
    </div>
  );
}

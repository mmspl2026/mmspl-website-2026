"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Settings2, X, Info } from "lucide-react";
import clsx from "clsx";
import type { Game, TournamentResult } from "@/lib/types";
import { buildDownloadUrl, slugifyTeamName } from "@/lib/scheduleExport";
import { getTodayEastern } from "@/utils/timezone";
import TournamentCards, { TournamentSheetCards } from "./TournamentCards";
import SeasonDropdown from "./SeasonDropdown";

const TEAM_STORAGE_KEY = "mmspl-schedule-team";
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

// Desktop filter bar only — compact enough to keep every filter on one row
// without wrapping. Mobile keeps using pillClass() above, untouched.
function compactPillClass(active: boolean) {
  return clsx(
    "shrink-0 rounded-full border-2 font-semibold transition-all",
    active ? "border-brand bg-brand text-white" : "border-gray-300 bg-white text-gray-600 hover:border-brand/60"
  );
}
const compactPillStyle = { padding: "6px 13px", fontSize: 12.5 };

// Only two statuses get any on-card indicator at all: a final result gets a
// solid black "FINAL" pill (forfeit/live share this — they're all "the game
// has a decided result" from a reader's point of view), and a cancelled
// game gets plain red text next to its score. Everything else (scheduled,
// postponed) shows nothing — no badge, no label.
function StatusBadge({ status }: { status: Game["status"] }) {
  if (status === "final" || status === "forfeit" || status === "live") {
    return (
      <span
        className="rounded-full bg-[#111111] px-2 py-0.5 font-bold uppercase tracking-wide text-white"
        style={{ fontSize: 10, borderRadius: 100 }}
      >
        {status === "forfeit" ? "Forfeit" : "Final"}
      </span>
    );
  }
  return null;
}

// "Centennial Park" / "Mintleaf Park" (as stored in Sanity) shown as the
// short, readable labels requested for game cards.
function parkDisplayName(field?: string): string {
  if (field === "Centennial Park") return "C. North";
  if (field === "Mintleaf Park") return "Mintleaf";
  return field || "";
}

// Sort key for "6:30 PM" style time strings — used to order games within a
// date group by park first, then by kickoff time.
function timeMinutes(time: string): number {
  const match = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec(time.trim());
  if (!match) return 0;
  let hour = Number(match[1]) % 12;
  if (match[3].toUpperCase() === "PM") hour += 12;
  return hour * 60 + Number(match[2]);
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
  const park = parkDisplayName(game.field);
  const isScheduled = game.status === "scheduled";
  const isCancelled = game.status === "cancelled";

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
        {park && (
          <span className="mt-0.5 text-brand" style={{ fontSize: 11, fontWeight: 600 }}>
            {park}
          </span>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2 py-1">
          <span className="flex min-w-0 items-baseline gap-1.5">
            <span className="font-mono-brand hidden shrink-0 text-[9px] uppercase tracking-[0.1em] text-gray-400 sm:inline">
              AWAY
            </span>
            <span className={clsx("truncate text-sm", nameClass(awayWon, homeWon))}>{game.awayTeam.name}</span>
          </span>
          {showScores ? (
            <span className={clsx("font-mono-brand shrink-0 text-base", scoreClass(awayWon, homeWon))}>
              {awayScore}
            </span>
          ) : isScheduled ? (
            <span className="font-mono-brand shrink-0 text-base text-gray-300">&ndash;</span>
          ) : isCancelled ? (
            <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-brand">Cancelled</span>
          ) : null}
        </div>
        <div className="border-t border-gray-100" />
        <div className="flex items-center justify-between gap-2 py-1">
          <span className="flex min-w-0 items-baseline gap-1.5">
            <span className="font-mono-brand hidden shrink-0 text-[9px] uppercase tracking-[0.1em] text-gray-400 sm:inline">
              HOME
            </span>
            <span className={clsx("truncate text-sm", nameClass(homeWon, awayWon))}>{game.homeTeam.name}</span>
          </span>
          {showScores ? (
            <span className={clsx("font-mono-brand shrink-0 text-base", scoreClass(homeWon, awayWon))}>
              {homeScore}
            </span>
          ) : isScheduled ? (
            <span className="font-mono-brand shrink-0 text-base text-gray-300">&ndash;</span>
          ) : isCancelled ? (
            <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-brand">Cancelled</span>
          ) : null}
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
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [team, setTeam] = useState("all");
  const [park, setPark] = useState("all");
  const [month, setMonth] = useState("all");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [tournamentSheetOpen, setTournamentSheetOpen] = useState(false);
  const [infoSheetOpen, setInfoSheetOpen] = useState(false);

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

  // On first load: default the month filter to the current real-world month
  // (if the season is in progress), and restore whichever team the visitor
  // picked last time, so returning players land back on their own schedule.
  useEffect(() => {
    const todayStr = getTodayEastern();
    const currentYear = Number(todayStr.slice(0, 4));
    const currentMonth = todayStr.slice(5, 7);

    if (selectedYear === currentYear) {
      if (MONTHS.some((m) => m.value === currentMonth)) {
        // May–Sep: mid-season, land on the current month.
        setMonth(currentMonth);
      } else if (currentMonth === "10" || currentMonth === "11" || currentMonth === "12") {
        // Oct–Dec: season's over, land on its last month of results.
        setMonth("09");
      } else if (games.length > 0) {
        // Jan–Apr, and this year's schedule is already loaded: show everything upcoming.
        setMonth("all");
      } else {
        // Jan–Apr, next season not loaded yet: fall back to last year's
        // closing month instead of showing an empty current-year list.
        setMonth("09");
        const params = new URLSearchParams(searchParams.toString());
        params.set("season", String(currentYear - 1));
        router.push(`${pathname}?${params.toString()}`);
      }
    } else {
      // Historical season: show the whole thing.
      setMonth("all");
    }

    const remembered = localStorage.getItem(TEAM_STORAGE_KEY);
    if (remembered && teamOptions.some((t) => t._id === remembered)) setTeam(remembered);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleTeamChange(newTeam: string) {
    setTeam(newTeam);
    if (newTeam === "all") localStorage.removeItem(TEAM_STORAGE_KEY);
    else localStorage.setItem(TEAM_STORAGE_KEY, newTeam);
  }

  const filtered = useMemo(() => {
    return games.filter((g) => {
      if (team !== "all" && g.homeTeam._id !== team && g.awayTeam._id !== team) return false;
      if (park !== "all" && g.field !== park) return false;
      if (month !== "all" && g.date.slice(5, 7) !== month) return false;
      return true;
    });
  }, [games, team, park, month]);

  // Upcoming dates first (nearest first), then past results below in
  // reverse-chronological order (most recent first) — the two runs sit in
  // one continuous list, not separate sections. `filtered` is already
  // date-ascending (inherited from the season query's order(date asc, time
  // asc)), so grouping preserves ascending order within each date, and only
  // the ORDER OF DATE GROUPS needs reversing for the past run — never the
  // games within a date, so time-of-day stays chronological either way.
  const dateGroups = useMemo(() => {
    const byDate = new Map<string, Game[]>();
    for (const g of filtered) {
      const existing = byDate.get(g.date);
      if (existing) existing.push(g);
      else byDate.set(g.date, [g]);
    }
    const groups = Array.from(byDate.entries()).map(([date, gamesOnDate]) => ({
      date,
      isUpcoming: gamesOnDate.some((g) => g.status === "scheduled" || g.status === "live" || g.status === "postponed"),
      // Centennial games first (by time), then Mintleaf (by time) — within
      // this one date, never across dates.
      games: [...gamesOnDate].sort((a, b) => {
        const parkRank = (g: Game) => (g.field === "Centennial Park" ? 0 : 1);
        const rankDiff = parkRank(a) - parkRank(b);
        return rankDiff !== 0 ? rankDiff : timeMinutes(a.time) - timeMinutes(b.time);
      }),
    }));
    const upcoming = groups.filter((g) => g.isUpcoming);
    const past = groups.filter((g) => !g.isUpcoming).reverse();
    return [...upcoming, ...past];
  }, [filtered]);

  function clearFilters() {
    handleTeamChange("all");
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
      {/* Desktop filter bar — always a single row, never wraps, never scrolls */}
      <div className="sticky top-[64px] z-30 hidden rounded-xl border bg-white p-3 text-black shadow md:block">
        <div className="flex flex-nowrap items-center gap-2" style={{ overflow: "visible" }}>
          <SeasonDropdown seasons={seasons} selected={selectedYear} className="w-[150px] shrink-0" />

          <select
            aria-label="Team"
            value={team}
            onChange={(e) => handleTeamChange(e.target.value)}
            className="h-9 w-[150px] shrink-0 rounded-md border-2 border-gray-300 bg-transparent px-2.5 text-xs font-semibold focus:border-brand focus:outline-none"
          >
            <option value="all">All Teams</option>
            {teamOptions.map((t) => (
              <option key={t._id} value={t._id}>
                {t.name}
              </option>
            ))}
          </select>

          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={() => setPark("all")}
              style={compactPillStyle}
              className={compactPillClass(park === "all")}
            >
              All
            </button>
            {PARKS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPark(p)}
                style={compactPillStyle}
                className={compactPillClass(park === p)}
              >
                {p.replace(" Park", "")}
              </button>
            ))}
          </div>

          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={() => setMonth("all")}
              style={compactPillStyle}
              className={compactPillClass(month === "all")}
            >
              All
            </button>
            {MONTHS.map((m) => (
              <button
                key={m.value}
                type="button"
                onClick={() => setMonth(m.value)}
                style={compactPillStyle}
                className={compactPillClass(month === m.value)}
              >
                {m.label}
              </button>
            ))}
          </div>

          <div className="ml-auto flex shrink-0 items-center gap-1.5">
            <span className="whitespace-nowrap text-[11px] font-medium text-gray-400">Download:</span>
            {csvUrl && (
              <a
                href={csvUrl}
                style={{ padding: "5px 10px", fontSize: 12 }}
                className="inline-flex items-center gap-1 whitespace-nowrap rounded-md border-2 border-gray-300 font-semibold text-gray-700 transition-colors hover:border-brand hover:text-brand"
              >
                📊 CSV
              </a>
            )}
            {icsUrl && (
              <a
                href={icsUrl}
                style={{ padding: "5px 10px", fontSize: 12 }}
                className="inline-flex items-center gap-1 whitespace-nowrap rounded-md bg-brand font-semibold text-white transition-colors hover:bg-brand-700"
              >
                📅 Calendar
              </a>
            )}
            <span className="group relative inline-flex shrink-0 items-center">
              <Info size={13} className="cursor-help text-gray-400" aria-hidden="true" />
              <span
                role="tooltip"
                className="pointer-events-none absolute bottom-full right-0 z-10 mb-2 w-60 rounded-md bg-[#111111] px-2.5 py-1.5 text-[12px] font-normal normal-case leading-snug text-white opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100"
              >
                Select a team from the dropdown above to download their schedule only. Default downloads the full master schedule.
              </span>
            </span>
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
      <p className="mt-1 text-xs text-gray-400 md:hidden">Top: Visitor &middot; Bottom: Home</p>

      <div className="mt-4">
        {dateGroups.length === 0 ? (
          <p className="py-8 text-center text-sm text-black/60">
            {games.length === 0
              ? "No game-by-game schedule was tracked for this season — see the season standings instead."
              : "No games match these filters."}
          </p>
        ) : (
          <div className="space-y-5">
            {dateGroups.map((group, i) => {
              const isFirstUpcoming = i === 0 && group.isUpcoming;
              const isFirstPast = !group.isUpcoming && (i === 0 || dateGroups[i - 1].isUpcoming);
              return (
                <div key={group.date}>
                  {isFirstUpcoming && (
                    <div className="mb-3 flex items-center gap-2">
                      <span
                        className="shrink-0 rounded-full px-3 py-1 font-bold uppercase tracking-wide text-white"
                        style={{ backgroundColor: "#AA1111", borderRadius: 100, fontSize: 11, fontWeight: 700 }}
                      >
                        Upcoming
                      </span>
                      <div className="h-px flex-1 bg-gray-200" />
                    </div>
                  )}
                  {isFirstPast && (
                    <div className="mb-3 flex items-center gap-2">
                      <span
                        className="shrink-0 rounded-full px-3 py-1 font-bold uppercase tracking-wide text-white"
                        style={{ backgroundColor: "#888888", borderRadius: 100, fontSize: 11, fontWeight: 700 }}
                      >
                        Past Results
                      </span>
                      <div className="h-px flex-1 bg-gray-200" />
                    </div>
                  )}
                  <div className="mb-2 flex items-center gap-2">
                    <p className="text-sm font-bold text-black">
                      {new Date(`${group.date}T00:00:00`).toLocaleDateString("en-CA", {
                        weekday: "long",
                        month: "long",
                        day: "numeric",
                      })}
                    </p>
                  </div>
                  <div className="space-y-2">
                    {group.games.map((game) => (
                      <ScheduleGameCard key={game._id} game={game} />
                    ))}
                  </div>
                </div>
              );
            })}
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
            onChange={(e) => handleTeamChange(e.target.value)}
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

      {/* Mobile tournaments bottom sheet */}
      <div
        className={clsx(
          "fixed inset-0 z-50 bg-black/60 transition-opacity duration-300 md:hidden",
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
          "fixed inset-x-0 bottom-0 z-50 flex max-h-[88vh] flex-col rounded-t-2xl bg-white text-black shadow-xl transition-transform duration-300 ease-out md:hidden",
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

      {/* Mobile info bottom sheet */}
      <div
        className={clsx(
          "fixed inset-0 z-50 bg-black/60 transition-opacity duration-300 md:hidden",
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
          "fixed inset-x-0 bottom-0 z-50 flex max-h-[88vh] flex-col rounded-t-2xl bg-white text-black shadow-xl transition-transform duration-300 ease-out md:hidden",
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
          <InfoRow icon="🏆" title="Tournament Schedules & Results">
            Tap the 🏆 button to view Charity and McGregor tournament schedules and results.
          </InfoRow>
          <InfoRow icon="⚙️" title="Filter & Download Your Schedule">
            Tap ⚙ Filter to:
            <ul className="mt-1 list-disc space-y-0.5 pl-4">
              <li>Select your team</li>
              <li>Filter by park or month</li>
              <li>Download as CSV or Calendar (.ics) to import into your phone</li>
            </ul>
          </InfoRow>
          <InfoRow icon="📍" title="Field Locations">
            <ul className="space-y-0.5">
              <li className="flex items-start gap-1.5">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" aria-hidden="true" />
                <span>C. North = Centennial Park North, Markham</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" aria-hidden="true" />
                <span>Mintleaf = Mintleaf Park, Markham</span>
              </li>
            </ul>
          </InfoRow>
          <InfoRow icon="📅" title="Reading Scores" last>
            Red score = winning team &middot; Gray score = losing team &middot; &ndash; = game not yet played
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

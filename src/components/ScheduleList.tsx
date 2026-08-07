"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { Game, Team } from "@/lib/types";
import { Funnel, MapPin, Calendar, CalendarDays, Clock, RefreshCw } from "lucide-react";
import clsx from "clsx";

const TEAM_STORAGE_KEY = "mmspl-schedule-team";
const PARKS = ["Centennial Park", "Mintleaf Park"] as const;
const TABS = [{ id: "season", label: "Season" }] as const;

function pillClass(active: boolean, wide = false) {
  return clsx(
    "rounded-full border-2 text-sm font-semibold transition-all",
    wide ? "px-4 py-1.5" : "px-3 py-1.5",
    active ? "border-brand bg-brand text-white" : "border-gray-300 bg-white text-gray-600 hover:border-brand/60"
  );
}

function teamShortName(team: Team) {
  return team.shortName?.trim() || team.name.trim().split(/\s+/)[0];
}

function formatCardDate(dateStr: string) {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString("en-CA", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function formatPillDate(dateStr: string) {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString("en-CA", { month: "short", day: "numeric" });
}

function ScheduleGameCard({ game }: { game: Game }) {
  const showScore = game.status === "final" || game.status === "forfeit" || game.status === "live";

  return (
    <div className="rounded-xl border bg-white text-black shadow transition-all hover:shadow-md">
      <div className="px-4 py-3">
        <div className="mb-2 flex items-center gap-3 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <Calendar size={12} className="text-brand" aria-hidden="true" />
            <span className="font-semibold">{formatCardDate(game.date)}</span>
          </span>
          <span className="flex items-center gap-1">
            <Clock size={12} className="text-brand" aria-hidden="true" />
            {game.time}
          </span>
        </div>
        <span className="flex items-center gap-1 text-xs text-gray-500">
          <MapPin size={12} className="text-brand" aria-hidden="true" />
          {game.field}
        </span>

        <div className="mt-2 flex items-center gap-2">
          <p className="flex-1 text-sm leading-tight text-[#0d0d0e]">
            <span className="hidden md:inline">{game.homeTeam.name}</span>
            <span className="md:hidden">{teamShortName(game.homeTeam)}</span>
            <span className="mt-0.5 block font-mono-brand text-[9px] tracking-[0.1em] text-[#9a968f]">HOME</span>
          </p>
          <div className="min-w-[90px] flex-shrink-0 text-center">
            {showScore ? (
              <div className="text-center text-lg font-bold text-black">
                {game.homeScore} &ndash; {game.awayScore}
              </div>
            ) : (
              <div className="text-center text-lg font-bold text-gray-400">VS</div>
            )}
          </div>
          <p className="flex-1 text-right text-sm leading-tight text-[#0d0d0e]">
            <span className="hidden md:inline">{game.awayTeam.name}</span>
            <span className="md:hidden">{teamShortName(game.awayTeam)}</span>
            <span className="mt-0.5 block text-right font-mono-brand text-[9px] tracking-[0.1em] text-[#9a968f]">
              AWAY
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function ScheduleList({
  games,
  today,
  tournamentLinks,
}: {
  games: Game[];
  today: string;
  tournamentLinks: { href: string; label: string }[];
}) {
  const [team, setTeam] = useState("all");
  const [park, setPark] = useState("all");
  const [month, setMonth] = useState("all");
  const [date, setDate] = useState<string | null>(null);
  const [updatedAt] = useState(() => new Date());

  // On first load: restore the remembered team (players filter to their own
  // team and expect it to stick between visits), then default the date/month
  // pickers to that team's next upcoming game — or the league's next game
  // night if no team is remembered yet.
  useEffect(() => {
    const remembered = localStorage.getItem(TEAM_STORAGE_KEY);
    const isValidTeam =
      remembered && games.some((g) => g.homeTeam._id === remembered || g.awayTeam._id === remembered);
    const effectiveTeam = isValidTeam ? remembered : "all";
    if (effectiveTeam !== "all") setTeam(effectiveTeam);

    const relevantGames =
      effectiveTeam === "all"
        ? games
        : games.filter((g) => g.homeTeam._id === effectiveTeam || g.awayTeam._id === effectiveTeam);
    const nextDate = relevantGames
      .map((g) => g.date)
      .filter((d) => d >= today)
      .sort()[0];
    if (nextDate) {
      setDate(nextDate);
      setMonth(nextDate.slice(5, 7));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleTeamChange(newTeam: string) {
    setTeam(newTeam);
    if (newTeam === "all") {
      localStorage.removeItem(TEAM_STORAGE_KEY);
    } else {
      localStorage.setItem(TEAM_STORAGE_KEY, newTeam);
    }
  }

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

  const monthOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const g of games) {
      const d = new Date(`${g.date}T00:00:00`);
      const value = String(d.getMonth() + 1).padStart(2, "0");
      map.set(value, d.toLocaleDateString("en-CA", { month: "short" }));
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([value, label]) => ({ value, label }));
  }, [games]);

  const teamParkMonthFiltered = useMemo(() => {
    return games.filter((g) => {
      if (team !== "all" && g.homeTeam._id !== team && g.awayTeam._id !== team) return false;
      if (park !== "all" && g.field !== park) return false;
      if (month !== "all" && g.date.slice(5, 7) !== month) return false;
      return true;
    });
  }, [games, team, park, month]);

  const dateOptions = useMemo(() => {
    return Array.from(new Set(teamParkMonthFiltered.map((g) => g.date))).sort();
  }, [teamParkMonthFiltered]);

  const filtered = useMemo(() => {
    if (!date) return teamParkMonthFiltered;
    return teamParkMonthFiltered.filter((g) => g.date === date);
  }, [teamParkMonthFiltered, date]);

  function clearFilters() {
    handleTeamChange("all");
    setPark("all");
    setMonth("all");
    setDate(null);
  }

  const hasActiveFilters = team !== "all" || park !== "all" || month !== "all" || date !== null;

  return (
    <div>
      <div className="rounded-xl border bg-white text-black shadow">
        <div className="space-y-4 p-6 pb-5 pt-5">
          <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
            <div className="flex flex-shrink-0 items-center gap-2">
              <Funnel size={16} className="text-brand" aria-hidden="true" />
              <label htmlFor="team-filter" className="whitespace-nowrap text-sm font-semibold text-black">
                Team:
              </label>
            </div>
            <select
              id="team-filter"
              value={team}
              onChange={(e) => handleTeamChange(e.target.value)}
              className="h-9 w-full rounded-md border-2 border-brand bg-transparent px-3 text-sm font-semibold sm:w-72"
            >
              <option value="all">All Teams</option>
              {teamOptions.map((t) => (
                <option key={t._id} value={t._id}>
                  {t.name}
                </option>
              ))}
            </select>

            <div className="flex flex-shrink-0 items-center gap-2 sm:ml-4">
              <MapPin size={16} className="text-brand" aria-hidden="true" />
              <span className="whitespace-nowrap text-sm font-semibold text-black">Park:</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => setPark("all")} className={pillClass(park === "all")}>
                All Parks
              </button>
              {PARKS.map((p) => (
                <button key={p} type="button" onClick={() => setPark(p)} className={pillClass(park === p)}>
                  {p.replace(" Park", "")}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-1.5 whitespace-nowrap text-sm font-semibold text-black">
              <Calendar size={16} className="text-brand" aria-hidden="true" />
              Month:
            </label>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => setMonth("all")} className={pillClass(month === "all", true)}>
                All
              </button>
              {monthOptions.map((m) => (
                <button
                  key={m.value}
                  type="button"
                  onClick={() => setMonth(m.value)}
                  className={pillClass(month === m.value, true)}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-1.5 whitespace-nowrap text-sm font-semibold text-black">
              <CalendarDays size={16} className="text-brand" aria-hidden="true" />
              Date:
            </label>
            <div className="flex gap-2 overflow-x-auto pb-1">
              <button
                type="button"
                onClick={() => setDate(null)}
                className={clsx(pillClass(date === null), "shrink-0")}
              >
                All Dates
              </button>
              {dateOptions.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDate(d)}
                  className={clsx(pillClass(date === d), "shrink-0")}
                >
                  {formatPillDate(d)}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 pt-4">
        <span className="text-sm font-semibold text-black">{filtered.length} games shown</span>
        {hasActiveFilters && (
          <button type="button" onClick={clearFilters} className="text-xs font-semibold text-brand hover:underline">
            Clear filters
          </button>
        )}
        <span className="ml-auto flex items-center gap-1 text-xs text-gray-400">
          <RefreshCw size={12} aria-hidden="true" />
          {updatedAt.toLocaleTimeString("en-CA", { hour: "2-digit", minute: "2-digit" })}
        </span>
      </div>

      <div role="tablist" className="my-6 grid h-9 w-full grid-cols-3 items-center justify-center rounded-lg bg-gray-100 p-1">
        {TABS.map((t) => (
          <span
            key={t.id}
            role="tab"
            aria-selected="true"
            className="rounded-md bg-white px-3 py-1 text-center text-xs font-medium text-black shadow sm:text-sm"
          >
            {t.label}
          </span>
        ))}
        {tournamentLinks.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            role="tab"
            aria-selected="false"
            className="rounded-md px-3 py-1 text-center text-xs font-medium text-gray-600 transition-all hover:text-black sm:text-sm"
          >
            {t.label}
          </Link>
        ))}
      </div>

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
  );
}

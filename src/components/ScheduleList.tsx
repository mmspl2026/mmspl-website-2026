"use client";

import { useMemo, useState } from "react";
import type { Game } from "@/lib/types";
import TeamMark from "./TeamMark";
import clsx from "clsx";

const PARKS = ["Centennial Park", "Mintleaf Park"] as const;

const STATUS_LABEL: Record<Game["status"], string> = {
  scheduled: "Scheduled",
  live: "Live",
  final: "Final",
  forfeit: "Forfeit",
  cancelled: "Cancelled",
  postponed: "Postponed",
};

const STATUS_CLASS: Record<Game["status"], string> = {
  scheduled: "bg-black/5 text-black/70",
  live: "bg-green-600 text-white",
  final: "bg-brand text-white",
  forfeit: "bg-amber-100 text-amber-700",
  cancelled: "bg-red-100 text-red-700",
  postponed: "bg-amber-100 text-amber-700",
};

function formatDateHeading(dateStr: string) {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString("en-CA", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function ScheduleList({ games }: { games: Game[] }) {
  const [park, setPark] = useState<string>("all");

  const filtered = useMemo(
    () => (park === "all" ? games : games.filter((g) => g.field === park)),
    [games, park]
  );

  const grouped = useMemo(() => {
    const map = new Map<string, Game[]>();
    for (const game of filtered) {
      const list = map.get(game.date) ?? [];
      list.push(game);
      map.set(game.date, list);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);

  return (
    <div>
      <div role="group" aria-label="Filter by ballpark" className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setPark("all")}
          aria-pressed={park === "all"}
          className={clsx(
            "rounded-full px-4 py-2 text-sm font-semibold uppercase tracking-wide transition-colors",
            park === "all" ? "bg-brand text-white" : "bg-black/5 text-black/70 hover:bg-black/10"
          )}
        >
          All Parks
        </button>
        {PARKS.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setPark(p)}
            aria-pressed={park === p}
            className={clsx(
              "rounded-full px-4 py-2 text-sm font-semibold uppercase tracking-wide transition-colors",
              park === p ? "bg-brand text-white" : "bg-black/5 text-black/70 hover:bg-black/10"
            )}
          >
            {p}
          </button>
        ))}
      </div>

      {grouped.length === 0 ? (
        <p className="mt-8 text-black/60">No games found for this filter.</p>
      ) : (
        <div className="mt-8 space-y-10">
          {grouped.map(([date, dateGames]) => (
            <section key={date} aria-labelledby={`date-${date}`}>
              <h2 id={`date-${date}`} className="text-lg font-heading uppercase tracking-wide text-black/70">
                {formatDateHeading(date)}
              </h2>
              <div className="mt-4 overflow-hidden rounded-lg border border-black/10">
                <table className="w-full min-w-[560px] border-collapse text-sm">
                  <caption className="sr-only">Games on {formatDateHeading(date)}</caption>
                  <thead>
                    <tr className="bg-black/5 text-left text-xs uppercase tracking-wide text-black/50">
                      <th scope="col" className="px-4 py-2">Time</th>
                      <th scope="col" className="px-4 py-2">Matchup</th>
                      <th scope="col" className="px-4 py-2">Field</th>
                      <th scope="col" className="px-4 py-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dateGames.map((game) => (
                      <tr key={game._id} className="border-t border-black/10">
                        <td className="px-4 py-3 align-top text-black/60">{game.time}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2">
                              <TeamMark team={game.homeTeam} size={22} />
                              <span>{game.homeTeam.name}</span>
                              {(game.status === "final" || game.status === "forfeit" || game.status === "live") && (
                                <span className="font-heading">{game.homeScore}</span>
                              )}
                            </div>
                            <span className="text-black/40">vs</span>
                            <div className="flex items-center gap-2">
                              {(game.status === "final" || game.status === "forfeit" || game.status === "live") && (
                                <span className="font-heading">{game.awayScore}</span>
                              )}
                              <span>{game.awayTeam.name}</span>
                              <TeamMark team={game.awayTeam} size={22} />
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 align-top text-black/60">{game.field}</td>
                        <td className="px-4 py-3 align-top">
                          <span
                            className={clsx(
                              "rounded px-2 py-0.5 text-xs font-semibold uppercase tracking-wide",
                              STATUS_CLASS[game.status]
                            )}
                          >
                            {STATUS_LABEL[game.status]}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

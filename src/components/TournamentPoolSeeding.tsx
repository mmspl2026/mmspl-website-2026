"use client";

import clsx from "clsx";
import type { TournamentPool } from "@/lib/types";

export default function TournamentPoolSeeding({
  pools,
  selectedTeam = null,
  onTeamClick,
}: {
  pools: TournamentPool[];
  /** Clicking a team here highlights all of their games in the schedule
   * below — the click originates from the pool listing, matching the old
   * site's behaviour (not from inside individual game cards). */
  selectedTeam?: string | null;
  onTeamClick?: (name: string) => void;
}) {
  if (pools.length === 0) return null;

  return (
    <div className="no-scrollbar -mx-5 flex gap-4 overflow-x-auto px-5 pb-1 sm:mx-0 sm:justify-center sm:px-0">
      {pools.map((pool) => (
        <div key={pool._id} className="w-56 shrink-0 overflow-hidden rounded-xl border shadow-sm">
          <div className="bg-brand px-4 py-2 text-center">
            <p className="font-heading text-sm uppercase tracking-[0.08em] text-white">Pool {pool.poolLetter}</p>
          </div>
          <ol className="divide-y bg-white">
            {pool.teams.map((team, i) => {
              const isSelected = team === selectedTeam;
              return (
                <li
                  key={team}
                  className={clsx("flex items-center gap-3 px-4 py-2", isSelected && "bg-brand")}
                >
                  <span className={clsx("font-mono-brand text-xs", isSelected ? "text-white/70" : "text-gray-400")}>
                    {i + 1}
                  </span>
                  {onTeamClick ? (
                    <button
                      type="button"
                      onClick={() => onTeamClick(team)}
                      className={clsx(
                        "truncate text-left text-sm hover:underline",
                        isSelected ? "font-bold text-white" : "text-black"
                      )}
                    >
                      {team}
                    </button>
                  ) : (
                    <span className="text-sm text-black">{team}</span>
                  )}
                </li>
              );
            })}
          </ol>
        </div>
      ))}
    </div>
  );
}

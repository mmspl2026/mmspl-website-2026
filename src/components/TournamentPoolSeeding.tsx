"use client";

import Image from "next/image";
import Link from "next/link";
import { Dices, Flame } from "lucide-react";
import clsx from "clsx";
import type { TournamentPool } from "@/lib/types";

export default function TournamentPoolSeeding({
  pools,
  selectedTeam = null,
  onTeamClick,
  trophyPhotoUrl,
  trophyAlt,
}: {
  pools: TournamentPool[];
  /** Clicking a team here highlights all of their games in the schedule
   * below — the click originates from the pool listing, matching the old
   * site's behaviour (not from inside individual game cards). */
  selectedTeam?: string | null;
  onTeamClick?: (name: string) => void;
  /** Shown until the tournament actually concludes (once a champion is set,
   * TournamentChampionsBanner takes over with real winner/finalist/MVP
   * photos instead) — not just during the pre-results projection. */
  trophyPhotoUrl?: string;
  trophyAlt?: string;
}) {
  if (pools.length === 0) return null;

  const trophy = trophyPhotoUrl && (
    <div className="flex flex-col items-center">
      <div className="relative h-64 w-52">
        <Image src={trophyPhotoUrl} alt={trophyAlt || "Tournament trophy"} fill className="object-contain" />
      </div>
      <p className="mt-1.5 text-xs text-gray-400">{trophyAlt || "Tournament Trophy"}</p>
    </div>
  );

  // Same for-fun simulator link as the pre-results projected view — this
  // shouldn't disappear just because real Thu-Sat games have been loaded.
  const simulateLinkClass = "flex items-center justify-center gap-1.5 text-xs font-semibold text-brand hover:underline";
  const simulateLinkMobile = (
    <Link href="/schedule/tournament/simulate" className={simulateLinkClass}>
      <Dices size={14} className="shrink-0" aria-hidden="true" />
      Simulate the Tournament &rarr;
    </Link>
  );
  const simulateLinkDesktop = (
    <Link href="/schedule/tournament/simulate" className={simulateLinkClass}>
      <Dices size={14} className="shrink-0" aria-hidden="true" />
      Curious how it plays out? Simulate the whole tournament &rarr;
    </Link>
  );

  // Claude's real (non-random) bracket call, written cold off the stats
  // once Phase 1 wraps up — separate from the for-fun randomized simulator.
  const predictionLink = (
    <Link href="/schedule/tournament/predict" className={simulateLinkClass}>
      <Flame size={14} className="shrink-0" aria-hidden="true" />
      Claude&apos;s Prediction &rarr;
    </Link>
  );

  const renderPool = (pool: TournamentPool) => (
    <div key={pool._id} className="w-56 shrink-0 overflow-hidden rounded-xl border shadow-sm">
      <div className="bg-brand px-4 py-2 text-center">
        <p className="font-heading text-sm uppercase tracking-[0.08em] text-white">Pool {pool.poolLetter}</p>
      </div>
      <ol className="divide-y bg-white">
        {pool.teams.map((team, i) => {
          const isSelected = team === selectedTeam;
          return (
            <li key={team} className={clsx("flex items-center gap-3 px-4 py-2", isSelected && "bg-brand")}>
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
  );

  // Same A+C / B+D flanking pairing as ProjectedSeeding — only meaningful
  // when there are exactly 4 pools (McGregor's format); anything else just
  // falls through to the plain scrollable row below.
  if (!trophy || pools.length !== 4) {
    return (
      <div>
        {trophy && <div className="mb-4 flex justify-center">{trophy}</div>}
        <div className="no-scrollbar -mx-5 flex gap-4 overflow-x-auto px-5 pb-1 sm:mx-0 sm:justify-center sm:px-0">
          {pools.map(renderPool)}
        </div>
        <div className="mt-4 flex flex-col items-center gap-2">
          {simulateLinkMobile}
          {predictionLink}
        </div>
      </div>
    );
  }

  const [leftPools, rightPools] = [
    [pools[0], pools[2]],
    [pools[1], pools[3]],
  ];

  return (
    <div>
      <div className="md:hidden">
        <div className="mb-4">{trophy}</div>
        <div className="no-scrollbar -mx-5 flex gap-4 overflow-x-auto px-5 pb-1 sm:mx-0 sm:justify-center sm:px-0">
          {pools.map(renderPool)}
        </div>
        <div className="mt-4 flex flex-col items-center gap-2">
          {simulateLinkMobile}
          {predictionLink}
        </div>
      </div>

      <div className="hidden md:block">
        <div className="flex items-center justify-center gap-6">
          <div className="flex flex-col gap-4">{leftPools.map(renderPool)}</div>
          {trophy}
          <div className="flex flex-col gap-4">{rightPools.map(renderPool)}</div>
        </div>
        <div className="mt-4 flex items-center justify-center gap-6">
          {simulateLinkDesktop}
          {predictionLink}
        </div>
      </div>
    </div>
  );
}

"use client";

import Image from "next/image";
import Link from "next/link";
import { Info, Dices } from "lucide-react";
import clsx from "clsx";
import type { ProjectedBox } from "@/lib/tournamentSeeding";

/** Same box-card layout as TournamentPoolSeeding, driven by a live-computed
 * projection instead of stored data — used before the real boxes are set. */
export default function ProjectedSeeding({
  boxes,
  includesSchedule = false,
  selectedTeam = null,
  onTeamClick,
  trophyPhotoUrl,
  trophyAlt,
}: {
  boxes: ProjectedBox[];
  includesSchedule?: boolean;
  selectedTeam?: string | null;
  onTeamClick?: (name: string) => void;
  trophyPhotoUrl?: string;
  trophyAlt?: string;
}) {
  const disclaimer = (
    <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
      <Info size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
      <p>
        <strong>Projected {includesSchedule ? "seeding & schedule" : "seeding"}</strong> &mdash; based on today&apos;s
        regular season standings. This is only a preview of what the {includesSchedule ? "boxes and matchups" : "boxes"}{" "}
        would look like if the season ended right now, and will change as more games are played.
      </p>
    </div>
  );

  const simulateLinkClass = "flex items-center justify-center gap-1.5 text-xs font-semibold text-brand hover:underline";
  // Mobile gets the short form — the full question-plus-sentence version
  // was overflowing/wrapping messily at narrow widths.
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

  const trophy = trophyPhotoUrl && (
    <div className="flex flex-col items-center">
      <div className="relative h-64 w-52">
        <Image src={trophyPhotoUrl} alt={trophyAlt || "Tournament trophy"} fill className="object-contain" />
      </div>
      <p className="mt-1.5 text-xs text-gray-400">{trophyAlt || "Tournament Trophy"}</p>
    </div>
  );

  const renderBox = (box: ProjectedBox) => (
    <div key={box.poolLetter} className="w-56 shrink-0 overflow-hidden rounded-xl border shadow-sm">
      <div className="bg-brand px-4 py-2 text-center">
        <p className="font-heading text-sm uppercase tracking-[0.08em] text-white">Pool {box.poolLetter}</p>
      </div>
      <ol className="divide-y bg-white">
        {box.teams.map((team, i) => {
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

  // Pair A (3 teams) with C (4 teams) on the left, B (3 teams) with D (4
  // teams) on the right — each side gets one 3-team and one 4-team box, so
  // the two columns come out the same height instead of A+B (6 rows) vs.
  // C+D (8 rows) looking lopsided next to the trophy.
  const [leftBoxes, rightBoxes] = [
    [boxes[0], boxes[2]],
    [boxes[1], boxes[3]],
  ];

  return (
    <div>
      {/* Below md, kept exactly as before: trophy, then disclaimer, then a
          horizontally-scrollable row of all 4 boxes — no room to flank the
          trophy at mobile widths. */}
      <div className="md:hidden">
        {trophy && <div className="mb-4">{trophy}</div>}
        <div className="mb-4">{disclaimer}</div>
        <div className="no-scrollbar -mx-5 flex gap-4 overflow-x-auto px-5 pb-1 sm:mx-0 sm:justify-center sm:px-0">
          {boxes.map(renderBox)}
        </div>
        <div className="mt-4">{simulateLinkMobile}</div>
      </div>

      {/* md and up: Pool A+C flank the trophy on the left, B+D on the
          right, closing the dead space that used to sit beside the trophy
          when it was centered alone in the full-width row. */}
      <div className="hidden md:block">
        <div className="mb-4">{disclaimer}</div>
        <div className="flex items-center justify-center gap-6">
          <div className="flex flex-col gap-4">{leftBoxes.map(renderBox)}</div>
          {trophy}
          <div className="flex flex-col gap-4">{rightBoxes.map(renderBox)}</div>
        </div>
        <div className="mt-4">{simulateLinkDesktop}</div>
      </div>
    </div>
  );
}

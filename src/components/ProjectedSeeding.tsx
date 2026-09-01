"use client";

import Image from "next/image";
import { Info } from "lucide-react";
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

  const [leftBoxes, rightBoxes] = [boxes.slice(0, 2), boxes.slice(2)];

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
      </div>

      {/* md and up: Pool A/B flank the trophy on the left, C/D on the
          right, closing the dead space that used to sit beside the trophy
          when it was centered alone in the full-width row. */}
      <div className="hidden md:block">
        <div className="mb-4">{disclaimer}</div>
        <div className="flex items-center justify-center gap-6">
          <div className="flex flex-col gap-4">{leftBoxes.map(renderBox)}</div>
          {trophy}
          <div className="flex flex-col gap-4">{rightBoxes.map(renderBox)}</div>
        </div>
      </div>
    </div>
  );
}

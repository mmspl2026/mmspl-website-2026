"use client";

import { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { Clock, MapPin, Check } from "lucide-react";
import ScoreStepper from "./ScoreStepper";
import StatusToggle from "./StatusToggle";
import type { Game } from "@/lib/types";

export interface EditableGame {
  _id: string;
  time: string;
  field: string;
  homeTeam: { _id: string; name: string; shortName?: string };
  awayTeam: { _id: string; name: string; shortName?: string };
  seasonId: string;
  seasonYear: number;
  savedHomeScore: number;
  savedAwayScore: number;
  savedStatus: Game["status"];
  savedForfeitingTeam?: "home" | "away";
  draftHomeScore: number;
  draftAwayScore: number;
  draftStatus: Game["status"];
  draftForfeitingTeam?: "home" | "away";
  saving: boolean;
}

export default function GameEntryCard({
  game,
  onScoreChange,
  onStatusChange,
  onForfeitingTeamChange,
  onSave,
  onRequestCancel,
}: {
  game: EditableGame;
  onScoreChange: (team: "home" | "away", value: number) => void;
  onStatusChange: (status: Game["status"]) => void;
  onForfeitingTeamChange: (team: "home" | "away") => void;
  onSave: () => void;
  onRequestCancel: () => void;
}) {
  const dirty =
    game.draftHomeScore !== game.savedHomeScore ||
    game.draftAwayScore !== game.savedAwayScore ||
    game.draftStatus !== game.savedStatus ||
    game.draftForfeitingTeam !== game.savedForfeitingTeam;
  const isCancelledLike = game.savedStatus === "cancelled" || game.savedStatus === "postponed";
  const isLive = game.draftStatus === "live";
  const isForfeit = game.draftStatus === "forfeit";
  const forfeitIncomplete = isForfeit && !game.draftForfeitingTeam;

  const wasSaving = useRef(false);
  const [justSaved, setJustSaved] = useState(false);
  useEffect(() => {
    if (wasSaving.current && !game.saving && !dirty) {
      setJustSaved(true);
      const t = setTimeout(() => setJustSaved(false), 2000);
      return () => clearTimeout(t);
    }
    wasSaving.current = game.saving;
  }, [game.saving, dirty]);

  return (
    <article
      className={clsx(
        "mb-3 rounded-2xl border-2 p-4 transition-all",
        isLive ? "border-red-500 bg-red-950/20" : "border-gray-800 bg-gray-900"
      )}
      aria-label={`${game.homeTeam.name} versus ${game.awayTeam.name}`}
    >
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <Clock size={12} aria-hidden="true" />
          <span>{game.time}</span>
          <MapPin size={12} className="ml-1" aria-hidden="true" />
          <span>{game.field}</span>
        </div>
        {isLive && (
          <span className="flex items-center gap-1 text-xs font-bold text-red-400">
            <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" aria-hidden="true" />
            LIVE
          </span>
        )}
      </div>

      <div className="mb-4 flex items-center gap-2">
        <div className="flex-1 text-center">
          <p className="mb-2 truncate text-xs font-semibold leading-tight text-white">{game.homeTeam.name}</p>
          <ScoreStepper
            label={game.homeTeam.name}
            value={game.draftHomeScore}
            onChange={(v) => onScoreChange("home", v)}
            disabled={game.saving}
          />
        </div>
        <div className="px-1 text-lg font-bold text-gray-600" aria-hidden="true">
          &ndash;
        </div>
        <div className="flex-1 text-center">
          <p className="mb-2 truncate text-xs font-semibold leading-tight text-white">{game.awayTeam.name}</p>
          <ScoreStepper
            label={game.awayTeam.name}
            value={game.draftAwayScore}
            onChange={(v) => onScoreChange("away", v)}
            disabled={game.saving}
          />
        </div>
      </div>

      <StatusToggle value={game.draftStatus} onChange={onStatusChange} disabled={game.saving} />

      {isForfeit && (
        <div className="mb-3 rounded-xl border-2 border-orange-600/50 bg-orange-950/20 p-3">
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-orange-300">Which team is forfeiting?</p>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={game.saving}
              onClick={() => onForfeitingTeamChange("home")}
              className={clsx(
                "flex-1 rounded-lg py-2 text-xs font-bold transition-all",
                game.draftForfeitingTeam === "home"
                  ? "bg-orange-600 text-white"
                  : "bg-gray-800 text-gray-300 hover:bg-gray-700"
              )}
            >
              {game.homeTeam.name} is forfeiting
            </button>
            <button
              type="button"
              disabled={game.saving}
              onClick={() => onForfeitingTeamChange("away")}
              className={clsx(
                "flex-1 rounded-lg py-2 text-xs font-bold transition-all",
                game.draftForfeitingTeam === "away"
                  ? "bg-orange-600 text-white"
                  : "bg-gray-800 text-gray-300 hover:bg-gray-700"
              )}
            >
              {game.awayTeam.name} is forfeiting
            </button>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={onRequestCancel}
        disabled={game.saving}
        className={clsx(
          "mb-3 w-full rounded-xl py-2 text-xs font-bold uppercase tracking-wide transition-all",
          isCancelledLike
            ? "bg-amber-500 text-white"
            : "bg-gray-800 text-gray-400 hover:bg-amber-900/40 hover:text-amber-300"
        )}
      >
        {isCancelledLike ? "✓ Cancelled (Rain-out) · 1–1 tie" : "Cancelled (Rain-out) — sets score to 1–1"}
      </button>

      <button
        type="button"
        onClick={onSave}
        disabled={!dirty || game.saving || forfeitIncomplete}
        className={clsx(
          "flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold transition-all",
          justSaved
            ? "bg-green-600 text-white"
            : dirty && !forfeitIncomplete
              ? "bg-red-600 text-white hover:bg-red-500 active:scale-[0.98]"
              : "cursor-not-allowed bg-gray-800 text-gray-600"
        )}
      >
        {justSaved && <Check size={16} aria-hidden="true" />}
        {game.saving
          ? "Saving…"
          : justSaved
            ? "Saved!"
            : forfeitIncomplete
              ? "Select forfeiting team"
              : "Save Score"}
      </button>
    </article>
  );
}

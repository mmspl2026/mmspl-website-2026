"use client";

import clsx from "clsx";
import { CloudRain, Save, Loader2 } from "lucide-react";
import ScoreStepper from "./ScoreStepper";
import StatusToggle from "./StatusToggle";
import type { Game } from "@/lib/types";

export interface EditableGame {
  _id: string;
  time: string;
  field: string;
  homeTeam: { _id: string; name: string };
  awayTeam: { _id: string; name: string };
  seasonId: string;
  seasonYear: number;
  savedHomeScore: number;
  savedAwayScore: number;
  savedStatus: Game["status"];
  draftHomeScore: number;
  draftAwayScore: number;
  draftStatus: Game["status"];
  saving: boolean;
}

export default function GameEntryCard({
  game,
  onScoreChange,
  onStatusChange,
  onSave,
  onRequestCancel,
}: {
  game: EditableGame;
  onScoreChange: (team: "home" | "away", value: number) => void;
  onStatusChange: (status: Game["status"]) => void;
  onSave: () => void;
  onRequestCancel: () => void;
}) {
  const dirty =
    game.draftHomeScore !== game.savedHomeScore ||
    game.draftAwayScore !== game.savedAwayScore ||
    game.draftStatus !== game.savedStatus;
  const isCancelledLike = game.savedStatus === "cancelled" || game.savedStatus === "postponed";

  return (
    <article
      className={clsx(
        "flex flex-col gap-4 rounded-lg border bg-[#1a1a1a] p-5 text-white transition-colors",
        dirty ? "border-amber-400 ring-1 ring-amber-400/40" : "border-white/10"
      )}
      aria-label={`${game.homeTeam.name} versus ${game.awayTeam.name}`}
    >
      <div className="flex items-center justify-between text-xs text-white/50">
        <span>
          {game.time} &middot; {game.field}
        </span>
        {dirty && (
          <span className="rounded bg-amber-400/20 px-2 py-0.5 font-semibold uppercase tracking-wide text-amber-300">
            Unsaved
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <ScoreStepper
          label={game.homeTeam.name}
          value={game.draftHomeScore}
          onChange={(v) => onScoreChange("home", v)}
          disabled={game.saving}
        />
        <ScoreStepper
          label={game.awayTeam.name}
          value={game.draftAwayScore}
          onChange={(v) => onScoreChange("away", v)}
          disabled={game.saving}
        />
      </div>

      <StatusToggle value={game.draftStatus} onChange={onStatusChange} disabled={game.saving} />

      <button
        type="button"
        onClick={onRequestCancel}
        disabled={game.saving}
        className="rounded border border-brand-700 bg-brand-950/60 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-brand-200 transition-colors hover:bg-brand-950 disabled:opacity-40"
      >
        <span className="flex items-center justify-center gap-2">
          <CloudRain size={16} aria-hidden="true" />
          Cancelled (Rain-Out) — Sets Score to 1-1
        </span>
      </button>

      <button
        type="button"
        onClick={onSave}
        disabled={!dirty || game.saving}
        className="flex items-center justify-center gap-2 rounded bg-brand px-4 py-3 text-sm font-semibold uppercase tracking-wide text-white transition-colors hover:bg-brand-700 disabled:opacity-40"
      >
        {game.saving ? (
          <Loader2 size={18} className="animate-spin" aria-hidden="true" />
        ) : (
          <Save size={18} aria-hidden="true" />
        )}
        {game.saving ? "Saving…" : "Save Score"}
      </button>

      {isCancelledLike && (
        <p className="text-center text-xs text-white/40">
          This game is marked {game.savedStatus}.
        </p>
      )}
    </article>
  );
}

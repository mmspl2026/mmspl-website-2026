import clsx from "clsx";
import type { TournamentGame } from "@/lib/types";

const ROUND_BADGE: Record<TournamentGame["round"], string | null> = {
  roundRobin: null,
  wildCard: "WC",
  quarterFinal: "QF",
  semiFinal: "SF",
  final: "FINAL",
};

function TeamRow({
  name,
  seed,
  score,
  result,
  isWinner,
  isSelected,
}: {
  name?: string;
  seed?: string;
  score?: number;
  result?: "W" | "-";
  isWinner: boolean;
  isSelected: boolean;
}) {
  return (
    <div
      className={clsx(
        "flex items-center justify-between gap-3 rounded-md px-3 py-2",
        isWinner && "border-l-2 border-brand",
        isSelected ? "bg-brand" : isWinner && "bg-white/[0.06]"
      )}
    >
      <span className="flex min-w-0 items-baseline gap-1.5">
        {seed && (
          <span className={clsx("font-mono-brand shrink-0 text-xs", isSelected ? "text-white/70" : "text-white/40")}>
            {seed}
          </span>
        )}
        <span
          className={clsx(
            "truncate text-sm",
            isSelected || isWinner ? "font-bold text-white" : "font-medium text-white/70"
          )}
        >
          {name || "TBD"}
        </span>
      </span>
      <span className={clsx("font-mono-brand text-sm", isSelected || isWinner ? "text-white" : "text-white/50")}>
        {typeof score === "number" ? score : result || "–"}
      </span>
    </div>
  );
}

export default function TournamentGameCard({
  game,
  selectedTeam,
}: {
  game: TournamentGame;
  selectedTeam?: string | null;
}) {
  const homeWin =
    typeof game.homeScore === "number" && typeof game.awayScore === "number"
      ? game.homeScore > game.awayScore
      : game.homeResult === "W";
  const awayWin =
    typeof game.homeScore === "number" && typeof game.awayScore === "number"
      ? game.awayScore > game.homeScore
      : game.awayResult === "W";

  const badge = ROUND_BADGE[game.round];
  const involvesSelected = Boolean(selectedTeam) && (game.homeTeam === selectedTeam || game.awayTeam === selectedTeam);

  return (
    <div
      className={clsx(
        "rounded-xl border p-4 text-white shadow transition-opacity",
        involvesSelected ? "border-brand bg-[#0d0d0e]" : "border-white/10 bg-[#0d0d0e]",
        selectedTeam && !involvesSelected && "opacity-40"
      )}
    >
      <div className="mb-2 flex items-center justify-between">
        <div>
          <p className="text-sm font-bold text-white">{game.time || "TBD"}</p>
          {game.field && <p className="text-xs text-white/50">{game.field}</p>}
        </div>
        {badge && (
          <span className="rounded-full bg-brand px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
            {badge}
          </span>
        )}
      </div>
      <div className="space-y-1">
        <TeamRow
          name={game.homeTeam}
          seed={game.homeSeed}
          score={game.homeScore}
          result={game.homeResult}
          isWinner={homeWin}
          isSelected={Boolean(game.homeTeam) && game.homeTeam === selectedTeam}
        />
        <TeamRow
          name={game.awayTeam}
          seed={game.awaySeed}
          score={game.awayScore}
          result={game.awayResult}
          isWinner={awayWin}
          isSelected={Boolean(game.awayTeam) && game.awayTeam === selectedTeam}
        />
      </div>
    </div>
  );
}

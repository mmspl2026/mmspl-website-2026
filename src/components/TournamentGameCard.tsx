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
  score,
  result,
  isWinner,
}: {
  name?: string;
  score?: number;
  result?: "W" | "-";
  isWinner: boolean;
}) {
  return (
    <div
      className={clsx(
        "flex items-center justify-between gap-3 rounded-md px-3 py-2",
        isWinner && "border-l-2 border-brand bg-white/[0.06]"
      )}
    >
      <span className={clsx("truncate text-sm", isWinner ? "font-bold text-white" : "font-medium text-white/70")}>
        {name || "TBD"}
      </span>
      <span className={clsx("font-mono-brand text-sm", isWinner ? "text-white" : "text-white/50")}>
        {typeof score === "number" ? score : result || "–"}
      </span>
    </div>
  );
}

export default function TournamentGameCard({ game }: { game: TournamentGame }) {
  const homeWin =
    typeof game.homeScore === "number" && typeof game.awayScore === "number"
      ? game.homeScore > game.awayScore
      : game.homeResult === "W";
  const awayWin =
    typeof game.homeScore === "number" && typeof game.awayScore === "number"
      ? game.awayScore > game.homeScore
      : game.awayResult === "W";

  const badge = ROUND_BADGE[game.round];

  return (
    <div className="rounded-xl border border-white/10 bg-[#0d0d0e] p-4 text-white shadow">
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
        <TeamRow name={game.homeTeam} score={game.homeScore} result={game.homeResult} isWinner={homeWin} />
        <TeamRow name={game.awayTeam} score={game.awayScore} result={game.awayResult} isWinner={awayWin} />
      </div>
    </div>
  );
}

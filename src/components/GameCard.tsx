import type { Game } from "@/lib/types";
import TeamMark from "./TeamMark";
import clsx from "clsx";

const STATUS_LABEL: Record<Game["status"], string> = {
  scheduled: "Scheduled",
  final: "Final",
  cancelled: "Cancelled",
  postponed: "Postponed",
};

const STATUS_CLASS: Record<Game["status"], string> = {
  scheduled: "bg-white/10 text-white/80",
  final: "bg-brand text-white",
  cancelled: "bg-red-950 text-red-200",
  postponed: "bg-amber-900 text-amber-200",
};

function formatDate(dateStr: string) {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString("en-CA", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export default function GameCard({
  game,
  today,
  className,
}: {
  game: Game;
  today?: string;
  className?: string;
}) {
  const isFinal = game.status === "final";
  const dateLabel = today && game.date === today ? "Today" : formatDate(game.date);

  return (
    <article
      className={clsx(
        "flex w-72 shrink-0 flex-col gap-3 rounded-lg border border-white/15 bg-black/70 p-4 text-white backdrop-blur-sm",
        className
      )}
      aria-label={`${game.homeTeam.name} versus ${game.awayTeam.name}`}
    >
      <div className="flex items-center justify-between text-xs text-white/60">
        <span>
          <span className={clsx(dateLabel === "Today" && "font-semibold text-brand-200")}>
            {dateLabel}
          </span>{" "}
          &middot; {game.time}
        </span>
        <span
          className={clsx(
            "rounded px-2 py-0.5 font-semibold uppercase tracking-wide",
            STATUS_CLASS[game.status]
          )}
        >
          {STATUS_LABEL[game.status]}
        </span>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <TeamMark team={game.homeTeam} size={28} />
            <span className="text-sm font-medium">{game.homeTeam.name}</span>
          </div>
          {isFinal && <span className="font-heading text-lg">{game.homeScore}</span>}
        </div>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <TeamMark team={game.awayTeam} size={28} />
            <span className="text-sm font-medium">{game.awayTeam.name}</span>
          </div>
          {isFinal && <span className="font-heading text-lg">{game.awayScore}</span>}
        </div>
      </div>

      <p className="text-xs text-white/50">{game.field}</p>
    </article>
  );
}

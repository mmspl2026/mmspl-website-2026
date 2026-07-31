import type { Game } from "@/lib/types";
import clsx from "clsx";

const STATUS_LABEL: Record<Game["status"], string> = {
  scheduled: "Scheduled",
  live: "Live",
  final: "Final",
  forfeit: "Forfeit",
  cancelled: "Cancelled",
  postponed: "Postponed",
};

function formatDate(dateStr: string) {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString("en-CA", {
    month: "short",
    day: "numeric",
  });
}

function abbreviate(name: string) {
  const words = name.trim().split(/\s+/);
  if (words.length === 1) return words[0].slice(0, 4).toUpperCase();
  return words
    .map((w) => w[0])
    .join("")
    .slice(0, 4)
    .toUpperCase();
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
  const showScore = game.status === "final" || game.status === "forfeit" || game.status === "live";
  const isOff = game.status === "cancelled" || game.status === "postponed";
  const dateLabel = today && game.date === today ? "Today" : formatDate(game.date);
  const topLabel = isOff ? STATUS_LABEL[game.status] : dateLabel;

  return (
    <article
      className={clsx(
        "flex w-[140px] shrink-0 snap-start flex-col gap-1.5 rounded-lg border border-white/15 bg-black/70 px-3 py-2.5 text-white backdrop-blur-sm sm:w-40",
        className
      )}
      aria-label={`${game.homeTeam.name} versus ${game.awayTeam.name}`}
    >
      <span
        className={clsx(
          "truncate text-[10px] font-semibold uppercase tracking-wide",
          isOff ? "text-brand-300" : dateLabel === "Today" ? "text-brand-200" : "text-white/50"
        )}
      >
        {topLabel}
      </span>

      <div className="flex items-center justify-between gap-1">
        <span className="truncate text-sm font-bold">{abbreviate(game.homeTeam.name)}</span>
        {showScore && (
          <span className="shrink-0 font-heading text-base tabular-nums">{game.homeScore}</span>
        )}
      </div>
      <div className="flex items-center justify-between gap-1">
        <span className="truncate text-sm font-bold text-white/70">
          {abbreviate(game.awayTeam.name)}
        </span>
        {showScore && (
          <span className="shrink-0 font-heading text-base tabular-nums text-white/70">
            {game.awayScore}
          </span>
        )}
      </div>

      <p className="truncate text-[10px] leading-tight text-white/40">
        {game.time} &middot; {game.field}
      </p>
    </article>
  );
}

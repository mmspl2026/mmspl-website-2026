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
        "flex w-[140px] shrink-0 snap-start flex-col gap-1.5 rounded-lg border border-white/10 px-3 py-2.5 text-white shadow-lg backdrop-blur-[6px] sm:w-40",
        className
      )}
      style={{ background: "rgba(20,20,20,0.75)" }}
      aria-label={`${game.homeTeam.name} versus ${game.awayTeam.name}`}
    >
      {!isOff && dateLabel === "Today" ? (
        <span className="w-fit rounded-full bg-brand px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white">
          Today
        </span>
      ) : (
        <span
          className={clsx(
            "truncate text-[10px] font-semibold uppercase tracking-wide",
            isOff ? "text-brand-300" : "text-white/50"
          )}
        >
          {topLabel}
        </span>
      )}

      <div className="flex items-center justify-between gap-1">
        <span className="truncate text-sm font-bold text-white">{abbreviate(game.homeTeam.name)}</span>
        {showScore && (
          <span className="shrink-0 font-heading text-base font-bold tabular-nums">
            {game.homeScore}
          </span>
        )}
      </div>
      <span className="text-[9px] font-semibold uppercase tracking-wide text-white/40">vs</span>
      <div className="flex items-center justify-between gap-1">
        <span className="truncate text-sm font-semibold text-white/80">
          {abbreviate(game.awayTeam.name)}
        </span>
        {showScore && (
          <span className="shrink-0 font-heading text-base font-bold tabular-nums text-white/80">
            {game.awayScore}
          </span>
        )}
      </div>

      <p className="truncate text-[10px] leading-tight text-white/50">
        {game.time} &middot; {game.field}
      </p>
    </article>
  );
}

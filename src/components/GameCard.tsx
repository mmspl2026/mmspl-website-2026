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

function displayName(name: string) {
  const trimmed = name.trim();
  return trimmed.length > 15 ? `${trimmed.slice(0, 15)}…` : trimmed;
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
        "flex min-h-[100px] w-[130px] shrink-0 snap-start flex-col gap-1 rounded-lg border border-white/10 p-2.5 text-white shadow-lg sm:min-h-[110px] sm:w-40 sm:gap-1.5 sm:p-3",
        className
      )}
      style={{
        background: "rgba(0,0,0,0.55)",
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
      }}
      aria-label={`${game.homeTeam.name} versus ${game.awayTeam.name}`}
    >
      {!isOff && dateLabel === "Today" ? (
        <span className="mx-auto w-fit rounded-full bg-brand px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white">
          Today
        </span>
      ) : (
        <span className="block truncate text-center text-[10px] font-bold uppercase tracking-wide text-brand">
          {topLabel}
        </span>
      )}

      <div className="flex items-center justify-between gap-1">
        <span className="truncate text-base font-bold text-white">{displayName(game.homeTeam.name)}</span>
        {showScore && (
          <span className="shrink-0 font-heading text-lg font-bold tabular-nums text-white">
            {game.homeScore}
          </span>
        )}
      </div>
      <span className="text-xs uppercase tracking-wider text-gray-400">vs</span>
      <div className="flex items-center justify-between gap-1">
        <span className="truncate text-sm text-white/80">{displayName(game.awayTeam.name)}</span>
        {showScore && (
          <span className="shrink-0 font-heading text-lg font-bold tabular-nums text-white">
            {game.awayScore}
          </span>
        )}
      </div>

      <p className="mt-auto truncate text-xs text-gray-400">
        {game.time} &middot; {game.field}
      </p>
    </article>
  );
}

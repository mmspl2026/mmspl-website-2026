import type { Game, Team } from "@/lib/types";
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
  return new Date(`${dateStr}T00:00:00`)
    .toLocaleDateString("en-CA", { month: "short", day: "numeric" })
    .toUpperCase();
}

function formatTimeShort(time: string) {
  const match = time.match(/^(\d{1,2}:\d{2})\s*([AP])M$/i);
  return match ? `${match[1]}${match[2].toLowerCase()}` : time;
}

function teamShortName(team: Team) {
  return team.shortName?.trim() || team.name.trim().split(/\s+/)[0];
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

  const homeDim = showScore && (game.homeScore ?? 0) < (game.awayScore ?? 0);
  const awayDim = showScore && (game.awayScore ?? 0) < (game.homeScore ?? 0);

  return (
    <article
      className={clsx(
        "flex w-[108px] shrink-0 snap-start flex-col rounded-[10px] border border-white/20 px-2 pb-1.5 pt-[9px] text-center text-white",
        className
      )}
      style={{
        background: "rgba(255,255,255,0.09)",
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
      }}
      aria-label={`${game.homeTeam.name} versus ${game.awayTeam.name}`}
    >
      {!isOff && dateLabel === "Today" ? (
        <span className="mx-auto mb-1 w-fit rounded-full bg-brand px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wide text-white">
          Today
        </span>
      ) : (
        <span className="mb-1 truncate font-mono-brand text-[9px] font-bold tracking-wider text-red-400">
          {topLabel}
        </span>
      )}

      <p
        className={clsx(
          "mb-0.5 truncate text-[9px] leading-[1.3]",
          homeDim ? "font-semibold text-white/50" : showScore ? "font-bold text-white" : "font-semibold text-white"
        )}
      >
        {teamShortName(game.homeTeam)}
      </p>

      {showScore ? (
        <p className="mb-0.5 text-[13px] font-extrabold tracking-[0.02em] text-white">
          {game.homeScore} &ndash; {game.awayScore}
        </p>
      ) : (
        <p className="mb-0.5 text-[8px] font-medium tracking-[0.08em] text-white/35">vs</p>
      )}

      <p
        className={clsx(
          "mb-1.5 truncate text-[9px] leading-[1.3]",
          awayDim ? "font-semibold text-white/50" : showScore ? "font-bold text-white" : "font-semibold text-white"
        )}
      >
        {teamShortName(game.awayTeam)}
      </p>

      <div className="border-t border-white/[0.15] pt-1">
        <p className="truncate text-[8px] text-white/[0.55]">
          {formatTimeShort(game.time)} &middot; {game.field}
        </p>
      </div>
    </article>
  );
}

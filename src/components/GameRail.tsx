import type { Game } from "@/lib/types";
import GameCard from "./GameCard";

export default function GameRail({ games, today }: { games: Game[]; today?: string }) {
  if (games.length === 0) {
    return <p className="text-white/60">No games scheduled yet — check back soon.</p>;
  }

  return (
    <div
      className="flex gap-4 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:thin]"
      role="region"
      aria-label="Upcoming and recent games"
      tabIndex={0}
    >
      {games.map((game) => (
        <GameCard key={game._id} game={game} today={today} />
      ))}
    </div>
  );
}

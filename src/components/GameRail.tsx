"use client";

import { useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Game } from "@/lib/types";
import GameCard from "./GameCard";

export default function GameRail({ games, today }: { games: Game[]; today?: string }) {
  const scrollerRef = useRef<HTMLDivElement>(null);

  if (games.length === 0) {
    return <p className="text-white/60">No games scheduled yet — check back soon.</p>;
  }

  function scrollByCards(direction: 1 | -1) {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    scroller.scrollBy({ left: direction * scroller.clientWidth * 0.8, behavior: "smooth" });
  }

  return (
    <div className="group relative">
      <button
        type="button"
        onClick={() => scrollByCards(-1)}
        aria-label="Scroll to previous games"
        className="absolute left-0 top-1/2 z-20 hidden h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-[rgba(20,20,20,0.85)] text-white shadow-lg transition-opacity hover:bg-black sm:flex"
      >
        <ChevronLeft size={18} aria-hidden="true" />
      </button>

      <div
        ref={scrollerRef}
        className="flex snap-x snap-mandatory gap-2.5 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:thin]"
        role="region"
        aria-label="Upcoming and recent games"
        tabIndex={0}
      >
        {games.map((game) => (
          <GameCard key={game._id} game={game} today={today} />
        ))}
      </div>

      <button
        type="button"
        onClick={() => scrollByCards(1)}
        aria-label="Scroll to next games"
        className="absolute right-0 top-1/2 z-20 hidden h-8 w-8 -translate-y-1/2 translate-x-1/2 items-center justify-center rounded-full border border-white/10 bg-[rgba(20,20,20,0.85)] text-white shadow-lg transition-opacity hover:bg-black sm:flex"
      >
        <ChevronRight size={18} aria-hidden="true" />
      </button>
    </div>
  );
}

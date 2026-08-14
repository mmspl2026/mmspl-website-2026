"use client";

import { useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Game } from "@/lib/types";
import GameCard from "./GameCard";

export default function GameRail({ games, today }: { games: Game[]; today?: string }) {
  const scrollerRef = useRef<HTMLDivElement>(null);

  // The rail includes the past week's games alongside upcoming ones (so
  // recent scores stay visible), which means today's games usually aren't
  // the first cards in the row. Bring them into view on load — direct
  // scrollLeft math against the row itself, not scrollIntoView, so this
  // never scrolls the page.
  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller || !today) return;
    const cards = Array.from(scroller.querySelectorAll<HTMLElement>("[data-game-date]"));
    const target = cards.find((el) => (el.dataset.gameDate as string) >= today);
    if (target) {
      scroller.scrollLeft = target.offsetLeft - scroller.offsetLeft;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [games, today]);

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
        className="flex snap-x snap-mandatory gap-2 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
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

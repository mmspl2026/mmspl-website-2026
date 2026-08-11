"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import clsx from "clsx";
import type { ImportantDate } from "@/lib/types";

function formatDateLabel(date: string) {
  return new Date(`${date}T00:00:00`)
    .toLocaleDateString("en-CA", { month: "short", day: "numeric" })
    .toUpperCase();
}

// Matches the league's home timezone, so "today" is computed consistently
// regardless of the server's or visitor's own timezone.
function todayInLeagueTZ() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/Toronto" });
}

// Card width (150px, see the `w-[150px]` article below) + the row's gap-3
// (12px) — used so each arrow click moves by a whole number of cards
// instead of GameRail's viewport-relative scroll amount.
const CARD_STEP = 150 + 12;

export default function UpcomingDates({ dates }: { dates: ImportantDate[] }) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  function updateScrollState() {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    setCanScrollLeft(scroller.scrollLeft > 4);
    setCanScrollRight(scroller.scrollLeft + scroller.clientWidth < scroller.scrollWidth - 4);
  }

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    updateScrollState();
    scroller.addEventListener("scroll", updateScrollState);
    window.addEventListener("resize", updateScrollState);
    return () => {
      scroller.removeEventListener("scroll", updateScrollState);
      window.removeEventListener("resize", updateScrollState);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dates]);

  useEffect(() => {
    if (dates.length === 0 || !scrollerRef.current) return;
    const today = todayInLeagueTZ();
    const nextIndex = dates.findIndex((d) => d.date >= today);
    if (nextIndex <= 0) return; // already at the start, or everything is in the past

    const timer = setTimeout(() => {
      const card = document.getElementById(`date-card-${dates[nextIndex]._id}`);
      // scrollIntoView respects scroll-snap-align on the cards (set below),
      // so every way this row can scroll — this auto-scroll, arrow clicks,
      // manual swipes — lands on the same consistent card boundary.
      card?.scrollIntoView({ behavior: "smooth", inline: "start", block: "nearest" });
    }, 500);
    return () => clearTimeout(timer);
  }, [dates]);

  if (dates.length === 0) return null;

  const today = todayInLeagueTZ();
  const nextUpId = dates.find((d) => d.date >= today)?._id;

  function scrollByCards(direction: 1 | -1) {
    scrollerRef.current?.scrollBy({ left: direction * CARD_STEP * 2.5, behavior: "smooth" });
  }

  return (
    <section aria-labelledby="dates-heading" className="bg-white py-8 md:py-10">
      <div className="container-page">
        <h2 id="dates-heading" className="text-3xl sm:text-4xl">
          Upcoming Dates
        </h2>

        <div className="relative mt-8">
          <button
            type="button"
            onClick={() => scrollByCards(-1)}
            disabled={!canScrollLeft}
            aria-label="Scroll to earlier dates"
            className={clsx(
              "absolute left-0 top-1/2 z-20 flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-[rgba(20,20,20,0.85)] text-white shadow-lg transition-opacity hover:bg-black sm:h-12 sm:w-12",
              canScrollLeft ? "opacity-100" : "pointer-events-none opacity-0"
            )}
          >
            <ChevronLeft size={18} aria-hidden="true" />
          </button>

          <div
            ref={scrollerRef}
            className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none", scrollBehavior: "smooth" }}
            role="region"
            aria-label="Upcoming important dates"
            tabIndex={0}
          >
            {dates.map((d) => {
              const isPast = d.date < today;
              const isNextUp = d._id === nextUpId;
              return (
                <article
                  key={d._id}
                  id={`date-card-${d._id}`}
                  className={clsx(
                    "flex w-[150px] shrink-0 snap-start flex-col items-center rounded-[10px] border px-3 py-3 text-center text-white backdrop-blur-sm",
                    isNextUp ? "border-brand bg-brand-950/80" : "border-white/10 bg-black/90",
                    isPast && "opacity-50"
                  )}
                >
                  {isNextUp && (
                    <span className="mb-1.5 w-fit rounded-full bg-brand px-2 py-0.5 text-[8px] font-bold uppercase tracking-wide text-white">
                      Next Up
                    </span>
                  )}
                  <span className="mb-1.5 font-mono-brand text-xs font-bold uppercase tracking-wider text-red-400">
                    {formatDateLabel(d.date)}
                  </span>
                  <p className="text-sm font-bold leading-snug text-white">{d.label}</p>
                </article>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => scrollByCards(1)}
            disabled={!canScrollRight}
            aria-label="Scroll to later dates"
            className={clsx(
              "absolute right-0 top-1/2 z-20 flex h-11 w-11 -translate-y-1/2 translate-x-1/2 items-center justify-center rounded-full border border-white/10 bg-[rgba(20,20,20,0.85)] text-white shadow-lg transition-opacity hover:bg-black sm:h-12 sm:w-12",
              canScrollRight ? "opacity-100" : "pointer-events-none opacity-0"
            )}
          >
            <ChevronRight size={18} aria-hidden="true" />
          </button>
        </div>
      </div>
    </section>
  );
}

"use client";

import { useEffect, useRef } from "react";
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

export default function UpcomingDates({ dates }: { dates: ImportantDate[] }) {
  const scrollerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (dates.length === 0 || !scrollerRef.current) return;
    const today = todayInLeagueTZ();
    const nextIndex = dates.findIndex((d) => d.date >= today);
    if (nextIndex <= 0) return; // already at the start, or everything is in the past

    const timer = setTimeout(() => {
      const card = document.getElementById(`date-card-${dates[nextIndex]._id}`);
      const scroller = scrollerRef.current;
      if (card && scroller) {
        scroller.scrollLeft = card.offsetLeft - scroller.offsetLeft;
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [dates]);

  if (dates.length === 0) return null;

  const today = todayInLeagueTZ();
  const nextUpId = dates.find((d) => d.date >= today)?._id;

  return (
    <section aria-labelledby="dates-heading" className="bg-white py-16">
      <div className="container-page">
        <h2 id="dates-heading" className="text-3xl sm:text-4xl">
          Upcoming Dates
        </h2>

        <div
          ref={scrollerRef}
          className="mt-8 flex gap-3 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden"
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
                  "flex w-[150px] shrink-0 flex-col items-center rounded-[10px] border px-3 py-3 text-center text-white backdrop-blur-sm",
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
      </div>
    </section>
  );
}

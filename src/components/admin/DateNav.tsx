"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

export default function DateNav({
  date,
  onChange,
  onPrev,
  onNext,
  canPrev,
  canNext,
  isToday,
}: {
  date: string;
  onChange: (date: string) => void;
  onPrev: () => void;
  onNext: () => void;
  canPrev: boolean;
  canNext: boolean;
  isToday: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={onPrev}
        disabled={!canPrev}
        aria-label="Previous game night"
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 disabled:opacity-30"
      >
        <ChevronLeft size={20} aria-hidden="true" />
      </button>

      <div className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-white/10 bg-[#1a1a1a] px-3 py-2.5">
        <label htmlFor="admin-date" className="sr-only">
          Selected date
        </label>
        <input
          id="admin-date"
          type="date"
          value={date}
          onChange={(e) => onChange(e.target.value)}
          className="bg-transparent text-sm font-semibold text-white [color-scheme:dark] focus:outline-none"
        />
        {isToday && (
          <span className="rounded bg-brand px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
            Today
          </span>
        )}
      </div>

      <button
        type="button"
        onClick={onNext}
        disabled={!canNext}
        aria-label="Next game night"
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 disabled:opacity-30"
      >
        <ChevronRight size={20} aria-hidden="true" />
      </button>
    </div>
  );
}

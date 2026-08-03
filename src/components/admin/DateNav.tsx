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
  const formatted = new Date(`${date}T12:00:00`).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="mb-6 flex items-center justify-between gap-2 rounded-2xl bg-gray-900 p-3">
      <button
        type="button"
        onClick={onPrev}
        disabled={!canPrev}
        aria-label="Previous game night"
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-800 text-white transition-all hover:bg-gray-700 active:scale-95 disabled:opacity-30"
      >
        <ChevronLeft size={20} aria-hidden="true" />
      </button>

      <div className="flex flex-1 flex-col items-center">
        <p className="text-sm font-bold text-white">{formatted}</p>
        {isToday && <span className="text-xs font-semibold text-red-400">TODAY</span>}
        <label htmlFor="admin-date" className="sr-only">
          Selected date
        </label>
        <input
          id="admin-date"
          type="date"
          value={date}
          onChange={(e) => onChange(e.target.value)}
          className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-800 px-2 py-1 text-center text-xs text-gray-300 [color-scheme:dark] focus:outline-none"
        />
      </div>

      <button
        type="button"
        onClick={onNext}
        disabled={!canNext}
        aria-label="Next game night"
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-800 text-white transition-all hover:bg-gray-700 active:scale-95 disabled:opacity-30"
      >
        <ChevronRight size={20} aria-hidden="true" />
      </button>
    </div>
  );
}

"use client";

import { Minus, Plus } from "lucide-react";

export default function ScoreStepper({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: number;
  onChange: (next: number) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex shrink-0 items-center justify-center gap-2">
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange(Math.max(0, value - 1))}
        aria-label={`Decrease ${label} score`}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-700 text-white transition-all hover:bg-gray-600 active:scale-95 disabled:opacity-40"
      >
        <Minus size={18} aria-hidden="true" />
      </button>
      <span className="w-10 shrink-0 text-center text-3xl font-bold tabular-nums text-white" aria-live="polite">
        {value}
      </span>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange(value + 1)}
        aria-label={`Increase ${label} score`}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-700 text-white transition-all hover:bg-red-600 active:scale-95 disabled:opacity-40"
      >
        <Plus size={18} aria-hidden="true" />
      </button>
    </div>
  );
}

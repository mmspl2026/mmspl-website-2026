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
    <div className="flex flex-col items-center gap-2">
      <span className="max-w-[7rem] truncate text-xs font-semibold uppercase tracking-wide text-white/50">
        {label}
      </span>
      <div className="flex items-center gap-3">
        <button
          type="button"
          disabled={disabled}
          onClick={() => onChange(Math.max(0, value - 1))}
          aria-label={`Decrease ${label} score`}
          className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-brand bg-transparent text-brand-300 transition-colors hover:bg-brand/20 active:scale-95 disabled:opacity-40"
        >
          <Minus size={22} aria-hidden="true" />
        </button>
        <span className="w-14 text-center font-heading text-4xl tabular-nums" aria-live="polite">
          {value}
        </span>
        <button
          type="button"
          disabled={disabled}
          onClick={() => onChange(value + 1)}
          aria-label={`Increase ${label} score`}
          className="flex h-12 w-12 items-center justify-center rounded-full bg-brand text-white transition-colors hover:bg-brand-700 active:scale-95 disabled:opacity-40"
        >
          <Plus size={22} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

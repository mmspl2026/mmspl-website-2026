"use client";

import clsx from "clsx";
import type { Game } from "@/lib/types";

const OPTIONS: Array<{ value: Game["status"]; label: string }> = [
  { value: "scheduled", label: "Scheduled" },
  { value: "live", label: "Live" },
  { value: "final", label: "Final" },
  { value: "forfeit", label: "Forfeit" },
];

export default function StatusToggle({
  value,
  onChange,
  disabled,
}: {
  value: Game["status"];
  onChange: (next: Game["status"]) => void;
  disabled?: boolean;
}) {
  return (
    <div role="group" aria-label="Game status" className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {OPTIONS.map((opt) => (
        <button
          key={opt.value}
          type="button"
          disabled={disabled}
          onClick={() => onChange(opt.value)}
          aria-pressed={value === opt.value}
          className={clsx(
            "rounded px-2 py-2.5 text-xs font-semibold uppercase tracking-wide transition-colors disabled:opacity-40",
            value === opt.value ? "bg-brand text-white" : "bg-white/10 text-white/70 hover:bg-white/20"
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

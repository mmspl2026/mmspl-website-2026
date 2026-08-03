"use client";

import clsx from "clsx";
import type { Game } from "@/lib/types";

const OPTIONS: Array<{ value: Game["status"]; label: string; selectedClass: string }> = [
  { value: "scheduled", label: "Scheduled", selectedClass: "bg-gray-600 text-white" },
  { value: "live", label: "Live", selectedClass: "bg-red-600 text-white" },
  { value: "final", label: "Final", selectedClass: "bg-green-700 text-white" },
  { value: "forfeit", label: "Forfeit", selectedClass: "bg-orange-600 text-white" },
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
    <div role="group" aria-label="Game status" className="mb-2 flex flex-wrap gap-1.5">
      {OPTIONS.map((opt) => (
        <button
          key={opt.value}
          type="button"
          disabled={disabled}
          onClick={() => onChange(opt.value)}
          aria-pressed={value === opt.value}
          className={clsx(
            "min-w-[4.5rem] flex-1 rounded-xl py-2 text-xs font-bold uppercase tracking-wide transition-all",
            disabled && "opacity-40",
            value === opt.value ? opt.selectedClass : "bg-gray-800 text-gray-400 hover:bg-gray-700"
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

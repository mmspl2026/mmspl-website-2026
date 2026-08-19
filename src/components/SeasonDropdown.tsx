"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { ChevronDown } from "lucide-react";
import clsx from "clsx";

interface SeasonOption {
  year: number;
  isActive: boolean;
}

export default function SeasonDropdown({
  seasons,
  selected,
  className,
}: {
  seasons: SeasonOption[];
  selected: number;
  className?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const current = seasons.filter((s) => s.isActive);
  const previous = seasons.filter((s) => !s.isActive);

  function handleChange(year: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("season", year);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className={clsx("relative", className)}>
      <select
        aria-label="Season"
        value={selected}
        onChange={(e) => handleChange(e.target.value)}
        className="h-9 w-full appearance-none rounded-md border-2 border-brand bg-transparent pl-3 pr-8 text-sm font-semibold text-black focus:outline-none focus:ring-1 focus:ring-brand"
      >
        {current.length > 0 && (
          <optgroup label="Current">
            {current.map((s) => (
              <option key={s.year} value={s.year}>
                {s.year} Season
              </option>
            ))}
          </optgroup>
        )}
        {previous.length > 0 && (
          <optgroup label="Previous">
            {previous.map((s) => (
              <option key={s.year} value={s.year}>
                {s.year} Season
              </option>
            ))}
          </optgroup>
        )}
      </select>
      <ChevronDown
        size={16}
        className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-black/60"
        aria-hidden="true"
      />
    </div>
  );
}

export type { SeasonOption };

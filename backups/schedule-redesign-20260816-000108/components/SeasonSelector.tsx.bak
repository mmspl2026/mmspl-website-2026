"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { ChevronDown } from "lucide-react";
import clsx from "clsx";

export default function SeasonSelector({
  years,
  selected,
  variant = "red",
}: {
  years: number[];
  selected: number;
  variant?: "red" | "gray";
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function handleChange(year: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("season", year);
    router.push(`${pathname}?${params.toString()}`);
  }

  const width = variant === "red" ? "w-40" : "w-32";

  return (
    <div className={clsx("relative inline-block h-9", width)}>
      <select
        id="season-select"
        value={selected}
        onChange={(e) => handleChange(e.target.value)}
        className={clsx(
          "h-9 appearance-none rounded-md border-2 bg-transparent px-3 py-2 text-sm text-black focus:outline-none focus:ring-1 focus:ring-brand",
          width,
          variant === "red" ? "border-brand" : "border-gray-300"
        )}
      >
        {years.map((year) => (
          <option key={year} value={year}>
            {year} Season
          </option>
        ))}
      </select>
      <ChevronDown
        size={16}
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-black/60"
        aria-hidden="true"
      />
    </div>
  );
}

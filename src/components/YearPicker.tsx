"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import clsx from "clsx";

export default function YearPicker({ years, selected }: { years: number[]; selected: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function handleSelect(year: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("year", String(year));
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div role="group" aria-label="Select award year" className="flex flex-wrap gap-2">
      {years.map((year) => (
        <button
          key={year}
          type="button"
          onClick={() => handleSelect(year)}
          aria-pressed={year === selected}
          className={clsx(
            "rounded-full px-4 py-2 text-sm font-semibold transition-colors",
            year === selected ? "bg-brand text-white" : "bg-black/5 text-black/70 hover:bg-black/10"
          )}
        >
          {year}
        </button>
      ))}
    </div>
  );
}

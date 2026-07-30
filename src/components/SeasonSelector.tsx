"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";

export default function SeasonSelector({ years, selected }: { years: number[]; selected: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function handleChange(year: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("season", year);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex items-center gap-2">
      <label htmlFor="season-select" className="text-sm font-semibold uppercase tracking-wide text-black/60">
        Season
      </label>
      <select
        id="season-select"
        value={selected}
        onChange={(e) => handleChange(e.target.value)}
        className="rounded border border-black/20 bg-white px-3 py-2 text-sm font-medium focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/40"
      >
        {years.map((year) => (
          <option key={year} value={year}>
            {year}
          </option>
        ))}
      </select>
    </div>
  );
}

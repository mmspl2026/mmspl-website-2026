import { Calendar } from "lucide-react";
import type { ImportantDate } from "@/lib/types";

function formatRange(date: string, endDate?: string) {
  const start = new Date(`${date}T00:00:00`);
  const startStr = start.toLocaleDateString("en-CA", { month: "short", day: "numeric" });
  if (!endDate) return startStr;
  const end = new Date(`${endDate}T00:00:00`);
  const endStr = end.toLocaleDateString("en-CA", { month: "short", day: "numeric" });
  return `${startStr} – ${endStr}`;
}

export default function UpcomingDates({ dates }: { dates: ImportantDate[] }) {
  return (
    <section aria-labelledby="dates-heading" className="bg-white py-16">
      <div className="container-page">
        <h2 id="dates-heading" className="text-3xl sm:text-4xl">
          Upcoming Dates
        </h2>
        <ol className="mt-8 divide-y divide-black/10 border-y border-black/10">
          {dates.map((d) => (
            <li key={d._id} className="flex items-center gap-4 py-4">
              <Calendar className="shrink-0 text-brand" size={22} aria-hidden="true" />
              <div className="flex flex-1 flex-col sm:flex-row sm:items-baseline sm:justify-between">
                <span className="font-semibold">{d.label}</span>
                <span className="text-sm text-black/60">{formatRange(d.date, d.endDate)}</span>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

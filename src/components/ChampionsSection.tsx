import { Trophy } from "lucide-react";
import { CHAMPIONS_2026 } from "@/lib/seed-content";

const ENTRIES = [
  { label: "Charity Tournament", ...CHAMPIONS_2026.charityTournament },
  { label: "Regular Season", ...CHAMPIONS_2026.regularSeason },
  { label: "McGregor Playoff Tournament", ...CHAMPIONS_2026.yearEndTournament },
];

export default function ChampionsSection() {
  return (
    <section aria-labelledby="champions-heading" className="bg-white py-16">
      <div className="container-page">
        <h2 id="champions-heading" className="text-3xl sm:text-4xl">
          2026 Champions
        </h2>
        <div className="mt-8 grid gap-6 sm:grid-cols-3">
          {ENTRIES.map((entry) => (
            <div key={entry.label} className="rounded-lg border border-black/10 p-6 text-center">
              <Trophy className="mx-auto text-brand" size={32} aria-hidden="true" />
              <h3 className="mt-4 text-sm font-heading uppercase tracking-wide text-black/50">
                {entry.label}
              </h3>
              <p className="mt-2 text-2xl font-heading">{entry.champion}</p>
              {entry.finalist && entry.finalist !== "TBD" && (
                <p className="mt-1 text-sm text-black/50">Runner-up: {entry.finalist}</p>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

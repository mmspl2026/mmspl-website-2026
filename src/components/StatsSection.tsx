import { Users, UserCheck, CalendarDays, HeartHandshake } from "lucide-react";
import { LEAGUE_FOUNDING_YEAR, LEAGUE_STATS } from "@/lib/seed-content";

const CURRENT_YEAR = new Date().getFullYear();
const YEARS_RUNNING = CURRENT_YEAR - LEAGUE_FOUNDING_YEAR;
const YEARS_GIVING = Math.floor((CURRENT_YEAR - LEAGUE_STATS.donatingSince) / 10) * 10;

const STATS = [
  {
    label: "Competitive Teams",
    value: `${LEAGUE_STATS.teams}`,
    icon: Users,
  },
  {
    label: "Active Players",
    value: `${LEAGUE_STATS.teams * LEAGUE_STATS.playersPerTeam}+`,
    icon: UserCheck,
  },
  {
    label: "Years Running",
    value: `${YEARS_RUNNING}`,
    icon: CalendarDays,
  },
  {
    label: "Years of Giving",
    value: `${YEARS_GIVING}+`,
    icon: HeartHandshake,
  },
];

export default function StatsSection() {
  return (
    <section aria-labelledby="stats-heading" className="bg-white py-16">
      <h2 id="stats-heading" className="sr-only">
        League at a Glance
      </h2>
      <div className="container-page grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {STATS.map(({ label, value, icon: Icon }) => (
          <div key={label} className="flex flex-col items-center rounded-lg border border-black/10 p-8 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-brand text-white">
              <Icon size={26} aria-hidden="true" />
            </span>
            <p className="mt-4 text-3xl font-heading text-brand">{value}</p>
            <p className="mt-1 text-sm font-semibold uppercase tracking-wide text-black/60">
              {label}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

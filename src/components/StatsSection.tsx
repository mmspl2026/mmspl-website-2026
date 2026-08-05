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
    <section aria-labelledby="stats-heading" className="bg-white py-14">
      <h2 id="stats-heading" className="sr-only">
        League at a Glance
      </h2>
      <div className="container-page grid grid-cols-2 gap-6 lg:grid-cols-4">
        {STATS.map(({ label, value, icon: Icon }) => (
          <div
            key={label}
            className="rounded-xl border border-gray-100 p-6 pb-4 pt-4 text-center shadow transition-all duration-300 hover:border-brand hover:shadow-lg"
          >
            <span className="mx-auto mb-2 flex h-11 w-11 items-center justify-center rounded-full bg-brand text-white">
              <Icon size={20} aria-hidden="true" />
            </span>
            <p className="mb-0.5 font-mono-brand text-[1.75rem] font-bold text-[#0d0d0e]">{value}</p>
            <p className="text-sm font-medium text-[#9a968f]">{label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

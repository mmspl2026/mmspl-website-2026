import Link from "next/link";
import { Trophy, Flag } from "lucide-react";

export interface SpecialRailCardData {
  /** ISO date — drives the rail's scroll-to-today behaviour and where the
   * card sorts in the row. Not necessarily displayed (see hideDate). */
  date: string;
  label: string;
  sublabel?: string;
  href: string;
  icon: "trophy" | "flag";
  /** For cards that don't represent one specific day (e.g. "End of Season")
   * — keeps `date` for sorting/scroll purposes without showing a date pill
   * that would misleadingly suggest something happens that day. */
  hideDate?: boolean;
}

function formatDate(dateStr: string) {
  return new Date(`${dateStr}T00:00:00`)
    .toLocaleDateString("en-CA", { month: "short", day: "numeric" })
    .toUpperCase();
}

export default function TournamentRailCard({ data, today }: { data: SpecialRailCardData; today?: string }) {
  const dateLabel = today && data.date === today ? "Today" : formatDate(data.date);
  const Icon = data.icon === "flag" ? Flag : Trophy;

  return (
    <Link
      href={data.href}
      data-game-date={data.date}
      className="flex w-[108px] shrink-0 snap-start flex-col items-center justify-center gap-1 rounded-[10px] border border-brand/50 px-2 py-2.5 text-center text-white transition-colors hover:border-brand"
      style={{ background: "rgba(170,17,17,0.16)", backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)" }}
    >
      {!data.hideDate &&
        (dateLabel === "Today" ? (
          <span className="w-fit rounded-full bg-brand px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wide text-white">
            Today
          </span>
        ) : (
          <span className="font-mono-brand text-[9px] font-bold tracking-wider text-red-400">{dateLabel}</span>
        ))}
      <Icon size={16} className="shrink-0 text-brand" aria-hidden="true" />
      <p className="w-full text-[10px] font-bold leading-tight text-white">{data.label}</p>
      {data.sublabel && <p className="w-full truncate text-[8px] text-white/50">{data.sublabel}</p>}
    </Link>
  );
}

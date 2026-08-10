import Link from "next/link";
import { Trophy } from "lucide-react";
import type { TournamentResult } from "@/lib/types";

interface ChampionCardProps {
  trophyName: string;
  label: string;
  champion?: string | null;
  subtitle?: string | null;
  href?: string;
}

function ChampionCard({ trophyName, label, champion, subtitle, href }: ChampionCardProps) {
  const content = (
    <div className="h-full overflow-hidden rounded-xl border border-white/10 bg-[#0d0d0e] text-white shadow transition-shadow hover:shadow-xl">
      <div className="bg-brand px-4 py-1.5">
        <p className="text-center text-[10px] font-semibold uppercase tracking-[0.14em] text-white">{trophyName}</p>
      </div>
      <div className="flex flex-col items-center gap-1.5 p-5 text-center">
        <Trophy size={20} className="text-brand" aria-hidden="true" />
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/50">{label}</p>
        {champion ? (
          <p className="font-heading text-lg uppercase leading-tight tracking-[0.01em] text-white">{champion}</p>
        ) : (
          <p className="font-heading text-lg uppercase leading-tight tracking-[0.01em] text-white/30">TBD</p>
        )}
        {subtitle && <p className="text-xs text-white/50">{subtitle}</p>}
      </div>
    </div>
  );

  if (!href) return content;
  return (
    <Link href={href} className="block h-full">
      {content}
    </Link>
  );
}

export default function ChampionsSection({
  year,
  charity,
  mcgregor,
  regularSeasonChampion,
}: {
  year: number;
  charity: TournamentResult | null;
  mcgregor: TournamentResult | null;
  regularSeasonChampion: string | null;
}) {
  return (
    <section aria-labelledby="champions-heading" className="bg-white py-8 md:py-10">
      <div className="container-page">
        <h2 id="champions-heading" className="text-3xl sm:text-4xl">
          {year} Champions
        </h2>
        <div className="mx-auto mt-8 grid max-w-2xl gap-4 sm:grid-cols-3">
          <ChampionCard
            trophyName="Kevan MacDonald Cup"
            label="Charity Tournament"
            champion={charity?.champion}
            subtitle={charity?.finalist ? `Finalists: ${charity.finalist}` : undefined}
            href={charity?.champion ? `/schedule/tournament/${year}/charity` : undefined}
          />
          <ChampionCard
            trophyName="President's Trophy"
            label="Regular Season"
            champion={regularSeasonChampion}
            href={regularSeasonChampion ? "/standings" : undefined}
          />
          <ChampionCard
            trophyName="Jim McGregor Trophy"
            label="Year-End Tournament"
            champion={mcgregor?.champion}
            subtitle={mcgregor?.finalist ? `Finalists: ${mcgregor.finalist}` : undefined}
            href={mcgregor?.champion ? `/schedule/tournament/${year}/mcgregor` : undefined}
          />
        </div>
      </div>
    </section>
  );
}

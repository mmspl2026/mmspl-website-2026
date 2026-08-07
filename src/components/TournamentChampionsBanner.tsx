import Image from "next/image";
import { Trophy, Medal, Star } from "lucide-react";
import type { TournamentResult } from "@/lib/types";
import { urlFor } from "@/lib/sanity/image";

function BannerCard({
  icon,
  label,
  name,
  subtitle,
  photo,
  variant,
}: {
  icon: React.ReactNode;
  label: string;
  name: string;
  subtitle?: string;
  photo?: TournamentResult["championPhoto"];
  variant: "red" | "dark";
}) {
  return (
    <div
      className={
        "w-full max-w-[220px] shrink-0 overflow-hidden rounded-xl border text-white shadow " +
        (variant === "red" ? "border-brand/40 bg-brand" : "border-white/10 bg-[#0d0d0e]")
      }
    >
      {photo && (
        <div className="relative h-56 w-full">
          <Image
            src={urlFor(photo).width(440).fit("max").url()}
            alt={name}
            fill
            className="object-cover object-top"
          />
        </div>
      )}
      <div className="p-4">
        <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-white/70">
          {icon}
          {label}
        </p>
        <p className="mt-2 font-heading text-lg uppercase leading-tight tracking-[0.01em] text-white">{name}</p>
        {subtitle && <p className="mt-1 text-xs text-white/60">{subtitle}</p>}
      </div>
    </div>
  );
}

export default function TournamentChampionsBanner({ result }: { result: TournamentResult }) {
  if (!result.champion && !result.hasDetailedResults) return null;

  return (
    <div className="flex flex-wrap justify-center gap-4">
      {result.champion && (
        <BannerCard
          icon={<Trophy size={14} aria-hidden="true" />}
          label="Champions"
          name={result.champion}
          photo={result.championPhoto}
          variant="red"
        />
      )}
      {result.mvp && (
        <BannerCard
          icon={<Star size={14} aria-hidden="true" />}
          label="MVP"
          name={result.mvp}
          subtitle={result.mvpTrophy}
          photo={result.mvpPhoto}
          variant="dark"
        />
      )}
      {result.finalist && (
        <BannerCard
          icon={<Medal size={14} aria-hidden="true" />}
          label="Finalists"
          name={result.finalist}
          photo={result.finalistPhoto}
          variant="dark"
        />
      )}
    </div>
  );
}

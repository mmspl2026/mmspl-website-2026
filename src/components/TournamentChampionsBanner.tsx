import Image from "next/image";
import { Trophy, Medal, Star } from "lucide-react";
import type { TournamentResult } from "@/lib/types";
import { urlFor } from "@/lib/sanity/image";

function BannerCard({
  icon,
  label,
  name,
  subtitle,
  imageSrc,
  imageFit = "cover",
  variant,
}: {
  icon: React.ReactNode;
  label: string;
  name: string;
  subtitle?: string;
  imageSrc?: string;
  imageFit?: "cover" | "contain";
  variant: "red" | "dark";
}) {
  return (
    <div
      className={
        "w-full max-w-[300px] shrink-0 overflow-hidden rounded-xl border text-white shadow " +
        (variant === "red" ? "border-brand/40 bg-brand" : "border-white/10 bg-[#0d0d0e]")
      }
    >
      {imageSrc && (
        <div className="relative h-56 w-full">
          <Image
            src={imageSrc}
            alt={name}
            fill
            className={imageFit === "contain" ? "object-contain p-3" : "object-cover object-top"}
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

  // Historical two-flight tournaments (e.g. 2010 McGregor) crowned separate
  // "A" and "B" champions — shown only here, never on Standings/Schedule,
  // which keep using champion/finalist alone (the "A" result) as usual.
  const hasSecondFlight = Boolean(result.secondaryChampion);

  // No individual MVP photo on file for most years — fall back to a photo of
  // the actual Richard Kirkby Memorial Trophy (McGregor tournament MVP award
  // since 1998) rather than showing an empty slot. Charity's MVP award is a
  // different trophy (McClarty), so this fallback is McGregor-only.
  const usingTrophyFallback = !result.mvpPhoto && result.type === "mcgregor";
  const mvpImageSrc = result.mvpPhoto
    ? urlFor(result.mvpPhoto).width(440).fit("max").url()
    : usingTrophyFallback
      ? "/richard-kirkby-trophy.jpg"
      : undefined;

  return (
    <div className="flex flex-wrap justify-center gap-4">
      {result.champion && (
        <BannerCard
          icon={<Trophy size={14} aria-hidden="true" />}
          label={hasSecondFlight ? "A Champions" : "Champions"}
          name={result.champion}
          imageSrc={result.championPhoto ? urlFor(result.championPhoto).width(440).fit("max").url() : undefined}
          variant="red"
        />
      )}
      {result.finalist && (
        <BannerCard
          icon={<Medal size={14} aria-hidden="true" />}
          label={hasSecondFlight ? "A Finalists" : "Finalists"}
          name={result.finalist}
          imageSrc={result.finalistPhoto ? urlFor(result.finalistPhoto).width(440).fit("max").url() : undefined}
          variant="dark"
        />
      )}
      {result.secondaryChampion && (
        <BannerCard
          icon={<Trophy size={14} aria-hidden="true" />}
          label="B Champions"
          name={result.secondaryChampion}
          imageSrc={
            result.secondaryChampionPhoto ? urlFor(result.secondaryChampionPhoto).width(440).fit("max").url() : undefined
          }
          variant="red"
        />
      )}
      {result.secondaryFinalist && (
        <BannerCard
          icon={<Medal size={14} aria-hidden="true" />}
          label="B Finalists"
          name={result.secondaryFinalist}
          imageSrc={
            result.secondaryFinalistPhoto ? urlFor(result.secondaryFinalistPhoto).width(440).fit("max").url() : undefined
          }
          variant="dark"
        />
      )}
      {result.mvp && (
        <BannerCard
          icon={<Star size={14} aria-hidden="true" />}
          label="MVP"
          name={result.mvp}
          subtitle={result.mvpTrophy}
          imageSrc={mvpImageSrc}
          imageFit={usingTrophyFallback ? "contain" : "cover"}
          variant="red"
        />
      )}
    </div>
  );
}

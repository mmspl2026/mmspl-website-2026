import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarOff } from "lucide-react";
import { sanityFetch } from "@/lib/sanity/client";
import {
  adminSettingsQuery,
  tournamentResultQuery,
  tournamentPoolsQuery,
  tournamentGamesQuery,
  wildCardRankingsQuery,
} from "@/lib/sanity/queries";
import type { AdminSettings, TournamentResult, TournamentPool, TournamentGame, WildCardRanking, TournamentType } from "@/lib/types";
import { urlFor } from "@/lib/sanity/image";
import { TOURNAMENT_LABELS, formatDateRange } from "@/lib/tournamentDisplay";
import TournamentChampionsBanner from "@/components/TournamentChampionsBanner";
import TournamentPoolSeeding from "@/components/TournamentPoolSeeding";
import TournamentDayTabs from "@/components/TournamentDayTabs";

function isTournamentType(value: string): value is TournamentType {
  return value === "charity" || value === "mcgregor";
}

export async function generateMetadata({ params }: { params: { year: string; type: string } }): Promise<Metadata> {
  if (!isTournamentType(params.type)) return { title: "Tournament" };
  return { title: `${params.year} ${TOURNAMENT_LABELS[params.type].short}` };
}

export default async function TournamentDetailPage({ params }: { params: { year: string; type: string } }) {
  if (!isTournamentType(params.type)) notFound();
  const type = params.type;

  const year = Number(params.year);
  if (!Number.isInteger(year)) notFound();

  const [result, pools, games, wcRankings, settings] = await Promise.all([
    sanityFetch<TournamentResult | null>(tournamentResultQuery, { year, type }, null),
    sanityFetch<TournamentPool[]>(tournamentPoolsQuery, { year, type }, []),
    sanityFetch<TournamentGame[]>(tournamentGamesQuery, { year, type }, []),
    sanityFetch<WildCardRanking[]>(wildCardRankingsQuery, { year, type }, []),
    sanityFetch<AdminSettings | null>(adminSettingsQuery, {}, null),
  ]);

  if (!result) notFound();

  const label = TOURNAMENT_LABELS[type];
  const heroImage = settings?.scheduleHeroImage || settings?.heroImage;
  const heroImageUrl = heroImage ? urlFor(heroImage).width(1920).height(1080).fit("crop").url() : "/hero.jpg";
  const dateRange = formatDateRange(games.map((g) => g.date), year);
  const isCurrentSeason = year === new Date().getFullYear();

  return (
    <div className="min-h-screen bg-gray-50">
      <div
        className="relative h-[260px] overflow-hidden"
        style={{
          backgroundImage: `linear-gradient(rgba(10,10,12,0.65), rgba(10,10,12,0.25) 35%, rgba(10,10,12,0.85) 80%), url(${heroImageUrl})`,
          backgroundSize: "cover",
          backgroundPosition: "center center",
          backgroundRepeat: "no-repeat",
        }}
      >
        <div className="absolute left-0 top-0 px-5 pt-5">
          <p className="text-[10px] uppercase tracking-[0.14em] text-white/45">
            <Link href="/" className="no-underline hover:underline">
              Home
            </Link>{" "}
            /{" "}
            <Link href="/schedule/tournament" className="no-underline hover:underline">
              Tournaments
            </Link>{" "}
            / {year} {label.short}
          </p>
        </div>
        <div className="absolute bottom-0 left-0 px-5 pb-7">
          <h1 className="font-heading uppercase leading-none tracking-[0.01em] text-white text-[clamp(1.6rem,4.5vw,3.2rem)]">
            {year} {label.full}
          </h1>
          <p className="mt-1.5 text-base text-white/70">{dateRange}</p>
        </div>
      </div>

      <div className="container-page space-y-8 py-10">
        <TournamentChampionsBanner result={result} />

        {result.cancelled ? (
          <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-gray-300 bg-gray-50 px-5 py-10 text-center">
            <CalendarOff size={28} className="text-gray-400" aria-hidden="true" />
            <p className="text-base font-semibold text-black">{year} Season Cancelled</p>
            <p className="max-w-md text-sm text-gray-500">
              {result.notes || "This season was cancelled due to the COVID-19 pandemic."}
            </p>
          </div>
        ) : result.hasDetailedResults ? (
          <>
            <TournamentPoolSeeding pools={pools} />
            <TournamentDayTabs games={games} wcRankings={wcRankings} interactive={isCurrentSeason} />
          </>
        ) : (
          <div className="rounded-lg border border-gray-200 bg-gray-100 px-5 py-4 text-center text-sm text-gray-500">
            Detailed game results not available for this year.
          </div>
        )}
      </div>
    </div>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { CalendarOff } from "lucide-react";
import { sanityFetch } from "@/lib/sanity/client";
import { allSeasonsQuery, gamesBySeasonQuery, adminSettingsQuery, allTournamentResultsQuery } from "@/lib/sanity/queries";
import type { AdminSettings, Game, Season, TournamentResult } from "@/lib/types";
import { urlFor } from "@/lib/sanity/image";
import ScheduleList from "@/components/ScheduleList";

export const metadata: Metadata = { title: "Schedule" };

const CURRENT_YEAR = new Date().getFullYear();

export default async function SchedulePage({
  searchParams,
}: {
  searchParams: { season?: string };
}) {
  const [seasons, settings, tournamentResults] = await Promise.all([
    sanityFetch<Season[]>(allSeasonsQuery, {}, []),
    sanityFetch<AdminSettings | null>(adminSettingsQuery, {}, null),
    sanityFetch<TournamentResult[]>(allTournamentResultsQuery, {}, []),
  ]);
  const years = seasons.length > 0 ? seasons.map((s) => s.year) : [CURRENT_YEAR];
  const selectedYear = searchParams.season ? Number(searchParams.season) : years[0];
  const selectedSeason = seasons.find((s) => s.year === selectedYear);
  const seasonOptions = seasons.length > 0 ? seasons.map((s) => ({ year: s.year, isActive: s.isActive })) : [{ year: CURRENT_YEAR, isActive: true }];

  const charityResult = tournamentResults.find((r) => r.year === selectedYear && r.type === "charity") || null;
  const mcgregorResult = tournamentResults.find((r) => r.year === selectedYear && r.type === "mcgregor") || null;

  const games = await sanityFetch<Game[]>(gamesBySeasonQuery, { year: selectedYear }, []);
  const displayGames = selectedSeason?.cancelled ? [] : games;

  const heroImage = settings?.scheduleHeroImage || settings?.heroImage;
  const heroImageUrl = heroImage ? urlFor(heroImage).width(1920).height(1080).fit("crop").url() : "/hero.jpg";

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
            / Schedule
          </p>
        </div>
        <div className="absolute bottom-0 left-0 px-5 pb-7">
          <h1 className="font-heading uppercase leading-none tracking-[0.01em] text-white text-[clamp(2rem,5vw,3.2rem)]">
            Game Schedule &amp; Results
          </h1>
          <p className="mt-1.5 text-base text-white/70">2026 Season &mdash; May to September</p>
        </div>
      </div>

      <div className="container-page py-10">
        {selectedSeason?.cancelled ? (
          <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-gray-300 bg-white px-5 py-16 text-center">
            <CalendarOff size={28} className="text-gray-400" aria-hidden="true" />
            <p className="text-base font-semibold text-black">{selectedYear} Season Cancelled</p>
            <p className="max-w-md text-sm text-gray-500">
              {selectedSeason.cancelledReason || "This season was cancelled due to the COVID-19 pandemic."}
            </p>
          </div>
        ) : (
          <ScheduleList
            key={selectedYear}
            games={displayGames}
            seasons={seasonOptions}
            selectedYear={selectedYear}
            charityResult={charityResult}
            mcgregorResult={mcgregorResult}
          />
        )}
      </div>
    </div>
  );
}

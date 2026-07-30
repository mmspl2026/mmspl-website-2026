import type { Metadata } from "next";
import { sanityFetch } from "@/lib/sanity/client";
import { allSeasonsQuery, gamesBySeasonQuery, adminSettingsQuery } from "@/lib/sanity/queries";
import type { AdminSettings, Game, Season } from "@/lib/types";
import { SEED_GAMES } from "@/lib/seed-data";
import ScheduleList from "@/components/ScheduleList";
import SeasonSelector from "@/components/SeasonSelector";
import Hero from "@/components/Hero";

export const metadata: Metadata = { title: "Schedule" };

const CURRENT_YEAR = new Date().getFullYear();

export default async function SchedulePage({
  searchParams,
}: {
  searchParams: { season?: string };
}) {
  const [seasons, settings] = await Promise.all([
    sanityFetch<Season[]>(allSeasonsQuery, {}, []),
    sanityFetch<AdminSettings | null>(adminSettingsQuery, {}, null),
  ]);
  const years = seasons.length > 0 ? seasons.map((s) => s.year) : [CURRENT_YEAR];
  const selectedYear = searchParams.season ? Number(searchParams.season) : years[0];

  const games = await sanityFetch<Game[]>(gamesBySeasonQuery, { year: selectedYear }, []);
  const displayGames = games.length > 0 ? games : SEED_GAMES;

  return (
    <div>
      <Hero
        heroImage={settings?.scheduleHeroImage || settings?.heroImage}
        title="Schedule"
        subtitle="Games at Centennial Park and Mintleaf Park."
      />

      <div className="container-page py-16">
        <div className="flex justify-end">
          <SeasonSelector years={years} selected={selectedYear} />
        </div>

        <div className="mt-8">
          <ScheduleList games={displayGames} />
        </div>
      </div>
    </div>
  );
}

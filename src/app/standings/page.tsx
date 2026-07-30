import type { Metadata } from "next";
import { sanityFetch } from "@/lib/sanity/client";
import { allSeasonsQuery, standingsBySeasonQuery, adminSettingsQuery } from "@/lib/sanity/queries";
import type { AdminSettings, Season, Standing } from "@/lib/types";
import { SEED_STANDINGS } from "@/lib/seed-data";
import StandingsTable from "@/components/StandingsTable";
import SeasonSelector from "@/components/SeasonSelector";
import Hero from "@/components/Hero";

export const metadata: Metadata = { title: "Standings" };

const CURRENT_YEAR = new Date().getFullYear();

export default async function StandingsPage({
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
  const selectedSeason = seasons.find((s) => s.year === selectedYear);
  const playoffCutoff = selectedSeason?.playoffCutoff ?? 8;

  const standings = await sanityFetch<Standing[]>(
    standingsBySeasonQuery,
    { year: selectedYear },
    []
  );
  const displayStandings = standings.length > 0 ? standings : SEED_STANDINGS;

  return (
    <div>
      <Hero
        heroImage={settings?.standingsHeroImage || settings?.heroImage}
        title="Standings"
        subtitle="Sorted by points (2 per win, 1 per tie)."
      />

      <div className="container-page py-16">
        <div className="flex justify-end">
          <SeasonSelector years={years} selected={selectedYear} />
        </div>

        <div className="mt-8">
          <StandingsTable standings={displayStandings} playoffCutoff={playoffCutoff} />
        </div>
      </div>
    </div>
  );
}

import type { Metadata } from "next";
import { sanityFetch } from "@/lib/sanity/client";
import { allAwardYearsQuery, awardsByYearQuery, adminSettingsQuery } from "@/lib/sanity/queries";
import type { AdminSettings, Award } from "@/lib/types";
import { SEED_AWARDS, SEED_AWARD_YEARS } from "@/lib/seed-data";
import AwardCard from "@/components/AwardCard";
import YearPicker from "@/components/YearPicker";
import Hero from "@/components/Hero";

export const metadata: Metadata = { title: "Awards" };

export default async function AwardsPage({
  searchParams,
}: {
  searchParams: { year?: string };
}) {
  const [years, settings] = await Promise.all([
    sanityFetch<number[]>(allAwardYearsQuery, {}, []),
    sanityFetch<AdminSettings | null>(adminSettingsQuery, {}, null),
  ]);
  const displayYears = years.length > 0 ? years : SEED_AWARD_YEARS;
  const selectedYear = searchParams.year ? Number(searchParams.year) : displayYears[0];

  const awards = await sanityFetch<Award[]>(awardsByYearQuery, { year: selectedYear }, []);
  const displayAwards =
    awards.length > 0 ? awards : SEED_AWARDS.filter((a) => a.year === selectedYear);

  return (
    <div>
      <Hero
        heroImage={settings?.awardsHeroImage || settings?.heroImage}
        title="Awards"
        subtitle="Celebrating the players and teams who stood out each season, presented at the Awards Banquet."
      />

      <div className="container-page py-16">
        <YearPicker years={displayYears} selected={selectedYear} />

        {displayAwards.length === 0 ? (
          <p className="mt-10 text-black/60">No awards recorded for {selectedYear} yet.</p>
        ) : (
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {displayAwards.map((award) => (
              <AwardCard key={award._id} award={award} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

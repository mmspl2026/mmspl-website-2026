import type { Metadata } from "next";
import Link from "next/link";
import { Trophy } from "lucide-react";
import { sanityFetch } from "@/lib/sanity/client";
import { allSeasonsQuery, standingsBySeasonQuery, adminSettingsQuery } from "@/lib/sanity/queries";
import type { AdminSettings, Season, Standing } from "@/lib/types";
import { SEED_STANDINGS } from "@/lib/seed-data";
import { urlFor } from "@/lib/sanity/image";
import StandingsTable from "@/components/StandingsTable";
import SeasonSelector from "@/components/SeasonSelector";

export const metadata: Metadata = { title: "Standings" };

const CURRENT_YEAR = new Date().getFullYear();

const TIE_BREAKING_RULES = [
  "Accumulated points during the regular season",
  "Head to head win/loss record",
  "Most total wins",
  "Best +/− in head-to-head games",
  "Most runs for in head-to-head games",
  "Best +/− in regular season games",
  "Coin toss",
];

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

  const heroImage = settings?.standingsHeroImage || settings?.heroImage;
  const heroImageUrl = heroImage ? urlFor(heroImage).width(1920).height(1080).fit("crop").url() : "/hero.jpg";

  const selectedYear = searchParams.season ? Number(searchParams.season) : years[0];

  const standings = await sanityFetch<Standing[]>(
    standingsBySeasonQuery,
    { year: selectedYear },
    []
  );
  const displayStandings = standings.length > 0 ? standings : SEED_STANDINGS;

  return (
    <div className="min-h-screen bg-gray-50">
      <div
        className="relative h-[260px] overflow-hidden"
        style={{
          backgroundImage: `linear-gradient(rgba(10,10,12,0.65), rgba(10,10,12,0.25) 35%, rgba(10,10,12,0.85) 80%), url(${heroImageUrl})`,
          backgroundSize: "cover",
          backgroundPosition: "center bottom",
          backgroundRepeat: "no-repeat",
        }}
      >
        <div className="absolute left-0 top-0 px-5 pt-5">
          <p className="text-[10px] uppercase tracking-[0.14em] text-white/45">
            <Link href="/" className="no-underline hover:underline">
              Home
            </Link>{" "}
            / Standings
          </p>
        </div>
        <div className="absolute bottom-0 left-0 px-5 pb-7">
          <h1 className="font-heading uppercase leading-none tracking-[0.01em] text-white text-[clamp(2rem,5vw,3.2rem)]">
            League Standings
          </h1>
          <p className="mt-1.5 text-base text-white/70">
            Historical Regular Season Standings &mdash; 2005 to present
          </p>
        </div>
      </div>

      <div className="container-page py-10">
        <h2 className="font-sans text-2xl font-bold normal-case tracking-normal text-black">Select Season</h2>
        <Link href="/schedule" className="mt-1 inline-block text-sm font-semibold text-brand hover:underline">
          View Schedule &amp; Scores &rarr;
        </Link>

        <div className="mt-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Trophy size={16} className="shrink-0 text-yellow-500" aria-hidden="true" />
            <span>Regular Season Champion</span>
          </div>
          <SeasonSelector years={years} selected={selectedYear} />
        </div>

        <div className="mt-6">
          <StandingsTable standings={displayStandings} year={selectedYear} />
        </div>

        <div className="rounded-xl border bg-white text-black shadow">
          <div className="flex flex-col space-y-1.5 p-6">
            <div className="font-semibold leading-none tracking-tight">Tie-Breaking Rules</div>
          </div>
          <div className="p-6 pt-0">
            <p className="mb-3 text-sm text-gray-700">
              In the event of a tie, final rankings are determined by:
            </p>
            <ol className="list-inside list-decimal space-y-1 text-sm text-gray-700">
              {TIE_BREAKING_RULES.map((rule) => (
                <li key={rule}>{rule}</li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}

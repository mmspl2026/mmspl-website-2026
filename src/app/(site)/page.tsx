import Link from "next/link";
import { sanityFetch } from "@/lib/sanity/client";
import {
  adminSettingsQuery,
  upcomingGamesQuery,
  recentNewsQuery,
  seasonImportantDatesQuery,
  activeSeasonQuery,
  standingsBySeasonQuery,
  tournamentResultQuery,
} from "@/lib/sanity/queries";
import type { AdminSettings, Game, ImportantDate, NewsItem, Season, Standing, TournamentResult } from "@/lib/types";
import { SEED_GAMES, SEED_NEWS, SEED_STANDINGS } from "@/lib/seed-data";
import { IMPORTANT_DATES_2026 } from "@/lib/seed-content";
import HomeHero from "@/components/HomeHero";
import StatsSection from "@/components/StatsSection";
import NewsCard from "@/components/NewsCard";
import UpcomingDates from "@/components/UpcomingDates";
import BallparksSection from "@/components/BallparksSection";
import SponsorCTA from "@/components/SponsorCTA";
import StandingsTable from "@/components/StandingsTable";
import ChampionsSection from "@/components/ChampionsSection";

const SEED_DATES: ImportantDate[] = IMPORTANT_DATES_2026.map((d, i) => ({
  _id: `seed-date-${i}`,
  ...d,
}));

export default async function HomePage() {
  const today = new Date().toISOString().slice(0, 10);
  const currentYear = new Date().getFullYear();

  const [settings, games, news, activeSeason] = await Promise.all([
    sanityFetch<AdminSettings | null>(adminSettingsQuery, {}, null),
    sanityFetch<Game[]>(upcomingGamesQuery, { today }, []),
    sanityFetch<NewsItem[]>(recentNewsQuery, {}, []),
    sanityFetch<Season | null>(activeSeasonQuery, {}, null),
  ]);

  const standingsYear = activeSeason?.year ?? currentYear;
  const seasonStart = `${standingsYear}-05-01`;
  const [standings, dates, charityResult, mcgregorResult] = await Promise.all([
    sanityFetch<Standing[]>(standingsBySeasonQuery, { year: standingsYear }, []),
    sanityFetch<ImportantDate[]>(seasonImportantDatesQuery, { seasonStart }, []),
    sanityFetch<TournamentResult | null>(tournamentResultQuery, { year: standingsYear, type: "charity" }, null),
    sanityFetch<TournamentResult | null>(tournamentResultQuery, { year: standingsYear, type: "mcgregor" }, null),
  ]);

  const displayGames = games.length > 0 ? games : SEED_GAMES;
  const displayNews = (news.length > 0 ? news : SEED_NEWS).slice(0, 3);
  const displayDates = dates.length > 0 ? dates : SEED_DATES;
  const displayStandings = (standings.length > 0 ? standings : SEED_STANDINGS).slice(0, 5);

  const seasonComplete = Boolean(activeSeason?.regularSeasonEnd && today > activeSeason.regularSeasonEnd);
  const regularSeasonChampion = seasonComplete && standings.length > 0 ? standings[0].team.name : null;

  return (
    <>
      <HomeHero heroImage={settings?.heroImage} games={displayGames} today={today} />

      <section aria-labelledby="news-heading" className="bg-white py-8 md:py-10">
        <div className="container-page">
          <div className="flex items-baseline justify-between">
            <h2 id="news-heading" className="text-3xl sm:text-4xl">
              Latest News
            </h2>
            <Link href="/news" className="text-sm font-semibold text-brand hover:underline">
              View all news &rarr;
            </Link>
          </div>
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {displayNews.map((item) => (
              <NewsCard key={item._id} item={item} />
            ))}
          </div>
        </div>
      </section>

      <UpcomingDates dates={displayDates} />

      <StatsSection />

      <ChampionsSection
        year={standingsYear}
        charity={charityResult}
        mcgregor={mcgregorResult}
        regularSeasonChampion={regularSeasonChampion}
      />

      <section aria-labelledby="standings-heading" className="bg-white py-8 md:py-10">
        <div className="container-page">
          <div className="flex items-baseline justify-between">
            <h2 id="standings-heading" className="text-3xl sm:text-4xl">
              Standings <span className="text-black/40">(Top 5)</span>
            </h2>
            <Link href="/standings" className="text-sm font-semibold text-brand hover:underline">
              Full standings &rarr;
            </Link>
          </div>
          <p className="mt-1 text-sm italic text-black/50">The quest for the President&apos;s trophy</p>
          <div className="mt-8">
            <StandingsTable standings={displayStandings} year={standingsYear} alwaysFullName />
          </div>
        </div>
      </section>

      <BallparksSection />

      <SponsorCTA text={settings?.sponsorText} />
    </>
  );
}

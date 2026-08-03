import Link from "next/link";
import { sanityFetch } from "@/lib/sanity/client";
import {
  adminSettingsQuery,
  upcomingGamesQuery,
  recentNewsQuery,
  upcomingImportantDatesQuery,
  activeSeasonQuery,
  standingsBySeasonQuery,
} from "@/lib/sanity/queries";
import type { AdminSettings, Game, ImportantDate, NewsItem, Season, Standing } from "@/lib/types";
import { SEED_GAMES, SEED_NEWS, SEED_STANDINGS } from "@/lib/seed-data";
import { IMPORTANT_DATES_2026 } from "@/lib/seed-content";
import HomeHero from "@/components/HomeHero";
import StatsSection from "@/components/StatsSection";
import NewsCard from "@/components/NewsCard";
import ChampionsSection from "@/components/ChampionsSection";
import UpcomingDates from "@/components/UpcomingDates";
import BallparksSection from "@/components/BallparksSection";
import SponsorCTA from "@/components/SponsorCTA";
import SocialLinks from "@/components/SocialLinks";
import StandingsTable from "@/components/StandingsTable";

const SEED_DATES: ImportantDate[] = IMPORTANT_DATES_2026.map((d, i) => ({
  _id: `seed-date-${i}`,
  ...d,
}));

export default async function HomePage() {
  const today = new Date().toISOString().slice(0, 10);
  const currentYear = new Date().getFullYear();

  const [settings, games, news, dates, activeSeason] = await Promise.all([
    sanityFetch<AdminSettings | null>(adminSettingsQuery, {}, null),
    sanityFetch<Game[]>(upcomingGamesQuery, { today }, []),
    sanityFetch<NewsItem[]>(recentNewsQuery, {}, []),
    sanityFetch<ImportantDate[]>(upcomingImportantDatesQuery, { today }, []),
    sanityFetch<Season | null>(activeSeasonQuery, {}, null),
  ]);

  const standingsYear = activeSeason?.year ?? currentYear;
  const standings = await sanityFetch<Standing[]>(standingsBySeasonQuery, { year: standingsYear }, []);

  const displayGames = games.length > 0 ? games : SEED_GAMES;
  const displayNews = news.length > 0 ? news : SEED_NEWS;
  const displayDates = dates.length > 0 ? dates.slice(0, 6) : SEED_DATES.slice(0, 6);
  const displayStandings = (standings.length > 0 ? standings : SEED_STANDINGS).slice(0, 5);

  return (
    <>
      <HomeHero heroImage={settings?.heroImage} games={displayGames} today={today} />

      <section aria-labelledby="news-heading" className="bg-white py-16">
        <div className="container-page">
          <div className="flex items-baseline justify-between">
            <h2 id="news-heading" className="text-3xl sm:text-4xl">
              Latest News
            </h2>
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

      <section aria-labelledby="standings-heading" className="bg-white py-16">
        <div className="container-page">
          <div className="flex items-baseline justify-between">
            <h2 id="standings-heading" className="text-3xl sm:text-4xl">
              Standings
            </h2>
            <Link href="/standings" className="text-sm font-semibold text-brand hover:underline">
              Full standings &rarr;
            </Link>
          </div>
          <div className="mt-8">
            <StandingsTable standings={displayStandings} year={standingsYear} />
          </div>
        </div>
      </section>

      <SponsorCTA text={settings?.sponsorText} />

      <ChampionsSection />

      <BallparksSection />

      <section aria-labelledby="social-heading" className="bg-white py-12">
        <div className="container-page flex flex-col items-center gap-4 text-center">
          <h2 id="social-heading" className="text-2xl sm:text-3xl">
            Follow the League
          </h2>
          <SocialLinks iconClassName="bg-black/5 text-black hover:bg-brand hover:text-white" />
        </div>
      </section>
    </>
  );
}

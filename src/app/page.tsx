import { sanityFetch } from "@/lib/sanity/client";
import {
  adminSettingsQuery,
  upcomingGamesQuery,
  recentNewsQuery,
  upcomingImportantDatesQuery,
} from "@/lib/sanity/queries";
import type { AdminSettings, Game, ImportantDate, NewsItem } from "@/lib/types";
import { SEED_GAMES, SEED_NEWS } from "@/lib/seed-data";
import { IMPORTANT_DATES_2026 } from "@/lib/seed-content";
import HomeHero from "@/components/HomeHero";
import StatsSection from "@/components/StatsSection";
import NewsCard from "@/components/NewsCard";
import ChampionsSection from "@/components/ChampionsSection";
import UpcomingDates from "@/components/UpcomingDates";
import BallparksSection from "@/components/BallparksSection";
import SponsorCTA from "@/components/SponsorCTA";
import SocialLinks from "@/components/SocialLinks";

const SEED_DATES: ImportantDate[] = IMPORTANT_DATES_2026.map((d, i) => ({
  _id: `seed-date-${i}`,
  ...d,
}));

export default async function HomePage() {
  const today = new Date().toISOString().slice(0, 10);

  const [settings, games, news, dates] = await Promise.all([
    sanityFetch<AdminSettings | null>(adminSettingsQuery, {}, null),
    sanityFetch<Game[]>(upcomingGamesQuery, { today }, []),
    sanityFetch<NewsItem[]>(recentNewsQuery, {}, []),
    sanityFetch<ImportantDate[]>(upcomingImportantDatesQuery, { today }, []),
  ]);

  const displayGames = games.length > 0 ? games : SEED_GAMES;
  const displayNews = news.length > 0 ? news : SEED_NEWS;
  const displayDates = dates.length > 0 ? dates.slice(0, 6) : SEED_DATES.slice(0, 6);

  return (
    <>
      <HomeHero heroImage={settings?.heroImage} games={displayGames} today={today} />

      <StatsSection />

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

      <ChampionsSection />

      <UpcomingDates dates={displayDates} />

      <BallparksSection />

      <section aria-labelledby="social-heading" className="bg-white py-12">
        <div className="container-page flex flex-col items-center gap-4 text-center">
          <h2 id="social-heading" className="text-2xl sm:text-3xl">
            Follow the League
          </h2>
          <SocialLinks iconClassName="bg-black/5 text-black hover:bg-brand hover:text-white" />
        </div>
      </section>

      <SponsorCTA text={settings?.sponsorText} />
    </>
  );
}

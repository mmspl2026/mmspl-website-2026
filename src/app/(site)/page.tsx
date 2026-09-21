import Link from "next/link";
import { getTodayEastern, getDateDaysAgoEastern } from "@/utils/timezone";
import { sanityFetch } from "@/lib/sanity/client";
import {
  adminSettingsQuery,
  upcomingGamesQuery,
  recentNewsQuery,
  seasonImportantDatesQuery,
  activeSeasonQuery,
  standingsBySeasonQuery,
  gamesBySeasonQuery,
  tournamentResultQuery,
} from "@/lib/sanity/queries";
import type { AdminSettings, Game, ImportantDate, NewsItem, Season, Standing, TournamentResult, TournamentType } from "@/lib/types";
import { SEED_NEWS } from "@/lib/seed-data";
import { IMPORTANT_DATES_2026 } from "@/lib/seed-content";
import { TOURNAMENT_LABELS, formatShortDateRange } from "@/lib/tournamentDisplay";
import { computeSeasonRanking } from "@/lib/seasonRanking";
import { addDays } from "@/lib/projectedSchedule";
import type { SpecialRailCardData } from "@/components/TournamentRailCard";
import HomeHero from "@/components/HomeHero";
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
  const today = getTodayEastern();
  const currentYear = Number(today.slice(0, 4));

  const [settings, games, news, activeSeason] = await Promise.all([
    sanityFetch<AdminSettings | null>(adminSettingsQuery, {}, null),
    sanityFetch<Game[]>(upcomingGamesQuery, { from: getDateDaysAgoEastern(7) }, []),
    sanityFetch<NewsItem[]>(recentNewsQuery, {}, []),
    sanityFetch<Season | null>(activeSeasonQuery, {}, null),
  ]);

  const standingsYear = activeSeason?.year ?? currentYear;
  const seasonStart = `${standingsYear}-05-01`;
  // Real game-log tiebreaks only apply 2026+ — see the matching comment on
  // the /standings page for why older seasons keep the simple order.
  const useRealTiebreaks = standingsYear >= 2026;
  const [standings, seasonGames, dates, charityResult, mcgregorResult] = await Promise.all([
    sanityFetch<Standing[]>(standingsBySeasonQuery, { year: standingsYear }, []),
    useRealTiebreaks ? sanityFetch<Game[]>(gamesBySeasonQuery, { year: standingsYear }, []) : Promise.resolve([]),
    sanityFetch<ImportantDate[]>(seasonImportantDatesQuery, { seasonStart }, []),
    sanityFetch<TournamentResult | null>(tournamentResultQuery, { year: standingsYear, type: "charity" }, null),
    sanityFetch<TournamentResult | null>(tournamentResultQuery, { year: standingsYear, type: "mcgregor" }, null),
  ]);

  // Same tie-break procedure as the full /standings page, so "1st place"
  // never disagrees between the two pages.
  const rankedStandings = useRealTiebreaks ? computeSeasonRanking(standings, seasonGames).map((r) => r.standing) : standings;

  const displayNews = (news.length > 0 ? news : SEED_NEWS).slice(0, 3);
  const displayDates = dates.length > 0 ? dates : SEED_DATES;
  const displayStandings = rankedStandings.slice(0, 5);

  const seasonComplete = Boolean(activeSeason?.regularSeasonEnd && today > activeSeason.regularSeasonEnd);
  const regularSeasonChampion = seasonComplete && rankedStandings.length > 0 ? rankedStandings[0].team.name : null;

  // Whichever tournament hasn't finished yet (upcoming or currently in
  // progress) gets a banner in the hero — automatically appears/disappears
  // around its planned dates with no manual toggling needed each year.
  function isUpcomingOrLive(result: TournamentResult | null): result is TournamentResult {
    if (!result || result.cancelled || !result.plannedStart) return false;
    return today <= (result.plannedEnd || result.plannedStart);
  }
  // True once the McGregor tournament's real dates are behind us — this is
  // the year-end event, so once it's done the season itself is done. Kept
  // true for the rest of the year so the homepage can keep telling readers
  // the season has ended, instead of the rail/banner just going blank the
  // day after the tournament — this stays up until next year's season
  // becomes active (mcgregorResult then resolves to null for that year).
  function hasConcluded(result: TournamentResult | null): result is TournamentResult {
    if (!result || result.cancelled || !result.plannedStart) return false;
    return today > (result.plannedEnd || result.plannedStart);
  }
  const activeTournament: { type: TournamentType; result: TournamentResult } | null = isUpcomingOrLive(mcgregorResult)
    ? { type: "mcgregor", result: mcgregorResult }
    : isUpcomingOrLive(charityResult)
      ? { type: "charity", result: charityResult }
      : null;
  const mcgregorConcluded = hasConcluded(mcgregorResult);
  const tournamentBanner = activeTournament
    ? {
        label: TOURNAMENT_LABELS[activeTournament.type].full,
        compactLabel: TOURNAMENT_LABELS[activeTournament.type].compact,
        dateRange: formatShortDateRange([
          activeTournament.result.plannedStart!,
          activeTournament.result.plannedEnd || activeTournament.result.plannedStart!,
        ]),
        href: `/schedule/tournament/${standingsYear}/${activeTournament.type}`,
      }
    : mcgregorConcluded
      ? {
          label: mcgregorResult.champion
            ? `${standingsYear} ${TOURNAMENT_LABELS.mcgregor.full} Champions`
            : `${standingsYear} Season Complete`,
          compactLabel: `${standingsYear} Champions:`,
          dateRange: mcgregorResult.champion || "See full results",
          href: `/schedule/tournament/${standingsYear}/mcgregor`,
        }
      : null;

  // Thu-Sat round robin + Championship Sunday, appended to the game rail
  // while the McGregor tournament is upcoming or in progress — derived from
  // its planned dates, so this needs no manual upkeep and disappears on its
  // own once the tournament's done. Once it's over, those day-specific
  // cards stop being useful, so they're replaced by a single persistent
  // "season complete" card that stays in the rail through the rest of the
  // year, until next season's tournament data replaces this one.
  const mcgregorRailCards: SpecialRailCardData[] =
    isUpcomingOrLive(mcgregorResult) && mcgregorResult.plannedStart
      ? (() => {
          const [thu, fri, sat, sun] = [0, 1, 2, 3].map((n) => addDays(mcgregorResult.plannedStart as string, n));
          const href = `/schedule/tournament/${standingsYear}/mcgregor`;
          return [
            { date: thu, label: "Round Robin", sublabel: "Tournament", href, icon: "trophy" as const },
            { date: fri, label: "Round Robin", sublabel: "Tournament", href, icon: "trophy" as const },
            { date: sat, label: "Round Robin", sublabel: "Tournament", href, icon: "trophy" as const },
            { date: sun, label: "Championship Sunday", sublabel: "Tournament", href, icon: "trophy" as const },
          ];
        })()
      : mcgregorConcluded
        ? [
            {
              date: today,
              label: `End of ${standingsYear} Season`,
              sublabel: mcgregorResult.champion ? `Champions: ${mcgregorResult.champion}` : "Tournament complete",
              href: `/schedule/tournament/${standingsYear}/mcgregor`,
              icon: "flag" as const,
              hideDate: true,
            },
          ]
        : [];

  return (
    <>
      <HomeHero
        heroImage={settings?.heroImage}
        games={games}
        today={today}
        tournamentBanner={tournamentBanner}
        specialCards={mcgregorRailCards}
      />

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
            <StandingsTable standings={displayStandings} year={standingsYear} seasonComplete={seasonComplete} />
          </div>
        </div>
      </section>

      <ChampionsSection
        year={standingsYear}
        charity={charityResult}
        mcgregor={mcgregorResult}
        regularSeasonChampion={regularSeasonChampion}
      />

      <BallparksSection />

      <SponsorCTA text={settings?.sponsorText} />
    </>
  );
}

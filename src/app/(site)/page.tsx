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
  newsBySlugQuery,
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
import NextSeasonCTA from "@/components/NextSeasonCTA";

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
  // Convention: each season's recap news post uses the slug `<year>-season-recap`
  // -- checked here (rather than hardcoding the link) so the hero's "Recap"
  // button only points at it once it actually exists, falling back to the
  // Champions section otherwise. No code change needed next year as long as
  // the recap post follows the same slug pattern.
  const recapSlug = `${standingsYear}-season-recap`;
  const [standings, seasonGames, dates, charityResult, mcgregorResult, recapArticle] = await Promise.all([
    sanityFetch<Standing[]>(standingsBySeasonQuery, { year: standingsYear }, []),
    useRealTiebreaks ? sanityFetch<Game[]>(gamesBySeasonQuery, { year: standingsYear }, []) : Promise.resolve([]),
    sanityFetch<ImportantDate[]>(seasonImportantDatesQuery, { seasonStart }, []),
    sanityFetch<TournamentResult | null>(tournamentResultQuery, { year: standingsYear, type: "charity" }, null),
    sanityFetch<TournamentResult | null>(tournamentResultQuery, { year: standingsYear, type: "mcgregor" }, null),
    sanityFetch<NewsItem | null>(newsBySlugQuery, { slug: recapSlug }, null),
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
  // Once the rail has nothing to show, keep it visible (with GameRail's
  // plain placeholder text) for a few weeks after the season actually
  // ends, rather than disappearing the moment the last game drops out of
  // the 7-day lookback window -- only fully hide the empty rail once 21
  // days have passed since the tournament's planned end. No year-specific
  // upkeep: driven off mcgregorResult.plannedEnd, same as mcgregorConcluded.
  const SEASON_END_RAIL_GRACE_DAYS = 21;
  const emptyRailHiddenAfter = mcgregorResult?.plannedEnd
    ? addDays(mcgregorResult.plannedEnd, SEASON_END_RAIL_GRACE_DAYS)
    : null;
  const suppressEmptyRail = Boolean(emptyRailHiddenAfter && today > emptyRailHiddenAfter);
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
          label: `${standingsYear} ${TOURNAMENT_LABELS.mcgregor.full} Results`,
          compactLabel: `${standingsYear} ${TOURNAMENT_LABELS.mcgregor.short} Results`,
          dateRange: "",
          href: `/schedule/tournament/${standingsYear}/mcgregor`,
        }
      : null;

  // Thu-Sat round robin + Championship Sunday, appended to the game rail
  // while the McGregor tournament is upcoming or in progress — derived from
  // its planned dates, so this needs no manual upkeep and disappears on its
  // own once the tournament's done. Once it's over, these day-specific
  // cards stop being useful and the rail goes back to empty — the hero's
  // "<year> Recap" button (see HomeHero) already covers the season-complete
  // messaging and champions link, so no separate rail card duplicates it.
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
      : [];

  return (
    <>
      <HomeHero
        heroImage={settings?.heroImage}
        games={games}
        today={today}
        tournamentBanner={tournamentBanner}
        specialCards={mcgregorRailCards}
        year={standingsYear}
        seasonComplete={mcgregorConcluded}
        suppressEmptyRail={suppressEmptyRail}
        recapHref={recapArticle ? `/news/${recapSlug}` : "/#champions-heading"}
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

      {/* Off-season registration teaser — gated on the same registrationOpen
          admin flag the /register page itself uses, so this disappears on
          its own the moment registration opens for next season, with no
          code change needed. */}
      {!(settings?.registrationOpen ?? true) && <NextSeasonCTA year={standingsYear + 1} />}

      <BallparksSection />

      <SponsorCTA text={settings?.sponsorText} />
    </>
  );
}

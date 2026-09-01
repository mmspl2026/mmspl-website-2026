import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarOff } from "lucide-react";
import { sanityFetch } from "@/lib/sanity/client";
import {
  adminSettingsQuery,
  tournamentResultQuery,
  tournamentPoolsQuery,
  tournamentGamesQuery,
  wildCardRankingsQuery,
  standingsBySeasonQuery,
  awardTrophyPhotoByCategoryQuery,
} from "@/lib/sanity/queries";
import type {
  AdminSettings,
  TournamentResult,
  TournamentPool,
  TournamentGame,
  WildCardRanking,
  TournamentType,
  Standing,
  AwardTrophyPhoto,
} from "@/lib/types";
import { urlFor } from "@/lib/sanity/image";
import { TOURNAMENT_LABELS, TOURNAMENT_TROPHY_AWARD_CATEGORY, formatDateRange } from "@/lib/tournamentDisplay";
import { computeProjectedBoxes } from "@/lib/tournamentSeeding";
import { computeProjectedSchedule } from "@/lib/projectedSchedule";
import TournamentChampionsBanner from "@/components/TournamentChampionsBanner";
import TournamentBracketView from "@/components/TournamentBracketView";
import { WildCardRankingsTable } from "@/components/TournamentDayTabs";

function isTournamentType(value: string): value is TournamentType {
  return value === "charity" || value === "mcgregor";
}

// Illustrative only — shows the shape of the real Wild Card Rankings table
// before any round-robin games exist to rank. The 10 rows mirror McGregor's
// actual field: each box's #1 seed becomes its Division Winner and skips
// this table entirely, leaving 2 from Box A, 2 from B, 3 from C, 3 from D to
// compete for the 8 Wild Card spots. A few rows include ties (2 pts win, 1
// pt tie, round robin games Thu-Sat can end level) to show how the points
// column — not just win count — ends up doing the ranking.
const WC_RANK_EXAMPLE: WildCardRanking[] = [
  { _id: "ex-1", year: 0, type: "mcgregor", rank: 1, teamName: "Team B2", pool: "B", points: 8, wins: 4, losses: 0, ties: 0, runDifferential: 19, advanced: true },
  { _id: "ex-2", year: 0, type: "mcgregor", rank: 2, teamName: "Team C2", pool: "C", points: 7, wins: 3, losses: 0, ties: 1, runDifferential: 15, advanced: true },
  { _id: "ex-3", year: 0, type: "mcgregor", rank: 3, teamName: "Team A2", pool: "A", points: 6, wins: 3, losses: 1, ties: 0, runDifferential: 12, advanced: true },
  { _id: "ex-4", year: 0, type: "mcgregor", rank: 4, teamName: "Team D2", pool: "D", points: 5, wins: 2, losses: 1, ties: 1, runDifferential: 9, advanced: true },
  { _id: "ex-5", year: 0, type: "mcgregor", rank: 5, teamName: "Team C3", pool: "C", points: 4, wins: 2, losses: 2, ties: 0, runDifferential: 6, advanced: true },
  { _id: "ex-6", year: 0, type: "mcgregor", rank: 6, teamName: "Team D3", pool: "D", points: 4, wins: 1, losses: 1, ties: 2, runDifferential: 2, advanced: true },
  { _id: "ex-7", year: 0, type: "mcgregor", rank: 7, teamName: "Team A3", pool: "A", points: 4, wins: 2, losses: 2, ties: 0, runDifferential: -3, advanced: true },
  { _id: "ex-8", year: 0, type: "mcgregor", rank: 8, teamName: "Team B3", pool: "B", points: 3, wins: 1, losses: 2, ties: 1, runDifferential: -7, advanced: true },
  { _id: "ex-9", year: 0, type: "mcgregor", rank: 9, teamName: "Team C4", pool: "C", points: 2, wins: 1, losses: 3, ties: 0, runDifferential: -14, advanced: false },
  { _id: "ex-10", year: 0, type: "mcgregor", rank: 10, teamName: "Team D4", pool: "D", points: 1, wins: 0, losses: 3, ties: 1, runDifferential: -19, advanced: false },
];

export async function generateMetadata({ params }: { params: { year: string; type: string } }): Promise<Metadata> {
  if (!isTournamentType(params.type)) return { title: "Tournament" };
  return { title: `${params.year} ${TOURNAMENT_LABELS[params.type].short}` };
}

export default async function TournamentDetailPage({ params }: { params: { year: string; type: string } }) {
  if (!isTournamentType(params.type)) notFound();
  const type = params.type;

  const year = Number(params.year);
  if (!Number.isInteger(year)) notFound();

  const [result, pools, games, wcRankings, settings, standings, trophyPhoto] = await Promise.all([
    sanityFetch<TournamentResult | null>(tournamentResultQuery, { year, type }, null),
    sanityFetch<TournamentPool[]>(tournamentPoolsQuery, { year, type }, []),
    sanityFetch<TournamentGame[]>(tournamentGamesQuery, { year, type }, []),
    sanityFetch<WildCardRanking[]>(wildCardRankingsQuery, { year, type }, []),
    sanityFetch<AdminSettings | null>(adminSettingsQuery, {}, null),
    sanityFetch<Standing[]>(standingsBySeasonQuery, { year }, []),
    sanityFetch<AwardTrophyPhoto | null>(
      awardTrophyPhotoByCategoryQuery,
      { category: TOURNAMENT_TROPHY_AWARD_CATEGORY[type] },
      null
    ),
  ]);

  if (!result) notFound();

  const label = TOURNAMENT_LABELS[type];
  const heroImage = settings?.scheduleHeroImage || settings?.heroImage;
  const heroImageUrl = heroImage ? urlFor(heroImage).width(1920).height(1080).fit("crop").url() : "/hero.jpg";
  // Before any real games are entered, fall back to the tournament's planned
  // dates so the hero doesn't just show the bare year.
  const dateRange =
    games.length > 0
      ? formatDateRange(games.map((g) => g.date), year)
      : formatDateRange(result.plannedStart ? [result.plannedStart, result.plannedEnd || result.plannedStart] : [], year);
  const isCurrentSeason = year === new Date().getFullYear();
  // Before the real boxes are set (no pools entered yet) for the tournament
  // that's about to happen this season, show a live "if the season ended
  // today" projection instead of a plain "not available" message.
  const projectedBoxes =
    !result.hasDetailedResults && isCurrentSeason && pools.length === 0 ? computeProjectedBoxes(standings) : null;
  // The Thu-Sat slot template is specific to the McGregor tournament's
  // format (Charity uses a different pool layout entirely), and needs a
  // planned start date to anchor the three real calendar dates to.
  const trophyPhotoUrl = trophyPhoto ? urlFor(trophyPhoto.photo).width(300).fit("max").url() : undefined;
  const projectedGames =
    projectedBoxes && type === "mcgregor" && result.plannedStart
      ? computeProjectedSchedule(projectedBoxes, year, type, result.plannedStart)
      : null;

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
            /{" "}
            <Link href="/schedule/tournament" className="no-underline hover:underline">
              Tournaments
            </Link>{" "}
            / {year} {label.short}
          </p>
        </div>
        <div className="absolute bottom-0 left-0 px-5 pb-7">
          <h1 className="font-heading uppercase leading-none tracking-[0.01em] text-white text-[clamp(1.6rem,4.5vw,3.2rem)]">
            {year} {label.full}
          </h1>
          <p className="mt-1.5 text-base text-white/70">{dateRange}</p>
        </div>
      </div>

      <div className="container-page space-y-8 py-10">
        <TournamentChampionsBanner result={result} />

        {result.cancelled ? (
          <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-gray-300 bg-gray-50 px-5 py-10 text-center">
            <CalendarOff size={28} className="text-gray-400" aria-hidden="true" />
            <p className="text-base font-semibold text-black">{year} {label.short} Not Held</p>
            <p className="max-w-md text-sm text-gray-500">
              {result.notes || "This tournament was not held."}
            </p>
          </div>
        ) : result.hasDetailedResults ? (
          <TournamentBracketView pools={pools} games={games} wcRankings={wcRankings} interactive={isCurrentSeason} />
        ) : projectedBoxes ? (
          <TournamentBracketView
            projectedBoxes={projectedBoxes}
            includesProjectedSchedule={Boolean(projectedGames)}
            trophyPhotoUrl={trophyPhotoUrl}
            trophyAlt={trophyPhoto?.photo.alt}
            games={projectedGames ?? []}
            wcRankings={[]}
            interactive
            rankingsPlaceholder={
              projectedGames && (
                <div className="space-y-4">
                  <div className="rounded-lg border border-gray-200 bg-gray-50 px-5 py-6 text-sm text-gray-700">
                    <p className="font-semibold text-black">Wild Card rankings aren&apos;t available yet.</p>
                    <p className="mt-2">
                      Once Thursday through Saturday&apos;s round-robin games are complete, the 4 division (box) winners
                      advance straight to the Quarter Finals. The other 10 teams are ranked by round-robin record, then
                      run differential &mdash; only the <strong>top 8</strong> of those advance to Sunday&apos;s Wild
                      Card round, seeded 1&ndash;8. This tab will show that ranking as real scores come in.
                    </p>
                  </div>
                  <div>
                    <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
                      Example &mdash; illustrative teams only
                    </p>
                    <WildCardRankingsTable rankings={WC_RANK_EXAMPLE} />
                  </div>
                </div>
              )
            }
          />
        ) : (
          <div className="rounded-lg border border-gray-200 bg-gray-100 px-5 py-4 text-center text-sm text-gray-500">
            Detailed game results not available for this year.
          </div>
        )}
      </div>
    </div>
  );
}

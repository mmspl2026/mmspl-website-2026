import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarOff, Flame } from "lucide-react";
import { getTodayEastern } from "@/utils/timezone";
import { sanityFetch } from "@/lib/sanity/client";
import {
  adminSettingsQuery,
  tournamentResultQuery,
  tournamentPoolsQuery,
  tournamentGamesQuery,
  wildCardRankingsQuery,
  standingsBySeasonQuery,
  awardTrophyPhotoByCategoryQuery,
  allTeamShortNamesQuery,
  tournamentPredictionQuery,
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
  TournamentPrediction,
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
  const today = getTodayEastern();

  const year = Number(params.year);
  if (!Number.isInteger(year)) notFound();

  const [result, pools, games, wcRankings, settings, standings, trophyPhoto, teamShortNamesRaw, prediction] =
    await Promise.all([
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
      sanityFetch<{ name: string; shortName: string }[]>(allTeamShortNamesQuery, {}, []),
      sanityFetch<TournamentPrediction | null>(tournamentPredictionQuery, { year, type }, null),
    ]);

  if (!result) notFound();

  const teamShortNames = Object.fromEntries(teamShortNamesRaw.map((t) => [t.name, t.shortName]));

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
  // Shown throughout the whole active tournament — projection, round robin,
  // and playdowns — and only stops once the tournament actually concludes
  // (a champion is set), at which point TournamentChampionsBanner takes
  // over with real winner/finalist/MVP photos instead.
  const trophyPhotoUrl = trophyPhoto && !result.champion ? urlFor(trophyPhoto.photo).width(300).fit("max").url() : undefined;
  const projectedGames =
    projectedBoxes && type === "mcgregor" && result.plannedStart
      ? computeProjectedSchedule(projectedBoxes, year, type, result.plannedStart)
      : null;

  // Explains the Wild Card ranking rules + a generic example table, shown
  // in place of the real Div & WC Rank tab whenever there's nothing real to
  // show yet — both before any games exist (the projected view) AND after
  // real Thu-Sat games are loaded but before real scores/rankings exist.
  // Without this, the whole tab silently disappears the moment "Load
  // Projected Schedule" is used, since wcRankings stays empty until Thu-Sat
  // is actually played.
  const wcRankingsPlaceholder = type === "mcgregor" && (
    <div className="space-y-4">
      <div className="rounded-lg border border-gray-200 bg-gray-50 px-5 py-6 text-sm text-gray-700">
        <p className="font-semibold text-black">Wild Card rankings aren&apos;t available yet.</p>
        <p className="mt-2">
          Once Thursday through Saturday&apos;s round-robin games are complete, the 4 Division Winners (best record
          within their own box) get a bye straight to the Quarter Finals. Which QF slot each one lands in (QF1
          &ndash; QF4) is set by a draw right at the end of Phase 1 &mdash; that draw is independent of who they&apos;ll
          actually face; their opponent is simply whoever wins the matching Wild Card game once Phase 2 is played.
          The other 10 teams are ranked 1&ndash;8 by their overall Phase 1 record; only the <strong>top 8</strong>{" "}
          advance to Sunday&apos;s Wild Card round, matched 1v8, 2v7, 3v6, 4v5.
        </p>
        <p className="mt-2">
          Ties are broken in this order: W-L record, run differential, runs scored, regular season points, then a
          coin flip. This tab will show that ranking as real scores come in.
        </p>
      </div>
      <div>
        <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
          Example &mdash; illustrative teams only
        </p>
        <WildCardRankingsTable rankings={WC_RANK_EXAMPLE} />
      </div>
    </div>
  );

  // Suspense teaser for the "Claude's Prediction" feature — only shown for
  // the live McGregor tournament, and only until the real prediction drops
  // (once `prediction` exists, the plain links in TournamentPoolSeeding /
  // ProjectedSeeding already point to the live page, so this banner would
  // just be stale "coming soon" copy sitting next to the real thing).
  let predictionTeaser: React.ReactNode = null;
  if (type === "mcgregor" && isCurrentSeason && !result.cancelled && !result.champion && !prediction && result.plannedStart) {
    const revealDate = new Date(`${result.plannedStart}T00:00:00`);
    revealDate.setDate(revealDate.getDate() + 2); // Thu start -> Saturday reveal
    const revealDateStr = revealDate.toLocaleDateString("en-CA", { timeZone: "America/Toronto" });
    const msPerDay = 24 * 60 * 60 * 1000;
    const daysLeft = Math.round(
      (new Date(`${revealDateStr}T00:00:00`).getTime() - new Date(`${today}T00:00:00`).getTime()) / msPerDay
    );
    const countdownLabel =
      daysLeft > 1 ? `${daysLeft} days to go` : daysLeft === 1 ? "1 day to go" : daysLeft === 0 ? "dropping tonight" : "coming any minute now";

    predictionTeaser = (
      <Link
        href="/schedule/tournament/predict"
        className="group flex flex-col gap-3 overflow-hidden rounded-xl border border-white/10 bg-[#0d0d0e] px-5 py-4 shadow-sm transition hover:border-brand/50 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
      >
        <div className="flex min-w-0 items-center gap-3">
          <span className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand/20">
            <Flame size={18} className="text-brand" aria-hidden="true" />
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand/40" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-brand">Something&apos;s coming</p>
            <p className="mt-0.5 text-sm text-white/80 sm:hidden">
              Good luck this week! Just for fun &mdash; can AI actually predict the champion? Find out Sept 19th.
            </p>
            <p className="mt-0.5 hidden text-sm text-white/80 sm:block">
              Good luck to every team out there this week &mdash; and once Phase 1 wraps, Claude&apos;s cold,
              stats-only championship prediction drops the night of Sept 19th. No bias, no player names, just
              numbers. Think the machine&apos;s got it wrong?
            </p>
          </div>
        </div>
        <span className="ml-12 w-fit shrink-0 whitespace-nowrap rounded-full border border-white/15 px-3 py-1.5 font-mono-brand text-[11px] font-bold uppercase tracking-wide text-white/70 group-hover:border-brand/50 group-hover:text-brand sm:ml-0">
          {countdownLabel}
        </span>
      </Link>
    );
  }

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

        {predictionTeaser}

        {result.cancelled ? (
          <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-gray-300 bg-gray-50 px-5 py-10 text-center">
            <CalendarOff size={28} className="text-gray-400" aria-hidden="true" />
            <p className="text-base font-semibold text-black">{year} {label.short} Not Held</p>
            <p className="max-w-md text-sm text-gray-500">
              {result.notes || "This tournament was not held."}
            </p>
          </div>
        ) : result.hasDetailedResults ? (
          <TournamentBracketView
            pools={pools}
            games={games}
            wcRankings={wcRankings}
            interactive={isCurrentSeason}
            trophyPhotoUrl={trophyPhotoUrl}
            trophyAlt={trophyPhoto?.photo.alt}
            today={today}
            teamShortNames={teamShortNames}
            rankingsPlaceholder={wcRankingsPlaceholder}
          />
        ) : projectedBoxes ? (
          <TournamentBracketView
            projectedBoxes={projectedBoxes}
            includesProjectedSchedule={Boolean(projectedGames)}
            trophyPhotoUrl={trophyPhotoUrl}
            trophyAlt={trophyPhoto?.photo.alt}
            games={projectedGames ?? []}
            wcRankings={[]}
            interactive
            today={today}
            rankingsPlaceholder={wcRankingsPlaceholder}
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

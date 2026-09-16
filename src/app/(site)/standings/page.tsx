import type { Metadata } from "next";
import Link from "next/link";
import { CalendarOff, Info, Trophy, AlertTriangle } from "lucide-react";
import { getTodayEastern } from "@/utils/timezone";
import { sanityFetch } from "@/lib/sanity/client";
import {
  allSeasonsQuery,
  standingsBySeasonQuery,
  gamesBySeasonQuery,
  adminSettingsQuery,
  allTournamentResultsQuery,
} from "@/lib/sanity/queries";
import type { AdminSettings, Season, Standing, Game, TournamentResult } from "@/lib/types";
import { urlFor } from "@/lib/sanity/image";
import { computeSeasonRanking, TIE_BREAK_RULES } from "@/lib/seasonRanking";
import StandingsTable from "@/components/StandingsTable";
import SeasonDropdown from "@/components/SeasonDropdown";
import TournamentCards from "@/components/TournamentCards";
import StandingsMobileBar from "@/components/StandingsMobileBar";

export const metadata: Metadata = { title: "Standings" };

const CURRENT_YEAR = new Date().getFullYear();

export default async function StandingsPage({
  searchParams,
}: {
  searchParams: { season?: string };
}) {
  const [seasons, settings, tournamentResults] = await Promise.all([
    sanityFetch<Season[]>(allSeasonsQuery, {}, []),
    sanityFetch<AdminSettings | null>(adminSettingsQuery, {}, null),
    sanityFetch<TournamentResult[]>(allTournamentResultsQuery, {}, []),
  ]);
  const years = seasons.length > 0 ? seasons.map((s) => s.year) : [CURRENT_YEAR];
  const seasonOptions = seasons.length > 0 ? seasons.map((s) => ({ year: s.year, isActive: s.isActive })) : [{ year: CURRENT_YEAR, isActive: true }];

  const heroImage = settings?.standingsHeroImage || settings?.heroImage;
  const heroImageUrl = heroImage ? urlFor(heroImage).width(1920).height(1080).fit("crop").url() : "/hero.jpg";

  const selectedYear = searchParams.season ? Number(searchParams.season) : years[0];
  const selectedSeason = seasons.find((s) => s.year === selectedYear);
  const charityResult = tournamentResults.find((r) => r.year === selectedYear && r.type === "charity") || null;
  const mcgregorResult = tournamentResults.find((r) => r.year === selectedYear && r.type === "mcgregor") || null;

  // The full computed tie-break procedure (head-to-head, +/-, etc.) needs a
  // real season game log to work from — only reliably tracked from 2026
  // onward. Older seasons were bulk-imported without that data, so they
  // keep the previous simple points-then-run-differential order rather than
  // risk a misleading tiebreaker marker or a false "coin toss needed" flag
  // that's really just a data gap.
  const useRealTiebreaks = selectedYear >= 2026;

  const [standings, seasonGames] = await Promise.all([
    sanityFetch<Standing[]>(standingsBySeasonQuery, { year: selectedYear }, []),
    useRealTiebreaks ? sanityFetch<Game[]>(gamesBySeasonQuery, { year: selectedYear }, []) : Promise.resolve([]),
  ]);

  const ranked = useRealTiebreaks
    ? computeSeasonRanking(standings, seasonGames)
    : standings.map((standing, i) => ({ standing, rank: i + 1, decidedBy: "points" as const, coinTossNeeded: false }));
  const displayStandings = selectedSeason?.cancelled ? [] : ranked.map((r) => r.standing);
  const tiebreakInfo = useRealTiebreaks
    ? Object.fromEntries(ranked.map((r) => [r.standing._id, { decidedBy: r.decidedBy, coinTossNeeded: r.coinTossNeeded }]))
    : undefined;
  const coinTossTeams = ranked.filter((r) => r.coinTossNeeded).map((r) => r.standing.team.name);

  // A season stops being the "active" one only once next year's season is
  // created — so for the current active season, `isActive` alone can't tell
  // us the regular season itself has wrapped (it's true from May through the
  // tournament). Fall back to the same date check the homepage uses.
  const seasonComplete = Boolean(
    selectedSeason &&
      (!selectedSeason.isActive ||
        (selectedSeason.regularSeasonEnd && getTodayEastern() > selectedSeason.regularSeasonEnd))
  );

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
        <div className="sticky top-[64px] z-30 hidden rounded-xl border bg-white p-3 text-black shadow md:block">
          <div className="flex flex-nowrap items-center gap-2" style={{ overflow: "visible" }}>
            <SeasonDropdown seasons={seasonOptions} selected={selectedYear} className="w-[150px] shrink-0" />

            <div className="ml-auto flex shrink-0 items-center gap-2.5">
              <Link
                href="/schedule"
                className="inline-flex items-center gap-1 rounded-md bg-[#1a1a1a] px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-black"
              >
                Results &rarr;
              </Link>
              <span className="group relative inline-flex shrink-0 items-center">
                <Info size={13} className="cursor-help text-gray-400" aria-hidden="true" />
                <span
                  role="tooltip"
                  className="pointer-events-none absolute bottom-full right-0 z-10 mb-2 w-64 rounded-md bg-[#111111] px-2.5 py-1.5 text-[12px] font-normal normal-case leading-snug text-white opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100"
                >
                  Select a season from the dropdown to view its final standings. Tap Results to see the full game schedule for that season.
                </span>
              </span>
            </div>
          </div>
        </div>

        {!selectedSeason?.cancelled && (
          <div className="mt-6 hidden md:block">
            <TournamentCards year={selectedYear} charity={charityResult} mcgregor={mcgregorResult} />
          </div>
        )}

        <StandingsMobileBar
          seasons={seasonOptions}
          selectedYear={selectedYear}
          charityResult={charityResult}
          mcgregorResult={mcgregorResult}
        />

        <p className="mt-4 flex items-center gap-1.5 text-sm font-semibold text-gray-600 md:mt-6">
          <Trophy size={22} className="shrink-0 text-brand" aria-hidden="true" /> Regular Season Champion
        </p>

        <div className="mt-2">
          {selectedSeason?.cancelled ? (
            <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-gray-300 bg-white px-5 py-16 text-center">
              <CalendarOff size={28} className="text-gray-400" aria-hidden="true" />
              <p className="text-base font-semibold text-black">{selectedYear} Season Cancelled</p>
              <p className="max-w-md text-sm text-gray-500">
                {selectedSeason.cancelledReason || "This season was cancelled due to the COVID-19 pandemic."}
              </p>
            </div>
          ) : (
            <StandingsTable
              standings={displayStandings}
              year={selectedYear}
              seasonComplete={seasonComplete}
              tiebreakInfo={tiebreakInfo}
            />
          )}
        </div>

        {!selectedSeason?.cancelled && coinTossTeams.length > 0 && (
          <div className="mb-6 flex items-start gap-2.5 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <AlertTriangle size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
            <p>
              <strong>Coin toss required:</strong> {coinTossTeams.join(", ")} remain tied after every tiebreaker
              below and can&apos;t be separated automatically — final placement among them needs an actual coin
              toss.
            </p>
          </div>
        )}

        <div className="rounded-xl border bg-white text-black shadow">
          <div className="flex flex-col space-y-1.5 p-6">
            <div className="font-semibold leading-none tracking-tight">Tie-Breaking Rules</div>
          </div>
          <div className="p-6 pt-0">
            <p className="mb-3 text-sm text-gray-700">
              In the event of a tie, final rankings are determined by, in order:
            </p>
            <ol className="list-inside list-decimal space-y-1 text-sm text-gray-700">
              {TIE_BREAK_RULES.map((rule) => (
                <li key={rule.level}>{rule.label}</li>
              ))}
            </ol>
            <p className="mt-3 text-xs text-gray-400">
              Applied automatically from each team&apos;s final and forfeit games — a{" "}
              <span className="font-bold text-brand">†</span> next to a rank above means a tiebreaker beyond points
              was needed to place that team.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

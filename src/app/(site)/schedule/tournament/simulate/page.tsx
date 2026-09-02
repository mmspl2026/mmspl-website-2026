import type { Metadata } from "next";
import Link from "next/link";
import { sanityFetch } from "@/lib/sanity/client";
import { activeSeasonQuery, standingsBySeasonQuery, gamesBySeasonQuery } from "@/lib/sanity/queries";
import { getTodayEastern } from "@/utils/timezone";
import type { Season, Standing, Game } from "@/lib/types";
import TournamentSimulator from "@/components/TournamentSimulator";

export const metadata: Metadata = { title: "Tournament Simulator" };

// Standalone for-fun page — deliberately not wired into the real tournament
// data (no tournamentResult/tournamentGame documents involved). Just runs a
// randomized playthrough of the McGregor bracket from this season's live
// standings, fresh on every click.
export default async function TournamentSimulatorPage() {
  const today = getTodayEastern();
  const currentYear = Number(today.slice(0, 4));

  const activeSeason = await sanityFetch<Season | null>(activeSeasonQuery, {}, null);
  const year = activeSeason?.year ?? currentYear;

  const [standings, games] = await Promise.all([
    sanityFetch<Standing[]>(standingsBySeasonQuery, { year }, []),
    sanityFetch<Game[]>(gamesBySeasonQuery, { year }, []),
  ]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-[#0d0d0e] px-5 py-10 text-center text-white">
        <p className="text-[10px] uppercase tracking-[0.14em] text-white/45">
          <Link href="/" className="no-underline hover:underline">
            Home
          </Link>{" "}
          /{" "}
          <Link href="/schedule/tournament" className="no-underline hover:underline">
            Tournaments
          </Link>{" "}
          / Simulator
        </p>
        <h1 className="mt-3 font-heading uppercase leading-none tracking-[0.01em] text-[clamp(1.8rem,5vw,3rem)]">
          Tournament Simulator
        </h1>
        <p className="mx-auto mt-3 max-w-lg text-sm text-white/60">
          Just for fun &mdash; a randomized, weighted playthrough of the McGregor Year-End Tournament based on{" "}
          {year}&apos;s regular season, not a prediction. Click Simulate to see how the season could end.
        </p>
      </div>

      <div className="container-page py-8">
        {standings.length === 14 ? (
          <TournamentSimulator standings={standings} seasonGames={games} />
        ) : (
          <div className="rounded-lg border border-gray-200 bg-white px-5 py-10 text-center text-sm text-gray-500">
            Need exactly 14 teams in the {year} standings to run the simulator (found {standings.length}).
          </div>
        )}
      </div>
    </div>
  );
}

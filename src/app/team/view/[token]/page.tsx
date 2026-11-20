import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import { Beer, ListOrdered } from "lucide-react";
import { writeClient } from "@/lib/sanity/client";
import {
  teamCaptainByShareTokenQuery,
  rosterByTeamQuery,
  statLinesByTeamQuery,
  statLinesByGameQuery,
  beerAssignmentsByTeamQuery,
  teamAllGamesQuery,
} from "@/lib/sanity/queries";
import { computeSeasonTotals, type StatLine } from "@/lib/teamStats";
import { getTodayEastern, getDateDaysAgoEastern } from "@/utils/timezone";
import { urlFor } from "@/lib/sanity/image";
import type { RosterPlayer, BeerAssignment, Team, Game } from "@/lib/types";
import GameLineupPicker from "@/components/team/GameLineupPicker";

export const metadata: Metadata = { title: "Team Roster & Stats", robots: { index: false, follow: false } };
// Public page with no cookies()/headers() call, so unlike every authenticated
// /team/* page it wouldn't otherwise opt out of Next's default fetch caching —
// without this, a deleted roster player (or any other change) would keep
// showing here indefinitely until the next deploy.
export const dynamic = "force-dynamic";

const STAT_KEYS = ["ab", "h", "r", "rbi", "hr", "e"] as const;

/**
 * A game stays the default pick through the day after it's played (so
 * checking the lineup/result the next evening still shows it), then hands
 * off to whichever game is next. Falls back to the most recent past game
 * if nothing is upcoming (season's over).
 */
function pickDefaultGame(games: Game[]): string | undefined {
  const today = getTodayEastern();
  const yesterday = getDateDaysAgoEastern(1);

  const recent = games.filter((g) => g.date >= yesterday && g.date <= today);
  if (recent.length > 0) return recent[recent.length - 1]._id;

  const next = games.find((g) => g.date > today);
  if (next) return next._id;

  const past = games.filter((g) => g.date < yesterday);
  if (past.length > 0) return past[past.length - 1]._id;

  return undefined;
}

function gameLabel(g: Game, teamId: string): string {
  const isHome = g.homeTeam._id === teamId;
  const opponent = isHome ? g.awayTeam.name : g.homeTeam.name;
  let statusLabel = g.status.charAt(0).toUpperCase() + g.status.slice(1);
  if (g.status === "final" && g.homeScore !== undefined && g.awayScore !== undefined) {
    const us = isHome ? g.homeScore : g.awayScore;
    const them = isHome ? g.awayScore : g.homeScore;
    statusLabel = `Final ${us}-${them}`;
  }
  return `${g.date} — vs ${opponent} (${statusLabel})`;
}

export default async function TeamPublicViewPage({
  params,
  searchParams,
}: {
  params: { token: string };
  searchParams: { game?: string };
}) {
  const result = await writeClient.fetch<{ _id: string; team: Team } | null>(teamCaptainByShareTokenQuery, {
    shareToken: params.token,
  });
  if (!result) notFound();

  const teamId = result.team._id;
  const [roster, lines, assignments, allGames] = await Promise.all([
    writeClient.fetch<RosterPlayer[]>(rosterByTeamQuery, { teamId }),
    writeClient.fetch<StatLine[]>(statLinesByTeamQuery, { teamId }),
    writeClient.fetch<BeerAssignment[]>(beerAssignmentsByTeamQuery, { teamId }),
    writeClient.fetch<Game[]>(teamAllGamesQuery, { teamId }),
  ]);
  const totals = computeSeasonTotals(roster, lines);
  const upcomingBeer = assignments.filter((a) => a.player);

  const rosterById = Object.fromEntries(roster.map((p) => [p._id, p]));
  const selectedGameId = searchParams.game && allGames.some((g) => g._id === searchParams.game)
    ? searchParams.game
    : pickDefaultGame(allGames);
  const selectedGame = allGames.find((g) => g._id === selectedGameId);
  const lineup = selectedGameId
    ? await writeClient
        .fetch<StatLine[]>(statLinesByGameQuery, { teamId, gameId: selectedGameId })
        .then((gameLines) => gameLines.filter((l) => l.attended && rosterById[l.player]))
    : [];

  return (
    <div className="min-h-screen bg-gray-50 text-black">
      <div className="border-b border-white/10 bg-black px-4 py-5 text-white">
        <div className="mx-auto flex max-w-4xl items-center gap-3">
          {result.team.logo ? (
            <Image
              src={urlFor(result.team.logo).width(72).height(72).fit("crop").url()}
              alt=""
              width={48}
              height={48}
              className="rounded"
            />
          ) : null}
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-white/40">Team Page — Read Only</p>
            <h1 className="text-xl font-semibold">{result.team.name}</h1>
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-4xl space-y-8 px-4 py-6">
        <section>
          <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-gray-500">
            <ListOrdered size={16} aria-hidden="true" />
            Game Lineup
          </h2>

          {allGames.length === 0 ? (
            <p className="mt-2 text-sm text-gray-400">No games yet this season.</p>
          ) : (
            <>
              <div className="mt-3">
                <GameLineupPicker
                  games={allGames.map((g) => ({ _id: g._id, label: gameLabel(g, teamId) }))}
                  selectedGameId={selectedGameId || ""}
                />
              </div>

              {selectedGame && (
                <div className="mt-3 overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
                  <div className="border-b border-gray-100 bg-gray-50 px-3 py-2 text-xs text-gray-500">
                    {selectedGame.date} · {selectedGame.time}
                    {selectedGame.field ? ` · ${selectedGame.field}` : ""}
                  </div>
                  {lineup.length === 0 ? (
                    <p className="px-3 py-4 text-sm text-gray-400">Lineup not set yet for this game.</p>
                  ) : (
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-100 text-left text-xs uppercase tracking-wide text-gray-500">
                          <th className="px-2 py-2">#</th>
                          <th className="px-2 py-2">Player</th>
                          <th className="px-2 py-2">Position</th>
                          {STAT_KEYS.map((k) => (
                            <th key={k} className="px-2 py-2 text-center">
                              {k.toUpperCase()}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {lineup.map((l, i) => (
                          <tr key={l._id} className="border-b border-gray-100">
                            <td className="px-2 py-1.5 text-gray-400">{i + 1}</td>
                            <td className="px-2 py-1.5 font-medium text-black">{rosterById[l.player]?.name}</td>
                            <td className="px-2 py-1.5 text-gray-500">{l.positionPlayed || "—"}</td>
                            {STAT_KEYS.map((k) => (
                              <td key={k} className="px-2 py-1.5 text-center text-gray-500">
                                {l[k]}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </>
          )}
        </section>

        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Roster</h2>
          <div className="mt-3 overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
                  <th className="px-3 py-2">Name</th>
                  <th className="px-3 py-2">#</th>
                  <th className="px-3 py-2">Position</th>
                  <th className="px-3 py-2">P</th>
                  <th className="px-3 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {roster.map((p) => (
                  <tr key={p._id} className="border-b border-gray-100">
                    <td className="px-3 py-2 font-medium text-black">{p.name}</td>
                    <td className="px-3 py-2 text-gray-500">{p.jerseyNumber || "—"}</td>
                    <td className="px-3 py-2 text-gray-500">{p.position || "—"}</td>
                    <td className="px-3 py-2 text-gray-500">{p.isPitcher ? "P" : ""}</td>
                    <td className="px-3 py-2 text-gray-500">{p.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Season Stats</h2>
          <div className="mt-3 overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
                  <th className="px-2 py-2">Player</th>
                  <th className="px-2 py-2 text-center">GP</th>
                  {STAT_KEYS.map((k) => (
                    <th key={k} className="px-2 py-2 text-center">
                      {k.toUpperCase()}
                    </th>
                  ))}
                  <th className="px-2 py-2 text-center">AVG</th>
                </tr>
              </thead>
              <tbody>
                {totals.map((t) => (
                  <tr key={t.player._id} className="border-b border-gray-100">
                    <td className="px-2 py-1.5 font-medium text-black">{t.player.name}</td>
                    <td className="px-2 py-1.5 text-center text-gray-500">{t.gp}</td>
                    <td className="px-2 py-1.5 text-center text-gray-500">{t.ab}</td>
                    <td className="px-2 py-1.5 text-center text-gray-500">{t.h}</td>
                    <td className="px-2 py-1.5 text-center text-gray-500">{t.r}</td>
                    <td className="px-2 py-1.5 text-center text-gray-500">{t.rbi}</td>
                    <td className="px-2 py-1.5 text-center text-gray-500">{t.hr}</td>
                    <td className="px-2 py-1.5 text-center text-gray-500">{t.e}</td>
                    <td className="px-2 py-1.5 text-center font-mono text-black">{t.avg.toFixed(3).replace(/^0/, "")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-gray-500">
            <Beer size={16} aria-hidden="true" />
            Beer Duty
          </h2>
          {upcomingBeer.length === 0 ? (
            <p className="mt-2 text-sm text-gray-400">No beer assignments yet.</p>
          ) : (
            <ul className="mt-3 divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white shadow-sm">
              {upcomingBeer.map((a) => (
                <li key={a._id} className="flex items-center justify-between px-3 py-2 text-sm">
                  <span className="text-black">
                    {a.game.homeTeam.name} vs {a.game.awayTeam.name} — {a.game.date}
                  </span>
                  <span className="font-semibold text-brand">{a.player?.name}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <p className="text-center text-xs text-gray-400">
          This link is private to your team. Please don&rsquo;t share it publicly.
        </p>
      </main>
    </div>
  );
}

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import { Beer } from "lucide-react";
import { writeClient } from "@/lib/sanity/client";
import {
  teamCaptainByShareTokenQuery,
  rosterByTeamQuery,
  statLinesByTeamQuery,
  beerAssignmentsByTeamQuery,
} from "@/lib/sanity/queries";
import { computeSeasonTotals, type StatLine } from "@/lib/teamStats";
import { urlFor } from "@/lib/sanity/image";
import type { RosterPlayer, BeerAssignment, Team } from "@/lib/types";

export const metadata: Metadata = { title: "Team Roster & Stats", robots: { index: false, follow: false } };

const STAT_KEYS = ["ab", "h", "r", "rbi", "hr", "e"] as const;

export default async function TeamPublicViewPage({ params }: { params: { token: string } }) {
  const result = await writeClient.fetch<{ _id: string; team: Team } | null>(teamCaptainByShareTokenQuery, {
    shareToken: params.token,
  });
  if (!result) notFound();

  const teamId = result.team._id;
  const [roster, lines, assignments] = await Promise.all([
    writeClient.fetch<RosterPlayer[]>(rosterByTeamQuery, { teamId }),
    writeClient.fetch<StatLine[]>(statLinesByTeamQuery, { teamId }),
    writeClient.fetch<BeerAssignment[]>(beerAssignmentsByTeamQuery, { teamId }),
  ]);
  const totals = computeSeasonTotals(roster, lines);
  const upcomingBeer = assignments.filter((a) => a.player);

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="border-b border-white/10 bg-[#111111] px-4 py-5">
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
          <h2 className="text-sm font-semibold uppercase tracking-wide text-white/70">Roster</h2>
          <div className="mt-3 overflow-x-auto rounded-lg border border-white/10">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 bg-[#1a1a1a] text-left text-xs uppercase tracking-wide text-white/50">
                  <th className="px-3 py-2">Name</th>
                  <th className="px-3 py-2">#</th>
                  <th className="px-3 py-2">Position</th>
                  <th className="px-3 py-2">P</th>
                  <th className="px-3 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {roster.map((p) => (
                  <tr key={p._id} className="border-b border-white/5">
                    <td className="px-3 py-2 font-medium">{p.name}</td>
                    <td className="px-3 py-2 text-white/60">{p.jerseyNumber || "—"}</td>
                    <td className="px-3 py-2 text-white/60">{p.position || "—"}</td>
                    <td className="px-3 py-2 text-white/60">{p.isPitcher ? "P" : ""}</td>
                    <td className="px-3 py-2 text-white/60">{p.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-white/70">Season Stats</h2>
          <div className="mt-3 overflow-x-auto rounded-lg border border-white/10">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 bg-[#1a1a1a] text-left text-xs uppercase tracking-wide text-white/50">
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
                  <tr key={t.player._id} className="border-b border-white/5">
                    <td className="px-2 py-1.5 font-medium">{t.player.name}</td>
                    <td className="px-2 py-1.5 text-center text-white/60">{t.gp}</td>
                    <td className="px-2 py-1.5 text-center text-white/60">{t.ab}</td>
                    <td className="px-2 py-1.5 text-center text-white/60">{t.h}</td>
                    <td className="px-2 py-1.5 text-center text-white/60">{t.r}</td>
                    <td className="px-2 py-1.5 text-center text-white/60">{t.rbi}</td>
                    <td className="px-2 py-1.5 text-center text-white/60">{t.hr}</td>
                    <td className="px-2 py-1.5 text-center text-white/60">{t.e}</td>
                    <td className="px-2 py-1.5 text-center font-mono text-white/80">{t.avg.toFixed(3).replace(/^0/, "")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-white/70">
            <Beer size={16} aria-hidden="true" />
            Beer Duty
          </h2>
          {upcomingBeer.length === 0 ? (
            <p className="mt-2 text-sm text-white/40">No beer assignments yet.</p>
          ) : (
            <ul className="mt-3 divide-y divide-white/10 rounded-lg border border-white/10">
              {upcomingBeer.map((a) => (
                <li key={a._id} className="flex items-center justify-between px-3 py-2 text-sm">
                  <span>
                    {a.game.homeTeam.name} vs {a.game.awayTeam.name} — {a.game.date}
                  </span>
                  <span className="font-semibold text-brand-300">{a.player?.name}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <p className="text-center text-xs text-white/30">
          This link is private to your team. Please don&rsquo;t share it publicly.
        </p>
      </main>
    </div>
  );
}

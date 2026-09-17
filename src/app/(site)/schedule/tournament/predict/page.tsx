import type { Metadata } from "next";
import Link from "next/link";
import { Trophy, Check, X, Clock, Quote } from "lucide-react";
import clsx from "clsx";
import { sanityFetch } from "@/lib/sanity/client";
import {
  activeSeasonQuery,
  tournamentPredictionQuery,
  tournamentGamesQuery,
  tournamentResultQuery,
} from "@/lib/sanity/queries";
import { getTodayEastern } from "@/utils/timezone";
import { TOURNAMENT_LABELS } from "@/lib/tournamentDisplay";
import type { Season, TournamentGame, TournamentPrediction, TournamentResult } from "@/lib/types";

export const metadata: Metadata = { title: "Claude's Prediction" };

type Status = "correct" | "wrong" | "pending";

function actualWinner(g: TournamentGame): string | null {
  if (typeof g.homeScore !== "number" || typeof g.awayScore !== "number") return null;
  if (g.homeScore === g.awayScore) return null;
  return g.homeScore > g.awayScore ? g.homeTeam ?? null : g.awayTeam ?? null;
}

function roundWinners(games: TournamentGame[], round: string): string[] {
  return games
    .filter((g) => g.round === round)
    .map(actualWinner)
    .filter((w): w is string => Boolean(w));
}

function roundComplete(games: TournamentGame[], round: string): boolean {
  const roundGames = games.filter((g) => g.round === round);
  if (roundGames.length === 0) return false;
  return roundGames.every((g) => typeof g.homeScore === "number" && typeof g.awayScore === "number");
}

function pickStatus(team: string, actual: string[], complete: boolean): Status {
  if (actual.includes(team)) return "correct";
  if (complete) return "wrong";
  return "pending";
}

function StatusIcon({ status }: { status: Status }) {
  if (status === "correct") return <Check size={15} className="shrink-0 text-green-600" aria-hidden="true" />;
  if (status === "wrong") return <X size={15} className="shrink-0 text-red-500" aria-hidden="true" />;
  return <Clock size={15} className="shrink-0 text-gray-300" aria-hidden="true" />;
}

function PickRow({ team, status }: { team: string; status: Status }) {
  return (
    <li
      className={clsx(
        "flex items-center gap-2 rounded-lg border px-3 py-2 text-sm",
        status === "correct" && "border-green-200 bg-green-50",
        status === "wrong" && "border-red-200 bg-red-50 opacity-70",
        status === "pending" && "border-gray-200 bg-white"
      )}
    >
      <StatusIcon status={status} />
      <span className={clsx("truncate font-semibold", status === "wrong" ? "text-gray-500 line-through" : "text-black")}>
        {team}
      </span>
    </li>
  );
}

function RoundSection({
  title,
  picks,
  actual,
  complete,
}: {
  title: string;
  picks: string[];
  actual: string[];
  complete: boolean;
}) {
  if (picks.length === 0) return null;
  const correctCount = picks.filter((p) => actual.includes(p)).length;
  return (
    <div className="rounded-xl border bg-white shadow-sm">
      <div className="flex items-center justify-between rounded-t-xl bg-[#0d0d0e] px-4 py-2.5">
        <p className="font-heading text-sm uppercase tracking-[0.08em] text-white">{title}</p>
        {complete && (
          <span className="font-mono-brand text-xs font-bold text-white/70">
            {correctCount}/{picks.length}
          </span>
        )}
      </div>
      <ul className="grid grid-cols-1 gap-2 p-4 sm:grid-cols-2">
        {picks.map((team) => (
          <PickRow key={team} team={team} status={pickStatus(team, actual, complete)} />
        ))}
      </ul>
    </div>
  );
}

export default async function TournamentPredictionPage() {
  const today = getTodayEastern();
  const currentYear = Number(today.slice(0, 4));
  const activeSeason = await sanityFetch<Season | null>(activeSeasonQuery, {}, null);
  const year = activeSeason?.year ?? currentYear;

  const [prediction, games, result] = await Promise.all([
    sanityFetch<TournamentPrediction | null>(tournamentPredictionQuery, { year, type: "mcgregor" }, null),
    sanityFetch<TournamentGame[]>(tournamentGamesQuery, { year, type: "mcgregor" }, []),
    sanityFetch<TournamentResult | null>(tournamentResultQuery, { year, type: "mcgregor" }, null),
  ]);

  const wcActual = roundWinners(games, "wildCard");
  const wcComplete = roundComplete(games, "wildCard");
  const qfActual = roundWinners(games, "quarterFinal");
  const qfComplete = roundComplete(games, "quarterFinal");
  const sfActual = roundWinners(games, "semiFinal");
  const sfComplete = roundComplete(games, "semiFinal");
  const actualChampion = roundWinners(games, "final")[0] || result?.champion || null;
  const championDecided = roundComplete(games, "final") || Boolean(result?.champion);

  const championStatus: Status | null = !prediction
    ? null
    : !championDecided
      ? "pending"
      : actualChampion === prediction.championPick
        ? "correct"
        : "wrong";

  const totalPicks = prediction
    ? (prediction.wildCardAdvancers?.length ?? 0) +
      (prediction.quarterFinalWinners?.length ?? 0) +
      (prediction.semiFinalWinners?.length ?? 0) +
      1
    : 0;
  const totalCorrect = prediction
    ? (prediction.wildCardAdvancers ?? []).filter((t) => wcActual.includes(t)).length +
      (prediction.quarterFinalWinners ?? []).filter((t) => qfActual.includes(t)).length +
      (prediction.semiFinalWinners ?? []).filter((t) => sfActual.includes(t)).length +
      (championStatus === "correct" ? 1 : 0)
    : 0;
  const anyRealResultsYet = games.some((g) => typeof g.homeScore === "number");

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
          /{" "}
          <Link href={`/schedule/tournament/${year}/mcgregor`} className="no-underline hover:underline">
            {year} {TOURNAMENT_LABELS.mcgregor.short}
          </Link>{" "}
          / Prediction
        </p>
        <h1 className="mt-3 font-heading uppercase leading-none tracking-[0.01em] text-[clamp(1.8rem,5vw,3rem)]">
          Claude&apos;s Prediction
        </h1>
        <p className="mx-auto mt-3 max-w-lg text-sm text-white/60">
          One bracket call, made cold off the stats once Thursday&ndash;Saturday wraps up &mdash; no player names, no
          favourites, just regular season and round robin numbers. Let&apos;s see if the machine can pick a winner.
        </p>
      </div>

      <div className="container-page space-y-6 py-8">
        {!prediction ? (
          <div className="rounded-xl border border-dashed border-gray-300 bg-white px-6 py-14 text-center">
            <Trophy size={28} className="mx-auto mb-3 text-gray-300" aria-hidden="true" />
            <p className="text-base font-semibold text-black">The prediction isn&apos;t in yet.</p>
            <p className="mx-auto mt-2 max-w-md text-sm text-gray-500">
              Check back Saturday night, once Thursday&ndash;Saturday&apos;s round robin wraps up and the real Wild
              Card seeding is set &mdash; that&apos;s when the call gets made, before a single Sunday pitch is
              thrown.
            </p>
          </div>
        ) : (
          <>
            {anyRealResultsYet && (
              <div className="flex items-center justify-between rounded-xl border-2 border-brand/30 bg-brand-50 px-4 py-3">
                <p className="text-sm font-bold text-brand-700">Claude&apos;s Record</p>
                <p className="font-mono-brand text-sm font-bold text-brand-700">
                  {totalCorrect} / {totalPicks} correct so far
                </p>
              </div>
            )}

            <div className="rounded-xl border bg-white p-5 shadow-sm">
              <div className="flex items-start gap-3">
                <Quote size={22} className="mt-0.5 shrink-0 text-brand" aria-hidden="true" />
                <p className="text-sm leading-relaxed text-gray-700">{prediction.intro}</p>
              </div>
            </div>

            <div className="overflow-hidden rounded-xl border-2 border-brand shadow-sm">
              <div className="bg-brand px-5 py-4 text-center">
                <p className="flex items-center justify-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-white/80">
                  <Trophy size={14} aria-hidden="true" /> Claude Picks
                </p>
                <p className="mt-1 font-heading text-2xl uppercase text-white">{prediction.championPick}</p>
                {prediction.finalistPick && (
                  <p className="mt-1 text-xs text-white/70">over {prediction.finalistPick}</p>
                )}
              </div>
              <div className="bg-white p-5">
                <p className="text-sm leading-relaxed text-gray-700">{prediction.championReasoning}</p>
                {championStatus && (
                  <div
                    className={clsx(
                      "mt-4 flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-bold",
                      championStatus === "correct" && "bg-green-50 text-green-700",
                      championStatus === "wrong" && "bg-red-50 text-red-600",
                      championStatus === "pending" && "bg-gray-50 text-gray-400"
                    )}
                  >
                    <StatusIcon status={championStatus} />
                    {championStatus === "correct" && "Called it. Champion confirmed."}
                    {championStatus === "wrong" && `Whiffed — ${actualChampion} actually won it.`}
                    {championStatus === "pending" && "Still to be decided."}
                  </div>
                )}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <RoundSection title="Wild Card" picks={prediction.wildCardAdvancers ?? []} actual={wcActual} complete={wcComplete} />
              <RoundSection
                title="Quarter Final"
                picks={prediction.quarterFinalWinners ?? []}
                actual={qfActual}
                complete={qfComplete}
              />
              <RoundSection title="Semi Final" picks={prediction.semiFinalWinners ?? []} actual={sfActual} complete={sfComplete} />
            </div>

            {prediction.picks && prediction.picks.length > 0 && (
              <div className="rounded-xl border bg-white shadow-sm">
                <div className="rounded-t-xl bg-[#0d0d0e] px-4 py-2.5">
                  <p className="font-heading text-sm uppercase tracking-[0.08em] text-white">Game-by-Game</p>
                </div>
                <div className="divide-y">
                  {prediction.picks.map((p, i) => (
                    <div key={i} className="px-4 py-3">
                      <p className="text-xs font-bold uppercase tracking-wide text-gray-400">{p.label}</p>
                      <p className="mt-0.5 text-sm font-bold text-black">{p.team}</p>
                      {p.reasoning && <p className="mt-1 text-sm text-gray-600">{p.reasoning}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <p className="text-center text-xs text-gray-400">
              Generated {new Date(prediction.generatedAt).toLocaleDateString("en-CA", { dateStyle: "long" })} — before
              Sunday&apos;s games were played.
            </p>
          </>
        )}
      </div>
    </div>
  );
}

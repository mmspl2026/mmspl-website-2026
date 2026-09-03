"use client";

import { useState } from "react";
import { Dices, Trophy, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import clsx from "clsx";
import type { Standing, Game, WildCardRanking } from "@/lib/types";
import { simulateTournament, type TournamentSimulationResult, type SimulatedGame } from "@/lib/tournamentSimulation";
import { WildCardRankingsTable } from "./TournamentDayTabs";

function BracketRow({ game }: { game: SimulatedGame }) {
  return (
    <div className="rounded-xl border border-white/10 bg-[#0d0d0e] p-3">
      <p className="mb-2 text-[10px] uppercase tracking-wide text-white/40">{game.label}</p>
      <div className="flex items-center justify-between gap-2">
        <span
          className={clsx(
            "min-w-0 flex-1 truncate text-sm",
            game.winner === game.homeTeam ? "font-bold text-white" : "text-white/50"
          )}
        >
          {game.homeTeam}
        </span>
        <span className="font-mono-brand shrink-0 text-sm text-white">{game.homeScore}</span>
        <span className="shrink-0 text-white/30">&ndash;</span>
        <span className="font-mono-brand shrink-0 text-sm text-white">{game.awayScore}</span>
        <span
          className={clsx(
            "min-w-0 flex-1 truncate text-right text-sm",
            game.winner === game.awayTeam ? "font-bold text-white" : "text-white/50"
          )}
        >
          {game.awayTeam}
        </span>
      </div>
    </div>
  );
}

function Section({
  title,
  children,
  defaultOpen = true,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="mb-4">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="mb-2 flex w-full items-center justify-between rounded-lg bg-[#0d0d0e] px-4 py-2.5 text-left"
      >
        <span className="font-heading text-sm uppercase tracking-[0.08em] text-white">{title}</span>
        {open ? (
          <ChevronUp size={16} className="text-white/50" aria-hidden="true" />
        ) : (
          <ChevronDown size={16} className="text-white/50" aria-hidden="true" />
        )}
      </button>
      {open && <div className="space-y-2">{children}</div>}
    </div>
  );
}

function toWildCardRankingShape(result: TournamentSimulationResult): WildCardRanking[] {
  return result.wildCardRanking.map((e) => ({
    _id: `sim-wc-${e.rank}`,
    year: 0,
    type: "mcgregor",
    rank: e.rank,
    teamName: e.teamName,
    pool: e.pool,
    points: e.wins * 2 + e.ties,
    wins: e.wins,
    losses: e.losses,
    ties: e.ties,
    runDifferential: e.runDifferential,
    advanced: e.advanced,
  }));
}

export default function TournamentSimulator({ standings, seasonGames }: { standings: Standing[]; seasonGames: Game[] }) {
  const [result, setResult] = useState<TournamentSimulationResult | null>(null);
  const [running, setRunning] = useState(false);

  function handleSimulate() {
    setRunning(true);
    // Tiny delay purely for suspense — the computation itself is instant.
    setTimeout(() => {
      setResult(simulateTournament(standings, seasonGames));
      setRunning(false);
    }, 650);
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleSimulate}
        disabled={running}
        className="mx-auto flex w-full max-w-sm items-center justify-center gap-2 rounded-full bg-brand py-3.5 text-sm font-bold uppercase tracking-wide text-white shadow-lg transition-all hover:bg-brand-700 active:scale-[0.98] disabled:opacity-60"
      >
        {running ? (
          <Loader2 size={18} className="animate-spin" aria-hidden="true" />
        ) : (
          <Dices size={18} aria-hidden="true" />
        )}
        {running ? "Simulating…" : result ? "Simulate Again" : "Simulate the Tournament"}
      </button>

      {result && !running && (
        <div className="mt-8">
          <div className="mx-auto mb-8 max-w-md rounded-2xl border-2 border-brand bg-[#0d0d0e] p-6 text-center shadow-xl">
            <Trophy size={32} className="mx-auto mb-2 text-brand" aria-hidden="true" />
            <p className="text-[11px] uppercase tracking-[0.14em] text-white/50">Simulated Champion</p>
            <p className="mt-1 font-heading text-2xl uppercase text-white">{result.champion}</p>
            <p className="mt-2 text-xs text-white/40">
              Final: {result.final.homeTeam} {result.final.homeScore} &ndash; {result.final.awayScore}{" "}
              {result.final.awayTeam}
            </p>
          </div>

          <div className="mx-auto max-w-2xl">
            <Section title="Playdowns">
              <BracketRow game={result.final} />
              {result.semiFinals.map((g) => (
                <BracketRow key={g.label} game={g} />
              ))}
              {result.quarterFinals.map((g) => (
                <BracketRow key={g.label} game={g} />
              ))}
              {result.wildCardRoundGames.map((g) => (
                <BracketRow key={g.label} game={g} />
              ))}
            </Section>

            <Section title="Division Winners (bye to Quarter Finals)">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {result.divisionWinners.map((dw) => (
                  <div key={dw.pool} className="rounded-xl border border-white/10 bg-[#0d0d0e] p-3 text-center">
                    <p className="text-[10px] uppercase tracking-wide text-white/40">Pool {dw.pool}</p>
                    <p className="mt-1 truncate text-sm font-bold text-white">{dw.teamName}</p>
                    <p className="mt-1 font-mono-brand text-[11px] text-white/40">
                      {dw.wins}-{dw.losses}-{dw.ties} &middot;{" "}
                      {dw.runDifferential > 0 ? `+${dw.runDifferential}` : dw.runDifferential}
                    </p>
                  </div>
                ))}
              </div>
            </Section>

            <Section title="Wild Card Ranking">
              <WildCardRankingsTable rankings={toWildCardRankingShape(result)} />
            </Section>

            <Section title="All Round Robin Games (Thu–Sat)" defaultOpen={false}>
              {result.roundRobinGames.map((g, i) => (
                <BracketRow key={i} game={g} />
              ))}
            </Section>
          </div>
        </div>
      )}
    </div>
  );
}

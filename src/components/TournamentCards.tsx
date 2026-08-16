import Link from "next/link";
import type { TournamentResult, TournamentType } from "@/lib/types";
import { TOURNAMENT_LABELS } from "@/lib/tournamentDisplay";

function TournamentCard({
  year,
  type,
  result,
}: {
  year: number;
  type: TournamentType;
  result: TournamentResult | null;
}) {
  const label = TOURNAMENT_LABELS[type];
  const isCancelled = Boolean(result?.cancelled);
  const isPending = !isCancelled && !result?.champion;

  return (
    <div className="rounded-lg border-l-4 border-brand bg-[#1a1a1a] px-4 py-3.5 text-white sm:px-5 sm:py-4">
      <p className="font-mono-brand text-[9.5px] uppercase tracking-[0.14em] text-white/50">{label.trophy}</p>
      <h3 className="mt-1 font-heading text-base uppercase leading-tight tracking-[0.01em] text-white sm:text-lg">
        {label.short}
      </h3>

      {isCancelled ? (
        <p className="mt-2 text-sm italic text-gray-400">Not held in {year}</p>
      ) : isPending ? (
        <p className="mt-2 text-sm italic text-gray-400">Pending</p>
      ) : (
        <p className="mt-2 text-base font-bold text-brand sm:text-lg">{result!.champion}</p>
      )}

      {isPending || isCancelled ? (
        <span className="mt-2.5 inline-block text-sm text-gray-500">&mdash;</span>
      ) : (
        <Link
          href={`/schedule/tournament/${year}/${type}`}
          className="mt-2.5 inline-flex items-center gap-1 text-sm font-semibold text-brand hover:underline"
        >
          View full results &rarr;
        </Link>
      )}
    </div>
  );
}

export default function TournamentCards({
  year,
  charity,
  mcgregor,
}: {
  year: number;
  charity: TournamentResult | null;
  mcgregor: TournamentResult | null;
}) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <TournamentCard year={year} type="charity" result={charity} />
      <TournamentCard year={year} type="mcgregor" result={mcgregor} />
    </div>
  );
}

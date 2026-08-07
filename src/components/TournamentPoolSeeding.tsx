import type { TournamentPool } from "@/lib/types";

export default function TournamentPoolSeeding({ pools }: { pools: TournamentPool[] }) {
  if (pools.length === 0) return null;

  return (
    <div className="no-scrollbar -mx-5 flex gap-4 overflow-x-auto px-5 pb-1 sm:mx-0 sm:justify-center sm:px-0">
      {pools.map((pool) => (
        <div key={pool._id} className="w-56 shrink-0 overflow-hidden rounded-xl border shadow-sm">
          <div className="bg-brand px-4 py-2 text-center">
            <p className="font-heading text-sm uppercase tracking-[0.08em] text-white">Pool {pool.poolLetter}</p>
          </div>
          <ol className="divide-y bg-white">
            {pool.teams.map((team, i) => (
              <li key={team} className="flex items-center gap-3 px-4 py-2">
                <span className="font-mono-brand text-xs text-gray-400">{i + 1}</span>
                <span className="text-sm text-black">{team}</span>
              </li>
            ))}
          </ol>
        </div>
      ))}
    </div>
  );
}

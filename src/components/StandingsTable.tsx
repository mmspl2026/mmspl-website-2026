import type { Standing } from "@/lib/types";

export default function StandingsTable({
  standings,
  year,
  alwaysFullName = false,
}: {
  standings: Standing[];
  year: number;
  /** Skip the mobile short-name / desktop full-name toggle and always render the full team name. */
  alwaysFullName?: boolean;
}) {
  if (standings.length === 0) {
    return <p className="text-black/60">No standings posted for this season yet.</p>;
  }

  const gamesPlayed = Math.max(...standings.map((s) => s.wins + s.losses + s.ties));

  return (
    <div className="mb-8 rounded-xl border bg-white text-black shadow">
      <div className="flex flex-col space-y-1.5 rounded-t-xl bg-gradient-to-r from-black to-gray-900 p-6 text-white">
        <div className="font-semibold leading-none tracking-tight">{year} Regular Season Standings</div>
        <p className="text-sm text-gray-300">Final standings after {gamesPlayed} games played</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <caption className="sr-only">League standings, sorted by points.</caption>
          <thead className="bg-gray-100">
            <tr>
              <th scope="col" className="px-1.5 py-2.5 text-left text-sm font-bold text-gray-700 md:px-3 md:py-4">
                Rank
              </th>
              <th scope="col" className="px-1.5 py-2.5 text-left text-sm font-bold text-gray-700 md:px-3 md:py-4">
                Team
              </th>
              <th scope="col" className="px-1.5 py-2.5 text-center text-sm font-bold text-gray-700 md:px-3 md:py-4">
                GP
              </th>
              <th scope="col" className="px-1.5 py-2.5 text-center text-sm font-bold text-gray-700 md:px-3 md:py-4">
                W
              </th>
              <th scope="col" className="px-1.5 py-2.5 text-center text-sm font-bold text-gray-700 md:px-3 md:py-4">
                L
              </th>
              <th scope="col" className="px-1.5 py-2.5 text-center text-sm font-bold text-gray-700 md:px-3 md:py-4">
                T
              </th>
              <th scope="col" className="px-1.5 py-2.5 text-center text-sm font-bold text-gray-700 md:px-3 md:py-4">
                D
              </th>
              <th scope="col" className="px-1.5 py-2.5 text-center text-sm font-bold text-gray-700 md:px-3 md:py-4">
                PTS
              </th>
            </tr>
          </thead>
          <tbody>
            {standings.map((row, i) => {
              const rank = i + 1;
              const gp = row.wins + row.losses + row.ties;
              const points = row.wins * 2 + row.ties;
              return (
                <tr key={row._id} className="border-b transition-colors hover:bg-gray-50">
                  <td className="px-1.5 py-2.5 font-mono-brand md:px-3 md:py-4">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-black">{rank}</span>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-1.5 py-2.5 font-mono-brand text-sm font-bold text-black md:px-3 md:py-4">
                    {alwaysFullName ? (
                      row.team.name
                    ) : (
                      <>
                        <span className="md:hidden">{row.team.shortName?.trim() || row.team.name.split(/\s+/)[0]}</span>
                        <span className="hidden md:inline">{row.team.name}</span>
                      </>
                    )}
                  </td>
                  <td className="px-1.5 py-2.5 text-center font-mono-brand font-semibold text-gray-700 md:px-3 md:py-4">
                    {gp}
                  </td>
                  <td className="px-1.5 py-2.5 text-center font-mono-brand font-bold text-green-600 md:px-3 md:py-4">
                    {row.wins}
                  </td>
                  <td className="px-1.5 py-2.5 text-center font-mono-brand font-bold text-red-600 md:px-3 md:py-4">
                    {row.losses}
                  </td>
                  <td className="px-1.5 py-2.5 text-center font-mono-brand font-bold text-gray-600 md:px-3 md:py-4">
                    {row.ties}
                  </td>
                  <td className="px-1.5 py-2.5 text-center font-mono-brand font-bold text-orange-600 md:px-3 md:py-4">
                    {row.defaults ?? 0}
                  </td>
                  <td className="px-1.5 py-2.5 text-center font-mono-brand text-xl font-bold text-black md:px-3 md:py-4">
                    {points}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

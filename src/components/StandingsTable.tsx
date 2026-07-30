import type { Standing } from "@/lib/types";
import TeamMark from "./TeamMark";
import clsx from "clsx";

export default function StandingsTable({
  standings,
  playoffCutoff,
}: {
  standings: Standing[];
  playoffCutoff: number;
}) {
  if (standings.length === 0) {
    return <p className="text-black/60">No standings posted for this season yet.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-black/10">
      <table className="w-full min-w-[560px] border-collapse text-sm">
        <caption className="sr-only">
          League standings, sorted by winning percentage. The top {playoffCutoff} teams qualify for playoffs.
        </caption>
        <thead>
          <tr className="bg-black text-white">
            <th scope="col" className="px-4 py-3 text-left font-heading font-normal uppercase tracking-wide">
              #
            </th>
            <th scope="col" className="px-4 py-3 text-left font-heading font-normal uppercase tracking-wide">
              Team
            </th>
            <th scope="col" className="px-4 py-3 text-center font-heading font-normal uppercase tracking-wide">
              W
            </th>
            <th scope="col" className="px-4 py-3 text-center font-heading font-normal uppercase tracking-wide">
              L
            </th>
            <th scope="col" className="px-4 py-3 text-center font-heading font-normal uppercase tracking-wide">
              T
            </th>
            <th scope="col" className="px-4 py-3 text-center font-heading font-normal uppercase tracking-wide">
              Pts
            </th>
            <th scope="col" className="px-4 py-3 text-center font-heading font-normal uppercase tracking-wide">
              Run Diff
            </th>
          </tr>
        </thead>
        <tbody>
          {standings.map((row, i) => {
            const rank = i + 1;
            const points = row.wins * 2 + row.ties;
            const isLastPlayoffSpot = rank === playoffCutoff;
            return (
              <tr
                key={row._id}
                className={clsx(
                  "border-b border-black/10 last:border-0",
                  isLastPlayoffSpot && "border-b-4 border-b-brand"
                )}
              >
                <td className="px-4 py-3 text-black/60">{rank}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <TeamMark team={row.team} size={24} />
                    <span className="font-medium">{row.team.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-center">{row.wins}</td>
                <td className="px-4 py-3 text-center">{row.losses}</td>
                <td className="px-4 py-3 text-center">{row.ties}</td>
                <td className="px-4 py-3 text-center font-semibold">{points}</td>
                <td
                  className={clsx(
                    "px-4 py-3 text-center",
                    row.runDifferential > 0 && "text-green-700",
                    row.runDifferential < 0 && "text-brand-700"
                  )}
                >
                  {row.runDifferential > 0 ? `+${row.runDifferential}` : row.runDifferential}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="border-t border-black/10 bg-brand-50 px-4 py-2 text-xs text-brand-700">
        <span className="mr-2 inline-block h-2 w-4 align-middle bg-brand" aria-hidden="true" /> Top {playoffCutoff} teams
        make the playoffs.
      </p>
    </div>
  );
}

"use client";

import { ChevronDown } from "lucide-react";
import type { Standing } from "@/lib/types";

export default function AdminStandingsPanel({ standings }: { standings: Standing[] }) {
  return (
    <details className="group rounded-lg border border-white/10 bg-[#1a1a1a] text-white">
      <summary className="flex cursor-pointer list-none items-center justify-between p-4">
        <span className="text-sm font-heading uppercase tracking-wide">Current Standings</span>
        <ChevronDown size={18} className="transition-transform group-open:rotate-180" aria-hidden="true" />
      </summary>
      <div className="border-t border-white/10 p-4">
        {standings.length === 0 ? (
          <p className="text-sm text-white/50">No standings yet — save some Final games or hit Sync Standings.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[420px] text-sm">
              <caption className="sr-only">Current league standings</caption>
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-white/40">
                  <th scope="col" className="py-1 pr-2">#</th>
                  <th scope="col" className="py-1 pr-2">Team</th>
                  <th scope="col" className="px-2 py-1 text-center">W</th>
                  <th scope="col" className="px-2 py-1 text-center">L</th>
                  <th scope="col" className="px-2 py-1 text-center">T</th>
                  <th scope="col" className="py-1 pl-2 text-center">Diff</th>
                </tr>
              </thead>
              <tbody>
                {standings.map((row, i) => (
                  <tr key={row._id} className="border-t border-white/5">
                    <td className="py-1.5 pr-2 text-white/50">{i + 1}</td>
                    <td className="py-1.5 pr-2">{row.team.name}</td>
                    <td className="px-2 py-1.5 text-center">{row.wins}</td>
                    <td className="px-2 py-1.5 text-center">{row.losses}</td>
                    <td className="px-2 py-1.5 text-center">{row.ties}</td>
                    <td className="py-1.5 pl-2 text-center">
                      {row.runDifferential > 0 ? `+${row.runDifferential}` : row.runDifferential}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </details>
  );
}

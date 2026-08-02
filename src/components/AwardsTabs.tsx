"use client";

import { useState } from "react";
import { Trophy, Users } from "lucide-react";
import clsx from "clsx";
import { AWARD_TABS, type AwardTab, type AwardCategoryConfig } from "@/lib/awardCategories";

export interface CategoryGroup {
  category: string;
  config: AwardCategoryConfig;
  entries: { year: number; winner: string }[];
}

function AwardCategoryCard({ group }: { group: CategoryGroup }) {
  const { config, entries } = group;
  return (
    <div className="rounded-xl border bg-white text-black shadow">
      <div
        className={clsx(
          "flex flex-col space-y-1.5 rounded-t-xl p-6 text-white",
          config.headerGradient === "dark" ? "bg-gradient-to-r from-black to-gray-900" : "bg-gradient-to-r from-red-600 to-red-700"
        )}
      >
        <div className="flex items-center gap-3">
          <Trophy size={32} className="shrink-0 text-yellow-500" aria-hidden="true" />
          <div>
            <div className="text-2xl font-semibold tracking-tight">{config.displayTitle}</div>
            <p className="mt-1 text-sm text-gray-300">{config.subtitle}</p>
          </div>
        </div>
      </div>
      <div className="p-6">
        <p className="mb-4 text-gray-700">{config.description}</p>
        <div className="max-h-96 overflow-y-auto rounded-lg border">
          <table className="w-full">
            <thead className="sticky top-0 bg-gray-100">
              <tr>
                <th className="px-4 py-2 text-left text-sm font-bold">Year</th>
                <th className="px-4 py-2 text-left text-sm font-bold">{config.columnLabel}</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr
                  key={e.year}
                  className={clsx("border-b hover:bg-gray-50", e.winner === "Not Awarded" && "text-gray-400")}
                >
                  <td className="px-4 py-2 font-semibold">{e.year}</td>
                  <td className="px-4 py-2">{e.winner}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function HonoraryMembersCard() {
  return (
    <div className="rounded-xl border bg-white text-black shadow">
      <div className="flex flex-col space-y-1.5 rounded-t-xl bg-gradient-to-r from-black to-gray-900 p-6 text-white">
        <div className="flex items-center gap-3">
          <Users size={32} className="shrink-0 text-yellow-500" aria-hidden="true" />
          <div className="text-2xl font-semibold tracking-tight">MMSPL Honorary Members</div>
        </div>
      </div>
      <div className="p-6">
        <p className="mb-4 leading-relaxed text-gray-700">
          In order to permanently recognize individuals who, through personal involvement with the league, have
          contributed to its growth, organization or enjoyment by its members, the league offers a status of
          honourary membership.
        </p>
        <p className="leading-relaxed text-gray-700">
          This membership entitles the individual to participate in all social activities of the league that would
          otherwise be restricted to league members. The full list of honorary members is being migrated — check
          back soon.
        </p>
      </div>
    </div>
  );
}

export default function AwardsTabs({ groups }: { groups: CategoryGroup[] }) {
  const [tab, setTab] = useState<AwardTab>("championships");

  const groupsByTab = groups.reduce<Record<string, CategoryGroup[]>>((acc, g) => {
    (acc[g.config.tab] ??= []).push(g);
    return acc;
  }, {});

  return (
    <div>
      <div
        role="tablist"
        className="mb-8 grid h-auto w-full grid-cols-2 items-center justify-center gap-1 rounded-lg bg-gray-100 p-1 lg:h-9 lg:grid-cols-5"
      >
        {AWARD_TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={clsx(
              "rounded-md px-3 py-1 text-sm font-medium transition-all",
              tab === t.id ? "bg-white text-black shadow" : "text-gray-600"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="space-y-8">
        {tab === "honorary" ? (
          <HonoraryMembersCard />
        ) : (groupsByTab[tab] ?? []).length === 0 ? (
          <p className="py-8 text-center text-sm text-black/60">No awards recorded in this category yet.</p>
        ) : (
          groupsByTab[tab].map((g) => <AwardCategoryCard key={g.category} group={g} />)
        )}
      </div>
    </div>
  );
}

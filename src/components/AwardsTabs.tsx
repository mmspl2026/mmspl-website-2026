"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import clsx from "clsx";
import type { SanityImageWithAlt } from "@/lib/types";
import { urlFor } from "@/lib/sanity/image";
import { AWARD_CATEGORY_DISPLAY_TITLE, HONORARY_MEMBERS, HONORARY_MEMBERS_DESCRIPTION } from "@/lib/awardCategories";

export interface CategoryGroup {
  category: string;
  entries: { year: number; winner: string; photo?: SanityImageWithAlt }[];
  photo?: SanityImageWithAlt;
  description?: string;
  namedAfter?: string;
}

const HONORARY_TAB_ID = "__honorary__";

function FeaturedWinnerCard({ group }: { group: CategoryGroup }) {
  const featured = group.entries[0];
  const displayTitle = AWARD_CATEGORY_DISPLAY_TITLE[group.category] ?? group.category;
  const photo = featured?.photo || group.photo;

  if (!featured) {
    return (
      <div className="rounded-xl border border-white/10 bg-[#0d0d0e] p-8 text-center text-white/60">
        No winner recorded yet for this award.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-white/10 bg-[#0d0d0e] text-white shadow">
      <div className="flex flex-col gap-6 p-6 sm:flex-row sm:items-center sm:p-8">
        {photo && (
          <div className="mx-auto flex h-64 w-56 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white/5 sm:mx-0 sm:h-80 sm:w-64">
            <Image
              src={urlFor(photo).width(500).height(700).fit("max").url()}
              alt={photo.alt || featured.winner}
              width={500}
              height={700}
              className="h-full w-full object-contain"
            />
          </div>
        )}
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand">{featured.year} Winner</p>
          <h2 className="mt-2 font-heading text-3xl uppercase leading-none tracking-[0.01em] text-white sm:text-4xl">
            {featured.winner}
          </h2>
          <p className="mt-2 text-sm text-white/60">{displayTitle}</p>
        </div>
      </div>
    </div>
  );
}

function AwardDescription({ group }: { group: CategoryGroup }) {
  if (!group.description && !group.namedAfter) return null;
  return (
    <div className="rounded-xl border bg-white p-6 text-black shadow-sm">
      {group.description && <p className="leading-relaxed text-gray-700">{group.description}</p>}
      {group.namedAfter && <p className="mt-2 text-sm italic text-gray-500">{group.namedAfter}</p>}
    </div>
  );
}

function HistoryTable({ group }: { group: CategoryGroup }) {
  return (
    <div className="overflow-hidden rounded-xl border shadow-sm">
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-[#0d0d0e] text-white">
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.1em]">Year</th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.1em]">Winner</th>
          </tr>
        </thead>
        <tbody>
          {group.entries.map((e, i) => (
            <tr key={e.year} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
              <td className="px-4 py-2.5 font-mono-brand text-sm text-gray-500">{e.year}</td>
              <td
                className={clsx(
                  "px-4 py-2.5 text-sm",
                  e.winner === "Not Awarded" ? "text-gray-400" : "font-medium text-black"
                )}
              >
                {e.winner}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function HonoraryMembersPanel() {
  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-xl border border-white/10 bg-[#0d0d0e] text-white shadow">
        <div className="p-6 sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand">MMSPL</p>
          <h2 className="mt-2 font-heading text-3xl uppercase leading-none tracking-[0.01em] text-white sm:text-4xl">
            Honorary Members
          </h2>
        </div>
      </div>
      <div className="rounded-xl border bg-white p-6 text-black shadow-sm">
        <p className="leading-relaxed text-gray-700">{HONORARY_MEMBERS_DESCRIPTION}</p>
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        {HONORARY_MEMBERS.map((name) => (
          <div
            key={name}
            className="rounded-xl border bg-white px-4 py-5 text-center shadow-sm transition-shadow hover:shadow-md"
          >
            <p className="font-heading text-base uppercase tracking-[0.01em] text-black">{name}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AwardsTabs({ groups }: { groups: CategoryGroup[] }) {
  const [activeCategory, setActiveCategory] = useState<string>(HONORARY_TAB_ID);
  const scrollerRef = useRef<HTMLDivElement>(null);

  const activeGroup = groups.find((g) => g.category === activeCategory);

  function scrollTabs(direction: -1 | 1) {
    scrollerRef.current?.scrollBy({ left: direction * 240, behavior: "smooth" });
  }

  return (
    <div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => scrollTabs(-1)}
          aria-label="Scroll categories left"
          className="hidden shrink-0 items-center justify-center rounded-full border border-gray-300 bg-white p-2 text-black transition-colors hover:border-gray-400 hover:bg-gray-50 sm:flex"
        >
          <ChevronLeft size={18} aria-hidden="true" />
        </button>

        <div
          ref={scrollerRef}
          role="tablist"
          aria-label="Award categories"
          className="no-scrollbar -mx-5 flex flex-1 gap-2 overflow-x-auto px-5 pb-1 sm:mx-0 sm:px-0"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeCategory === HONORARY_TAB_ID}
            onClick={() => setActiveCategory(HONORARY_TAB_ID)}
            className={clsx(
              "shrink-0 whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition-colors",
              activeCategory === HONORARY_TAB_ID
                ? "bg-brand text-white"
                : "border border-gray-300 bg-white text-black hover:border-gray-400"
            )}
          >
            Honorary Members
          </button>
          {groups.map((g) => (
            <button
              key={g.category}
              type="button"
              role="tab"
              aria-selected={activeCategory === g.category}
              onClick={() => setActiveCategory(g.category)}
              className={clsx(
                "shrink-0 whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition-colors",
                activeCategory === g.category
                  ? "bg-brand text-white"
                  : "border border-gray-300 bg-white text-black hover:border-gray-400"
              )}
            >
              {g.category}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => scrollTabs(1)}
          aria-label="Scroll categories right"
          className="hidden shrink-0 items-center justify-center rounded-full border border-gray-300 bg-white p-2 text-black transition-colors hover:border-gray-400 hover:bg-gray-50 sm:flex"
        >
          <ChevronRight size={18} aria-hidden="true" />
        </button>
      </div>

      <div className="mt-8 space-y-6">
        {activeCategory === HONORARY_TAB_ID ? (
          <HonoraryMembersPanel />
        ) : activeGroup ? (
          <>
            <FeaturedWinnerCard group={activeGroup} />
            <AwardDescription group={activeGroup} />
            <HistoryTable group={activeGroup} />
          </>
        ) : (
          <p className="py-8 text-center text-sm text-black/60">No awards recorded in this category yet.</p>
        )}
      </div>
    </div>
  );
}

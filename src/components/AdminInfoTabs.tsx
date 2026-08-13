"use client";

import { useRef, useState } from "react";
import { Eye, Download, FileText } from "lucide-react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import clsx from "clsx";
import type { LeagueExecutive, TeamRepresentative, LeagueDocument } from "@/lib/types";

const DOCUMENT_CATEGORIES = ["Rules & Regulations", "AGM Documents", "General"] as const;

const TABS = ["Executives", ...DOCUMENT_CATEGORIES] as const;

type TabId = (typeof TABS)[number];

function ExecutivesPanel({
  executives,
  reps,
}: {
  executives: LeagueExecutive[];
  reps: TeamRepresentative[];
}) {
  return (
    <div>
      <h3 className="mb-4 font-heading text-xl uppercase tracking-[0.01em] text-black">2026 Executives</h3>
      <div className="mb-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {executives.map((e) => (
          <div
            key={e._id}
            className="rounded-xl border border-gray-200 bg-white px-5 py-3 transition-all hover:border-red-200"
          >
            <p className="font-mono-brand mb-1 text-[9px] uppercase tracking-[0.14em] text-brand">{e.role}</p>
            <p className="text-sm font-bold text-gray-900">{e.name}</p>
          </div>
        ))}
      </div>

      <h3 className="mb-4 font-heading text-xl uppercase tracking-[0.01em] text-black">
        2026 Executive Council &mdash; Team Representatives
      </h3>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {reps.map((r) => (
          <div
            key={r._id}
            className="rounded-xl border border-gray-200 bg-white px-5 py-3 transition-all hover:border-red-200"
          >
            <p className="text-sm font-bold text-gray-900">{r.repName}</p>
            <p className="mt-0.5 text-xs font-semibold text-brand">{r.team?.name}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function DocumentsPanel({ documents }: { documents: LeagueDocument[] }) {
  if (documents.length === 0) {
    return (
      <div className="py-16 text-center">
        <FileText className="mx-auto mb-3 h-14 w-14 text-gray-200" aria-hidden="true" />
        <p className="text-gray-400">No documents found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {documents.map((doc) => {
        const fileUrl = doc.file?.asset?.url;
        return (
          <div
            key={doc._id}
            className="rounded-xl border border-gray-200 bg-white px-4 py-3 transition-all hover:border-red-200 hover:shadow-sm"
          >
            <div className="flex items-center gap-3">
              {doc.badge && (
                <span
                  className={`flex-shrink-0 rounded-full px-2 py-0.5 text-xs font-bold ${
                    doc.badge === "PASSED"
                      ? "bg-green-100 text-green-700"
                      : doc.badge === "FAILED"
                        ? "bg-red-100 text-red-600"
                        : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {doc.badge}
                </span>
              )}
              <p className="min-w-0 flex-1 truncate text-sm font-semibold leading-snug text-gray-900">{doc.title}</p>
              <div className="flex flex-shrink-0 gap-1.5">
                {fileUrl ? (
                  <>
                    <a
                      href={fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex h-7 items-center justify-center rounded-md border border-gray-300 px-2 text-xs text-gray-700 transition-colors hover:border-red-600 hover:text-red-600"
                      aria-label={`View ${doc.title}`}
                    >
                      <Eye className="h-3 w-3" aria-hidden="true" />
                    </a>
                    <a
                      href={fileUrl}
                      download
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex h-7 items-center justify-center rounded-md bg-red-600 px-2 text-xs text-white transition-colors hover:bg-red-700"
                      aria-label={`Download ${doc.title}`}
                    >
                      <Download className="h-3 w-3" aria-hidden="true" />
                    </a>
                  </>
                ) : (
                  <span className="text-xs italic text-gray-400">Coming soon</span>
                )}
              </div>
            </div>
            {doc.description && (
              <p className="mt-1.5 line-clamp-2 text-xs leading-snug text-gray-500">{doc.description}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function AdminInfoTabs({
  executives,
  reps,
  documents,
}: {
  executives: LeagueExecutive[];
  reps: TeamRepresentative[];
  documents: LeagueDocument[];
}) {
  const [tab, setTab] = useState<TabId>("Executives");
  const scrollerRef = useRef<HTMLDivElement>(null);

  function scrollTabs(direction: -1 | 1) {
    scrollerRef.current?.scrollBy({ left: direction * 240, behavior: "smooth" });
  }

  // Mobile only: bring the newly-selected tab into view within the scroller
  // (not the page — direct scrollLeft math, same reasoning as the date pills).
  // Seeing the tab shift into focus is what tells the reader there's more to scroll.
  function selectTab(id: TabId, button: HTMLButtonElement) {
    setTab(id);
    const scroller = scrollerRef.current;
    if (!scroller || window.innerWidth >= 640) return;
    scroller.scrollTo({ left: button.offsetLeft - scroller.offsetLeft, behavior: "smooth" });
  }

  return (
    <div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => scrollTabs(-1)}
          aria-label="Scroll sections left"
          className="hidden shrink-0 items-center justify-center rounded-full border border-gray-300 bg-white p-2 text-black transition-colors hover:border-gray-400 hover:bg-gray-50 sm:flex"
        >
          <ChevronLeft size={18} aria-hidden="true" />
        </button>

        <div
          ref={scrollerRef}
          role="tablist"
          aria-label="Admin sections"
          className="no-scrollbar -mx-5 flex flex-1 gap-2 overflow-x-auto px-5 pb-1 sm:mx-0 sm:justify-center sm:px-0"
        >
          {TABS.map((t) => (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={tab === t}
              onClick={(e) => selectTab(t, e.currentTarget)}
              className={clsx(
                "shrink-0 whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition-colors",
                tab === t ? "bg-brand text-white" : "border border-gray-300 bg-white text-black hover:border-gray-400"
              )}
            >
              {t}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => scrollTabs(1)}
          aria-label="Scroll sections right"
          className="hidden shrink-0 items-center justify-center rounded-full border border-gray-300 bg-white p-2 text-black transition-colors hover:border-gray-400 hover:bg-gray-50 sm:flex"
        >
          <ChevronRight size={18} aria-hidden="true" />
        </button>
      </div>

      <div className="mt-8">
        {tab === "Executives" ? (
          <ExecutivesPanel executives={executives} reps={reps} />
        ) : (
          <DocumentsPanel documents={documents.filter((d) => d.category === tab)} />
        )}
      </div>
    </div>
  );
}

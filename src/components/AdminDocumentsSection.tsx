"use client";

import { useMemo, useState } from "react";
import { Eye, Download, FileText } from "lucide-react";
import type { LeagueDocument } from "@/lib/types";

const CATEGORIES = ["Rules & Regulations", "AGM Documents", "General"] as const;

export default function AdminDocumentsSection({ documents }: { documents: LeagueDocument[] }) {
  const [category, setCategory] = useState<string>("all");

  const visible = category === "all" ? documents : documents.filter((d) => d.category === category);

  const grouped = useMemo(() => {
    const byCategory: Record<string, LeagueDocument[]> = {};
    for (const cat of CATEGORIES) {
      const items = visible.filter((d) => d.category === cat);
      if (items.length > 0) byCategory[cat] = items;
    }
    return byCategory;
  }, [visible]);

  return (
    <div id="documents">
      <h2 className="mb-2 font-sans text-2xl font-bold normal-case tracking-normal text-black">Official Documents</h2>
      <div className="mb-8 h-1 w-16 bg-red-600" />

      <div className="mb-8 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          <label htmlFor="doc-category-filter" className="whitespace-nowrap text-sm font-semibold">
            Filter:
          </label>
          <select
            id="doc-category-filter"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="h-9 w-52 rounded-md border-2 border-red-600 bg-white px-3 text-sm text-black focus:outline-none"
          >
            <option value="all">All Documents</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="py-16 text-center">
          <FileText className="mx-auto mb-3 h-14 w-14 text-gray-200" aria-hidden="true" />
          <p className="text-gray-400">No documents found.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(grouped).map(([cat, items]) => (
            <div key={cat}>
              <h3 className="mb-3 flex items-center gap-2 font-sans text-sm font-bold uppercase tracking-widest text-gray-400">
                <span className="h-px w-8 bg-gray-300" />
                {cat}
                <span className="text-xs font-normal normal-case">({items.length})</span>
              </h3>
              <div className="space-y-2">
                {items.map((doc) => {
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
                              doc.badge === "PASSED" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"
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
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

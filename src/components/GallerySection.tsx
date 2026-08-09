"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { ZoomIn, ChevronLeft, ChevronRight, X } from "lucide-react";
import type { PublicGalleryPhoto } from "@/lib/types";
import { urlFor } from "@/lib/sanity/image";

interface Photo {
  id: string;
  url: string;
  width: number;
  height: number;
  caption: string;
  category: string;
  year: number;
}

function toPhoto(p: PublicGalleryPhoto): Photo | null {
  const dims = p.image?.asset?.metadata?.dimensions;
  if (!p.image?.asset || !dims) return null;
  return {
    id: p._id,
    url: urlFor(p.image).width(900).auto("format").url(),
    width: dims.width,
    height: dims.height,
    caption: p.caption || "",
    category: p.category || "General",
    // `p.date` is a plain "YYYY-MM-DD" string — parsing it with `new Date()`
    // reads it as UTC midnight, and .getFullYear() reports it back in the
    // local timezone, which rolls back to the previous year everywhere west
    // of UTC (e.g. Eastern Time). Read the year directly from the string.
    year: p.date ? Number(p.date.slice(0, 4)) : new Date().getFullYear(),
  };
}

export default function GallerySection({
  photos: rawPhotos,
  categories: initialCategories,
}: {
  photos: PublicGalleryPhoto[];
  categories: string[];
}) {
  const photos = useMemo(() => rawPhotos.map(toPhoto).filter((p): p is Photo => p !== null), [rawPhotos]);
  const categories = useMemo(() => ["All", ...initialCategories], [initialCategories]);

  const [categoryFilter, setCategoryFilter] = useState("All");
  const [yearFilter, setYearFilter] = useState("All");
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [brokenIds, setBrokenIds] = useState<Set<string>>(new Set());

  const years = useMemo(
    () => ["All", ...Array.from(new Set(photos.map((p) => p.year))).sort((a, b) => b - a)],
    [photos]
  );

  const filtered = useMemo(
    () =>
      photos.filter(
        (p) =>
          !brokenIds.has(p.id) &&
          (categoryFilter === "All" || p.category === categoryFilter) &&
          (yearFilter === "All" || p.year === Number(yearFilter))
      ),
    [photos, brokenIds, categoryFilter, yearFilter]
  );

  const lightboxPhoto = lightboxIndex !== null ? filtered[lightboxIndex] : null;

  return (
    <div className="mx-auto max-w-7xl px-5 py-12">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <div role="tablist" aria-label="Photo categories" className="flex flex-wrap gap-2">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              role="tab"
              aria-selected={categoryFilter === cat}
              onClick={() => setCategoryFilter(cat)}
              className={
                "shrink-0 whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition-colors " +
                (categoryFilter === cat
                  ? "bg-brand text-white"
                  : "border border-gray-300 bg-white text-black hover:border-gray-400")
              }
            >
              {cat}
            </button>
          ))}
        </div>
        <select
          value={yearFilter}
          onChange={(e) => setYearFilter(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:border-red-600 focus:border-red-600 focus:outline-none"
        >
          {years.map((y) => (
            <option key={y} value={y}>
              {y === "All" ? "All Years" : y}
            </option>
          ))}
        </select>
      </div>

      <p className="mb-6 text-sm text-gray-400">
        {filtered.length} photo{filtered.length !== 1 ? "s" : ""}
      </p>

      {filtered.length === 0 ? (
        <div className="py-20 text-center text-gray-400">
          <p className="text-lg">No photos for this filter.</p>
        </div>
      ) : (
        <div className="columns-1 gap-4 space-y-4 sm:columns-2 lg:columns-3">
          {filtered.map((photo, i) => (
            <div
              key={photo.id}
              onClick={() => setLightboxIndex(i)}
              className="group relative cursor-pointer overflow-hidden rounded-xl shadow-sm transition-all duration-300 hover:shadow-xl [break-inside:avoid]"
            >
              <Image
                src={photo.url}
                alt={photo.caption}
                width={photo.width}
                height={photo.height}
                className="h-auto w-full object-cover transition-transform duration-500 group-hover:scale-105"
                sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                onError={() => setBrokenIds((prev) => new Set([...prev, photo.id]))}
              />
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/0 transition-all duration-300 group-hover:bg-black/50">
                <ZoomIn className="mb-2 h-8 w-8 text-white opacity-0 transition-opacity duration-300 group-hover:opacity-100" aria-hidden="true" />
                <span className="px-3 text-center text-xs font-semibold text-white opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                  {photo.caption.split(" — ")[0]}
                </span>
              </div>
              <div className="absolute left-2 top-2 flex gap-1">
                <span className="rounded-full bg-red-600 px-2 py-0.5 text-xs font-bold text-white">{photo.category}</span>
                <span className="rounded-full bg-black/60 px-2 py-0.5 text-xs text-white">{photo.year}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {lightboxPhoto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/95"
          onClick={() => setLightboxIndex(null)}
        >
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setLightboxIndex((idx) => (idx! - 1 + filtered.length) % filtered.length);
            }}
            className="absolute left-4 top-1/2 z-10 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
            aria-label="Previous photo"
          >
            <ChevronLeft className="h-6 w-6" aria-hidden="true" />
          </button>

          <div className="w-full max-w-5xl px-16" onClick={(e) => e.stopPropagation()}>
            <img src={lightboxPhoto.url} alt={lightboxPhoto.caption} className="max-h-[75vh] w-full rounded-lg object-contain" />
            <div className="mt-4 text-center">
              <div className="mb-2 flex justify-center gap-2">
                <span className="rounded-full bg-red-600 px-2 py-0.5 text-xs font-bold text-white">{lightboxPhoto.category}</span>
                <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs text-white">{lightboxPhoto.year}</span>
              </div>
              <p className="text-sm text-white">{lightboxPhoto.caption}</p>
              <p className="mt-2 text-xs text-gray-500">
                {lightboxIndex! + 1} / {filtered.length}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setLightboxIndex((idx) => (idx! + 1) % filtered.length);
            }}
            className="absolute right-4 top-1/2 z-10 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
            aria-label="Next photo"
          >
            <ChevronRight className="h-6 w-6" aria-hidden="true" />
          </button>

          <button
            type="button"
            onClick={() => setLightboxIndex(null)}
            className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
            aria-label="Close"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
      )}
    </div>
  );
}

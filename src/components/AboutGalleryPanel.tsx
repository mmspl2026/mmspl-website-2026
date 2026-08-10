"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { ZoomIn, ChevronLeft, ChevronRight, X } from "lucide-react";
import clsx from "clsx";
import type { PublicGalleryPhoto } from "@/lib/types";
import { urlFor } from "@/lib/sanity/image";

const PAGE_SIZE = 12;

interface Photo {
  id: string;
  url: string;
  fullUrl: string;
  width: number;
  height: number;
  caption: string;
  category: string;
}

function toPhoto(p: PublicGalleryPhoto): Photo | null {
  if (!p.image?.asset) return null;
  const dims = p.image.asset.metadata?.dimensions;
  return {
    id: p._id,
    url: urlFor(p.image).width(600).auto("format").url(),
    fullUrl: urlFor(p.image).width(1600).auto("format").url(),
    width: dims?.width || 800,
    height: dims?.height || 600,
    caption: p.caption || "",
    category: p.category || "General",
  };
}

export default function AboutGalleryPanel({
  photos: rawPhotos,
  categories: initialCategories,
}: {
  photos: PublicGalleryPhoto[];
  categories: string[];
}) {
  const photos = useMemo(() => rawPhotos.map(toPhoto).filter((p): p is Photo => p !== null), [rawPhotos]);
  const categories = useMemo(() => ["All", ...initialCategories], [initialCategories]);

  const [categoryFilter, setCategoryFilter] = useState("All");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const filtered = useMemo(
    () => photos.filter((p) => categoryFilter === "All" || p.category === categoryFilter),
    [photos, categoryFilter]
  );

  const visible = filtered.slice(0, visibleCount);
  const lightboxPhoto = lightboxIndex !== null ? visible[lightboxIndex] : null;

  function selectCategory(cat: string) {
    setCategoryFilter(cat);
    setVisibleCount(PAGE_SIZE);
  }

  return (
    <div>
      <h2 className="font-heading text-2xl uppercase tracking-[0.01em] text-black">League Photos</h2>
      <div className="mb-8 mt-2 h-1 w-16 bg-brand" />

      <div role="tablist" aria-label="Photo categories" className="mb-6 flex flex-wrap gap-2">
        {categories.map((cat) => (
          <button
            key={cat}
            type="button"
            role="tab"
            aria-selected={categoryFilter === cat}
            onClick={() => selectCategory(cat)}
            className={clsx(
              "shrink-0 whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition-colors",
              categoryFilter === cat
                ? "bg-brand text-white"
                : "border border-gray-300 bg-white text-black hover:border-gray-400"
            )}
          >
            {cat}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="py-16 text-center text-sm text-gray-400">No photos for this filter.</p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
            {visible.map((photo, i) => (
              <button
                key={photo.id}
                type="button"
                onClick={() => setLightboxIndex(i)}
                className="group relative block aspect-[4/3] overflow-hidden rounded-xl text-left shadow-sm transition-shadow hover:shadow-xl"
              >
                <Image
                  src={photo.url}
                  alt={photo.caption}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                  sizes="(min-width: 1024px) 33vw, 50vw"
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-all duration-300 group-hover:bg-black/50">
                  <ZoomIn
                    className="h-7 w-7 text-white opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                    aria-hidden="true"
                  />
                </div>
                <span className="absolute left-2 top-2 rounded-full bg-brand px-2 py-0.5 text-xs font-bold text-white">
                  {photo.category}
                </span>
                {photo.caption && (
                  <span className="absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-black/80 to-transparent px-2 pb-1.5 pt-4 text-xs text-white">
                    {photo.caption}
                  </span>
                )}
              </button>
            ))}
          </div>

          {visibleCount < filtered.length && (
            <div className="mt-8 flex justify-center">
              <button
                type="button"
                onClick={() => setVisibleCount((v) => v + PAGE_SIZE)}
                className="rounded-full border border-gray-300 bg-white px-6 py-2.5 text-sm font-semibold text-black transition-colors hover:border-gray-400"
              >
                Load More
              </button>
            </div>
          )}
        </>
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
              setLightboxIndex((idx) => (idx! - 1 + visible.length) % visible.length);
            }}
            className="absolute left-4 top-1/2 z-10 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
            aria-label="Previous photo"
          >
            <ChevronLeft className="h-6 w-6" aria-hidden="true" />
          </button>

          <div className="w-full max-w-5xl px-16" onClick={(e) => e.stopPropagation()}>
            <img
              src={lightboxPhoto.fullUrl}
              alt={lightboxPhoto.caption}
              className="max-h-[75vh] w-full rounded-lg object-contain"
            />
            <div className="mt-4 text-center">
              <span className="mb-2 inline-block rounded-full bg-brand px-2 py-0.5 text-xs font-bold text-white">
                {lightboxPhoto.category}
              </span>
              {lightboxPhoto.caption && <p className="mt-1 text-sm text-white">{lightboxPhoto.caption}</p>}
              <p className="mt-2 text-xs text-gray-500">
                {lightboxIndex! + 1} / {visible.length}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setLightboxIndex((idx) => (idx! + 1) % visible.length);
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

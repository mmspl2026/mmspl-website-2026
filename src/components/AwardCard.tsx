import Image from "next/image";
import { Trophy } from "lucide-react";
import type { Award } from "@/lib/types";
import { urlFor } from "@/lib/sanity/image";

export default function AwardCard({ award }: { award: Award }) {
  const imageUrl = award.photo ? urlFor(award.photo).width(500).height(500).fit("crop").url() : null;

  return (
    <article className="flex flex-col overflow-hidden rounded-lg border border-black/10 bg-white shadow-sm">
      <div className="relative aspect-square w-full bg-brand-900">
        {imageUrl ? (
          <Image src={imageUrl} alt={award.photo?.alt || `${award.winner}`} fill className="object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Trophy className="text-brand-200" size={48} aria-hidden="true" />
          </div>
        )}
      </div>
      <div className="p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-brand">{award.category}</p>
        <h3 className="mt-1 text-xl">{award.winner}</h3>
        {award.team && <p className="text-sm text-black/50">{award.team.name}</p>}
        {award.description && <p className="mt-2 text-sm text-black/70">{award.description}</p>}
      </div>
    </article>
  );
}

import Image from "next/image";
import Link from "next/link";
import { Newspaper } from "lucide-react";
import type { NewsItem } from "@/lib/types";
import { urlFor } from "@/lib/sanity/image";

const TAG_LABEL: Record<string, string> = {
  league: "League News",
  results: "Game Results",
  charity: "Charity",
  announcement: "Announcement",
  registration: "Registration",
};

export default function NewsCard({ item }: { item: NewsItem }) {
  const imageUrl = item.photo ? urlFor(item.photo).width(640).height(400).fit("crop").url() : null;

  return (
    <article className="flex flex-col overflow-hidden rounded-lg border border-black/10 bg-white shadow-sm transition-shadow hover:shadow-md">
      <div className="relative aspect-[16/10] w-full bg-brand-900">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={item.photo?.alt || ""}
            fill
            className="object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Newspaper className="text-white/30" size={40} aria-hidden="true" />
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-5">
        {item.tag && (
          <span className="w-fit rounded bg-brand-50 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-brand-700">
            {TAG_LABEL[item.tag] || item.tag}
          </span>
        )}
        <h3 className="text-lg leading-snug">{item.title}</h3>
        <time dateTime={item.date} className="text-xs text-black/50">
          {new Date(item.date).toLocaleDateString("en-CA", { year: "numeric", month: "long", day: "numeric" })}
        </time>
        <Link
          href={`/news/${item.slug.current}`}
          className="mt-auto pt-2 text-sm font-semibold text-brand hover:underline"
        >
          Read more &rarr;
        </Link>
      </div>
    </article>
  );
}

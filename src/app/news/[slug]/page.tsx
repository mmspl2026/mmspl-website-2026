import { notFound } from "next/navigation";
import Image from "next/image";
import { PortableText } from "@portabletext/react";
import { sanityFetch } from "@/lib/sanity/client";
import { newsBySlugQuery } from "@/lib/sanity/queries";
import { urlFor } from "@/lib/sanity/image";
import type { NewsItem } from "@/lib/types";
import { SEED_NEWS } from "@/lib/seed-data";

export default async function NewsArticlePage({ params }: { params: { slug: string } }) {
  const item = await sanityFetch<NewsItem | null>(newsBySlugQuery, { slug: params.slug }, null);
  const fallback = SEED_NEWS.find((n) => n.slug.current === params.slug) || null;
  const article = item || fallback;

  if (!article) notFound();

  const imageUrl = article.photo ? urlFor(article.photo).width(1200).height(675).fit("crop").url() : null;

  return (
    <article className="container-page py-16">
      <p className="text-sm text-black/50">
        <time dateTime={article.date}>
          {new Date(article.date).toLocaleDateString("en-CA", {
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </time>
      </p>
      <h1 className="mt-2 max-w-3xl text-3xl sm:text-4xl">{article.title}</h1>

      {imageUrl && (
        <div className="relative mt-8 aspect-video w-full max-w-3xl overflow-hidden rounded-lg">
          <Image src={imageUrl} alt={article.photo?.alt || ""} fill className="object-cover" />
        </div>
      )}

      <div className="mt-8 max-w-3xl space-y-4 text-base leading-relaxed text-black/80 [&_a]:text-brand [&_a]:underline [&_h2]:mt-6 [&_h2]:text-2xl [&_h3]:mt-4 [&_h3]:text-xl">
        {Array.isArray(article.body) && article.body.length > 0 ? (
          <PortableText value={article.body as never} />
        ) : (
          <p className="text-black/70">Full story coming soon.</p>
        )}
      </div>
    </article>
  );
}

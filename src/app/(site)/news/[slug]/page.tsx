import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { PortableText, type PortableTextComponents } from "@portabletext/react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { sanityFetch } from "@/lib/sanity/client";
import { newsBySlugQuery, adjacentNewsQuery } from "@/lib/sanity/queries";
import { urlFor } from "@/lib/sanity/image";
import type { NewsItem } from "@/lib/types";
import { SEED_NEWS } from "@/lib/seed-data";

interface AdjacentArticle {
  title: string;
  slug: string;
}

const portableTextComponents: PortableTextComponents = {
  marks: {
    link: ({ value, children }) => {
      const href = value?.href as string | undefined;
      if (!href) return <>{children}</>;
      const isExternal = value?.blank !== false;
      return (
        <a href={href} target={isExternal ? "_blank" : undefined} rel={isExternal ? "noopener noreferrer" : undefined}>
          {children}
        </a>
      );
    },
  },
};

export default async function NewsArticlePage({ params }: { params: { slug: string } }) {
  const item = await sanityFetch<NewsItem | null>(newsBySlugQuery, { slug: params.slug }, null);
  const fallback = SEED_NEWS.find((n) => n.slug.current === params.slug) || null;
  const article = item || fallback;

  if (!article) notFound();

  const { prev, next } = await sanityFetch<{ prev: AdjacentArticle | null; next: AdjacentArticle | null }>(
    adjacentNewsQuery,
    { date: article.date },
    { prev: null, next: null }
  );

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
          <PortableText value={article.body as never} components={portableTextComponents} />
        ) : (
          <p className="text-black/70">Full story coming soon.</p>
        )}
      </div>

      {(prev || next) && (
        <nav aria-label="More news" className="mt-12 flex max-w-3xl items-stretch justify-between gap-4 border-t border-black/10 pt-8">
          {prev ? (
            <Link
              href={`/news/${prev.slug}`}
              className="group flex max-w-[48%] flex-col gap-1 text-left"
            >
              <span className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-black/50">
                <ArrowLeft size={14} aria-hidden="true" />
                Previous
              </span>
              <span className="text-sm font-semibold text-black group-hover:text-brand">{prev.title}</span>
            </Link>
          ) : (
            <span />
          )}
          {next ? (
            <Link
              href={`/news/${next.slug}`}
              className="group flex max-w-[48%] flex-col items-end gap-1 text-right"
            >
              <span className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-black/50">
                Next
                <ArrowRight size={14} aria-hidden="true" />
              </span>
              <span className="text-sm font-semibold text-black group-hover:text-brand">{next.title}</span>
            </Link>
          ) : (
            <span />
          )}
        </nav>
      )}
    </article>
  );
}

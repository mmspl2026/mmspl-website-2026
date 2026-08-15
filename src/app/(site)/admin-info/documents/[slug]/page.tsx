import { notFound } from "next/navigation";
import Link from "next/link";
import { PortableText, type PortableTextComponents } from "@portabletext/react";
import { sanityFetch } from "@/lib/sanity/client";
import { leagueDocumentPageBySlugQuery } from "@/lib/sanity/queries";
import type { LeagueDocument } from "@/lib/types";

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

export default async function LeagueDocumentPage({ params }: { params: { slug: string } }) {
  const doc = await sanityFetch<LeagueDocument | null>(leagueDocumentPageBySlugQuery, { slug: params.slug }, null);
  if (!doc) notFound();

  return (
    <article className="container-page py-16">
      <p className="text-sm text-black/50">
        <Link href="/admin-info" className="hover:text-brand hover:underline">
          &larr; Admin
        </Link>{" "}
        &middot; {doc.category}
      </p>
      <h1 className="mt-2 max-w-3xl text-3xl sm:text-4xl">{doc.title}</h1>
      {doc.description && <p className="mt-3 max-w-3xl text-base text-black/60">{doc.description}</p>}

      <div className="mt-8 max-w-3xl space-y-4 text-base leading-relaxed text-black/80 [&_a]:text-brand [&_a]:underline [&_h2]:mt-6 [&_h2]:text-2xl [&_h3]:mt-4 [&_h3]:text-xl">
        {Array.isArray(doc.pageBody) && doc.pageBody.length > 0 ? (
          <PortableText value={doc.pageBody as never} components={portableTextComponents} />
        ) : (
          <p className="text-black/70">This page has no content yet.</p>
        )}
      </div>
    </article>
  );
}

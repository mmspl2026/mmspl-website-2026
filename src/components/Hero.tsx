import Image from "next/image";
import type { SanityImageWithAlt } from "@/lib/types";
import { urlFor } from "@/lib/sanity/image";

export default function Hero({
  heroImage,
  eyebrow,
  title,
  subtitle,
}: {
  heroImage?: SanityImageWithAlt;
  eyebrow?: string;
  title: string;
  subtitle?: string;
}) {
  const imageUrl = heroImage ? urlFor(heroImage).width(1920).height(1080).fit("crop").url() : null;

  return (
    <section className="relative flex min-h-[36vh] flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-brand-900 via-black to-black px-4 py-14 text-center text-white">
      {imageUrl && (
        <Image src={imageUrl} alt={heroImage?.alt || ""} fill className="object-cover" />
      )}
      <div className="absolute inset-0 bg-hero-overlay" aria-hidden="true" />

      <div className="relative z-10 flex flex-col items-center">
        {eyebrow && (
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-brand-200">
            {eyebrow}
          </p>
        )}
        <h1 className="mt-3 max-w-3xl text-3xl leading-tight sm:text-4xl">{title}</h1>
        {subtitle && (
          <p className="mt-3 max-w-xl text-sm text-white/85 sm:text-base">{subtitle}</p>
        )}
      </div>
    </section>
  );
}

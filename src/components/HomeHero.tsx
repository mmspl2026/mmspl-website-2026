import Image from "next/image";
import Link from "next/link";
import type { Game, SanityImageWithAlt } from "@/lib/types";
import { urlFor } from "@/lib/sanity/image";
import GameRail from "./GameRail";

export default function HomeHero({
  heroImage,
  games,
  today,
}: {
  heroImage?: SanityImageWithAlt;
  games: Game[];
  today: string;
}) {
  const imageUrl = heroImage
    ? urlFor(heroImage).width(2400).height(1350).fit("crop").url()
    : "/hero.jpg";
  const imageAlt = heroImage?.alt || "Slo-pitch game at dusk at an MMSPL ballpark";

  return (
    <section className="relative flex min-h-[85vh] flex-col overflow-hidden bg-black text-white">
      <Image src={imageUrl} alt={imageAlt} fill priority className="object-cover" />
      <div className="absolute inset-0 bg-hero-overlay" aria-hidden="true" />

      <div className="container-page relative z-10 flex flex-1 flex-col items-center justify-center px-4 py-20 pb-52 text-center sm:pb-56">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-white/80 sm:text-sm">
          2026 Season &middot; May &ndash; September
        </p>
        <h1 className="mt-4 text-5xl leading-[0.95] sm:text-6xl md:text-7xl">
          <span className="block text-white">Markham Men&rsquo;s</span>
          <span className="block text-brand">Slo-Pitch League</span>
        </h1>
        <p className="mt-6 max-w-xl text-base text-white/85 sm:text-lg">
          Markham&rsquo;s longest active men&rsquo;s softball league since 1968.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-4">
          <Link href="/register" className="btn-primary">
            Join Our League
          </Link>
          <Link href="/schedule" className="btn-outline">
            2026 Schedule
          </Link>
        </div>
      </div>

      <div className="absolute inset-x-0 bottom-0 z-10 border-t border-white/10 bg-black/60 backdrop-blur-sm">
        <div className="container-page py-6">
          <div className="flex items-baseline justify-between">
            <h2 className="text-sm font-heading uppercase tracking-wide text-white/70">
              Upcoming Games &amp; Scores
            </h2>
            <Link href="/schedule" className="text-xs font-semibold text-brand-300 hover:underline">
              Full schedule &rarr;
            </Link>
          </div>
          <div className="mt-4">
            <GameRail games={games} today={today} />
          </div>
        </div>
      </div>
    </section>
  );
}

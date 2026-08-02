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
    <section className="relative flex items-center justify-center text-white" style={{ minHeight: "640px" }}>
      <Image
        src={imageUrl}
        alt={imageAlt}
        fill
        priority
        className="object-cover object-[75%_center]"
      />
      {/* Exact gradient/stops measured from the Emergent reference build —
          same at every breakpoint there, so no mobile/desktop split here. */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(rgba(10,10,12,0.55), rgba(10,10,12,0.2) 30%, rgba(10,10,12,0.9) 78%)",
        }}
        aria-hidden="true"
      />

      <div className="relative z-10 mx-auto w-full max-w-5xl px-5 py-16 text-center">
        <p className="font-mono-brand text-[11px] uppercase tracking-[0.12em] text-white/55">
          2026 Season &middot; May &ndash; September
        </p>
        {/* font-size is a fluid clamp(), matching Emergent's h1 exactly
            instead of stepping across Tailwind breakpoints. */}
        <h1 className="mt-3 font-heading uppercase leading-none text-[clamp(3rem,8vw,5.5rem)]">
          <span className="block text-white">Markham Men&rsquo;s</span>
          <span className="block text-brand">Slo-Pitch League</span>
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-[clamp(1rem,2.5vw,1.25rem)] font-medium text-white/85 sm:mt-6">
          Markham&rsquo;s longest active men&rsquo;s softball league since 1968.
        </p>
        <div className="mx-auto mt-6 flex w-full max-w-xs flex-col gap-3 sm:mt-8 sm:w-auto sm:max-w-none sm:flex-row sm:flex-wrap sm:justify-center sm:gap-4">
          <Link href="/register" className="btn-primary w-full sm:w-auto">
            Join Our League
          </Link>
          <Link href="/schedule" className="btn-outline w-full sm:w-auto">
            2026 Schedule
          </Link>
        </div>

        {/* Game rail sits in normal document flow right after the buttons —
            Emergent doesn't absolutely-position it at the section's bottom
            edge, it just stacks it in the same centered content column. */}
        <div className="mx-auto mt-6 w-full max-w-4xl px-5">
          <h2 className="mb-2 text-center font-sans text-xs font-semibold uppercase tracking-widest text-white/60">
            Upcoming Games &amp; Scores
          </h2>
          <GameRail games={games} today={today} />
        </div>
      </div>
    </section>
  );
}

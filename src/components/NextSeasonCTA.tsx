import Link from "next/link";
import { Bell } from "lucide-react";

export default function NextSeasonCTA({ year }: { year: number }) {
  return (
    <section aria-labelledby="next-season-heading" className="bg-brand py-8 text-white md:py-10">
      <div className="mx-auto max-w-7xl px-5 text-center">
        <h2 id="next-season-heading" className="mb-3 text-3xl sm:text-4xl">
          {year} Registration Opens in January
        </h2>
        <p className="mx-auto mb-8 max-w-2xl leading-relaxed text-white/85">
          Spots fill up fast once sign-ups go live. Subscribe to notifications and we&rsquo;ll let you know
          the moment {year} registration opens.
        </p>
        <Link
          href="/notifications"
          className="inline-flex h-10 items-center justify-center gap-2 whitespace-nowrap rounded-[3px] bg-black px-8 py-4 text-lg font-bold text-white transition-colors hover:bg-black/80"
        >
          <Bell size={18} aria-hidden="true" />
          Get Notified
        </Link>
      </div>
    </section>
  );
}

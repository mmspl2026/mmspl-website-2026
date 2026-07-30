import Link from "next/link";

export default function SponsorCTA({ text }: { text?: string }) {
  return (
    <section aria-labelledby="sponsor-heading" className="bg-brand py-16 text-white">
      <div className="container-page flex flex-col items-center gap-6 text-center">
        <h2 id="sponsor-heading" className="text-3xl sm:text-4xl">
          Become a Sponsor
        </h2>
        <p className="max-w-2xl text-white/90">
          {text ||
            "MMSPL is proud to partner with local Markham businesses. Sponsorship supports our charity tournament, equipment, and league operations while putting your brand in front of hundreds of players and families."}
        </p>
        <Link
          href="/contact"
          className="rounded bg-black px-6 py-3 font-semibold uppercase tracking-wide text-white transition-colors hover:bg-black/80"
        >
          Get in Touch
        </Link>
      </div>
    </section>
  );
}

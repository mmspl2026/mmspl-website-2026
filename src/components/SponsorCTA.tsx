import Link from "next/link";

export default function SponsorCTA({ text }: { text?: string }) {
  return (
    <section aria-labelledby="sponsor-heading" className="bg-black py-8 text-white md:py-10">
      <div className="mx-auto max-w-7xl px-5 text-center">
        <h2 id="sponsor-heading" className="mb-4 font-sans text-4xl font-bold normal-case tracking-normal">
          Sponsorship Opportunities
        </h2>
        <div className="mx-auto mb-6 h-1 w-24 bg-red-600" />
        <p className="mx-auto mb-8 max-w-3xl leading-relaxed text-gray-300">
          {text ||
            "We are welcoming new sponsorships to our league. If you are a local business in Markham and would like to sponsor a team in the MMSPL, please get in touch with us."}
        </p>
        <Link
          href="/contact"
          className="inline-flex h-10 items-center justify-center gap-2 whitespace-nowrap rounded-[3px] bg-red-600 px-8 py-4 text-lg font-bold text-white transition-colors hover:bg-red-700"
        >
          Become a Sponsor
        </Link>
      </div>
    </section>
  );
}

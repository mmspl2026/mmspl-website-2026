import type { Metadata } from "next";
import { Heart, ShieldCheck } from "lucide-react";
import { sanityFetch } from "@/lib/sanity/client";
import { adminSettingsQuery } from "@/lib/sanity/queries";
import type { AdminSettings } from "@/lib/types";
import {
  LEAGUE_FOUNDING_YEAR,
  EXECUTIVE_TEAM,
  CHARITY_BENEFICIARIES_RECENT,
  LEAGUE_STATS,
} from "@/lib/seed-content";
import Hero from "@/components/Hero";

export const metadata: Metadata = { title: "About" };

const HISTORY_MILESTONES = [
  {
    year: "Mid-1960s",
    text: "Markham residents form a fast-pitch Sunday night league at Morgan Park with four teams.",
  },
  {
    year: "1968",
    text: 'Facing a shortage of pitching talent, the league pivots to slo-pitch. Jim McGregor founds the "Markham Men\'s Fun League" with six teams.',
  },
  {
    year: "1970s–80s",
    text: "The league grows steadily through the following two decades, reaching 16 teams by 1981.",
  },
  {
    year: "1986",
    text: "The league adopts its current constitution, formalizing governance for the growing membership.",
  },
  {
    year: "Late 1980s–90s",
    text: 'The league rebrands to the "Markham Men\'s Slo-Pitch League" — the name it carries today.',
  },
  {
    year: "Today",
    text: `MMSPL remains the oldest league in Markham: ${LEAGUE_STATS.teams} teams, ${LEAGUE_STATS.playersPerTeam} players each, ages ${LEAGUE_STATS.ageRange}, spanning generations of players.`,
  },
];

export default async function AboutPage() {
  const settings = await sanityFetch<AdminSettings | null>(adminSettingsQuery, {}, null);

  return (
    <div>
      <Hero
        heroImage={settings?.aboutHeroImage || settings?.heroImage}
        eyebrow="About MMSPL"
        title="Markham's Longest Active Men's Softball League"
        subtitle={`Established ${LEAGUE_FOUNDING_YEAR}, MMSPL is a semi-competitive slo-pitch league built on multi-generational participation and community.`}
      />

      <section aria-labelledby="history-heading" className="container-page py-16">
        <h2 id="history-heading" className="text-3xl sm:text-4xl">
          Our History
        </h2>
        <ol className="mt-8 space-y-8 border-l-2 border-brand pl-6">
          {HISTORY_MILESTONES.map((m) => (
            <li key={m.year}>
              <p className="text-sm font-heading uppercase tracking-wide text-brand">{m.year}</p>
              <p className="mt-1 max-w-2xl text-black/80">{m.text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="exec-heading" className="bg-black/[.03] py-16">
        <div className="container-page">
          <h2 id="exec-heading" className="text-3xl sm:text-4xl">
            Executive Team
          </h2>
          <p className="mt-2 max-w-2xl text-black/60">
            MMSPL is run by a volunteer executive elected at the Annual General Meeting.
          </p>
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {EXECUTIVE_TEAM.map((member) => (
              <div key={member.name} className="rounded-lg border border-black/10 bg-white p-6">
                <ShieldCheck className="text-brand" size={24} aria-hidden="true" />
                <p className="mt-3 text-lg font-semibold">{member.name}</p>
                <p className="text-sm text-black/60">{member.title}</p>
              </div>
            ))}
          </div>
          <p className="mt-4 text-sm text-black/50">
            Full executive list maintained by the league office —{" "}
            <a href="/contact" className="text-brand underline">
              contact us
            </a>{" "}
            for a specific committee.
          </p>
        </div>
      </section>

      <section aria-labelledby="charity-heading" className="container-page py-16">
        <div className="flex items-center gap-3">
          <Heart className="text-brand" size={28} aria-hidden="true" />
          <h2 id="charity-heading" className="text-3xl sm:text-4xl">
            Community &amp; Charity
          </h2>
        </div>
        <p className="mt-4 max-w-2xl text-black/70">
          Every June, MMSPL hosts its annual Charity Tournament, donating proceeds to local
          organizations. Since {LEAGUE_STATS.donatingSince}, the league has given back over $
          {LEAGUE_STATS.totalCharityDonated.toLocaleString()} to the Markham community.
        </p>
        <h3 className="mt-6 text-sm font-heading uppercase tracking-wide text-black/60">
          Recent Beneficiaries
        </h3>
        <ul className="mt-3 flex flex-wrap gap-2">
          {CHARITY_BENEFICIARIES_RECENT.map((org) => (
            <li
              key={org}
              className="rounded-full bg-brand-50 px-4 py-2 text-sm font-medium text-brand-700"
            >
              {org}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

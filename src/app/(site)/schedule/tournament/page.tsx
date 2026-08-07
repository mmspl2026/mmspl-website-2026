import type { Metadata } from "next";
import Link from "next/link";
import { Trophy } from "lucide-react";
import { sanityFetch } from "@/lib/sanity/client";
import { adminSettingsQuery, allTournamentResultsQuery } from "@/lib/sanity/queries";
import type { AdminSettings, TournamentResult, TournamentType } from "@/lib/types";
import { urlFor } from "@/lib/sanity/image";
import { TOURNAMENT_LABELS } from "@/lib/tournamentDisplay";

export const metadata: Metadata = { title: "Tournament History" };

function TournamentColumn({ type, results }: { type: TournamentType; results: TournamentResult[] }) {
  const label = TOURNAMENT_LABELS[type];
  const sorted = [...results].sort((a, b) => b.year - a.year);

  return (
    <div>
      <div className="mb-4 flex items-center gap-2">
        <Trophy size={18} className="text-brand" aria-hidden="true" />
        <h2 className="font-heading text-xl uppercase tracking-[0.01em] text-black">{label.short}</h2>
      </div>
      <div className="space-y-2">
        {sorted.length === 0 ? (
          <p className="rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm text-gray-500">No results recorded.</p>
        ) : (
          sorted.map((r) =>
            r.cancelled ? (
              <div
                key={r._id}
                className="flex items-center justify-between rounded-lg border border-dashed border-gray-300 bg-gray-50 px-4 py-3"
              >
                <span className="font-mono-brand text-sm text-gray-400">{r.year}</span>
                <span className="text-right text-sm italic text-gray-500">Cancelled &mdash; COVID-19</span>
              </div>
            ) : (
              <Link
                key={r._id}
                href={`/schedule/tournament/${r.year}/${type}`}
                className="flex items-center justify-between rounded-lg border bg-white px-4 py-3 shadow-sm transition-shadow hover:shadow-md"
              >
                <span className="font-mono-brand text-sm text-gray-500">{r.year}</span>
                <span className="text-right text-sm font-semibold text-black">
                  {r.champion || <span className="font-normal italic text-gray-400">No results recorded</span>}
                </span>
              </Link>
            )
          )
        )}
      </div>
    </div>
  );
}

export default async function TournamentIndexPage() {
  const [results, settings] = await Promise.all([
    sanityFetch<TournamentResult[]>(allTournamentResultsQuery, {}, []),
    sanityFetch<AdminSettings | null>(adminSettingsQuery, {}, null),
  ]);

  const heroImage = settings?.scheduleHeroImage || settings?.heroImage;
  const heroImageUrl = heroImage ? urlFor(heroImage).width(1920).height(1080).fit("crop").url() : "/hero.jpg";

  const byType = (type: TournamentType) => results.filter((r) => r.type === type);

  return (
    <div className="min-h-screen bg-gray-50">
      <div
        className="relative h-[260px] overflow-hidden"
        style={{
          backgroundImage: `linear-gradient(rgba(10,10,12,0.65), rgba(10,10,12,0.25) 35%, rgba(10,10,12,0.85) 80%), url(${heroImageUrl})`,
          backgroundSize: "cover",
          backgroundPosition: "center center",
          backgroundRepeat: "no-repeat",
        }}
      >
        <div className="absolute left-0 top-0 px-5 pt-5">
          <p className="text-[10px] uppercase tracking-[0.14em] text-white/45">
            <Link href="/" className="no-underline hover:underline">
              Home
            </Link>{" "}
            /{" "}
            <Link href="/schedule" className="no-underline hover:underline">
              Schedule
            </Link>{" "}
            / Tournaments
          </p>
        </div>
        <div className="absolute bottom-0 left-0 px-5 pb-7">
          <h1 className="font-heading uppercase leading-none tracking-[0.01em] text-white text-[clamp(2rem,5vw,3.2rem)]">
            Tournament History
          </h1>
          <p className="mt-1.5 text-base text-white/70">Charity &amp; Year-End Tournament results, year by year</p>
        </div>
      </div>

      <div className="container-page py-10">
        <div className="grid gap-10 sm:grid-cols-2">
          <TournamentColumn type="charity" results={byType("charity")} />
          <TournamentColumn type="mcgregor" results={byType("mcgregor")} />
        </div>
      </div>
    </div>
  );
}

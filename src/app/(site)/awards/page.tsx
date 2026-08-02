import type { Metadata } from "next";
import Link from "next/link";
import { sanityFetch } from "@/lib/sanity/client";
import { allAwardsQuery, adminSettingsQuery } from "@/lib/sanity/queries";
import type { AdminSettings, Award } from "@/lib/types";
import { SEED_AWARDS } from "@/lib/seed-data";
import { urlFor } from "@/lib/sanity/image";
import { AWARD_CATEGORY_CONFIG } from "@/lib/awardCategories";
import AwardsTabs, { type CategoryGroup } from "@/components/AwardsTabs";

export const metadata: Metadata = { title: "Awards" };

function fillGaps(entries: { year: number; winner: string }[]) {
  if (entries.length === 0) return entries;
  const byYear = new Map(entries.map((e) => [e.year, e.winner]));
  const years = entries.map((e) => e.year);
  const max = Math.max(...years);
  const min = Math.min(...years);
  const filled: { year: number; winner: string }[] = [];
  for (let y = max; y >= min; y--) {
    filled.push({ year: y, winner: byYear.get(y) ?? "Not Awarded" });
  }
  return filled;
}

export default async function AwardsPage() {
  const [awards, settings] = await Promise.all([
    sanityFetch<Award[]>(allAwardsQuery, {}, []),
    sanityFetch<AdminSettings | null>(adminSettingsQuery, {}, null),
  ]);
  const displayAwards = awards.length > 0 ? awards : SEED_AWARDS;

  const byCategory = new Map<string, { year: number; winner: string }[]>();
  for (const a of displayAwards) {
    const list = byCategory.get(a.category) ?? [];
    list.push({ year: a.year, winner: a.winner });
    byCategory.set(a.category, list);
  }

  const groups: CategoryGroup[] = Array.from(byCategory.entries()).flatMap(([category, entries]) => {
    const config = AWARD_CATEGORY_CONFIG[category];
    if (!config) return [];
    return [{ category, config, entries: fillGaps(entries) }];
  });

  const heroImage = settings?.awardsHeroImage || settings?.heroImage;
  const heroImageUrl = heroImage ? urlFor(heroImage).width(1920).height(1080).fit("crop").url() : "/hero.jpg";

  return (
    <div className="min-h-screen bg-gray-50">
      <div
        className="relative h-[260px] overflow-hidden"
        style={{
          backgroundImage: `linear-gradient(rgba(10,10,12,0.65), rgba(10,10,12,0.25) 35%, rgba(10,10,12,0.85) 80%), url(${heroImageUrl})`,
          backgroundSize: "cover",
          backgroundPosition: "center top",
          backgroundRepeat: "no-repeat",
        }}
      >
        <div className="absolute left-0 top-0 px-5 pt-5">
          <p className="text-[10px] uppercase tracking-[0.14em] text-white/45">
            <Link href="/" className="no-underline hover:underline">
              Home
            </Link>{" "}
            / Awards
          </p>
        </div>
        <div className="absolute bottom-0 left-0 px-5 pb-7">
          <h1 className="font-heading uppercase leading-none tracking-[0.01em] text-white text-[clamp(2rem,5vw,3.2rem)]">
            League Awards
          </h1>
          <p className="mt-1.5 text-base text-white/70">Celebrating excellence and achievement</p>
        </div>
      </div>

      <div className="container-page py-10">
        <AwardsTabs groups={groups} />

        <div className="mt-8 rounded-xl border bg-gray-50 text-black shadow">
          <div className="p-6">
            <h3 className="mb-3 font-bold text-black">Special Thanks to Markham Trophy</h3>
            <p className="mb-2 text-sm text-gray-700">Official trophy caretaker to the MMSPL</p>
            <div className="space-y-0.5 text-sm text-gray-600">
              <p>
                <strong>Website:</strong>{" "}
                <a
                  href="http://www.trophy.ws"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-brand hover:text-brand-700"
                >
                  www.trophy.ws
                </a>
              </p>
              <p>
                <strong>Address:</strong> 522 Hood Road, Markham, Ontario L3R 3K9
              </p>
              <p>Tel (905) 477-1302</p>
              <p>Fax (905) 477-6373</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

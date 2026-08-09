import type { Metadata } from "next";
import Link from "next/link";
import { sanityFetch } from "@/lib/sanity/client";
import {
  adminSettingsQuery,
  allLeagueExecutivesQuery,
  allTeamRepresentativesQuery,
  allLeagueDocumentsQuery,
} from "@/lib/sanity/queries";
import type { AdminSettings, LeagueExecutive, TeamRepresentative, LeagueDocument } from "@/lib/types";
import { urlFor } from "@/lib/sanity/image";
import AdminInfoTabs from "@/components/AdminInfoTabs";

export const metadata: Metadata = { title: "Admin" };

export default async function AdminInfoPage() {
  const [settings, executives, reps, documents] = await Promise.all([
    sanityFetch<AdminSettings | null>(adminSettingsQuery, {}, null),
    sanityFetch<LeagueExecutive[]>(allLeagueExecutivesQuery, {}, []),
    sanityFetch<TeamRepresentative[]>(allTeamRepresentativesQuery, {}, []),
    sanityFetch<LeagueDocument[]>(allLeagueDocumentsQuery, {}, []),
  ]);

  const heroImage = settings?.adminInfoHeroImage || settings?.heroImage;
  const heroImageUrl = heroImage ? urlFor(heroImage).width(1920).height(1080).fit("crop").url() : "/hero.jpg";

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
            / Admin
          </p>
        </div>
        <div className="absolute bottom-0 left-0 px-5 pb-7">
          <h1 className="font-heading uppercase leading-none tracking-[0.01em] text-white text-[clamp(2rem,5vw,3.2rem)]">
            Admin
          </h1>
          <p className="mt-1.5 text-base text-white/70">League Administration, Rules &amp; Official Documents</p>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-5 py-12">
        <AdminInfoTabs executives={executives} reps={reps} documents={documents} />
      </div>
    </div>
  );
}

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
import AdminDocumentsSection from "@/components/AdminDocumentsSection";

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
        <div className="mb-14">
          <h2 className="mb-2 font-sans text-2xl font-bold normal-case tracking-normal text-black">League Administration</h2>
          <div className="mb-8 h-1 w-16 bg-red-600" />

          <h3 className="mb-4 flex items-center gap-2 font-sans text-sm font-bold uppercase tracking-widest text-gray-400">
            <span className="h-px w-8 bg-gray-300" />
            2026 Executives
          </h3>
          <div className="mb-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {executives.map((e) => (
              <div
                key={e._id}
                className="bg-white transition-all hover:shadow-sm"
                style={{
                  borderTop: "1px solid #e5e1da",
                  borderRight: "1px solid #e5e1da",
                  borderBottom: "1px solid #e5e1da",
                  borderLeft: "3px solid #c8202b",
                  borderRadius: "5px",
                  padding: "14px 18px",
                }}
              >
                <p className="font-mono-brand mb-1 text-[9px] uppercase tracking-[0.14em] text-[#9a968f]">{e.role}</p>
                <p className="text-[15px] font-bold text-[#0d0d0e]">{e.name}</p>
                <a href={`mailto:${e.email}`} className="mt-0.5 block text-xs text-[#c8202b] hover:underline">
                  {e.email}
                </a>
              </div>
            ))}
          </div>

          <h3 className="mb-4 flex items-center gap-2 font-sans text-sm font-bold uppercase tracking-widest text-gray-400">
            <span className="h-px w-8 bg-gray-300" />
            2026 Executive Council — Team Representatives
          </h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {reps.map((r) => (
              <div
                key={r._id}
                className="rounded-xl border border-gray-200 bg-white px-5 py-3 transition-all hover:border-red-200"
              >
                <p className="text-sm font-bold text-gray-900">{r.repName}</p>
                <p className="mt-0.5 text-xs text-gray-500">{r.team?.name}</p>
              </div>
            ))}
          </div>
        </div>

        <AdminDocumentsSection documents={documents} />
      </div>
    </div>
  );
}

import type { Metadata } from "next";
import { sanityFetch } from "@/lib/sanity/client";
import { adminSettingsQuery, allImportantDatesQuery } from "@/lib/sanity/queries";
import type { AdminSettings, ImportantDate } from "@/lib/types";
import { IMPORTANT_DATES_2026, LEAGUE_STATS } from "@/lib/seed-content";
import RegisterForm from "@/components/RegisterForm";
import Hero from "@/components/Hero";

export const metadata: Metadata = { title: "Register" };

const SEED_DATES: ImportantDate[] = IMPORTANT_DATES_2026.map((d, i) => ({
  _id: `seed-date-${i}`,
  ...d,
}));

export default async function RegisterPage() {
  const [settings, dates] = await Promise.all([
    sanityFetch<AdminSettings | null>(adminSettingsQuery, {}, null),
    sanityFetch<ImportantDate[]>(allImportantDatesQuery, {}, []),
  ]);

  const displayDates = dates.length > 0 ? dates : SEED_DATES;
  const rookieEval = displayDates.find((d) => d.label.toLowerCase().includes("rookie"));
  const registrationOpen = settings?.registrationOpen ?? true;
  const fee = settings?.registrationFee;

  return (
    <div>
      <Hero
        heroImage={settings?.registerHeroImage || settings?.heroImage}
        title="Register"
        subtitle={`Join ${LEAGUE_STATS.teams} teams of ${LEAGUE_STATS.playersPerTeam} players, ages ${LEAGUE_STATS.ageRange}, playing semi-competitive slo-pitch across Markham.`}
      />

      <div className="container-page py-16">
        <div className="grid gap-12 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <RegisterForm registrationOpen={registrationOpen} />
          </div>

          <aside className="space-y-6">
            {typeof fee === "number" && (
              <div className="rounded-lg border border-black/10 p-5">
                <h2 className="text-sm font-heading uppercase tracking-wide text-black/60">
                  Registration Fee
                </h2>
                <p className="mt-2 text-2xl font-heading text-brand">${fee} CAD</p>
              </div>
            )}

            {rookieEval && (
              <div className="rounded-lg border border-black/10 p-5">
                <h2 className="text-sm font-heading uppercase tracking-wide text-black/60">
                  Rookie Evaluation Dates
                </h2>
                <p className="mt-2 text-black/80">{rookieEval.description}</p>
              </div>
            )}

            <div className="rounded-lg border border-black/10 p-5">
              <h2 className="text-sm font-heading uppercase tracking-wide text-black/60">
                How It Works
              </h2>
              <ol className="mt-2 list-decimal space-y-2 pl-4 text-sm text-black/70">
                <li>Submit your registration below.</li>
                <li>New players attend a Rookie Evaluation session.</li>
                <li>Teams are set at the Entry Draft.</li>
                <li>Season kicks off on Opening Night.</li>
              </ol>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

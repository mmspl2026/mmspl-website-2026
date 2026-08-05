import type { Metadata } from "next";
import Link from "next/link";
import { Lock, Bell, ArrowLeft } from "lucide-react";
import { sanityFetch } from "@/lib/sanity/client";
import { adminSettingsQuery, activeSeasonQuery } from "@/lib/sanity/queries";
import type { AdminSettings, Season } from "@/lib/types";
import { urlFor } from "@/lib/sanity/image";
import RegisterPageClient from "@/components/RegisterPageClient";

export const metadata: Metadata = { title: "Register" };

const DEFAULT_CLOSED_MESSAGE =
  "Registration for the season is currently closed. It reopens each spring — check back or subscribe to notifications to be alerted.";

const FALLBACK_HERO_URL = "https://www.mmspl.ca/res/img/2023-finals-champions.jpg";

function HeroBand({
  breadcrumbLabel,
  title,
  subtitle,
  imageUrl,
}: {
  breadcrumbLabel: string;
  title: string;
  subtitle: string;
  imageUrl: string;
}) {
  return (
    <div
      className="relative h-[260px] overflow-hidden"
      style={{
        backgroundImage: `linear-gradient(rgba(10,10,12,0.65), rgba(10,10,12,0.25) 35%, rgba(10,10,12,0.85) 80%), url(${imageUrl})`,
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
          / {breadcrumbLabel}
        </p>
      </div>
      <div className="absolute bottom-0 left-0 px-5 pb-7">
        <h1 className="font-heading uppercase leading-none tracking-[0.01em] text-white text-[clamp(2rem,5vw,3.2rem)]">
          {title}
        </h1>
        <p className="mt-1.5 text-base text-white/70">{subtitle}</p>
      </div>
    </div>
  );
}

export default async function RegisterPage() {
  const [settings, activeSeason] = await Promise.all([
    sanityFetch<AdminSettings | null>(adminSettingsQuery, {}, null),
    sanityFetch<Season | null>(activeSeasonQuery, {}, null),
  ]);

  const registrationOpen = settings?.registrationOpen ?? true;
  const heroImage = settings?.registerHeroImage || settings?.heroImage;
  const heroImageUrl = heroImage ? urlFor(heroImage).width(1920).height(1080).fit("crop").url() : FALLBACK_HERO_URL;
  const seasonYear = activeSeason?.year ?? new Date().getFullYear();

  if (!registrationOpen) {
    const closedMessage = settings?.registrationClosedMessage || DEFAULT_CLOSED_MESSAGE;

    return (
      <div className="min-h-screen bg-gray-50" data-testid="registration-closed-page">
        <HeroBand
          breadcrumbLabel="Register"
          title="Registration Closed"
          subtitle="Off-Season · Check back soon"
          imageUrl={heroImageUrl}
        />

        <div className="mx-auto max-w-2xl px-4 py-16">
          <div className="overflow-hidden rounded-xl border-none bg-white shadow-xl">
            <div className="flex flex-col items-center bg-[#0d0d0e] px-6 py-8 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#c8202b]">
                <Lock className="h-8 w-8 text-white" aria-hidden="true" />
              </div>
              <h2 className="font-anton text-3xl uppercase tracking-wide text-white">Registration is closed</h2>
              <p className="mt-2 text-sm text-gray-400">See you next spring</p>
            </div>
            <div className="p-8">
              <p className="mb-8 text-center text-base leading-relaxed text-gray-700" data-testid="registration-closed-message">
                {closedMessage}
              </p>
              <div className="flex flex-col justify-center gap-3 sm:flex-row">
                <Link
                  href="/notifications"
                  data-testid="subscribe-updates-btn"
                  className="inline-flex w-full items-center justify-center rounded-md bg-[#c8202b] px-4 py-2 text-sm font-medium text-white shadow transition-colors hover:bg-[#a51823] sm:w-auto"
                >
                  <Bell className="mr-2 h-4 w-4" aria-hidden="true" />
                  Subscribe for Updates
                </Link>
                <Link
                  href="/"
                  data-testid="back-home-btn"
                  className="inline-flex w-full items-center justify-center rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-black shadow-sm transition-colors hover:bg-gray-50 sm:w-auto"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
                  Back to Home
                </Link>
              </div>
              <div className="mt-10 border-t border-gray-200 pt-6 text-center">
                <p className="text-xs text-gray-500">
                  Have a question in the meantime?{" "}
                  <Link href="/contact" className="font-semibold text-[#c8202b] hover:underline">
                    Contact the league
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <HeroBand
        breadcrumbLabel="Register"
        title="Player Registration"
        subtitle={`Join the MMSPL for the ${seasonYear} season`}
        imageUrl={heroImageUrl}
      />
      <RegisterPageClient registrationFee={settings?.registrationFee ?? 270} seasonYear={seasonYear} />
    </div>
  );
}

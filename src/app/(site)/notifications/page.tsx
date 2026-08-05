import type { Metadata } from "next";
import Link from "next/link";
import { Mail, Bell } from "lucide-react";
import { sanityFetch } from "@/lib/sanity/client";
import { adminSettingsQuery } from "@/lib/sanity/queries";
import type { AdminSettings } from "@/lib/types";
import { urlFor } from "@/lib/sanity/image";
import EmailSubscribeForm from "@/components/EmailSubscribeForm";
import PushNotificationButton from "@/components/PushNotificationButton";

export const metadata: Metadata = { title: "Notifications" };

export default async function NotificationsPage() {
  const settings = await sanityFetch<AdminSettings | null>(adminSettingsQuery, {}, null);

  const heroImage = settings?.notificationsHeroImage || settings?.heroImage;
  const heroImageUrl = heroImage ? urlFor(heroImage).width(1920).height(1080).fit("crop").url() : "/hero.jpg";

  return (
    <div>
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
            / Notifications
          </p>
        </div>
        <div className="absolute bottom-0 left-0 px-5 pb-7">
          <h1 className="font-heading uppercase leading-none tracking-[0.01em] text-white text-[clamp(2rem,5vw,3.2rem)]">
            Stay Updated
          </h1>
          <p className="mt-1.5 text-base text-white/70">Get instant alerts for game cancellations &amp; league news</p>
        </div>
      </div>

      <div className="bg-neutral-50 py-16">
        <div className="container-page">
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="flex flex-col gap-4 rounded-lg border border-black/10 bg-white p-8">
              <Mail className="text-brand" size={36} aria-hidden="true" />
              <h2 className="text-xl">Email Notifications</h2>
              <p className="text-sm text-black/60">
                Receive updates in your inbox — game cancellations, league news, and
                announcements.
              </p>
              <div className="mt-2">
                <EmailSubscribeForm />
              </div>
            </div>

            <div className="flex flex-col gap-4 rounded-lg border border-black/10 bg-white p-8">
              <Bell className="text-black" size={36} aria-hidden="true" />
              <h2 className="text-xl">Push Notifications</h2>
              <p className="text-sm text-black/60">
                Instant pop-up alerts on your device — no app needed.
              </p>
              <div className="mt-2">
                <PushNotificationButton />
              </div>
            </div>
          </div>

          <p className="mt-10 text-center text-sm text-black/50">
            MMSPL will only send important league updates. You can unsubscribe at any time.
          </p>
        </div>
      </div>
    </div>
  );
}

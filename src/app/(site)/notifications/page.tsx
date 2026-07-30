import type { Metadata } from "next";
import { Mail, Bell } from "lucide-react";
import { sanityFetch } from "@/lib/sanity/client";
import { adminSettingsQuery } from "@/lib/sanity/queries";
import type { AdminSettings } from "@/lib/types";
import Hero from "@/components/Hero";
import EmailSubscribeForm from "@/components/EmailSubscribeForm";
import PushNotificationButton from "@/components/PushNotificationButton";

export const metadata: Metadata = { title: "Notifications" };

export default async function NotificationsPage() {
  const settings = await sanityFetch<AdminSettings | null>(adminSettingsQuery, {}, null);

  return (
    <div>
      <Hero
        heroImage={settings?.notificationsHeroImage || settings?.heroImage}
        title="Stay Updated"
        subtitle="Get instant alerts for game cancellations & league news."
      />

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

import type { Metadata } from "next";
import { MapPin } from "lucide-react";
import { sanityFetch } from "@/lib/sanity/client";
import { adminSettingsQuery } from "@/lib/sanity/queries";
import type { AdminSettings } from "@/lib/types";
import ContactForm from "@/components/ContactForm";
import SocialLinks from "@/components/SocialLinks";
import Hero from "@/components/Hero";
import { LEAGUE_ADDRESS } from "@/lib/seed-content";

export const metadata: Metadata = { title: "Contact" };

export default async function ContactPage() {
  const settings = await sanityFetch<AdminSettings | null>(adminSettingsQuery, {}, null);

  return (
    <div>
      <Hero
        heroImage={settings?.contactHeroImage || settings?.heroImage}
        title="Contact"
        subtitle="Questions about registration, sponsorship, or the schedule? Send us a message."
      />

      <div className="container-page py-16">
        <div className="grid gap-12 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <ContactForm />
          </div>

          <aside className="space-y-8">
            <div>
              <h2 className="text-sm font-heading uppercase tracking-wide text-black/60">Mailing Address</h2>
              <div className="mt-2 flex items-start gap-2">
                <MapPin className="mt-0.5 shrink-0 text-brand" size={18} aria-hidden="true" />
                <address className="not-italic text-black/80">{LEAGUE_ADDRESS}</address>
              </div>
            </div>

            <div>
              <h2 className="text-sm font-heading uppercase tracking-wide text-black/60">Follow Us</h2>
              <SocialLinks className="mt-3" iconClassName="bg-black/5 text-black hover:bg-brand hover:text-white" />
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

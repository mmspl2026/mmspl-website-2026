import type { Metadata } from "next";
import Link from "next/link";
import { MapPin, Calendar, Share2 } from "lucide-react";
import { sanityFetch } from "@/lib/sanity/client";
import { adminSettingsQuery } from "@/lib/sanity/queries";
import type { AdminSettings } from "@/lib/types";
import { urlFor } from "@/lib/sanity/image";
import { SOCIAL_LINKS } from "@/lib/seed-content";
import { FacebookIcon, YoutubeIcon, InstagramIcon } from "@/components/icons/BrandSocialIcons";
import ContactForm from "@/components/ContactForm";

export const metadata: Metadata = { title: "Contact" };

const PARKS = [
  {
    name: "Centennial Park",
    directionsUrl: "https://maps.app.goo.gl/571s8V1jaKktCr198",
  },
  {
    name: "Mintleaf Park",
    directionsUrl: "https://maps.app.goo.gl/ye3zLdqtVUeCqBnf6",
  },
];

export default async function ContactPage() {
  const settings = await sanityFetch<AdminSettings | null>(adminSettingsQuery, {}, null);

  const heroImage = settings?.contactHeroImage || settings?.heroImage;
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
            / Contact
          </p>
        </div>
        <div className="absolute bottom-0 left-0 px-5 pb-7">
          <h1 className="font-heading uppercase leading-none tracking-[0.01em] text-white text-[clamp(2rem,5vw,3.2rem)]">
            Contact Us
          </h1>
          <p className="mt-1.5 text-base text-white/70">Get in touch with MMSPL</p>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-5 py-16">
        <div className="grid gap-8 md:grid-cols-2">
          <div className="space-y-6">
            <div className="overflow-hidden rounded-xl border bg-white shadow">
              <div className="px-6 pt-6">
                <h3 className="flex items-center gap-2 text-xl font-semibold text-black">
                  <Share2 className="h-6 w-6 text-brand" aria-hidden="true" />
                  <span>Follow Us</span>
                </h3>
              </div>
              <div className="px-6 pb-6 pt-4">
                <p className="mb-4 text-sm text-gray-700">Follow us for the latest updates</p>
                <div className="flex gap-3">
                  <a
                    href={SOCIAL_LINKS.facebook}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="MMSPL on Facebook"
                    className="flex h-9 w-9 items-center justify-center rounded-full text-white transition-opacity hover:opacity-80"
                    style={{ background: "#1877F2" }}
                  >
                    <FacebookIcon />
                  </a>
                  <a
                    href={SOCIAL_LINKS.youtube}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="MMSPL on YouTube"
                    className="flex h-9 w-9 items-center justify-center rounded-full text-white transition-opacity hover:opacity-80"
                    style={{ background: "#FF0000" }}
                  >
                    <YoutubeIcon />
                  </a>
                  <a
                    href={SOCIAL_LINKS.instagram}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="MMSPL on Instagram"
                    className="flex h-9 w-9 items-center justify-center rounded-full text-white transition-opacity hover:opacity-80"
                    style={{
                      background:
                        "radial-gradient(circle at 30% 107%, #fdf497 0%, #fdf497 5%, #fd5949 45%, #d6249f 60%, #285AEB 90%)",
                    }}
                  >
                    <InstagramIcon />
                  </a>
                </div>
              </div>
            </div>

            <div className="overflow-hidden rounded-xl border bg-white shadow">
              <div className="px-6 pt-6">
                <h3 className="flex items-center gap-2 text-xl font-semibold text-black">
                  <MapPin className="h-6 w-6 text-brand" aria-hidden="true" />
                  <span>Where We Play</span>
                </h3>
              </div>
              <div className="px-6 pb-6 pt-4">
                <p className="mb-3 text-sm text-gray-700">We play at Centennial Park and Mintleaf Park in Markham.</p>
                <div className="space-y-1">
                  {PARKS.map((park) => (
                    <a
                      key={park.name}
                      href={park.directionsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block text-sm text-brand hover:underline"
                    >
                      {park.name} &mdash; Get Directions &rarr;
                    </a>
                  ))}
                </div>
              </div>
            </div>

            <div className="overflow-hidden rounded-xl border bg-white shadow">
              <div className="px-6 pt-6">
                <h3 className="flex items-center gap-2 text-xl font-semibold text-black">
                  <Calendar className="h-6 w-6 text-brand" aria-hidden="true" />
                  <span>Season</span>
                </h3>
              </div>
              <div className="px-6 pb-6 pt-4">
                <p className="text-sm text-gray-700">Regular season May&ndash;September &middot; Tuesdays &amp; Thursdays</p>
                <p className="mt-2 text-sm text-gray-700">
                  Plus the Charity Tournament (early June) and Year-End Tournament (mid-September)
                </p>
              </div>
            </div>
          </div>

          <ContactForm />
        </div>
      </div>
    </div>
  );
}

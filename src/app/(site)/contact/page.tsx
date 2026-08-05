import type { Metadata } from "next";
import Link from "next/link";
import { Mail, MapPin, Calendar } from "lucide-react";
import { sanityFetch } from "@/lib/sanity/client";
import { adminSettingsQuery } from "@/lib/sanity/queries";
import type { AdminSettings } from "@/lib/types";
import { urlFor } from "@/lib/sanity/image";
import ContactForm from "@/components/ContactForm";

export const metadata: Metadata = { title: "Contact" };

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
          <p className="mt-1.5 text-base text-white/70">Get in touch with MMSPL Execs</p>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-5 py-16">
        <div className="grid gap-8 md:grid-cols-2">
          <ContactForm />

          <div className="space-y-6">
            <div className="overflow-hidden rounded-xl border bg-white shadow">
              <div className="px-6 pt-6">
                <h3 className="flex items-center gap-2 text-xl font-semibold text-black">
                  <Mail className="h-6 w-6 text-red-600" aria-hidden="true" />
                  <span>Email Us</span>
                </h3>
              </div>
              <div className="px-6 pb-6 pt-4">
                <div className="space-y-2">
                  <p className="text-sm text-gray-700">
                    <strong>President:</strong>{" "}
                    <a href="mailto:president@mmspl.ca" className="text-red-600 hover:underline">
                      president@mmspl.ca
                    </a>
                  </p>
                  <p className="text-sm text-gray-700">
                    <strong>Secretary:</strong>{" "}
                    <a href="mailto:secretary@mmspl.ca" className="text-red-600 hover:underline">
                      secretary@mmspl.ca
                    </a>
                  </p>
                </div>
              </div>
            </div>

            <div className="overflow-hidden rounded-xl border bg-white shadow">
              <div className="px-6 pt-6">
                <h3 className="flex items-center gap-2 text-xl font-semibold text-black">
                  <MapPin className="h-6 w-6 text-red-600" aria-hidden="true" />
                  <span>Game Locations</span>
                </h3>
              </div>
              <div className="px-6 pb-6 pt-4">
                <div className="space-y-3">
                  <div>
                    <h4 className="font-bold text-black">Centennial Park</h4>
                    <p className="text-sm text-gray-600">Bullock and McCowan, Markham, ON</p>
                    <a
                      href="https://maps.google.com/?q=Centennial+Park,+Bullock+and+McCowan,+Markham+ON"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-red-600 hover:underline"
                    >
                      Get Directions &rarr;
                    </a>
                  </div>
                  <div>
                    <h4 className="font-bold text-black">Mintleaf Park</h4>
                    <p className="text-sm text-gray-600">Fincham and Wootten Way N., Markham, ON</p>
                    <a
                      href="https://maps.google.com/?q=Mintleaf+Park,+Fincham+and+Wootten+Way+N,+Markham+ON"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-red-600 hover:underline"
                    >
                      Get Directions &rarr;
                    </a>
                  </div>
                </div>
              </div>
            </div>

            <div className="overflow-hidden rounded-xl border bg-white shadow">
              <div className="px-6 pt-6">
                <h3 className="flex items-center gap-2 text-xl font-semibold text-black">
                  <Calendar className="h-6 w-6 text-red-600" aria-hidden="true" />
                  <span>Season Schedule</span>
                </h3>
              </div>
              <div className="px-6 pb-6 pt-4">
                <div className="space-y-2">
                  <p className="text-sm text-gray-700">
                    <strong>Regular Season:</strong> May to September
                  </p>
                  <p className="text-sm text-gray-700">
                    <strong>Game Days:</strong> Tuesdays and Thursdays
                  </p>
                  <p className="text-sm text-gray-700">
                    <strong>Tournaments:</strong> Charity Tournament (early June) and Year-End Playoffs (mid-September)
                  </p>
                </div>
              </div>
            </div>

            <div className="overflow-hidden rounded-xl border bg-gradient-to-r from-black to-gray-900 text-white shadow">
              <div className="px-6 pb-6 pt-6">
                <h3 className="mb-3 text-xl font-bold">Sponsorship Opportunities</h3>
                <p className="mb-3 text-sm text-gray-300">
                  We are welcoming new sponsorships to our league. If you are a local business in Markham and would
                  like to sponsor a team in the MMSPL, please contact us using the form.
                </p>
                <p className="text-xs text-gray-400">Help support our community while getting your business recognized!</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

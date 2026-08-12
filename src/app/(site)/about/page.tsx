import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { sanityFetch } from "@/lib/sanity/client";
import { adminSettingsQuery, publicGalleryPhotosQuery, galleryCategoriesQuery } from "@/lib/sanity/queries";
import type { AdminSettings, PublicGalleryPhoto } from "@/lib/types";
import { ABOUT_PAGE_IMAGES, CHARITY_PRESENTATIONS } from "@/lib/seed-content";
import { urlFor } from "@/lib/sanity/image";
import AboutTabs from "@/components/AboutTabs";
import StatsSection from "@/components/StatsSection";

export const metadata: Metadata = { title: "About" };

export default async function AboutPage() {
  const [settings, galleryPhotos, galleryCategories] = await Promise.all([
    sanityFetch<AdminSettings | null>(adminSettingsQuery, {}, null),
    sanityFetch<PublicGalleryPhoto[]>(publicGalleryPhotosQuery, {}, []),
    sanityFetch<string[] | null>(galleryCategoriesQuery, {}, null),
  ]);

  const heroImage = settings?.aboutHeroImage || settings?.heroImage;
  const heroImageUrl = heroImage ? urlFor(heroImage).width(1920).height(1080).fit("crop").url() : ABOUT_PAGE_IMAGES.hero;
  const communityPhotos = settings?.homeCommunityPhotos?.slice(0, 4) ?? [];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="relative h-[260px] overflow-hidden">
        {communityPhotos.length > 0 ? (
          <div
            className="absolute inset-0 grid"
            style={{ gridTemplateColumns: `repeat(${communityPhotos.length}, minmax(0, 1fr))` }}
          >
            {communityPhotos.map((p, i) => (
              <div key={i} className="relative h-full w-full overflow-hidden">
                <Image
                  src={urlFor(p.image).width(600).height(700).fit("crop").url()}
                  alt=""
                  fill
                  className="object-cover"
                  style={{ objectPosition: p.position || "center" }}
                  sizes="25vw"
                  priority
                />
              </div>
            ))}
          </div>
        ) : (
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `url(${heroImageUrl})`,
              backgroundSize: "cover",
              backgroundPosition: "center top",
              backgroundRepeat: "no-repeat",
            }}
          />
        )}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "linear-gradient(rgba(10,10,12,0.35), rgba(10,10,12,0.08) 35%, rgba(10,10,12,0.55) 80%)",
          }}
        />
        <div className="absolute left-0 top-0 px-5 pt-5">
          <p className="text-[10px] uppercase tracking-[0.14em] text-white/45">
            <Link href="/" className="no-underline hover:underline">
              Home
            </Link>{" "}
            / About
          </p>
        </div>
        <div className="absolute bottom-0 left-0 px-5 pb-7">
          <h1 className="font-heading uppercase leading-none tracking-[0.01em] text-white text-[clamp(2rem,5vw,3.2rem)]">
            About MMSPL
          </h1>
          <p className="mt-1.5 text-base text-white/70">Over 50 years of tradition and community</p>
        </div>
      </div>

      <StatsSection />

      <div className="mx-auto max-w-7xl px-5 py-16">
        <AboutTabs
          presentations={CHARITY_PRESENTATIONS}
          logo50={ABOUT_PAGE_IMAGES.logo50}
          galleryPhotos={galleryPhotos}
          galleryCategories={galleryCategories && galleryCategories.length > 0 ? galleryCategories : ["Tournament", "Charity", "Awards"]}
        />
      </div>
    </div>
  );
}

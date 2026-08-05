import type { Metadata } from "next";
import Link from "next/link";
import { sanityFetch } from "@/lib/sanity/client";
import { adminSettingsQuery, publicGalleryPhotosQuery, galleryCategoriesQuery } from "@/lib/sanity/queries";
import type { AdminSettings, PublicGalleryPhoto } from "@/lib/types";
import { urlFor } from "@/lib/sanity/image";
import GallerySection from "@/components/GallerySection";

export const metadata: Metadata = { title: "Photo Gallery" };

export default async function GalleryPage() {
  const [settings, photos, categories] = await Promise.all([
    sanityFetch<AdminSettings | null>(adminSettingsQuery, {}, null),
    sanityFetch<PublicGalleryPhoto[]>(publicGalleryPhotosQuery, {}, []),
    sanityFetch<string[] | null>(galleryCategoriesQuery, {}, null),
  ]);

  const heroImage = settings?.galleryHeroImage || settings?.heroImage;
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
            / Gallery
          </p>
        </div>
        <div className="absolute bottom-0 left-0 px-5 pb-7">
          <h1 className="font-heading uppercase leading-none tracking-[0.01em] text-white text-[clamp(2rem,5vw,3.2rem)]">
            Photo Gallery
          </h1>
          <p className="mt-1.5 text-base text-white/70">Memorable moments from MMSPL over the years</p>
        </div>
      </div>

      <GallerySection photos={photos} categories={categories && categories.length > 0 ? categories : ["Tournament", "Charity", "Awards"]} />
    </div>
  );
}

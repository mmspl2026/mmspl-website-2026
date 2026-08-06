import type { Metadata } from "next";
import Link from "next/link";
import { sanityFetch } from "@/lib/sanity/client";
import { allNewsQuery, adminSettingsQuery } from "@/lib/sanity/queries";
import type { AdminSettings, NewsItem } from "@/lib/types";
import { SEED_NEWS } from "@/lib/seed-data";
import { urlFor } from "@/lib/sanity/image";
import NewsCard from "@/components/NewsCard";

export const metadata: Metadata = { title: "News" };

export default async function NewsIndexPage() {
  const [news, settings] = await Promise.all([
    sanityFetch<NewsItem[]>(allNewsQuery, {}, []),
    sanityFetch<AdminSettings | null>(adminSettingsQuery, {}, null),
  ]);
  const displayNews = news.length > 0 ? news : SEED_NEWS;

  const heroImage = settings?.newsHeroImage || settings?.heroImage;
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
            / News
          </p>
        </div>
        <div className="absolute bottom-0 left-0 px-5 pb-7">
          <h1 className="font-heading uppercase leading-none tracking-[0.01em] text-white text-[clamp(2rem,5vw,3.2rem)]">
            League News
          </h1>
          <p className="mt-1.5 text-base text-white/70">Announcements, results, and updates from around the league</p>
        </div>
      </div>

      <div className="container-page py-12">
        {displayNews.length === 0 ? (
          <p className="py-16 text-center text-black/50">No news articles yet — check back soon.</p>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {displayNews.map((item) => (
              <NewsCard key={item._id} item={item} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

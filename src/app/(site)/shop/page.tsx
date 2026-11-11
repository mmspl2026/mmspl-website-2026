import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { Bell, Clock } from "lucide-react";
import { sanityFetch } from "@/lib/sanity/client";
import { adminSettingsQuery, activeShopProductsQuery } from "@/lib/sanity/queries";
import type { AdminSettings, ShopProduct } from "@/lib/types";
import { urlFor } from "@/lib/sanity/image";

export const metadata: Metadata = { title: "Shop" };

const DEFAULT_COMING_SOON_MESSAGE =
  "We're still finishing setup with our payment processor. Check back soon, or subscribe to notifications and we'll let you know the moment the shop opens.";

function ProductCard({ product, paymentsEnabled }: { product: ShopProduct; paymentsEnabled: boolean }) {
  const imageUrl = product.photo ? urlFor(product.photo).width(900).fit("max").url() : null;

  return (
    <div className="overflow-hidden rounded-xl border border-black/10 bg-white shadow-sm">
      <div className="relative flex aspect-[4/5] items-center justify-center bg-neutral-50 p-6">
        {imageUrl && (
          <Image
            src={imageUrl}
            alt={product.photo?.alt || product.name}
            fill
            sizes="(min-width: 768px) 420px, 90vw"
            className="object-contain p-6"
          />
        )}
      </div>
      <div className="p-6">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-xl">{product.name}</h2>
          <p className="font-mono-brand text-xl font-bold text-brand">
            {typeof product.price === "number" ? `$${product.price.toFixed(2)}` : "$TBD"}
          </p>
        </div>
        {product.description && <p className="mt-2 text-sm text-black/70">{product.description}</p>}

        {product.sizes && product.sizes.length > 0 && (
          <div className="mt-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-black/40">Available Sizes</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {product.sizes.map((size) => (
                <span
                  key={size}
                  className="rounded-md border border-black/15 px-2.5 py-1 text-sm font-semibold text-black/70"
                >
                  {size}
                </span>
              ))}
            </div>
          </div>
        )}

        {product.fulfillmentNote && <p className="mt-4 text-xs italic text-black/50">{product.fulfillmentNote}</p>}

        {/* Real checkout wires in here once shopPaymentsEnabled flips on and a
            Stripe Checkout Session API route exists — deliberately not built
            yet, since Stripe account setup is still in progress. */}
        {!paymentsEnabled && (
          <div className="mt-5 flex items-center gap-2 rounded-md bg-neutral-100 px-3 py-2 text-sm font-semibold text-black/60">
            <Clock size={15} className="shrink-0" aria-hidden="true" />
            Online payments coming soon
          </div>
        )}
      </div>
    </div>
  );
}

export default async function ShopPage() {
  const [settings, products] = await Promise.all([
    sanityFetch<AdminSettings | null>(adminSettingsQuery, {}, null),
    sanityFetch<ShopProduct[]>(activeShopProductsQuery, {}, []),
  ]);

  const paymentsEnabled = settings?.shopPaymentsEnabled ?? false;
  const heroImage = settings?.shopHeroImage || settings?.heroImage;
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
            / Shop
          </p>
        </div>
        <div className="absolute bottom-0 left-0 px-5 pb-7">
          <h1 className="font-heading uppercase leading-none tracking-[0.01em] text-white text-[clamp(2rem,5vw,3.2rem)]">
            MMSPL Shop
          </h1>
          <p className="mt-1.5 text-base text-white/70">Not-for-profit — proceeds go straight back to the league</p>
          <p className="mt-1 text-sm text-white/55">Men&apos;s sizing available first — women&apos;s sizing coming soon</p>
        </div>
      </div>

      <div className="container-page py-10">
        {!paymentsEnabled && (
          <div className="mb-8 flex flex-col items-start gap-4 rounded-xl border border-black/10 bg-[#0d0d0e] px-6 py-6 text-white sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <Clock size={22} className="mt-0.5 shrink-0 text-brand" aria-hidden="true" />
              <div>
                <p className="font-heading text-lg uppercase tracking-[0.01em]">Online payments coming soon</p>
                <p className="mt-1 max-w-xl text-sm text-white/70">
                  {settings?.shopComingSoonMessage || DEFAULT_COMING_SOON_MESSAGE}
                </p>
              </div>
            </div>
            <Link
              href="/notifications"
              className="inline-flex shrink-0 items-center gap-2 rounded-md bg-brand px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
            >
              <Bell size={15} aria-hidden="true" />
              Get Notified
            </Link>
          </div>
        )}

        {products.length === 0 ? (
          <p className="py-16 text-center text-sm text-black/60">
            Nothing in the shop just yet — check back soon.
          </p>
        ) : (
          <>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {products.map((product) => (
                <ProductCard key={product._id} product={product} paymentsEnabled={paymentsEnabled} />
              ))}
            </div>
            <p className="mt-6 text-center text-xs text-black/40">
              Product photos are for reference — actual item may vary slightly in colour and print placement.
            </p>
          </>
        )}
      </div>
    </div>
  );
}

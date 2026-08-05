import Image from "next/image";
import type { AdminSettings } from "@/lib/types";
import { urlFor } from "@/lib/sanity/image";

export default function CommunityPhotoStrip({ photos }: { photos: AdminSettings["homeCommunityPhotos"] }) {
  if (!photos || photos.length === 0) return null;

  return (
    <section>
      <div className="grid h-48 grid-cols-4">
        {photos.map((p, i) => (
          <div key={i} className="relative flex-1 overflow-hidden">
            <Image
              src={urlFor(p.image).width(600).height(400).fit("crop").url()}
              alt="League photo"
              fill
              className="object-cover transition-transform duration-500 hover:scale-110"
              style={{ objectPosition: p.position || "center" }}
              sizes="25vw"
            />
          </div>
        ))}
      </div>
    </section>
  );
}

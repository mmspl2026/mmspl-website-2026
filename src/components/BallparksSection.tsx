import { MapPin } from "lucide-react";
import { BALLPARKS } from "@/lib/seed-content";

export default function BallparksSection() {
  return (
    <section aria-labelledby="ballparks-heading" className="bg-white py-16">
      <div className="container-page">
        <h2 id="ballparks-heading" className="text-3xl sm:text-4xl">
          Our Ballparks
        </h2>
        <div className="mt-8 grid gap-6 sm:grid-cols-2">
          {BALLPARKS.map((park) => (
            <div key={park.name} className="flex items-start gap-4 rounded-lg border border-black/10 p-6">
              <MapPin className="mt-1 shrink-0 text-brand" size={24} aria-hidden="true" />
              <div>
                <h3 className="text-xl">
                  <a
                    href={park.mapUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="transition-colors hover:text-blue-600"
                  >
                    {park.name}
                  </a>
                </h3>
                <p className="mt-1 text-black/60">{park.address}</p>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-4 text-xs text-black/40">Tip: click a park name for directions.</p>
      </div>
    </section>
  );
}

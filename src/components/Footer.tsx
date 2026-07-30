import Link from "next/link";
import Image from "next/image";
import SocialLinks from "./SocialLinks";
import { LEAGUE_ADDRESS, LEAGUE_FOUNDING_YEAR } from "@/lib/seed-content";

const FOOTER_LINKS = [
  { href: "/standings", label: "Standings" },
  { href: "/schedule", label: "Schedule" },
  { href: "/awards", label: "Awards" },
  { href: "/register", label: "Register" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

export default function Footer() {
  return (
    <footer className="bg-black text-white">
      <div className="container-page grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <Image src="/mmspl-logo.png" alt="Markham Men's Slo-Pitch League logo" width={96} height={56} />
          <p className="mt-4 max-w-xs text-sm text-white/70">
            Markham&rsquo;s longest active men&rsquo;s softball league, established {LEAGUE_FOUNDING_YEAR}.
          </p>
        </div>

        <nav aria-label="Footer">
          <h2 className="mb-3 text-sm font-heading uppercase tracking-wide text-white/90">Explore</h2>
          <ul className="space-y-2 text-sm">
            {FOOTER_LINKS.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="text-white/70 hover:text-white">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div>
          <h2 className="mb-3 text-sm font-heading uppercase tracking-wide text-white/90">Contact</h2>
          <address className="not-italic text-sm text-white/70">{LEAGUE_ADDRESS}</address>
          <Link href="/contact" className="mt-2 inline-block text-sm text-brand-300 hover:text-brand-200">
            Send a message &rarr;
          </Link>
        </div>

        <div>
          <h2 className="mb-3 text-sm font-heading uppercase tracking-wide text-white/90">Follow</h2>
          <SocialLinks />
        </div>
      </div>

      <div className="border-t border-white/10 py-6">
        <p className="container-page text-center text-xs text-white/50">
          &copy; {new Date().getFullYear()} Markham Men&rsquo;s Slo-Pitch League. All rights reserved.
        </p>
      </div>
    </footer>
  );
}

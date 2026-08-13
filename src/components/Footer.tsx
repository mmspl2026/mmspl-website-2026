import Link from "next/link";
import { MapPin, Calendar, Mail } from "lucide-react";
import { SOCIAL_LINKS } from "@/lib/seed-content";
import { FacebookIcon, YoutubeIcon, InstagramIcon } from "./icons/BrandSocialIcons";

export default function Footer() {
  return (
    <footer className="border-t-2 border-red-600 bg-black text-white">
      <div className="mx-auto max-w-7xl px-5 py-12">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          <div>
            <p className="mb-4 text-sm text-gray-400">
              Markham&apos;s longest active men&apos;s softball league, established in 1968.
            </p>
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

          <div>
            <h4 className="mb-4 text-lg font-semibold text-red-600">Quick Links</h4>
            <ul className="space-y-2">
              <li>
                <Link href="/about" className="text-sm text-gray-400 transition-colors hover:text-red-600">
                  About Us
                </Link>
              </li>
              <li>
                <Link href="/schedule" className="text-sm text-gray-400 transition-colors hover:text-red-600">
                  Schedule
                </Link>
              </li>
              <li>
                <Link href="/standings" className="text-sm text-gray-400 transition-colors hover:text-red-600">
                  Standings
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="mb-4 text-lg font-semibold text-red-600">Information</h4>
            <ul className="space-y-2">
              <li>
                <Link href="/register" className="text-sm text-gray-400 transition-colors hover:text-red-600">
                  Registration
                </Link>
              </li>
              <li>
                <Link href="/news" className="text-sm text-gray-400 transition-colors hover:text-red-600">
                  News &amp; Updates
                </Link>
              </li>
              <li>
                <Link href="/about#gallery" className="text-sm text-gray-400 transition-colors hover:text-red-600">
                  Gallery
                </Link>
              </li>
              <li>
                <Link href="/awards" className="text-sm text-gray-400 transition-colors hover:text-red-600">
                  Awards
                </Link>
              </li>
              <li>
                <Link href="/contact" className="text-sm text-gray-400 transition-colors hover:text-red-600">
                  Contact Us
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="mb-4 text-lg font-semibold text-red-600">Contact Info</h4>
            <ul className="space-y-3">
              <li className="flex items-start space-x-2 text-sm">
                <MapPin className="mt-1 h-4 w-4 flex-shrink-0 text-red-600" aria-hidden="true" />
                <span className="text-gray-400">Centennial Park &amp; Mintleaf Park, Markham, ON</span>
              </li>
              <li className="flex items-start space-x-2 text-sm">
                <Calendar className="mt-1 h-4 w-4 flex-shrink-0 text-red-600" aria-hidden="true" />
                <span className="text-gray-400">
                  May - September
                  <br />
                  Tues &amp; Thurs
                </span>
              </li>
              <li className="flex items-start space-x-2 text-sm">
                <Mail className="mt-1 h-4 w-4 flex-shrink-0 text-red-600" aria-hidden="true" />
                <Link href="/contact" className="text-gray-400 transition-colors hover:text-red-600">
                  Contact Form
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 border-t border-gray-800 pt-8 text-center">
          <p className="text-sm text-gray-400">
            &copy; {new Date().getFullYear()} Markham Men&apos;s Slo-Pitch League. All rights reserved.
            {" "}&middot;{" "}
            <Link href="/privacy" className="transition-colors hover:text-red-600 hover:underline">
              Privacy Policy
            </Link>
          </p>
          <p className="mt-2 text-xs text-gray-500">Proudly supporting local Markham charities since 1982</p>
        </div>
      </div>
    </footer>
  );
}

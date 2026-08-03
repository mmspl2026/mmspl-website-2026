import Link from "next/link";
import { MapPin, Calendar, Mail } from "lucide-react";
import { SOCIAL_LINKS } from "@/lib/seed-content";

function FacebookIcon() {
  return (
    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}

function YoutubeIcon() {
  return (
    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  );
}

function InstagramIcon() {
  return (
    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
    </svg>
  );
}

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
                <Link href="/gallery" className="text-sm text-gray-400 transition-colors hover:text-red-600">
                  Photo Gallery
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
          </p>
          <p className="mt-2 text-xs text-gray-500">Proudly supporting local Markham charities since 1982</p>
        </div>
      </div>
    </footer>
  );
}

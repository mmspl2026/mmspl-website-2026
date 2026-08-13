import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Privacy Policy" };

const SECTIONS: { heading: string; items: React.ReactNode[] }[] = [
  {
    heading: "What We Collect",
    items: [
      "Registration information (name, email, phone) when you register for the league",
      "Contact form submissions (name, email, message)",
      "Notification subscription (email address if you subscribe)",
      "Basic analytics (anonymous page views via Vercel Analytics — no personal data)",
    ],
  },
  {
    heading: "How We Use It",
    items: [
      "Registration data: to process your league registration and contact you about league matters",
      "Contact submissions: to respond to your enquiry",
      "Email subscriptions: to send game cancellation alerts and league announcements",
      "We never sell or share your data with third parties",
    ],
  },
  {
    heading: "Data Storage",
    items: [
      "All data is stored securely in Sanity CMS",
      "Images and files stored on Sanity CDN",
      "We retain registration data for the current season plus one year",
    ],
  },
  {
    heading: "Your Rights (PIPEDA)",
    items: [
      "You may request access to your personal information",
      "You may request correction of inaccurate information",
      "You may unsubscribe from notifications at any time",
      "Contact us via the contact form to exercise these rights",
    ],
  },
  {
    heading: "Cookies",
    items: [
      "This site uses minimal cookies for essential functionality only",
      "No advertising or third-party tracking cookies are used",
    ],
  },
];

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div
        className="relative h-[260px] overflow-hidden"
        style={{
          backgroundImage:
            "linear-gradient(rgba(10,10,12,0.65), rgba(10,10,12,0.25) 35%, rgba(10,10,12,0.85) 80%), url(/hero.jpg)",
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
            / Privacy Policy
          </p>
        </div>
        <div className="absolute bottom-0 left-0 px-5 pb-7">
          <h1 className="font-heading uppercase leading-none tracking-[0.01em] text-white text-[clamp(2rem,5vw,3.2rem)]">
            Privacy Policy
          </h1>
          <p className="mt-1.5 text-base text-white/70">Your privacy matters to us</p>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-5 py-16">
        <div className="rounded-xl border bg-white p-6 shadow sm:p-10">
          {SECTIONS.map((section) => (
            <div key={section.heading} className="mb-10 last:mb-0">
              <h2 className="mb-3 font-heading text-xl uppercase tracking-[0.01em] text-black">{section.heading}</h2>
              <ul className="space-y-2">
                {section.items.map((item, i) => (
                  <li key={i} className="flex items-start leading-relaxed text-gray-700">
                    <span className="mr-2 mt-1 text-brand">&bull;</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <div className="mb-10">
            <h2 className="mb-3 font-heading text-xl uppercase tracking-[0.01em] text-black">Contact</h2>
            <p className="leading-relaxed text-gray-700">
              For privacy inquiries, please get in touch via our{" "}
              <Link href="/contact" className="text-brand hover:underline">
                contact form
              </Link>
              .
            </p>
          </div>

          <p className="border-t pt-6 text-sm text-gray-500">Last updated: August 2026</p>
        </div>
      </div>
    </div>
  );
}

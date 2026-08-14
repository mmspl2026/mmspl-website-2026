"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { ChevronDown, Send } from "lucide-react";

const SUBJECT_OPTIONS = [
  "General Inquiry",
  "Registration",
  "Sponsorship",
  "Scheduling",
  "Rules",
  "Other",
];

const SUBJECT_LABELS: Record<string, string> = {
  "General Inquiry": "General Inquiry",
  Registration: "Registration",
  Sponsorship: "Sponsorship",
  Scheduling: "Scheduling",
  Rules: "Rules & Regulations",
  Other: "Other",
};

const INITIAL_STATE = { name: "", email: "", subject: "General Inquiry", message: "" };

const CONTROL_CLASS =
  "flex h-9 w-full rounded-md border border-[#e5e5e5] bg-transparent px-3 py-1 text-base shadow-sm transition-colors placeholder:text-[#737373] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-black disabled:cursor-not-allowed disabled:opacity-50 md:text-sm mt-1";

export default function ContactForm() {
  const [form, setForm] = useState(INITIAL_STATE);
  const [status, setStatus] = useState<"idle" | "submitting" | "sent">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const successRef = useRef<HTMLDivElement>(null);
  const formCardRef = useRef<HTMLDivElement>(null);

  // On mobile the form can extend well below the fold — without this, the
  // success message renders in place but the page stays scrolled wherever
  // the user left it, so they never see the confirmation.
  useEffect(() => {
    if (status === "sent") {
      successRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [status]);

  // Mobile only: the contact page stacks info cards above this form, so
  // landing here from a "Contact Us" link leaves the form off-screen below
  // the fold. Bring it into view on load so it's immediately visible.
  useEffect(() => {
    if (window.innerWidth < 640) {
      formCardRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, []);

  function update<K extends keyof typeof INITIAL_STATE>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setStatus("submitting");
    setErrorMessage("");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to send message. Please try again or email us directly.");
      }
      setStatus("sent");
      setForm(INITIAL_STATE);
    } catch (err) {
      setStatus("idle");
      setErrorMessage(
        err instanceof Error ? err.message : "Failed to send message. Please try again or email us directly."
      );
    }
  }

  return (
    <div ref={formCardRef} className="h-full overflow-hidden rounded-xl border bg-white text-black shadow">
      <div className="bg-gradient-to-r from-black to-gray-900 px-6 py-6 text-white">
        <h2 className="text-2xl font-semibold">Send Us a Message</h2>
        <p className="text-sm text-gray-300">Your message will be sent directly to the league executive</p>
      </div>

      {status === "sent" ? (
        <div ref={successRef} className="flex flex-col items-center gap-2 px-6 py-16 text-center">
          <p className="text-lg font-semibold text-black">✅ Message sent! We&apos;ll get back to you shortly.</p>
        </div>
      ) : (
        <div className="px-6 pb-6 pt-6">
          <form onSubmit={handleSubmit} noValidate className="space-y-4" data-testid="contact-form">
            <div>
              <label htmlFor="name" className="text-sm font-medium leading-none">
                Your Name *
              </label>
              <input
                id="name"
                required
                placeholder="John Smith"
                data-testid="contact-name"
                value={form.name}
                onChange={(e) => update("name", e.target.value)}
                className={CONTROL_CLASS}
              />
            </div>
            <div>
              <label htmlFor="email" className="text-sm font-medium leading-none">
                Your Email *
              </label>
              <input
                id="email"
                type="email"
                required
                placeholder="john@example.com"
                data-testid="contact-email"
                value={form.email}
                onChange={(e) => update("email", e.target.value)}
                className={CONTROL_CLASS}
              />
            </div>
            <div>
              <label htmlFor="subject" className="text-sm font-medium leading-none">
                Reason
              </label>
              <div className="relative mt-1">
                <select
                  id="subject"
                  data-testid="contact-subject"
                  value={form.subject}
                  onChange={(e) => update("subject", e.target.value)}
                  className="flex h-9 w-full appearance-none items-center justify-between rounded-md border border-[#e5e5e5] bg-transparent px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-black"
                >
                  {SUBJECT_OPTIONS.map((o) => (
                    <option key={o} value={o}>
                      {SUBJECT_LABELS[o]}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 opacity-50"
                  aria-hidden="true"
                />
              </div>
            </div>
            <div>
              <label htmlFor="message" className="text-sm font-medium leading-none">
                Message *
              </label>
              <textarea
                id="message"
                required
                rows={4}
                placeholder="Tell us how we can help you..."
                data-testid="contact-message"
                value={form.message}
                onChange={(e) => update("message", e.target.value)}
                className="mt-1 flex min-h-[60px] w-full rounded-md border border-[#e5e5e5] bg-transparent px-3 py-2 text-base shadow-sm transition-colors placeholder:text-[#737373] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-black md:text-sm"
              />
            </div>

            {errorMessage && (
              <p role="alert" className="text-sm text-brand">
                {errorMessage}
              </p>
            )}

            <button
              type="submit"
              disabled={status === "submitting"}
              data-testid="contact-submit"
              className="flex w-full items-center justify-center rounded-md bg-brand py-6 text-lg font-bold text-white shadow transition-colors hover:bg-brand-700 disabled:opacity-50"
            >
              <Send className="mr-2 h-5 w-5" aria-hidden="true" />
              {status === "submitting" ? "Sending..." : "Send Message"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

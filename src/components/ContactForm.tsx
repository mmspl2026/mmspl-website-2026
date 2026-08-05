"use client";

import { useEffect, useState, type FormEvent } from "react";
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
  Sponsorship: "Sponsorship Opportunity",
  Scheduling: "Scheduling Question",
  Rules: "Rules & Regulations",
  Other: "Other",
};

const INITIAL_STATE = { name: "", email: "", subject: "General Inquiry", message: "" };

const CONTROL_CLASS =
  "flex h-9 w-full rounded-md border border-[#e5e5e5] bg-transparent px-3 py-1 text-base shadow-sm transition-colors placeholder:text-[#737373] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-black disabled:cursor-not-allowed disabled:opacity-50 md:text-sm mt-1";

export default function ContactForm() {
  const [form, setForm] = useState(INITIAL_STATE);
  const [status, setStatus] = useState<"idle" | "submitting">("idle");
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  function update<K extends keyof typeof INITIAL_STATE>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setStatus("submitting");
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
      setToast({ type: "success", message: "Message sent! We will get back to you shortly." });
      setForm(INITIAL_STATE);
    } catch (err) {
      setToast({
        type: "error",
        message: err instanceof Error ? err.message : "Failed to send message. Please try again or email us directly.",
      });
    } finally {
      setStatus("idle");
    }
  }

  return (
    <div className="h-full overflow-hidden rounded-xl border bg-white text-black shadow">
      <div className="bg-gradient-to-r from-black to-gray-900 px-6 py-6 text-white">
        <h2 className="text-2xl font-semibold">Send Us a Message</h2>
        <p className="text-sm text-gray-300">Your message will be sent directly to the league executive</p>
      </div>
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
              Subject
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
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 opacity-50" aria-hidden="true" />
            </div>
          </div>
          <div>
            <label htmlFor="message" className="text-sm font-medium leading-none">
              Message *
            </label>
            <textarea
              id="message"
              required
              rows={6}
              placeholder="Tell us how we can help you..."
              data-testid="contact-message"
              value={form.message}
              onChange={(e) => update("message", e.target.value)}
              className="mt-1 flex min-h-[60px] w-full rounded-md border border-[#e5e5e5] bg-transparent px-3 py-2 text-base shadow-sm transition-colors placeholder:text-[#737373] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-black md:text-sm"
            />
          </div>
          <button
            type="submit"
            disabled={status === "submitting"}
            data-testid="contact-submit"
            className="flex w-full items-center justify-center rounded-md bg-red-600 py-6 text-lg font-bold text-white shadow transition-colors hover:bg-red-700 disabled:opacity-50"
          >
            <Send className="mr-2 h-5 w-5" aria-hidden="true" />
            {status === "submitting" ? "Sending..." : "Send Message"}
          </button>
        </form>
      </div>

      {toast && (
        <div
          role="status"
          className={`fixed bottom-6 right-6 z-50 rounded-md px-4 py-3 text-sm text-white shadow-lg ${
            toast.type === "success" ? "bg-green-600" : "bg-red-600"
          }`}
        >
          {toast.message}
        </div>
      )}
    </div>
  );
}

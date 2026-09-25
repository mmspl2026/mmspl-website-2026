"use client";

import { useState, type FormEvent } from "react";
import { Check } from "lucide-react";

export default function EmailSubscribeForm() {
  const [email, setEmail] = useState("");
  // Honeypot: real visitors never see or fill this in (see the CSS below).
  // A bot that blindly fills every input on the page trips it; the API
  // silently reports success without creating a subscriber.
  const [website, setWebsite] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setStatus("submitting");
    setErrorMessage("");
    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, website }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Something went wrong. Please try again.");
      }
      setStatus("success");
    } catch (err) {
      setStatus("error");
      setErrorMessage(err instanceof Error ? err.message : "Something went wrong.");
    }
  }

  if (status === "success") {
    return (
      <p role="status" className="flex items-center gap-2 text-sm font-semibold text-green-700">
        <Check size={18} aria-hidden="true" />
        You&rsquo;re subscribed — check your inbox for a confirmation.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2 sm:flex-row" noValidate>
      <div className="absolute h-0 w-0 overflow-hidden opacity-0" aria-hidden="true">
        <label htmlFor="notify-website">Website</label>
        <input
          id="notify-website"
          name="website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
        />
      </div>
      <label htmlFor="notify-email" className="sr-only">
        Email address
      </label>
      <input
        id="notify-email"
        type="email"
        required
        placeholder="you@example.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="input"
      />
      <button
        type="submit"
        disabled={status === "submitting"}
        className="shrink-0 rounded bg-brand px-6 py-2.5 text-sm font-semibold uppercase tracking-wide text-white transition-colors hover:bg-brand-700 disabled:opacity-50"
      >
        {status === "submitting" ? "Subscribing…" : "Subscribe"}
      </button>
      {status === "error" && (
        <p role="alert" className="text-sm text-brand-700 sm:basis-full">
          {errorMessage}
        </p>
      )}
    </form>
  );
}

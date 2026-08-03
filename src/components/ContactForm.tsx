"use client";

import { useState, type FormEvent } from "react";

export default function ContactForm() {
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

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
        throw new Error(data.error || "Something went wrong. Please try again.");
      }
      setStatus("success");
      setForm({ name: "", email: "", subject: "", message: "" });
    } catch (err) {
      setStatus("error");
      setErrorMessage(err instanceof Error ? err.message : "Something went wrong.");
    }
  }

  if (status === "success") {
    return (
      <div role="status" className="rounded-lg border border-green-200 bg-green-50 p-8 text-center">
        <h2 className="text-xl text-green-800">Message Sent</h2>
        <p className="mt-2 text-green-700">Thanks for reaching out — we&rsquo;ll get back to you soon.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      <div>
        <label htmlFor="contact-name" className="mb-1 block text-sm font-semibold text-black/70">
          Name <span className="text-brand">*</span>
        </label>
        <input
          id="contact-name"
          required
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          className="input"
        />
      </div>
      <div>
        <label htmlFor="contact-email" className="mb-1 block text-sm font-semibold text-black/70">
          Email <span className="text-brand">*</span>
        </label>
        <input
          id="contact-email"
          type="email"
          required
          value={form.email}
          onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
          className="input"
        />
      </div>
      <div>
        <label htmlFor="contact-subject" className="mb-1 block text-sm font-semibold text-black/70">
          Subject
        </label>
        <input
          id="contact-subject"
          value={form.subject}
          onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
          className="input"
        />
      </div>
      <div>
        <label htmlFor="contact-message" className="mb-1 block text-sm font-semibold text-black/70">
          Message <span className="text-brand">*</span>
        </label>
        <textarea
          id="contact-message"
          required
          rows={5}
          value={form.message}
          onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
          className="input resize-y"
        />
      </div>

      {errorMessage && (
        <p role="alert" className="text-sm text-brand-700">
          {errorMessage}
        </p>
      )}

      <button
        type="submit"
        disabled={status === "submitting"}
        className="rounded bg-brand px-6 py-2.5 font-semibold uppercase tracking-wide text-white hover:bg-brand-700 disabled:opacity-50"
      >
        {status === "submitting" ? "Sending…" : "Send Message"}
      </button>
    </form>
  );
}

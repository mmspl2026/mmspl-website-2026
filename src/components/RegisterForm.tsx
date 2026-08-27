"use client";

import { useRef, useState, type FormEvent } from "react";
import Script from "next/script";
import { ChevronDown, CheckCircle2 } from "lucide-react";

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement,
        options: {
          sitekey: string;
          callback: (token: string) => void;
          "error-callback"?: () => void;
          "expired-callback"?: () => void;
        }
      ) => string;
      reset: (widgetId?: string) => void;
    };
  }
}

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

interface FormState {
  firstName: string;
  lastName: string;
  streetAddress: string;
  unit: string;
  city: string;
  postalCode: string;
  homeNumber: string;
  mobileNumber: string;
  email: string;
  alternateEmail: string;
  dateOfBirth: string;
  heardAbout: string;
  highestLevel: string;
  category: string;
  preferredPosition: string;
  yearsExperience: string;
  experienceComments: string;
  canPitch: string;
  yearsPitched: string;
  pitchingComments: string;
  website: string;
}

const INITIAL_STATE: FormState = {
  firstName: "",
  lastName: "",
  streetAddress: "",
  unit: "",
  city: "",
  postalCode: "",
  homeNumber: "",
  mobileNumber: "",
  email: "",
  alternateEmail: "",
  dateOfBirth: "",
  heardAbout: "",
  highestLevel: "",
  category: "",
  preferredPosition: "",
  yearsExperience: "",
  experienceComments: "",
  canPitch: "",
  yearsPitched: "",
  pitchingComments: "",
  website: "",
};

const CONTROL_CLASS =
  "flex h-9 w-full rounded-md border border-[#e5e5e5] bg-transparent px-3 py-1 text-base shadow-sm transition-colors placeholder:text-[#737373] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-black disabled:cursor-not-allowed disabled:opacity-50 md:text-sm mt-1";

function Label({ htmlFor, children }: { htmlFor: string; children: React.ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="text-sm font-medium leading-none">
      {children}
    </label>
  );
}

function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={CONTROL_CLASS} />;
}

function TextareaField(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className="mt-1 flex min-h-[60px] w-full rounded-md border border-[#e5e5e5] bg-transparent px-3 py-2 text-base shadow-sm transition-colors placeholder:text-[#737373] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-black disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
    />
  );
}

function SelectField({
  id,
  value,
  onChange,
  required,
  placeholder,
  options,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  placeholder: string;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="relative mt-1">
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="flex h-9 w-full appearance-none items-center justify-between rounded-md border border-[#e5e5e5] bg-transparent px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-black disabled:cursor-not-allowed disabled:opacity-50"
      >
        <option value="" disabled>
          {placeholder}
        </option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 opacity-50" aria-hidden="true" />
    </div>
  );
}

export default function RegisterForm({ onSuccess }: { onSuccess: () => void }) {
  const [form, setForm] = useState<FormState>(INITIAL_STATE);
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  // Spam guard: when this form was rendered, so the API can reject
  // submissions that arrive suspiciously fast (bots fill instantly).
  const loadedAtRef = useRef(Date.now());
  const turnstileContainerRef = useRef<HTMLDivElement>(null);
  const turnstileWidgetIdRef = useRef<string | undefined>(undefined);
  const [turnstileToken, setTurnstileToken] = useState("");

  function renderTurnstile() {
    if (!TURNSTILE_SITE_KEY || !turnstileContainerRef.current || !window.turnstile) return;
    turnstileWidgetIdRef.current = window.turnstile.render(turnstileContainerRef.current, {
      sitekey: TURNSTILE_SITE_KEY,
      callback: (token) => setTurnstileToken(token),
      "error-callback": () => setTurnstileToken(""),
      "expired-callback": () => setTurnstileToken(""),
    });
  }

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (TURNSTILE_SITE_KEY && !turnstileToken) {
      setErrorMessage("Please wait a moment for verification to finish, then try again.");
      return;
    }
    setStatus("submitting");
    setErrorMessage("");
    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, loadedAt: loadedAtRef.current, turnstileToken }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Something went wrong. Please try again.");
      }
      setStatus("success");
      setForm(INITIAL_STATE);
      onSuccess();
    } catch (err) {
      // The token is single-use — get a fresh one before the visitor retries.
      window.turnstile?.reset(turnstileWidgetIdRef.current);
      setTurnstileToken("");
      setStatus("error");
      setErrorMessage(err instanceof Error ? err.message : "Something went wrong.");
    }
  }

  return (
    <div className="rounded-xl border bg-white text-black shadow">
      {TURNSTILE_SITE_KEY && (
        <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js" strategy="afterInteractive" onLoad={renderTurnstile} />
      )}
      <div className="rounded-t-xl bg-gradient-to-r from-black to-gray-900 px-6 py-6 text-white">
        <h2 className="text-2xl font-semibold">Registration Form</h2>
        <p className="text-gray-300">Please fill out all required fields</p>
      </div>
      <form onSubmit={handleSubmit} noValidate className="space-y-6 px-6 pb-6 pt-6">
        {/* Honeypot — invisible to real visitors, irresistible to bots that
            auto-fill every field they find. Kept off-screen rather than
            display:none, since some bots skip fields hidden that way. */}
        <div style={{ position: "absolute", left: "-9999px", top: "-9999px", height: 0, width: 0, overflow: "hidden" }} aria-hidden="true">
          <label htmlFor="website">Leave this field blank</label>
          <input
            id="website"
            name="website"
            type="text"
            tabIndex={-1}
            autoComplete="off"
            value={form.website}
            onChange={(e) => update("website", e.target.value)}
          />
        </div>
        <div>
          <h3 className="mb-4 text-xl font-bold text-black">Personal Information</h3>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="firstName">First Name *</Label>
              <TextInput id="firstName" required value={form.firstName} onChange={(e) => update("firstName", e.target.value)} />
            </div>
            <div>
              <Label htmlFor="lastName">Last Name *</Label>
              <TextInput id="lastName" required value={form.lastName} onChange={(e) => update("lastName", e.target.value)} />
            </div>
          </div>
        </div>

        <div>
          <h3 className="mb-4 text-xl font-bold text-black">Address</h3>
          <div className="space-y-4">
            <div>
              <Label htmlFor="streetAddress">Street Address *</Label>
              <TextInput id="streetAddress" required value={form.streetAddress} onChange={(e) => update("streetAddress", e.target.value)} />
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <Label htmlFor="unit">Unit</Label>
                <TextInput id="unit" value={form.unit} onChange={(e) => update("unit", e.target.value)} />
              </div>
              <div>
                <Label htmlFor="city">City *</Label>
                <TextInput id="city" required value={form.city} onChange={(e) => update("city", e.target.value)} />
              </div>
              <div>
                <Label htmlFor="postalCode">Postal Code *</Label>
                <TextInput id="postalCode" required value={form.postalCode} onChange={(e) => update("postalCode", e.target.value)} />
              </div>
            </div>
          </div>
        </div>

        <div>
          <h3 className="mb-4 text-xl font-bold text-black">Contact Information</h3>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="homeNumber">Home Number</Label>
              <TextInput id="homeNumber" type="tel" value={form.homeNumber} onChange={(e) => update("homeNumber", e.target.value)} />
            </div>
            <div>
              <Label htmlFor="mobileNumber">Mobile Number *</Label>
              <TextInput id="mobileNumber" type="tel" required value={form.mobileNumber} onChange={(e) => update("mobileNumber", e.target.value)} />
            </div>
            <div>
              <Label htmlFor="email">Email *</Label>
              <TextInput id="email" type="email" required value={form.email} onChange={(e) => update("email", e.target.value)} />
            </div>
            <div>
              <Label htmlFor="alternateEmail">Alternate Email</Label>
              <TextInput id="alternateEmail" type="email" value={form.alternateEmail} onChange={(e) => update("alternateEmail", e.target.value)} />
            </div>
            <div>
              <Label htmlFor="dateOfBirth">Date of Birth (MM/DD/YYYY) *</Label>
              <TextInput id="dateOfBirth" type="date" required value={form.dateOfBirth} onChange={(e) => update("dateOfBirth", e.target.value)} />
            </div>
            <div>
              <Label htmlFor="heardAbout">I heard about this league *</Label>
              <SelectField
                id="heardAbout"
                value={form.heardAbout}
                onChange={(v) => update("heardAbout", v)}
                required
                placeholder="Select an option"
                options={[
                  { value: "internet", label: "Internet search" },
                  { value: "family", label: "Family League Member" },
                  { value: "friend", label: "Friend" },
                  { value: "facebook", label: "Facebook" },
                  { value: "community", label: "Ads Within Community" },
                  { value: "online", label: "Online Ad" },
                ]}
              />
            </div>
          </div>
        </div>

        <div>
          <h3 className="mb-4 text-xl font-bold text-black">Playing Experience</h3>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="highestLevel">Highest Level Played *</Label>
              <TextInput
                id="highestLevel"
                required
                placeholder="e.g., Recreational, Competitive, etc."
                value={form.highestLevel}
                onChange={(e) => update("highestLevel", e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="category">SPN/SPO/NSA Category *</Label>
              <SelectField
                id="category"
                value={form.category}
                onChange={(v) => update("category", v)}
                required
                placeholder="Select category"
                options={[
                  { value: "not-sure", label: "Not Sure" },
                  { value: "a", label: "A" },
                  { value: "b", label: "B" },
                  { value: "c", label: "C" },
                  { value: "d", label: "D" },
                  { value: "e", label: "E / Rec" },
                ]}
              />
            </div>
            <div>
              <Label htmlFor="preferredPosition">Preferred Position *</Label>
              <SelectField
                id="preferredPosition"
                value={form.preferredPosition}
                onChange={(v) => update("preferredPosition", v)}
                required
                placeholder="Select position"
                options={[
                  { value: "no-preference", label: "No Preference" },
                  { value: "infield", label: "Infield" },
                  { value: "outfield", label: "Outfield" },
                ]}
              />
            </div>
            <div>
              <Label htmlFor="yearsExperience">Years of Experience *</Label>
              <SelectField
                id="yearsExperience"
                value={form.yearsExperience}
                onChange={(v) => update("yearsExperience", v)}
                required
                placeholder="Select years"
                options={[
                  { value: "0-3", label: "0-3" },
                  { value: "4-6", label: "4-6" },
                  { value: "7-9", label: "7-9" },
                  { value: "10+", label: "10+" },
                ]}
              />
            </div>
          </div>
          <div className="mt-4">
            <Label htmlFor="experienceComments">Comments on Experience</Label>
            <TextareaField id="experienceComments" rows={3} value={form.experienceComments} onChange={(e) => update("experienceComments", e.target.value)} />
          </div>
        </div>

        <div>
          <h3 className="mb-4 text-xl font-bold text-black">Pitching Experience</h3>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="canPitch">I am able to Pitch *</Label>
              <SelectField
                id="canPitch"
                value={form.canPitch}
                onChange={(v) => update("canPitch", v)}
                required
                placeholder="Select option"
                options={[
                  { value: "no", label: "No" },
                  { value: "occasional", label: "On an occasional basis" },
                  { value: "primary", label: "As my primary position" },
                ]}
              />
            </div>
            <div>
              <Label htmlFor="yearsPitched">Years Pitched</Label>
              <SelectField
                id="yearsPitched"
                value={form.yearsPitched}
                onChange={(v) => update("yearsPitched", v)}
                placeholder="Select years"
                options={[
                  { value: "0-3", label: "0-3" },
                  { value: "4-6", label: "4-6" },
                  { value: "7-9", label: "7-9" },
                  { value: "10+", label: "10+" },
                ]}
              />
            </div>
          </div>
          <div className="mt-4">
            <Label htmlFor="pitchingComments">Comments on Pitching Experience</Label>
            <TextareaField id="pitchingComments" rows={3} value={form.pitchingComments} onChange={(e) => update("pitchingComments", e.target.value)} />
          </div>
        </div>

        {TURNSTILE_SITE_KEY && <div ref={turnstileContainerRef} className="flex justify-center" />}

        {errorMessage && (
          <p role="alert" className="text-sm text-red-600">
            {errorMessage}
          </p>
        )}

        <div className="flex gap-4">
          <button
            type="submit"
            disabled={status === "submitting"}
            className="flex flex-1 items-center justify-center rounded-md bg-red-600 py-6 text-lg font-bold text-white shadow transition-colors hover:bg-red-700 disabled:opacity-50"
          >
            <CheckCircle2 className="mr-2 h-5 w-5" aria-hidden="true" />
            {status === "submitting" ? "Submitting…" : "Submit Registration"}
          </button>
        </div>
      </form>
    </div>
  );
}

"use client";

import { useState, type FormEvent } from "react";
import clsx from "clsx";

interface FormState {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  birthYear: string;
  experience: string;
  position: string;
  emergencyContact: string;
  emergencyPhone: string;
  agreeToTerms: boolean;
}

const INITIAL_STATE: FormState = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  birthYear: "",
  experience: "returning",
  position: "",
  emergencyContact: "",
  emergencyPhone: "",
  agreeToTerms: false,
};

const STEPS = ["Player Info", "Experience", "Emergency Contact", "Review"] as const;

export default function RegisterForm({ registrationOpen }: { registrationOpen: boolean }) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormState>(INITIAL_STATE);
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function canAdvance() {
    if (step === 0) return form.firstName && form.lastName && form.email && form.phone;
    if (step === 1) return form.experience && form.position;
    if (step === 2) return form.emergencyContact && form.emergencyPhone;
    return true;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form.agreeToTerms) {
      setErrorMessage("Please agree to the league terms before submitting.");
      return;
    }
    setStatus("submitting");
    setErrorMessage("");
    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
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

  if (!registrationOpen) {
    return (
      <div className="rounded-lg border border-black/10 bg-black/5 p-8 text-center">
        <h2 className="text-xl">Registration Is Currently Closed</h2>
        <p className="mt-2 text-black/60">
          Check back closer to the season, or follow us on social media for the announcement.
        </p>
      </div>
    );
  }

  if (status === "success") {
    return (
      <div role="status" className="rounded-lg border border-green-200 bg-green-50 p-8 text-center">
        <h2 className="text-xl text-green-800">You&rsquo;re Registered!</h2>
        <p className="mt-2 text-green-700">
          A confirmation email is on its way to {form.email}. We&rsquo;ll be in touch with next
          steps, including your Rookie Evaluation date if applicable.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <ol className="flex flex-wrap gap-2" aria-label="Registration steps">
        {STEPS.map((label, i) => (
          <li key={label}>
            <span
              className={clsx(
                "flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-wide",
                i === step ? "bg-brand text-white" : i < step ? "bg-brand-100 text-brand-700" : "bg-black/5 text-black/50"
              )}
              aria-current={i === step ? "step" : undefined}
            >
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-black/10 text-[10px]">
                {i + 1}
              </span>
              {label}
            </span>
          </li>
        ))}
      </ol>

      <div className="mt-8 space-y-5">
        {step === 0 && (
          <fieldset className="space-y-5">
            <legend className="sr-only">Player information</legend>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="First name" id="firstName" required>
                <input
                  id="firstName"
                  required
                  value={form.firstName}
                  onChange={(e) => update("firstName", e.target.value)}
                  className="input"
                />
              </Field>
              <Field label="Last name" id="lastName" required>
                <input
                  id="lastName"
                  required
                  value={form.lastName}
                  onChange={(e) => update("lastName", e.target.value)}
                  className="input"
                />
              </Field>
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Email" id="email" required>
                <input
                  id="email"
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => update("email", e.target.value)}
                  className="input"
                />
              </Field>
              <Field label="Phone" id="phone" required>
                <input
                  id="phone"
                  type="tel"
                  required
                  value={form.phone}
                  onChange={(e) => update("phone", e.target.value)}
                  className="input"
                />
              </Field>
            </div>
            <Field label="Birth year" id="birthYear">
              <input
                id="birthYear"
                inputMode="numeric"
                placeholder="e.g. 1988"
                value={form.birthYear}
                onChange={(e) => update("birthYear", e.target.value)}
                className="input max-w-[160px]"
              />
            </Field>
          </fieldset>
        )}

        {step === 1 && (
          <fieldset className="space-y-5">
            <legend className="sr-only">Playing experience</legend>
            <Field label="Experience" id="experience" required>
              <select
                id="experience"
                value={form.experience}
                onChange={(e) => update("experience", e.target.value)}
                className="input"
              >
                <option value="returning">Returning MMSPL player</option>
                <option value="rookie">New / rookie player</option>
                <option value="other-league">Experienced elsewhere, new to MMSPL</option>
              </select>
            </Field>
            <Field label="Preferred position" id="position" required>
              <input
                id="position"
                required
                placeholder="e.g. Shortstop, Outfield, Pitcher"
                value={form.position}
                onChange={(e) => update("position", e.target.value)}
                className="input"
              />
            </Field>
            {form.experience === "rookie" && (
              <p className="rounded border border-brand-100 bg-brand-50 p-3 text-sm text-brand-700">
                As a rookie, you&rsquo;ll attend one Rookie Evaluation session (April 11, 19, or 25)
                before the Entry Draft on April 29. We&rsquo;ll email you the details.
              </p>
            )}
          </fieldset>
        )}

        {step === 2 && (
          <fieldset className="space-y-5">
            <legend className="sr-only">Emergency contact</legend>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Emergency contact name" id="emergencyContact" required>
                <input
                  id="emergencyContact"
                  required
                  value={form.emergencyContact}
                  onChange={(e) => update("emergencyContact", e.target.value)}
                  className="input"
                />
              </Field>
              <Field label="Emergency contact phone" id="emergencyPhone" required>
                <input
                  id="emergencyPhone"
                  type="tel"
                  required
                  value={form.emergencyPhone}
                  onChange={(e) => update("emergencyPhone", e.target.value)}
                  className="input"
                />
              </Field>
            </div>
          </fieldset>
        )}

        {step === 3 && (
          <div>
            <h2 className="text-lg font-heading uppercase tracking-wide">Review Your Registration</h2>
            <dl className="mt-4 grid gap-x-6 gap-y-3 sm:grid-cols-2">
              <ReviewItem label="Name" value={`${form.firstName} ${form.lastName}`} />
              <ReviewItem label="Email" value={form.email} />
              <ReviewItem label="Phone" value={form.phone} />
              <ReviewItem label="Birth year" value={form.birthYear || "—"} />
              <ReviewItem label="Experience" value={form.experience} />
              <ReviewItem label="Position" value={form.position} />
              <ReviewItem label="Emergency contact" value={form.emergencyContact} />
              <ReviewItem label="Emergency phone" value={form.emergencyPhone} />
            </dl>

            <label className="mt-6 flex items-start gap-3 text-sm">
              <input
                type="checkbox"
                checked={form.agreeToTerms}
                onChange={(e) => update("agreeToTerms", e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-black/30 text-brand focus:ring-brand"
              />
              <span>
                I agree to the MMSPL constitution, code of conduct, and confirm the information
                above is accurate.
              </span>
            </label>
          </div>
        )}

        {errorMessage && (
          <p role="alert" className="text-sm text-brand-700">
            {errorMessage}
          </p>
        )}
      </div>

      <div className="mt-8 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          disabled={step === 0}
          className="rounded border border-black/20 px-5 py-2.5 font-semibold uppercase tracking-wide text-black/70 disabled:opacity-40"
        >
          Back
        </button>

        {step < STEPS.length - 1 ? (
          <button
            type="button"
            onClick={() => canAdvance() && setStep((s) => Math.min(STEPS.length - 1, s + 1))}
            className="rounded bg-brand px-6 py-2.5 font-semibold uppercase tracking-wide text-white hover:bg-brand-700"
          >
            Next
          </button>
        ) : (
          <button
            type="submit"
            disabled={status === "submitting" || !form.agreeToTerms}
            className="rounded bg-brand px-6 py-2.5 font-semibold uppercase tracking-wide text-white hover:bg-brand-700 disabled:opacity-50"
          >
            {status === "submitting" ? "Submitting…" : "Submit Registration"}
          </button>
        )}
      </div>
    </form>
  );
}

function Field({
  label,
  id,
  required,
  children,
}: {
  label: string;
  id: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-semibold text-black/70">
        {label} {required && <span className="text-brand">*</span>}
      </label>
      {children}
    </div>
  );
}

function ReviewItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-black/50">{label}</dt>
      <dd className="text-black/90">{value}</dd>
    </div>
  );
}

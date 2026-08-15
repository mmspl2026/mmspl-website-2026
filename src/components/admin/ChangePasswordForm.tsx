"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { validatePasswordPolicy } from "@/lib/passwordPolicy";
import PasswordStrengthMeter from "./PasswordStrengthMeter";

export default function ChangePasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErrorMessage("");

    const policy = validatePasswordPolicy(password);
    if (!policy.valid) {
      setStatus("error");
      setErrorMessage(policy.errors.join(" "));
      return;
    }
    if (password !== confirm) {
      setStatus("error");
      setErrorMessage("Passwords do not match.");
      return;
    }

    setStatus("submitting");
    try {
      const res = await fetch("/api/admin/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to change password.");
      }
      router.replace("/admin");
      router.refresh();
    } catch (err) {
      setStatus("error");
      setErrorMessage(err instanceof Error ? err.message : "Failed to change password.");
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full max-w-sm rounded-lg border border-white/10 bg-[#1a1a1a] p-8 text-white"
      noValidate
    >
      <h1 className="text-center text-2xl">Set a New Password</h1>
      <p className="mt-1 text-center text-sm text-white/50">
        You&rsquo;re signing in with a temporary password — choose a new one to continue.
      </p>

      <div className="mt-6 space-y-3">
        <div>
          <label htmlFor="new-password" className="sr-only">
            New Password
          </label>
          <input
            id="new-password"
            type="password"
            autoFocus
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded border border-white/20 bg-black px-4 py-3 text-base text-white placeholder:text-white/30 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/40"
            placeholder="New password"
          />
          <div className="px-0.5">
            <PasswordStrengthMeter password={password} />
          </div>
        </div>
        <div>
          <label htmlFor="confirm-password" className="sr-only">
            Confirm Password
          </label>
          <input
            id="confirm-password"
            type="password"
            required
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="w-full rounded border border-white/20 bg-black px-4 py-3 text-base text-white placeholder:text-white/30 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/40"
            placeholder="Confirm new password"
          />
        </div>
      </div>

      {status === "error" && (
        <p role="alert" className="mt-3 text-sm text-brand-300">
          {errorMessage}
        </p>
      )}

      <button
        type="submit"
        disabled={status === "submitting"}
        className="mt-6 w-full rounded bg-brand px-6 py-3 text-sm font-semibold uppercase tracking-wide text-white transition-colors hover:bg-brand-700 disabled:opacity-50"
      >
        {status === "submitting" ? "Saving…" : "Set Password & Continue"}
      </button>
    </form>
  );
}

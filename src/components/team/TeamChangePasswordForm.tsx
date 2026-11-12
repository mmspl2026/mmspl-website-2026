"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { validateTeamPasswordPolicy } from "@/lib/teamPasswordPolicy";
import TeamPasswordStrengthMeter from "@/components/team/TeamPasswordStrengthMeter";

export default function TeamChangePasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState<"idle" | "submitting" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErrorMessage("");

    const policy = validateTeamPasswordPolicy(password);
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
      const res = await fetch("/api/team/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to change password.");
      }
      router.replace("/team");
      router.refresh();
    } catch (err) {
      setStatus("error");
      setErrorMessage(err instanceof Error ? err.message : "Failed to change password.");
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full max-w-sm rounded-xl border border-gray-200 bg-white p-8 text-black shadow-sm"
      noValidate
    >
      <h1 className="text-center text-2xl font-bold text-black">Set a New Password</h1>
      <p className="mt-1 text-center text-sm text-gray-500">
        You&rsquo;re signing in with a temporary password — choose a new one to continue.
      </p>

      <div className="mt-6 space-y-3">
        <div>
          <label htmlFor="team-new-password" className="sr-only">
            New Password
          </label>
          <div className="relative">
            <input
              id="team-new-password"
              type={showPassword ? "text" : "password"}
              autoFocus
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-md border-2 border-gray-300 bg-white px-4 py-3 pr-11 text-base text-black placeholder:text-gray-400 focus:border-brand focus:outline-none"
              placeholder="New password"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-400 hover:text-black"
            >
              {showPassword ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
            </button>
          </div>
          <div className="px-0.5">
            <TeamPasswordStrengthMeter password={password} />
          </div>
        </div>
        <div>
          <label htmlFor="team-confirm-password" className="sr-only">
            Confirm Password
          </label>
          <input
            id="team-confirm-password"
            type={showPassword ? "text" : "password"}
            required
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="w-full rounded-md border-2 border-gray-300 bg-white px-4 py-3 text-base text-black placeholder:text-gray-400 focus:border-brand focus:outline-none"
            placeholder="Confirm new password"
          />
        </div>
      </div>

      {status === "error" && (
        <p role="alert" className="mt-3 text-sm text-brand">
          {errorMessage}
        </p>
      )}

      <button
        type="submit"
        disabled={status === "submitting"}
        className="mt-6 w-full rounded-md bg-brand px-6 py-3 text-sm font-semibold uppercase tracking-wide text-white transition-colors hover:bg-brand-700 disabled:opacity-50"
      >
        {status === "submitting" ? "Saving…" : "Set Password & Continue"}
      </button>
    </form>
  );
}

"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Eye, EyeOff } from "lucide-react";

export default function TeamLoginForm({ next = "/team" }: { next?: string }) {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState<"idle" | "submitting" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [resetStatus, setResetStatus] = useState<"idle" | "sending" | "sent">("idle");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setStatus("submitting");
    setErrorMessage("");
    try {
      const res = await fetch("/api/team/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Login failed.");
      }
      router.replace(data.mustChangePassword ? "/team/change-password" : next);
      router.refresh();
    } catch (err) {
      setStatus("error");
      setErrorMessage(err instanceof Error ? err.message : "Login failed.");
    }
  }

  async function handleForgotPassword() {
    if (!username.trim()) {
      setStatus("error");
      setErrorMessage("Enter your username first, then tap \"Forgot password?\".");
      return;
    }
    setResetStatus("sending");
    try {
      await fetch("/api/team/request-password-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username }),
      });
    } finally {
      setResetStatus("sent");
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full max-w-sm rounded-xl border border-gray-200 bg-white p-8 text-black shadow-sm"
      noValidate
    >
      <div className="flex flex-col items-center text-center">
        <Image src="/mmspl-logo.png" alt="Markham Men's Slo-Pitch League logo" width={110} height={64} priority />
        <h1 className="mt-4 text-2xl font-bold text-black">Team Captain Portal</h1>
        <p className="mt-1 text-sm text-gray-500">Sign in to manage your roster, stats &amp; beer list</p>
      </div>

      <div className="mt-6 space-y-3">
        <div>
          <label htmlFor="team-username" className="sr-only">
            Username
          </label>
          <input
            id="team-username"
            type="text"
            autoFocus
            required
            autoCapitalize="off"
            autoCorrect="off"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full rounded-md border-2 border-gray-300 bg-white px-4 py-3 text-base text-black placeholder:text-gray-400 focus:border-brand focus:outline-none"
            placeholder="Username"
          />
        </div>
        <div>
          <label htmlFor="team-password" className="sr-only">
            Password
          </label>
          <div className="relative">
            <input
              id="team-password"
              type={showPassword ? "text" : "password"}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-md border-2 border-gray-300 bg-white px-4 py-3 pr-11 text-base text-black placeholder:text-gray-400 focus:border-brand focus:outline-none"
              placeholder="Password"
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
        {status === "submitting" ? "Signing in…" : "Sign In"}
      </button>

      <div className="mt-4 text-center text-xs text-gray-400">
        {resetStatus === "sent" ? (
          <p>Your league executive has been notified and will reset your password.</p>
        ) : (
          <button
            type="button"
            onClick={handleForgotPassword}
            disabled={resetStatus === "sending"}
            className="underline-offset-2 hover:underline disabled:opacity-50"
          >
            {resetStatus === "sending" ? "Notifying…" : "Forgot password?"}
          </button>
        )}
      </div>
    </form>
  );
}

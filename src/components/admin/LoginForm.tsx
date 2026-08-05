"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { LEAGUE_FOUNDING_YEAR } from "@/lib/seed-content";

export default function LoginForm() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setStatus("submitting");
    setErrorMessage("");
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Login failed.");
      }
      router.replace("/admin");
      router.refresh();
    } catch (err) {
      setStatus("error");
      setErrorMessage(err instanceof Error ? err.message : "Login failed.");
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full max-w-sm rounded-lg border border-white/10 bg-[#1a1a1a] p-8 text-white"
      noValidate
    >
      <div className="flex flex-col items-center text-center">
        <Link href="/" aria-label="Back to main site">
          <Image
            src="/mmspl-logo.png"
            alt="Markham Men's Slo-Pitch League logo"
            width={110}
            height={64}
            priority
          />
        </Link>
        <span className="mt-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/50">
          Est. {LEAGUE_FOUNDING_YEAR}
        </span>
        <h1 className="mt-4 text-2xl">Admin Login</h1>
        <p className="mt-1 text-sm text-white/50">Sign in with your credentials</p>
        <Link href="/" className="mt-2 text-xs text-white/40 underline-offset-2 hover:text-white/70 hover:underline">
          &larr; Back to main site
        </Link>
      </div>

      <div className="mt-6 space-y-3">
        <div>
          <label htmlFor="admin-username" className="sr-only">
            Username
          </label>
          <input
            id="admin-username"
            type="text"
            autoFocus
            required
            autoCapitalize="off"
            autoCorrect="off"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full rounded border border-white/20 bg-black px-4 py-3 text-base text-white placeholder:text-white/30 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/40"
            placeholder="Username"
          />
        </div>
        <div>
          <label htmlFor="admin-password" className="sr-only">
            Password
          </label>
          <input
            id="admin-password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded border border-white/20 bg-black px-4 py-3 text-base text-white placeholder:text-white/30 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/40"
            placeholder="Password"
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
        {status === "submitting" ? "Signing in…" : "Sign In"}
      </button>
    </form>
  );
}

"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

export default function TeamLoginForm({ next = "/team" }: { next?: string }) {
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

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full max-w-sm rounded-lg border border-white/10 bg-[#1a1a1a] p-8 text-white"
      noValidate
    >
      <div className="flex flex-col items-center text-center">
        <Image src="/mmspl-logo.png" alt="Markham Men's Slo-Pitch League logo" width={110} height={64} priority />
        <h1 className="mt-4 text-2xl">Team Captain Portal</h1>
        <p className="mt-1 text-sm text-white/50">Sign in to manage your roster, stats &amp; beer list</p>
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
            className="w-full rounded border border-white/20 bg-black px-4 py-3 text-base text-white placeholder:text-white/30 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/40"
            placeholder="Username"
          />
        </div>
        <div>
          <label htmlFor="team-password" className="sr-only">
            Password
          </label>
          <input
            id="team-password"
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

      <p className="mt-4 text-center text-xs text-white/30">
        Issued by your league executive. Lost access?{" "}
        <Link href="/" className="underline-offset-2 hover:underline">
          Contact MMSPL
        </Link>
      </p>
    </form>
  );
}

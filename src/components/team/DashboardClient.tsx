"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Link2, Mail, Bell, Copy, RefreshCw, Users, BarChart3, Beer } from "lucide-react";
import ToastStack from "@/components/admin/ToastStack";
import { useToasts } from "@/components/admin/useToasts";
import { SITE_URL } from "@/lib/emailTemplate";
import type { Game } from "@/lib/types";

export default function DashboardClient({
  captainName,
  teamName,
  initialShareToken,
}: {
  captainName: string;
  teamName: string;
  initialShareToken?: string;
}) {
  const { toasts, push, dismiss } = useToasts();
  const [shareToken, setShareToken] = useState(initialShareToken);
  const [working, setWorking] = useState(false);
  const [games, setGames] = useState<Game[] | null>(null);

  useEffect(() => {
    fetch("/api/team/games?status=upcoming")
      .then((res) => res.json())
      .then((data) => setGames(data.games || []))
      .catch(() => setGames([]));
  }, []);

  const shareUrl = shareToken ? `${SITE_URL}/team/view/${shareToken}` : null;

  async function regenerateLink() {
    setWorking(true);
    try {
      const res = await fetch("/api/team/share-link", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to generate link.");
      setShareToken(data.token);
      push({ message: "Share link generated.", tone: "success" });
    } catch (err) {
      push({ message: err instanceof Error ? err.message : "Failed to generate link.", tone: "error" });
    } finally {
      setWorking(false);
    }
  }

  async function copyLink() {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl);
    push({ message: "Link copied to clipboard.", tone: "success" });
  }

  async function notify(channel: "email" | "push") {
    setWorking(true);
    try {
      const res = await fetch("/api/team/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channels: [channel] }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to send.");
      setShareToken((prev) => prev || data.shareUrl?.split("/").pop());
      const result = channel === "email" ? data.results?.email : data.results?.push;
      if (result?.skipped) {
        push({ message: channel === "email" ? "No player emails on file." : "No players have push enabled.", tone: "info" });
      } else {
        push({ message: `Sent to ${result?.sent ?? 0} of ${result?.total ?? 0} players.`, tone: "success" });
      }
    } catch (err) {
      push({ message: err instanceof Error ? err.message : "Failed to send.", tone: "error" });
    } finally {
      setWorking(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl">Welcome, {captainName}</h1>
        <p className="text-sm text-white/50">{teamName} — manage your roster, stats, and beer list below.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Link
          href="/team/roster"
          className="flex items-center gap-3 rounded-lg border border-white/10 bg-[#1a1a1a] p-4 transition-colors hover:border-brand"
        >
          <Users className="text-brand" size={22} aria-hidden="true" />
          <span className="text-sm font-semibold">Roster</span>
        </Link>
        <Link
          href="/team/stats"
          className="flex items-center gap-3 rounded-lg border border-white/10 bg-[#1a1a1a] p-4 transition-colors hover:border-brand"
        >
          <BarChart3 className="text-brand" size={22} aria-hidden="true" />
          <span className="text-sm font-semibold">Stats</span>
        </Link>
        <Link
          href="/team/beer-list"
          className="flex items-center gap-3 rounded-lg border border-white/10 bg-[#1a1a1a] p-4 transition-colors hover:border-brand"
        >
          <Beer className="text-brand" size={22} aria-hidden="true" />
          <span className="text-sm font-semibold">Beer List</span>
        </Link>
      </div>

      <div className="rounded-lg border border-white/10 bg-[#1a1a1a] p-5">
        <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-white/70">
          <Link2 size={16} aria-hidden="true" />
          Share With Your Team
        </h2>
        <p className="mt-1 text-sm text-white/50">
          A read-only link showing your roster, stats, and beer list. Anyone with the link can view it — share it only
          with your own team.
        </p>

        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
          <input
            readOnly
            value={shareUrl || "No link generated yet"}
            className="flex-1 rounded border border-white/20 bg-black px-3 py-2 text-sm text-white/70"
          />
          {shareUrl && (
            <button
              type="button"
              onClick={copyLink}
              className="flex items-center justify-center gap-1 rounded border border-white/20 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-white/70 hover:border-white/40 hover:text-white"
            >
              <Copy size={14} aria-hidden="true" />
              Copy
            </button>
          )}
          <button
            type="button"
            onClick={regenerateLink}
            disabled={working}
            className="flex items-center justify-center gap-1 rounded border border-white/20 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-white/70 hover:border-white/40 hover:text-white disabled:opacity-50"
          >
            <RefreshCw size={14} aria-hidden="true" />
            {shareUrl ? "Regenerate" : "Generate Link"}
          </button>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => notify("email")}
            disabled={working}
            className="flex items-center gap-2 rounded bg-brand px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white hover:bg-brand-700 disabled:opacity-50"
          >
            <Mail size={14} aria-hidden="true" />
            Email Link to Team
          </button>
          <button
            type="button"
            onClick={() => notify("push")}
            disabled={working}
            className="flex items-center gap-2 rounded border border-white/20 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white/70 hover:border-white/40 hover:text-white disabled:opacity-50"
          >
            <Bell size={14} aria-hidden="true" />
            Push-Notify Team
          </button>
        </div>
      </div>

      <div className="rounded-lg border border-white/10 bg-[#1a1a1a] p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-white/70">Upcoming Games</h2>
        {games === null ? (
          <p className="mt-2 text-sm text-white/40">Loading…</p>
        ) : games.length === 0 ? (
          <p className="mt-2 text-sm text-white/40">No upcoming games scheduled.</p>
        ) : (
          <ul className="mt-3 divide-y divide-white/10">
            {games.slice(0, 5).map((g) => (
              <li key={g._id} className="flex items-center justify-between py-2 text-sm">
                <span>
                  {g.homeTeam.name} vs {g.awayTeam.name}
                </span>
                <span className="text-white/40">
                  {g.date} · {g.time}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <ToastStack toasts={toasts} onDismiss={dismiss} />
    </div>
  );
}

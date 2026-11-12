"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Mail, Bell, Copy, RefreshCw, Users, BarChart3, Beer } from "lucide-react";
import { Card, CardHeader, PrimaryButton, SecondaryButton, TextInput } from "@/components/admin/data/ui";
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
        <h1 className="text-2xl font-bold text-black">Welcome, {captainName}</h1>
        <p className="text-sm text-gray-500">{teamName} — manage your roster, stats, and beer list below.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Link
          href="/team/roster"
          className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition-colors hover:border-brand"
        >
          <Users className="text-brand" size={22} aria-hidden="true" />
          <span className="text-sm font-semibold text-black">Roster</span>
        </Link>
        <Link
          href="/team/stats"
          className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition-colors hover:border-brand"
        >
          <BarChart3 className="text-brand" size={22} aria-hidden="true" />
          <span className="text-sm font-semibold text-black">Stats</span>
        </Link>
        <Link
          href="/team/beer-list"
          className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition-colors hover:border-brand"
        >
          <Beer className="text-brand" size={22} aria-hidden="true" />
          <span className="text-sm font-semibold text-black">Beer List</span>
        </Link>
      </div>

      <Card>
        <CardHeader
          title="Share With Your Team"
          subtitle="A read-only link showing your roster, stats, and beer list. Anyone with the link can view it — share it only with your own team."
        />
        <div className="space-y-4 p-5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <TextInput readOnly value={shareUrl || "No link generated yet"} className="flex-1 text-gray-500" />
            {shareUrl && (
              <SecondaryButton onClick={copyLink} className="h-9">
                <Copy size={14} aria-hidden="true" />
                Copy
              </SecondaryButton>
            )}
            <SecondaryButton onClick={regenerateLink} disabled={working} className="h-9">
              <RefreshCw size={14} aria-hidden="true" />
              {shareUrl ? "Regenerate" : "Generate Link"}
            </SecondaryButton>
          </div>

          <div className="flex flex-wrap gap-2">
            <PrimaryButton onClick={() => notify("email")} disabled={working}>
              <Mail size={14} aria-hidden="true" />
              Email Link to Team
            </PrimaryButton>
            <SecondaryButton onClick={() => notify("push")} disabled={working}>
              <Bell size={14} aria-hidden="true" />
              Push-Notify Team
            </SecondaryButton>
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader title="Upcoming Games" />
        <div className="p-5 pt-0">
          {games === null ? (
            <p className="text-sm text-gray-400">Loading…</p>
          ) : games.length === 0 ? (
            <p className="text-sm text-gray-400">No upcoming games scheduled.</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {games.slice(0, 5).map((g) => (
                <li key={g._id} className="flex items-center justify-between py-2 text-sm">
                  <span className="text-black">
                    {g.homeTeam.name} vs {g.awayTeam.name}
                  </span>
                  <span className="text-gray-400">
                    {g.date} · {g.time}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Card>

      <ToastStack toasts={toasts} onDismiss={dismiss} />
    </div>
  );
}

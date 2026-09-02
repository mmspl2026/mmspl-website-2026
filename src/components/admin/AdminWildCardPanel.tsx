"use client";

import { useState } from "react";
import { Loader2, ArrowUp, ArrowDown, AlertTriangle, RefreshCw } from "lucide-react";
import clsx from "clsx";
import type { WildCardStandingsResult, ComputedWildCardEntry } from "@/lib/wildCardStandings";
import type { TournamentType } from "@/lib/types";
import { useToasts } from "./useToasts";
import ToastStack from "./ToastStack";

/**
 * Computes Phase 2 (Wild Card) seeding from real Thu-Sat scores per the
 * league's house rules (see computeWildCardStandings), lets the admin
 * review it — and manually resolve any flagged coin-flip tie with the
 * up/down arrows — then commits it as real wildCardRanking documents.
 * Preview-first on purpose: this determines real playoff matchups, so it
 * shouldn't write anything until a human has looked at it.
 */
export default function AdminWildCardPanel({ year, type }: { year: number; type: TournamentType }) {
  const [preview, setPreview] = useState<WildCardStandingsResult | null>(null);
  const [order, setOrder] = useState<ComputedWildCardEntry[]>([]);
  const [computing, setComputing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const { toasts, push, dismiss } = useToasts();

  async function handleCompute() {
    setComputing(true);
    setSavedAt(null);
    try {
      const res = await fetch("/api/admin/tournament/wildcard/compute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ year, type }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to compute.");
      setPreview(data);
      setOrder(data.wildCard);
    } catch (err) {
      push({ tone: "error", message: err instanceof Error ? err.message : "Failed to compute." });
    } finally {
      setComputing(false);
    }
  }

  function move(index: number, dir: -1 | 1) {
    setOrder((prev) => {
      const target = index + dir;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next.map((e, i) => ({ ...e, rank: i + 1, advanced: i < 8 }));
    });
  }

  async function handleSaveWc() {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/tournament/wildcard/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ year, type, wildCard: order }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to save.");
      setSavedAt(Date.now());
      push({ tone: "success", message: "Wild Card rankings saved." });
    } catch (err) {
      push({ tone: "error", message: err instanceof Error ? err.message : "Failed to save." });
    } finally {
      setSaving(false);
    }
  }

  const anyCoinFlip = order.some((e) => e.tiedForCoinFlip);

  return (
    <div>
      <div className="mb-4 rounded-xl border-2 border-gray-800 bg-gray-900 p-4">
        <p className="mb-3 text-sm text-gray-400">
          Computes Phase 2 seeding from Thu-Sat round robin scores: the 4 Division Winners (best record within their
          own box) get the bye, the other 10 teams are ranked 1-8 (advance) / 9-10 (eliminated) by overall record,
          then run differential, then runs scored, then regular season points.
        </p>
        <button
          type="button"
          onClick={handleCompute}
          disabled={computing}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand py-3 text-sm font-bold text-white transition-all hover:bg-brand-700 disabled:opacity-50"
        >
          {computing ? (
            <Loader2 size={16} className="animate-spin" aria-hidden="true" />
          ) : (
            <RefreshCw size={16} aria-hidden="true" />
          )}
          {computing ? "Computing…" : preview ? "Recompute" : "Compute Wild Card Rankings"}
        </button>
      </div>

      {preview && (
        <>
          <p className="mb-3 text-xs text-gray-500">
            {preview.gamesConsidered} of {preview.totalRoundRobinGames} round robin games scored.
            {preview.gamesConsidered < preview.totalRoundRobinGames &&
              " Not all Thu-Sat games are in yet — this is a live preview, not final."}
          </p>

          <div className="mb-4 rounded-xl border-2 border-gray-800 bg-gray-900 p-4">
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-400">Division Winners (bye)</p>
            <div className="space-y-1.5">
              {preview.divisionWinners.map((dw) => (
                <div
                  key={dw.pool}
                  className="flex items-center justify-between rounded-lg bg-gray-950 px-3 py-2 text-sm"
                >
                  <span className="font-mono-brand text-xs text-gray-500">Pool {dw.pool}</span>
                  <span className="font-semibold text-white">{dw.teamName}</span>
                </div>
              ))}
            </div>
          </div>

          {anyCoinFlip && (
            <div className="mb-4 flex items-start gap-2 rounded-xl border-2 border-amber-700 bg-amber-950/30 p-3 text-sm text-amber-200">
              <AlertTriangle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
              <p>
                Rows marked <strong>COIN FLIP</strong> are tied on every tie-breaker (record, run diff, runs scored,
                regular season points). House rules call for an actual coin flip — flip it, then use the arrows to
                put the winner on top before saving.
              </p>
            </div>
          )}

          <div className="mb-4 divide-y divide-gray-800 overflow-hidden rounded-xl border-2 border-gray-800 bg-gray-900">
            {order.map((entry, i) => (
              <div key={entry.teamName} className={clsx("p-3", !entry.advanced && "opacity-60")}>
                <div className="flex items-center gap-3">
                  <span className="w-6 shrink-0 text-center font-mono-brand text-sm font-bold text-white">
                    {entry.rank}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-white">{entry.teamName}</p>
                    <p className="font-mono-brand text-[11px] text-gray-500">
                      Pool {entry.pool || "–"} &middot; {entry.wins}-{entry.losses}-{entry.ties} &middot; diff{" "}
                      {entry.runDifferential > 0 ? `+${entry.runDifferential}` : entry.runDifferential} &middot;{" "}
                      {entry.runsScored} RS &middot; {entry.regularSeasonPoints} season pts
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col gap-1">
                    <button
                      type="button"
                      onClick={() => move(i, -1)}
                      disabled={i === 0}
                      aria-label="Move up"
                      className="rounded bg-gray-800 p-1 disabled:opacity-30"
                    >
                      <ArrowUp size={12} className="text-white" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      onClick={() => move(i, 1)}
                      disabled={i === order.length - 1}
                      aria-label="Move down"
                      className="rounded bg-gray-800 p-1 disabled:opacity-30"
                    >
                      <ArrowDown size={12} className="text-white" aria-hidden="true" />
                    </button>
                  </div>
                  <span
                    className={clsx(
                      "shrink-0 rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide",
                      entry.advanced ? "bg-green-600 text-white" : "bg-red-600 text-white"
                    )}
                  >
                    {entry.advanced ? "Adv" : "Out"}
                  </span>
                </div>
                {entry.tiedForCoinFlip && (
                  <p className="mt-1.5 pl-9 text-[10px] font-bold uppercase tracking-wide text-amber-400">
                    Coin flip
                  </p>
                )}
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={handleSaveWc}
            disabled={saving}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 py-3 text-sm font-bold text-white transition-all hover:bg-red-500 disabled:opacity-50"
          >
            {saving && <Loader2 size={16} className="animate-spin" aria-hidden="true" />}
            {saving ? "Saving…" : "Save Wild Card Rankings"}
          </button>
          {savedAt && <p className="mt-2 text-center text-xs text-green-500">Saved — live on the WC Rank tab.</p>}
        </>
      )}

      <ToastStack toasts={toasts} onDismiss={dismiss} />
    </div>
  );
}

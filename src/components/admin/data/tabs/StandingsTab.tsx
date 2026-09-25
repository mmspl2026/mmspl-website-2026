"use client";

import { useEffect, useRef, useState } from "react";
import { RefreshCw, Zap, Lock, Unlock, History } from "lucide-react";
import clsx from "clsx";
import type { Season, Standing } from "@/lib/types";
import { Card, CardHeader, PrimaryButton, SecondaryButton, Select, Spinner, EmptyState, Modal, TextInput } from "../ui";
import { useToasts } from "@/components/admin/useToasts";
import ToastStack from "@/components/admin/ToastStack";
import { isStandingsLocked } from "@/lib/standingsLock";
import { getTodayEastern } from "@/utils/timezone";

interface EditableRow {
  _id: string;
  teamName: string;
  wins: number;
  losses: number;
  ties: number;
}

interface AuditLogRow {
  _id: string;
  action: string;
  performedByName: string;
  summary: string;
  createdAt: string;
}

function toRows(standings: Standing[]): EditableRow[] {
  return standings
    .slice()
    .sort((a, b) => b.wins * 2 + b.ties - (a.wins * 2 + a.ties))
    .map((s) => ({ _id: s._id, teamName: s.team.name, wins: s.wins, losses: s.losses, ties: s.ties }));
}

function formatCountdown(msRemaining: number): string {
  const totalSeconds = Math.max(0, Math.ceil(msRemaining / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export default function StandingsTab() {
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [seasonId, setSeasonId] = useState<string>("");
  const [rows, setRows] = useState<EditableRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [recalculating, setRecalculating] = useState(false);
  const { toasts, push, dismiss } = useToasts();

  const [unlockedUntil, setUnlockedUntil] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [unlockModalOpen, setUnlockModalOpen] = useState(false);
  const [unlockPassword, setUnlockPassword] = useState("");
  const [unlocking, setUnlocking] = useState(false);
  const [unlockError, setUnlockError] = useState("");

  const [auditEntries, setAuditEntries] = useState<AuditLogRow[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);

  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/admin/seasons");
      const data = await res.json();
      setSeasons(data.seasons ?? []);
      const active = data.seasons?.find((s: Season) => s.isActive) ?? data.seasons?.[0];
      if (active) setSeasonId(active._id);
    })();
  }, []);

  async function loadStandings(id: string) {
    setLoading(true);
    const res = await fetch(`/api/admin/standings?seasonId=${id}`);
    const data = await res.json();
    setRows(toRows(data.standings ?? []));
    setLoading(false);
  }

  const currentSeason = seasons.find((s) => s._id === seasonId);
  const locked = currentSeason ? isStandingsLocked(currentSeason, getTodayEastern()) : false;
  const stepUpActive = unlockedUntil !== null && now < unlockedUntil;
  const showLockedUI = locked && !stepUpActive;

  useEffect(() => {
    if (seasonId) loadStandings(seasonId);
  }, [seasonId]);

  useEffect(() => {
    if (!currentSeason) return;
    setAuditLoading(true);
    fetch(`/api/admin/standings/audit-log?year=${currentSeason.year}`)
      .then((res) => res.json())
      .then((data) => setAuditEntries(data.entries ?? []))
      .catch(() => setAuditEntries([]))
      .finally(() => setAuditLoading(false));
  }, [currentSeason?.year, saving, recalculating]);

  // Countdown tick while a step-up window is active; stops itself once it
  // lapses so the UI reverts to locked without needing another API call.
  useEffect(() => {
    if (unlockedUntil === null) return;
    tickRef.current = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, [unlockedUntil]);

  function updateRow(id: string, field: "wins" | "losses" | "ties", value: number) {
    setRows((prev) => prev.map((r) => (r._id === id ? { ...r, [field]: Math.max(0, value) } : r)));
  }

  /** Shared handling for a 423 response from save/sync: the season locked
   * itself again (step-up window lapsed server-side, or this was never a
   * valid unlock) — drop the local unlock state so the UI matches reality. */
  async function handleLockedResponse(res: Response): Promise<boolean> {
    if (res.status !== 423) return false;
    setUnlockedUntil(null);
    const data = await res.json().catch(() => ({}));
    push({ tone: "error", message: data.error || "This season's standings are locked." });
    return true;
  }

  async function handleRecalculate() {
    setRecalculating(true);
    try {
      const res = await fetch("/api/admin/standings/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seasonId }),
      });
      if (await handleLockedResponse(res)) return;
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Recalculate failed.");
      const data = await res.json();
      setRows(toRows(data.standings ?? []));
      push({ tone: "success", message: "Standings recalculated from Final games." });
    } catch (err) {
      push({ tone: "error", message: err instanceof Error ? err.message : "Recalculate failed." });
    } finally {
      setRecalculating(false);
    }
  }

  async function handleSaveAll() {
    const season = seasons.find((s) => s._id === seasonId);
    if (!season) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/standings/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          seasonYear: season.year,
          rows: rows.map((r) => ({ _id: r._id, wins: r.wins, losses: r.losses, ties: r.ties })),
        }),
      });
      if (await handleLockedResponse(res)) return;
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Save failed.");
      const data = await res.json();
      setRows(toRows(data.standings ?? []));
      push({ tone: "success", message: "Standings saved." });
    } catch (err) {
      push({ tone: "error", message: err instanceof Error ? err.message : "Save failed." });
    } finally {
      setSaving(false);
    }
  }

  async function handleUnlockSubmit() {
    setUnlocking(true);
    setUnlockError("");
    try {
      const res = await fetch("/api/admin/standings/unlock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: unlockPassword }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Unlock failed.");
      setUnlockedUntil(data.unlockedUntil);
      setNow(Date.now());
      setUnlockModalOpen(false);
      setUnlockPassword("");
      push({ tone: "success", message: "Editing unlocked for 10 minutes." });
    } catch (err) {
      setUnlockError(err instanceof Error ? err.message : "Unlock failed.");
    } finally {
      setUnlocking(false);
    }
  }

  return (
    <div className="space-y-4">
      {currentSeason && showLockedUI && (
        <Card className="flex flex-wrap items-center justify-between gap-3 border-amber-300 bg-amber-50 px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-500 text-white">
              <Lock size={16} aria-hidden="true" />
            </span>
            <div>
              <p className="text-sm font-bold text-black">{currentSeason.year} standings are locked</p>
              <p className="text-sm text-gray-600">
                This season is complete — editing is disabled to prevent accidental changes. Unlock to make a
                correction.
              </p>
            </div>
          </div>
          <SecondaryButton onClick={() => setUnlockModalOpen(true)}>
            <Unlock size={14} aria-hidden="true" />
            Unlock to Edit
          </SecondaryButton>
        </Card>
      )}

      {currentSeason && stepUpActive && (
        <Card className="flex items-center gap-3 border-green-300 bg-green-50 px-5 py-3">
          <Unlock size={16} className="shrink-0 text-green-700" aria-hidden="true" />
          <p className="text-sm font-semibold text-green-800">
            Editing unlocked — {formatCountdown((unlockedUntil ?? now) - now)} remaining
          </p>
        </Card>
      )}

      <Card className="flex flex-wrap items-center justify-between gap-3 border-brand/30 bg-brand-50/40 px-5 py-4">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand text-white">
            <Zap size={16} aria-hidden="true" />
          </span>
          <div>
            <p className="text-sm font-bold text-black">Auto-Calculate from Scores</p>
            <p className="text-sm text-gray-600">
              Recomputes W/L/T and run differential for every team from Final games in this season.
            </p>
          </div>
        </div>
        {!showLockedUI && (
          <PrimaryButton onClick={handleRecalculate} disabled={recalculating || !seasonId}>
            <RefreshCw size={14} className={clsx(recalculating && "animate-spin")} aria-hidden="true" />
            Recalculate
          </PrimaryButton>
        )}
      </Card>

      <Card>
        <CardHeader
          title="Standings"
          action={
            <div className="flex items-center gap-3">
              <Select value={seasonId} onChange={(e) => setSeasonId(e.target.value)}>
                {seasons.map((s) => (
                  <option key={s._id} value={s._id}>
                    {s.year} Season
                  </option>
                ))}
              </Select>
              {!showLockedUI && (
                <PrimaryButton onClick={handleSaveAll} disabled={saving || rows.length === 0}>
                  {saving ? "Saving…" : "Save All"}
                </PrimaryButton>
              )}
            </div>
          }
        />

        {loading ? (
          <Spinner />
        ) : rows.length === 0 ? (
          <EmptyState>No standings for this season yet — try Recalculate.</EmptyState>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-bold uppercase text-gray-500">Rank</th>
                  <th className="px-4 py-2 text-left text-xs font-bold uppercase text-gray-500">Team</th>
                  <th className="px-4 py-2 text-center text-xs font-bold uppercase text-gray-500">GP</th>
                  <th className="px-4 py-2 text-center text-xs font-bold uppercase text-gray-500">W</th>
                  <th className="px-4 py-2 text-center text-xs font-bold uppercase text-gray-500">L</th>
                  <th className="px-4 py-2 text-center text-xs font-bold uppercase text-gray-500">T</th>
                  <th className="px-4 py-2 text-center text-xs font-bold uppercase text-gray-500">PTS</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr key={row._id} className="border-b border-gray-100">
                    <td className="px-4 py-2 font-mono-brand text-sm font-bold text-black">{i + 1}</td>
                    <td className="px-4 py-2 text-sm font-semibold text-black">{row.teamName}</td>
                    <td className="px-4 py-2 text-center font-mono-brand text-sm text-gray-500">
                      {row.wins + row.losses + row.ties}
                    </td>
                    {(["wins", "losses", "ties"] as const).map((field) => (
                      <td key={field} className="px-4 py-2 text-center">
                        {showLockedUI ? (
                          <span className="font-mono-brand text-sm text-gray-700">{row[field]}</span>
                        ) : (
                          <input
                            type="number"
                            min={0}
                            value={row[field]}
                            onChange={(e) => updateRow(row._id, field, Number(e.target.value))}
                            className="h-8 w-14 rounded border border-gray-300 text-center font-mono-brand text-sm focus:border-brand focus:outline-none"
                          />
                        )}
                      </td>
                    ))}
                    <td className="px-4 py-2 text-center font-mono-brand text-base font-bold text-black">
                      {row.wins * 2 + row.ties}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {currentSeason && (
        <Card>
          <CardHeader
            title="Recent Changes"
            subtitle={`Last 20 standings edits for ${currentSeason.year}`}
          />
          {auditLoading ? (
            <Spinner />
          ) : auditEntries.length === 0 ? (
            <EmptyState>No changes logged for this season yet.</EmptyState>
          ) : (
            <div className="divide-y divide-gray-100">
              {auditEntries.map((entry) => (
                <div key={entry._id} className="flex items-start gap-3 px-4 py-3">
                  <History size={14} className="mt-0.5 shrink-0 text-gray-400" aria-hidden="true" />
                  <div className="min-w-0">
                    <p className="text-sm text-black">{entry.summary}</p>
                    <p className="mt-0.5 text-xs text-gray-400">
                      {entry.performedByName} · {new Date(entry.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      <Modal
        open={unlockModalOpen}
        onClose={() => {
          setUnlockModalOpen(false);
          setUnlockPassword("");
          setUnlockError("");
        }}
        title="Unlock Standings Editing"
      >
        <div className="space-y-3">
          <p className="text-sm text-gray-600">
            {currentSeason?.year} is a completed season. Re-enter your password to confirm you want to edit its
            standings — editing stays unlocked for 10 minutes.
          </p>
          <TextInput
            type="password"
            placeholder="Your password"
            value={unlockPassword}
            onChange={(e) => setUnlockPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleUnlockSubmit()}
            autoFocus
          />
          {unlockError && <p className="text-sm text-red-600">{unlockError}</p>}
          <div className="flex justify-end gap-2">
            <SecondaryButton onClick={() => setUnlockModalOpen(false)}>Cancel</SecondaryButton>
            <PrimaryButton onClick={handleUnlockSubmit} disabled={unlocking || !unlockPassword}>
              {unlocking ? "Verifying…" : "Unlock"}
            </PrimaryButton>
          </div>
        </div>
      </Modal>

      <ToastStack toasts={toasts} onDismiss={dismiss} />
    </div>
  );
}

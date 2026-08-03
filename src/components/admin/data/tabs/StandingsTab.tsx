"use client";

import { useEffect, useState } from "react";
import { RefreshCw, Zap } from "lucide-react";
import clsx from "clsx";
import type { Season, Standing } from "@/lib/types";
import { Card, CardHeader, PrimaryButton, Select, Spinner, EmptyState } from "../ui";
import { useToasts } from "@/components/admin/useToasts";
import ToastStack from "@/components/admin/ToastStack";

interface EditableRow {
  _id: string;
  teamName: string;
  wins: number;
  losses: number;
  ties: number;
}

function toRows(standings: Standing[]): EditableRow[] {
  return standings
    .slice()
    .sort((a, b) => b.wins * 2 + b.ties - (a.wins * 2 + a.ties))
    .map((s) => ({ _id: s._id, teamName: s.team.name, wins: s.wins, losses: s.losses, ties: s.ties }));
}

export default function StandingsTab() {
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [seasonId, setSeasonId] = useState<string>("");
  const [rows, setRows] = useState<EditableRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [recalculating, setRecalculating] = useState(false);
  const { toasts, push, dismiss } = useToasts();

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

  useEffect(() => {
    if (seasonId) loadStandings(seasonId);
  }, [seasonId]);

  function updateRow(id: string, field: "wins" | "losses" | "ties", value: number) {
    setRows((prev) => prev.map((r) => (r._id === id ? { ...r, [field]: Math.max(0, value) } : r)));
  }

  async function handleRecalculate() {
    setRecalculating(true);
    try {
      const res = await fetch("/api/admin/standings/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seasonId }),
      });
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

  return (
    <div className="space-y-4">
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
        <PrimaryButton onClick={handleRecalculate} disabled={recalculating || !seasonId}>
          <RefreshCw size={14} className={clsx(recalculating && "animate-spin")} aria-hidden="true" />
          Recalculate
        </PrimaryButton>
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
              <PrimaryButton onClick={handleSaveAll} disabled={saving || rows.length === 0}>
                {saving ? "Saving…" : "Save All"}
              </PrimaryButton>
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
                        <input
                          type="number"
                          min={0}
                          value={row[field]}
                          onChange={(e) => updateRow(row._id, field, Number(e.target.value))}
                          className="h-8 w-14 rounded border border-gray-300 text-center font-mono-brand text-sm focus:border-brand focus:outline-none"
                        />
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

      <ToastStack toasts={toasts} onDismiss={dismiss} />
    </div>
  );
}

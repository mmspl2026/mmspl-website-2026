"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Shuffle, Wand2, UploadCloud, X, Plus, Download, FileUp } from "lucide-react";
import clsx from "clsx";
import { Card, CardHeader, PrimaryButton, SecondaryButton, Select, TextInput, Spinner, EmptyState } from "../ui";
import { useToasts } from "@/components/admin/useToasts";
import ToastStack from "@/components/admin/ToastStack";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import { parseScheduleCsv, parseScheduleXlsx, buildDrawPlaceholderMap } from "@/lib/scheduleImport";
import { getScheduleLockDate, isScheduleLocked } from "@/lib/seasonScheduleLock";
import { getTodayEastern } from "@/utils/timezone";

interface TeamOption {
  _id: string;
  name: string;
  shortName?: string;
}

interface PreviewGame {
  date: string;
  time: string;
  field: string;
  homeTeamId: string;
  awayTeamId: string;
  homeTeamName: string;
  awayTeamName: string;
}

const SLOT_COUNT = 14;

function formatDateHeading(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00Z`);
  return d.toLocaleDateString("en-CA", { weekday: "long", month: "long", day: "numeric", timeZone: "UTC" });
}

export default function ScheduleGeneratorTab() {
  const [teams, setTeams] = useState<TeamOption[]>([]);
  const [loadingTeams, setLoadingTeams] = useState(true);
  const [year, setYear] = useState(String(new Date().getFullYear() + 1));
  const [seasonStartDate, setSeasonStartDate] = useState("");
  const [blackoutDates, setBlackoutDates] = useState<string[]>([]);
  const [newBlackoutDate, setNewBlackoutDate] = useState("");
  const [draw, setDraw] = useState<(string | null)[]>(Array(SLOT_COUNT).fill(null));
  const [generating, setGenerating] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [preview, setPreview] = useState<PreviewGame[] | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toasts, push, dismiss } = useToasts();

  // Only offer the teams that actually played the prior season — e.g.
  // generating 2027 only offers 2026's real 14 teams, not every team the
  // league has ever had. Re-fetches (and clears any draft draw order,
  // since it'd reference a now-stale team pool) whenever the year changes.
  useEffect(() => {
    const sourceYear = Number(year) - 1;
    if (!Number.isInteger(sourceYear)) return;
    let cancelled = false;
    async function load() {
      setLoadingTeams(true);
      const res = await fetch(`/api/admin/schedule/teams?year=${sourceYear}`);
      const data = await res.json();
      if (cancelled) return;
      setTeams(data.teams ?? []);
      setDraw(Array(SLOT_COUNT).fill(null));
      setPreview(null);
      setLoadingTeams(false);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [year]);

  const chosenIds = useMemo(() => new Set(draw.filter((t): t is string => Boolean(t))), [draw]);
  const allSlotsFilled = draw.every((t) => Boolean(t));
  const duplicates = draw.length !== new Set(draw.filter(Boolean)).size;
  const validYear = /^\d{4}$/.test(year);
  // Locks two weeks into a season's May automatically — covers every past
  // season without hardcoding a specific year, and the current one too
  // once its own season is under way.
  const yearLocked = validYear && isScheduleLocked(Number(year), getTodayEastern());
  const canGenerate = allSlotsFilled && !duplicates && Boolean(seasonStartDate) && validYear && !yearLocked;

  function setSlot(index: number, teamId: string) {
    setDraw((prev) => {
      const next = [...prev];
      next[index] = teamId || null;
      return next;
    });
  }

  function fillRandomly() {
    if (teams.length !== SLOT_COUNT) {
      push({ tone: "error", message: `Need exactly ${SLOT_COUNT} teams in Sanity to auto-fill (found ${teams.length}).` });
      return;
    }
    const shuffled = [...teams].sort(() => Math.random() - 0.5);
    setDraw(shuffled.map((t) => t._id));
  }

  function clearDraw() {
    setDraw(Array(SLOT_COUNT).fill(null));
    setPreview(null);
  }

  function addBlackoutDate() {
    if (!newBlackoutDate || blackoutDates.includes(newBlackoutDate)) return;
    setBlackoutDates((prev) => [...prev, newBlackoutDate].sort());
    setNewBlackoutDate("");
  }

  function removeBlackoutDate(date: string) {
    setBlackoutDates((prev) => prev.filter((d) => d !== date));
  }

  async function generatePreview() {
    setGenerating(true);
    setPreview(null);
    try {
      const res = await fetch("/api/admin/schedule/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ year: Number(year), seasonStartDate, teamIds: draw, blackoutDates }),
      });
      const data = await res.json();
      if (!res.ok) {
        push({ tone: "error", message: data.error || "Failed to generate schedule." });
        return;
      }
      setPreview(data.games);
      push({ tone: "success", message: `Generated ${data.games.length} games. Review below, then publish when ready.` });
    } finally {
      setGenerating(false);
    }
  }

  async function publish() {
    if (!preview) return;
    setConfirmOpen(false);
    setPublishing(true);
    try {
      const res = await fetch("/api/admin/schedule/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ year: Number(year), games: preview }),
      });
      const data = await res.json();
      if (!res.ok) {
        push({ tone: "error", message: data.error || "Failed to publish schedule." });
        return;
      }
      push({ tone: "success", message: `Published ${data.gamesCreated} games for the ${year} season.` });
      setPreview(null);
    } finally {
      setPublishing(false);
    }
  }

  function csvCell(value: string): string {
    return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
  }

  // Same DATE/TIME/PARK/HOME/AWAY column shape as the league's own 2026
  // template, so this can double as next year's reference spreadsheet if
  // needed — not just a one-off export.
  function downloadCsv() {
    if (!preview) return;
    const rows = [
      ["DATE", "TIME", "PARK", "HOME", "AWAY"],
      ...preview.map((g) => [formatDateHeading(g.date), g.time, g.field, g.homeTeamName, g.awayTeamName]),
    ];
    const csv = rows.map((row) => row.map(csvCell).join(",")).join("\r\n") + "\r\n";
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${year}-schedule.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // Lets the league override the generator entirely with their own
  // hand-built spreadsheet (DATE, TIME, PARK, HOME, AWAY columns, real team
  // names) — reuses the exact same preview/export/publish flow below, it
  // doesn't care whether `preview` came from the generator or a file.
  async function handleImportFile(file: File) {
    setImporting(true);
    setImportErrors([]);
    try {
      // If the draw hasn't been run yet, the file may still say "Team 1",
      // "Team 2", etc. (or "Team A" for Team 1, matching the league's own
      // template quirk) instead of real team names — resolve those against
      // whichever slots are already filled in the Draw Order picker above,
      // so the admin doesn't need a second place to assign them.
      const teamById = new Map(teams.map((t) => [t._id, t]));
      const drawTeams = draw.map((id) => (id ? (teamById.get(id) ?? null) : null));
      const placeholderMap = buildDrawPlaceholderMap(drawTeams);

      const isExcel = /\.xlsx?$/i.test(file.name);
      const { games, errors } = isExcel
        ? parseScheduleXlsx(await file.arrayBuffer(), teams, year, placeholderMap)
        : parseScheduleCsv(await file.text(), teams, year, placeholderMap);

      setImportErrors(errors);
      if (games.length === 0) {
        push({ tone: "error", message: "No valid rows could be imported — see the errors below." });
        return;
      }
      setPreview(games);
      push({
        tone: errors.length > 0 ? "info" : "success",
        message: `Imported ${games.length} game(s)${errors.length > 0 ? ` — ${errors.length} row(s) skipped, see below` : ""}. Review below, then publish when ready.`,
      });
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  const gamesByDate = useMemo(() => {
    if (!preview) return [];
    const map = new Map<string, PreviewGame[]>();
    for (const g of preview) {
      const list = map.get(g.date) ?? [];
      list.push(g);
      map.set(g.date, list);
    }
    return [...map.entries()];
  }, [preview]);

  return (
    <div className="space-y-6">
      <ToastStack toasts={toasts} onDismiss={dismiss} />

      <Card>
        <CardHeader
          title="Season Schedule Generator"
          subtitle="Double round-robin + 4 random bonus games per team, matching the league's real format — 14 teams, 2 fields, Tue/Thu, 3 time slots, 30 games/team."
        />
        <div className="space-y-5 p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-sm font-semibold text-gray-700">Season Year</span>
              <TextInput value={year} onChange={(e) => setYear(e.target.value.replace(/\D/g, "").slice(0, 4))} placeholder="2027" />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-semibold text-gray-700">First Game Date</span>
              <TextInput
                type="date"
                value={seasonStartDate}
                onChange={(e) => setSeasonStartDate(e.target.value)}
              />
              <span className="mt-1 block text-xs text-gray-400">
                Rolls forward automatically to the next Tuesday or Thursday if this isn&apos;t one.
              </span>
            </label>
          </div>

          {yearLocked && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">
              {year} is locked — the generator (and import) only work through {getScheduleLockDate(Number(year))},
              two weeks into that season&apos;s May, to protect a season that&apos;s already under way. This applies
              even if {year} has no games yet.
            </p>
          )}

          <div>
            <span className="mb-1 block text-sm font-semibold text-gray-700">Blackout Weeks</span>
            <p className="mb-2 text-xs text-gray-400">
              Any Tuesday/Thursday to skip entirely — long weekends, the Charity tournament week, etc. The season
              just runs a week later to make up each one.
            </p>
            <div className="flex flex-wrap items-center gap-2">
              {blackoutDates.map((d) => (
                <span
                  key={d}
                  className="flex items-center gap-1.5 rounded-full border border-gray-300 bg-gray-50 py-1 pl-3 pr-1.5 text-xs font-semibold text-gray-700"
                >
                  {d}
                  <button
                    type="button"
                    onClick={() => removeBlackoutDate(d)}
                    aria-label={`Remove ${d}`}
                    className="rounded-full p-0.5 text-gray-400 hover:bg-gray-200 hover:text-black"
                  >
                    <X size={12} aria-hidden="true" />
                  </button>
                </span>
              ))}
              <div className="flex items-center gap-1.5">
                <TextInput
                  type="date"
                  value={newBlackoutDate}
                  onChange={(e) => setNewBlackoutDate(e.target.value)}
                  className="h-8 w-40"
                />
                <SecondaryButton onClick={addBlackoutDate} disabled={!newBlackoutDate} className="h-8 px-2.5">
                  <Plus size={13} aria-hidden="true" />
                </SecondaryButton>
              </div>
            </div>
          </div>

          <div>
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <div>
                <span className="text-sm font-semibold text-gray-700">Draw Order (Team 1 – Team 14)</span>
                <p className="text-xs text-gray-400">
                  Only teams that played the {Number(year) - 1 || "prior"} season are offered.
                </p>
              </div>
              <div className="flex gap-2">
                <SecondaryButton onClick={fillRandomly} disabled={loadingTeams}>
                  <Shuffle size={14} aria-hidden="true" /> Fill Randomly
                </SecondaryButton>
                <SecondaryButton onClick={clearDraw}>Clear</SecondaryButton>
              </div>
            </div>

            {loadingTeams ? (
              <Spinner />
            ) : teams.length === 0 ? (
              <EmptyState>
                No teams found for the {Number(year) - 1 || "prior"} season — check that season has standings, or
                adjust the year above.
              </EmptyState>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {draw.map((teamId, i) => {
                  const isDupe = teamId && draw.filter((t) => t === teamId).length > 1;
                  return (
                    <div key={i} className="flex items-center gap-2">
                      <span className="w-14 shrink-0 font-mono-brand text-xs text-gray-400">
                        Team {i + 1}
                      </span>
                      <Select
                        value={teamId ?? ""}
                        onChange={(e) => setSlot(i, e.target.value)}
                        className={clsx("w-full", isDupe && "border-red-400")}
                      >
                        <option value="">— unassigned —</option>
                        {teams.map((t) => (
                          <option
                            key={t._id}
                            value={t._id}
                            disabled={chosenIds.has(t._id) && teamId !== t._id}
                          >
                            {t.name}
                          </option>
                        ))}
                      </Select>
                    </div>
                  );
                })}
              </div>
            )}
            {duplicates && (
              <p className="mt-2 text-xs font-semibold text-red-600">
                Each team can only be used once — fix the duplicate slot(s) above.
              </p>
            )}
          </div>

          <div className="flex justify-end">
            <PrimaryButton onClick={generatePreview} disabled={!canGenerate || generating}>
              <Wand2 size={15} aria-hidden="true" />
              {generating ? "Generating…" : "Generate Preview"}
            </PrimaryButton>
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader
          title="Or Import Your Own Schedule"
          subtitle="If the league would rather build it by hand: upload a CSV or Excel file with DATE, TIME, PARK, HOME, AWAY columns — team names must match real team names exactly. Skips the generator above entirely and feeds straight into the same preview/publish flow."
        />
        <div className="space-y-3 p-5">
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
            If the draw hasn&apos;t happened yet and the file still says &quot;Team 1&quot;, &quot;Team 2&quot;, etc.
            (or &quot;Team A&quot; for Team 1) instead of real names, fill in the <strong>Draw Order</strong> picker
            above first — those placeholders will resolve against whichever slots are filled in there.
          </p>
          <div className="flex items-center gap-3">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv,.xls,.xlsx,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleImportFile(file);
              }}
            />
            <SecondaryButton
              onClick={() => fileInputRef.current?.click()}
              disabled={importing || loadingTeams || yearLocked}
            >
              <FileUp size={14} aria-hidden="true" />
              {importing ? "Importing…" : "Choose CSV or Excel File"}
            </SecondaryButton>
            <span className="text-xs text-gray-400">
              .csv, .xls, or .xlsx. Dates can be plain (2027-05-12) or written out (Tuesday, May 12) — a written-out
              date without a year borrows the Season Year field above.
            </span>
          </div>
          {importErrors.length > 0 && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3">
              <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-red-700">
                {importErrors.length} row issue{importErrors.length === 1 ? "" : "s"}
              </p>
              <ul className="max-h-40 space-y-0.5 overflow-y-auto text-xs text-red-700">
                {importErrors.map((e, i) => (
                  <li key={i}>{e}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </Card>

      {preview && (
        <Card>
          <CardHeader
            title={`Preview — ${preview.length} games`}
            subtitle={`${formatDateHeading(gamesByDate[0][0])} through ${formatDateHeading(gamesByDate[gamesByDate.length - 1][0])}`}
            action={
              <div className="flex gap-2">
                <SecondaryButton onClick={downloadCsv}>
                  <Download size={14} aria-hidden="true" /> Export CSV
                </SecondaryButton>
                <PrimaryButton onClick={() => setConfirmOpen(true)} disabled={publishing || yearLocked}>
                  <UploadCloud size={15} aria-hidden="true" />
                  {publishing ? "Publishing…" : `Publish ${year} Schedule`}
                </PrimaryButton>
              </div>
            }
          />
          <div className="max-h-[600px] overflow-y-auto p-5">
            <div className="space-y-4">
              {gamesByDate.map(([date, games]) => (
                <div key={date}>
                  <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-gray-500">
                    {formatDateHeading(date)}
                  </p>
                  <div className="divide-y rounded-lg border border-gray-200">
                    {games.map((g, i) => (
                      <div key={i} className="grid grid-cols-[70px_1fr_90px] items-center gap-2 px-3 py-1.5 text-sm">
                        <span className="font-mono-brand text-xs text-gray-500">{g.time}</span>
                        <span className="truncate">
                          <span className="font-semibold text-black">{g.homeTeamName}</span>
                          <span className="text-gray-400"> vs </span>
                          <span className="font-semibold text-black">{g.awayTeamName}</span>
                        </span>
                        <span className="truncate text-right text-xs text-gray-500">{g.field}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}

      <ConfirmDialog
        open={confirmOpen}
        title={`Publish the ${year} schedule?`}
        description={`This creates ${preview?.length ?? 0} real games (and the ${year} season, if it doesn't exist yet). This can't be undone from here — refusing if any ${year} games already exist.`}
        confirmLabel="Publish"
        onConfirm={publish}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}

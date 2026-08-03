"use client";

import { useEffect, useMemo, useState } from "react";
import { Trash2 } from "lucide-react";
import type { Award } from "@/lib/types";
import { Card, CardHeader, Pill, PrimaryButton, DangerButton, TextInput, Spinner, EmptyState } from "../ui";
import { useToasts } from "@/components/admin/useToasts";
import ToastStack from "@/components/admin/ToastStack";

const TROPHY_CATEGORIES = [
  "Jim McGregor Trophy",
  "President's Trophy",
  "Richard Kirkby Memorial Trophy",
  "Kevan MacDonald Cup",
  "Rookie of the Year",
  "Service Award",
  "Peter McClarty Memorial Trophy",
];

export default function AwardsTab() {
  const [awards, setAwards] = useState<Award[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState(TROPHY_CATEGORIES[0]);
  const [year, setYear] = useState("");
  const [winner, setWinner] = useState("");
  const [saving, setSaving] = useState(false);
  const { toasts, push, dismiss } = useToasts();

  async function load() {
    setLoading(true);
    const res = await fetch("/api/admin/awards");
    const data = await res.json();
    setAwards(data.awards ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const history = useMemo(
    () => awards.filter((a) => a.category === category).sort((a, b) => b.year - a.year),
    [awards, category]
  );

  const existingForYear = useMemo(
    () => history.find((a) => String(a.year) === year.trim()),
    [history, year]
  );

  useEffect(() => {
    setYear("");
    setWinner("");
  }, [category]);

  async function handleSubmit() {
    if (!year.trim() || !winner.trim()) {
      push({ tone: "error", message: "Year and winner are required." });
      return;
    }
    setSaving(true);
    try {
      if (existingForYear) {
        const res = await fetch(`/api/admin/awards/${existingForYear._id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ winner: winner.trim() }),
        });
        if (!res.ok) throw new Error("Failed to update.");
      } else {
        const res = await fetch("/api/admin/awards", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ category, year: Number(year), winner: winner.trim() }),
        });
        if (!res.ok) throw new Error("Failed to add.");
      }
      push({ tone: "success", message: "Saved." });
      setYear("");
      setWinner("");
      load();
    } catch (err) {
      push({ tone: "error", message: err instanceof Error ? err.message : "Save failed." });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    setAwards((prev) => prev.filter((a) => a._id !== id));
    const res = await fetch(`/api/admin/awards/${id}`, { method: "DELETE" });
    if (!res.ok) {
      push({ tone: "error", message: "Delete failed." });
      load();
    }
  }

  if (loading) return <Spinner />;

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <div className="flex flex-wrap gap-2">
          {TROPHY_CATEGORIES.map((c) => (
            <Pill key={c} active={c === category} onClick={() => setCategory(c)}>
              {c}
            </Pill>
          ))}
        </div>
      </Card>

      <Card>
        <CardHeader title={existingForYear ? "Update Entry" : "Add Entry"} subtitle={category} />
        <div className="flex flex-wrap items-end gap-3 p-5">
          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-600">Year</label>
            <TextInput
              className="w-28 font-mono-brand"
              type="number"
              value={year}
              onChange={(e) => setYear(e.target.value)}
              placeholder="2026"
            />
          </div>
          <div className="min-w-[200px] flex-1">
            <label className="mb-1 block text-xs font-semibold text-gray-600">Winner / Team</label>
            <TextInput value={winner} onChange={(e) => setWinner(e.target.value)} placeholder="Winner name" />
          </div>
          <PrimaryButton onClick={handleSubmit} disabled={saving}>
            {saving ? "Saving…" : existingForYear ? "Update" : "Add"}
          </PrimaryButton>
        </div>
      </Card>

      <Card>
        <CardHeader title="History" subtitle={category} />
        {history.length === 0 ? (
          <EmptyState>No entries yet for this category.</EmptyState>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                <th className="px-5 py-2">Year</th>
                <th className="px-5 py-2">Winner</th>
                <th className="px-5 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {history.map((a) => (
                <tr key={a._id}>
                  <td className="px-5 py-3 font-mono-brand font-bold text-black">{a.year}</td>
                  <td className="px-5 py-3 text-black">{a.winner}</td>
                  <td className="px-5 py-3 text-right">
                    <DangerButton onClick={() => handleDelete(a._id)}>
                      <Trash2 size={12} aria-hidden="true" />
                    </DangerButton>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <ToastStack toasts={toasts} onDismiss={dismiss} />
    </div>
  );
}

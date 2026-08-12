"use client";

import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import clsx from "clsx";
import type { ImportantDate } from "@/lib/types";
import { getTodayEastern } from "@/utils/timezone";
import { Card, CardHeader, PrimaryButton, SecondaryButton, DangerButton, StatusBadge, TextInput, Select, Spinner, EmptyState } from "../ui";
import { useToasts } from "@/components/admin/useToasts";
import ToastStack from "@/components/admin/ToastStack";

const CATEGORY_TONE: Record<string, "blue" | "yellow" | "green" | "gray"> = {
  Season: "green",
  Tournament: "yellow",
  Registration: "blue",
  Admin: "gray",
};

type DraftDate = Partial<ImportantDate>;

const EMPTY_DRAFT: DraftDate = { label: "", date: "", description: "", category: "Admin" };

export default function KeyDatesTab() {
  const [dates, setDates] = useState<ImportantDate[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | "new" | null>(null);
  const [draft, setDraft] = useState<DraftDate>(EMPTY_DRAFT);
  const [saving, setSaving] = useState(false);
  const { toasts, push, dismiss } = useToasts();

  const todayISO = getTodayEastern();

  async function load() {
    setLoading(true);
    const res = await fetch("/api/admin/important-dates");
    const data = await res.json();
    setDates(data.dates ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  function startEdit(d: ImportantDate) {
    setEditingId(d._id);
    setDraft(d);
  }

  function startNew() {
    setEditingId("new");
    setDraft(EMPTY_DRAFT);
  }

  function cancelEdit() {
    setEditingId(null);
    setDraft(EMPTY_DRAFT);
  }

  async function saveDraft() {
    if (!draft.label || !draft.date) {
      push({ tone: "error", message: "Label and date are required." });
      return;
    }
    setSaving(true);
    try {
      if (editingId === "new") {
        const res = await fetch("/api/admin/important-dates", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(draft),
        });
        if (!res.ok) throw new Error("Failed to create.");
      } else if (editingId) {
        const res = await fetch(`/api/admin/important-dates/${editingId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(draft),
        });
        if (!res.ok) throw new Error("Failed to save.");
      }
      push({ tone: "success", message: "Saved." });
      cancelEdit();
      load();
    } catch (err) {
      push({ tone: "error", message: err instanceof Error ? err.message : "Save failed." });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    setDates((prev) => prev.filter((d) => d._id !== id));
    const res = await fetch(`/api/admin/important-dates/${id}`, { method: "DELETE" });
    if (!res.ok) {
      push({ tone: "error", message: "Delete failed." });
      load();
    }
  }

  if (loading) return <Spinner />;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader
          title="Key Dates"
          action={
            <PrimaryButton onClick={startNew}>
              <Plus size={14} aria-hidden="true" />
              Add Date
            </PrimaryButton>
          }
        />

        {editingId === "new" && (
          <DateEditor draft={draft} setDraft={setDraft} onSave={saveDraft} onCancel={cancelEdit} saving={saving} />
        )}

        {dates.length === 0 ? (
          <EmptyState>No key dates yet.</EmptyState>
        ) : (
          <div className="divide-y divide-gray-100">
            {dates.map((d) =>
              editingId === d._id ? (
                <DateEditor key={d._id} draft={draft} setDraft={setDraft} onSave={saveDraft} onCancel={cancelEdit} saving={saving} />
              ) : (
                <div
                  key={d._id}
                  className={clsx("flex flex-wrap items-center justify-between gap-3 p-4", d.date < todayISO && "opacity-50")}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono-brand text-sm font-bold text-black">
                        {new Date(`${d.date}T00:00:00`).toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" })}
                      </span>
                      {d.category && <StatusBadge tone={CATEGORY_TONE[d.category] ?? "gray"}>{d.category}</StatusBadge>}
                    </div>
                    <p className="mt-1 text-sm font-semibold text-black">{d.label}</p>
                    {d.description && <p className="text-sm text-gray-500">{d.description}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    <SecondaryButton className="h-8 px-2.5" onClick={() => startEdit(d)}>
                      <Pencil size={12} aria-hidden="true" />
                    </SecondaryButton>
                    <DangerButton onClick={() => handleDelete(d._id)}>
                      <Trash2 size={12} aria-hidden="true" />
                    </DangerButton>
                  </div>
                </div>
              )
            )}
          </div>
        )}
      </Card>

      <ToastStack toasts={toasts} onDismiss={dismiss} />
    </div>
  );
}

function DateEditor({
  draft,
  setDraft,
  onSave,
  onCancel,
  saving,
}: {
  draft: DraftDate;
  setDraft: (d: DraftDate) => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
}) {
  return (
    <div className="space-y-3 border-b border-gray-100 bg-gray-50 p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-semibold text-gray-600">Title</label>
          <TextInput value={draft.label ?? ""} onChange={(e) => setDraft({ ...draft, label: e.target.value })} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-gray-600">Date</label>
          <TextInput type="date" value={draft.date ?? ""} onChange={(e) => setDraft({ ...draft, date: e.target.value })} />
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-semibold text-gray-600">Category</label>
          <Select value={draft.category ?? "Admin"} onChange={(e) => setDraft({ ...draft, category: e.target.value as ImportantDate["category"] })}>
            <option value="Season">Season</option>
            <option value="Tournament">Tournament</option>
            <option value="Registration">Registration</option>
            <option value="Admin">Admin</option>
          </Select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-gray-600">Description</label>
          <TextInput value={draft.description ?? ""} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <SecondaryButton onClick={onCancel}>Cancel</SecondaryButton>
        <PrimaryButton onClick={onSave} disabled={saving}>
          {saving ? "Saving…" : "Save"}
        </PrimaryButton>
      </div>
    </div>
  );
}

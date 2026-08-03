"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Plus, Pencil, Trash2, Upload } from "lucide-react";
import type { NewsItem } from "@/lib/types";
import { urlFor } from "@/lib/sanity/image";
import { Card, CardHeader, PrimaryButton, SecondaryButton, DangerButton, StatusBadge, TextInput, TextArea, Select, Spinner, EmptyState } from "../ui";
import { useToasts } from "@/components/admin/useToasts";
import ToastStack from "@/components/admin/ToastStack";

const TAG_OPTIONS = [
  { value: "league", label: "League News" },
  { value: "results", label: "Game Results" },
  { value: "charity", label: "Charity" },
  { value: "announcement", label: "Announcement" },
  { value: "registration", label: "Registration" },
];

function portableTextToPlain(body: unknown): string {
  if (!Array.isArray(body)) return "";
  return body
    .map((block) =>
      block && typeof block === "object" && Array.isArray((block as { children?: unknown }).children)
        ? (block as { children: { text?: string }[] }).children.map((c) => c.text ?? "").join("")
        : ""
    )
    .join("\n\n");
}

type Draft = {
  _id?: string;
  title: string;
  date: string;
  tag: string;
  body: string;
  photo?: NewsItem["photo"];
};

const EMPTY_DRAFT: Draft = { title: "", date: new Date().toISOString().slice(0, 10), tag: "league", body: "" };

export default function NewsTab() {
  const [items, setItems] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const { toasts, push, dismiss } = useToasts();

  async function load() {
    setLoading(true);
    const res = await fetch("/api/admin/news");
    const data = await res.json();
    setItems(data.news ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  function startNew() {
    setEditing(EMPTY_DRAFT);
  }

  function startEdit(item: NewsItem) {
    setEditing({
      _id: item._id,
      title: item.title,
      date: item.date?.slice(0, 10) ?? "",
      tag: item.tag ?? "league",
      body: portableTextToPlain(item.body),
      photo: item.photo,
    });
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !editing) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/admin/upload", { method: "POST", body: form });
      if (!res.ok) throw new Error("Upload failed.");
      const data = await res.json();
      setEditing({ ...editing, photo: data.image });
    } catch (err) {
      push({ tone: "error", message: err instanceof Error ? err.message : "Upload failed." });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function handleSave() {
    if (!editing) return;
    if (!editing.title.trim() || !editing.body.trim()) {
      push({ tone: "error", message: "Title and body are required." });
      return;
    }
    setSaving(true);
    try {
      const payload = {
        title: editing.title,
        date: editing.date ? new Date(editing.date).toISOString() : new Date().toISOString(),
        tag: editing.tag,
        body: editing.body,
        photo: editing.photo,
      };
      const res = editing._id
        ? await fetch(`/api/admin/news/${editing._id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })
        : await fetch("/api/admin/news", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
      if (!res.ok) throw new Error("Save failed.");
      push({ tone: "success", message: "Saved." });
      setEditing(null);
      load();
    } catch (err) {
      push({ tone: "error", message: err instanceof Error ? err.message : "Save failed." });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    setItems((prev) => prev.filter((n) => n._id !== id));
    const res = await fetch(`/api/admin/news/${id}`, { method: "DELETE" });
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
          title="News Articles"
          action={
            <PrimaryButton onClick={startNew}>
              <Plus size={14} aria-hidden="true" />
              New Article
            </PrimaryButton>
          }
        />

        {editing && (
          <div className="space-y-3 border-b border-gray-100 bg-gray-50 p-5">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-600">Title</label>
                <TextInput value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-gray-600">Date</label>
                  <TextInput type="date" value={editing.date} onChange={(e) => setEditing({ ...editing, date: e.target.value })} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-gray-600">Category</label>
                  <Select value={editing.tag} onChange={(e) => setEditing({ ...editing, tag: e.target.value })}>
                    {TAG_OPTIONS.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-600">Body</label>
              <TextArea rows={6} value={editing.body} onChange={(e) => setEditing({ ...editing, body: e.target.value })} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-600">Photo</label>
              <div className="flex items-center gap-3">
                {editing.photo && (
                  <Image src={urlFor(editing.photo).width(80).height(80).url()} alt="" width={80} height={80} className="rounded-md object-cover" />
                )}
                <SecondaryButton onClick={() => fileRef.current?.click()} disabled={uploading}>
                  <Upload size={14} aria-hidden="true" />
                  {uploading ? "Uploading…" : "Upload Photo"}
                </SecondaryButton>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <SecondaryButton onClick={() => setEditing(null)}>Cancel</SecondaryButton>
              <PrimaryButton onClick={handleSave} disabled={saving}>
                {saving ? "Saving…" : "Save"}
              </PrimaryButton>
            </div>
          </div>
        )}

        {items.length === 0 ? (
          <EmptyState>No articles yet.</EmptyState>
        ) : (
          <div className="divide-y divide-gray-100">
            {items.map((item) => (
              <div key={item._id} className="flex flex-wrap items-center gap-4 p-4">
                {item.photo ? (
                  <Image src={urlFor(item.photo).width(64).height(64).url()} alt="" width={64} height={64} className="h-16 w-16 rounded-md object-cover" />
                ) : (
                  <div className="h-16 w-16 rounded-md bg-gray-100" />
                )}
                <div className="min-w-[200px] flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-black">{item.title}</p>
                    {item.tag && <StatusBadge tone="gray">{TAG_OPTIONS.find((t) => t.value === item.tag)?.label ?? item.tag}</StatusBadge>}
                  </div>
                  <p className="font-mono-brand text-xs text-gray-400">{item.date ? new Date(item.date).toLocaleDateString() : ""}</p>
                  <p className="mt-1 line-clamp-1 text-sm text-gray-500">{portableTextToPlain(item.body)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <SecondaryButton className="h-8 px-2.5" onClick={() => startEdit(item)}>
                    <Pencil size={12} aria-hidden="true" />
                  </SecondaryButton>
                  <DangerButton onClick={() => handleDelete(item._id)}>
                    <Trash2 size={12} aria-hidden="true" />
                  </DangerButton>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <ToastStack toasts={toasts} onDismiss={dismiss} />
    </div>
  );
}

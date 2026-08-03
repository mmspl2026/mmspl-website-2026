"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Plus, Trash2, Upload, Settings, X } from "lucide-react";
import type { GalleryPhoto } from "@/lib/types";
import { urlFor } from "@/lib/sanity/image";
import { Card, CardHeader, PrimaryButton, SecondaryButton, DangerButton, StatusBadge, TextInput, Select, Spinner, EmptyState } from "../ui";
import { useToasts } from "@/components/admin/useToasts";
import ToastStack from "@/components/admin/ToastStack";

type Draft = { image: GalleryPhoto["image"] | null; caption: string; category: string; date: string };
const EMPTY_DRAFT: Draft = { image: null, caption: "", category: "", date: new Date().toISOString().slice(0, 10) };

export default function GalleryTab() {
  const [photos, setPhotos] = useState<GalleryPhoto[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [managingCategories, setManagingCategories] = useState(false);
  const [newCategory, setNewCategory] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const { toasts, push, dismiss } = useToasts();

  async function load() {
    setLoading(true);
    const [photosRes, categoriesRes] = await Promise.all([
      fetch("/api/admin/gallery"),
      fetch("/api/admin/gallery/categories"),
    ]);
    const photosData = await photosRes.json();
    const categoriesData = await categoriesRes.json();
    setPhotos(photosData.photos ?? []);
    setCategories(categoriesData.categories ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/admin/upload", { method: "POST", body: form });
      if (!res.ok) throw new Error("Upload failed.");
      const data = await res.json();
      setDraft((d) => ({ ...d, image: data.image }));
    } catch (err) {
      push({ tone: "error", message: err instanceof Error ? err.message : "Upload failed." });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function handleSave() {
    if (!draft.image) {
      push({ tone: "error", message: "Please upload a photo first." });
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/gallery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: draft.image,
          caption: draft.caption || undefined,
          category: draft.category || undefined,
          date: draft.date ? new Date(draft.date).toISOString().slice(0, 10) : undefined,
        }),
      });
      if (!res.ok) throw new Error("Save failed.");
      push({ tone: "success", message: "Photo added." });
      setDraft(EMPTY_DRAFT);
      setAdding(false);
      load();
    } catch (err) {
      push({ tone: "error", message: err instanceof Error ? err.message : "Save failed." });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    setPhotos((prev) => prev.filter((p) => p._id !== id));
    const res = await fetch(`/api/admin/gallery/${id}`, { method: "DELETE" });
    if (!res.ok) {
      push({ tone: "error", message: "Delete failed." });
      load();
    }
  }

  async function saveCategories(next: string[]) {
    setCategories(next);
    await fetch("/api/admin/gallery/categories", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ categories: next }),
    });
  }

  function addCategory() {
    const name = newCategory.trim();
    if (!name || categories.includes(name)) return;
    saveCategories([...categories, name]);
    setNewCategory("");
  }

  function removeCategory(name: string) {
    saveCategories(categories.filter((c) => c !== name));
  }

  if (loading) return <Spinner />;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader
          title="Gallery"
          action={
            <div className="flex gap-2">
              <SecondaryButton onClick={() => setManagingCategories((v) => !v)}>
                <Settings size={14} aria-hidden="true" />
                Manage Categories
              </SecondaryButton>
              <PrimaryButton onClick={() => setAdding((v) => !v)}>
                <Plus size={14} aria-hidden="true" />
                Add Photo
              </PrimaryButton>
            </div>
          }
        />

        {managingCategories && (
          <div className="space-y-3 border-b border-gray-100 bg-gray-50 p-5">
            <div className="flex flex-wrap gap-2">
              {categories.map((c) => (
                <span key={c} className="inline-flex items-center gap-1 rounded-full bg-white border-2 border-gray-300 px-3 py-1 text-sm font-semibold text-gray-700">
                  {c}
                  <button type="button" onClick={() => removeCategory(c)} aria-label={`Remove ${c}`}>
                    <X size={12} className="text-gray-400 hover:text-brand" />
                  </button>
                </span>
              ))}
              {categories.length === 0 && <p className="text-sm text-gray-500">No categories yet.</p>}
            </div>
            <div className="flex gap-2">
              <TextInput
                className="max-w-xs"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                placeholder="New category name"
                onKeyDown={(e) => e.key === "Enter" && addCategory()}
              />
              <SecondaryButton onClick={addCategory}>Add</SecondaryButton>
            </div>
          </div>
        )}

        {adding && (
          <div className="space-y-3 border-b border-gray-100 bg-gray-50 p-5">
            <div className="flex items-center gap-3">
              {draft.image && (
                <Image src={urlFor(draft.image).width(80).height(80).url()} alt="" width={80} height={80} className="rounded-md object-cover" />
              )}
              <SecondaryButton onClick={() => fileRef.current?.click()} disabled={uploading}>
                <Upload size={14} aria-hidden="true" />
                {uploading ? "Uploading…" : "Upload Photo"}
              </SecondaryButton>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-600">Title / Caption</label>
                <TextInput value={draft.caption} onChange={(e) => setDraft({ ...draft, caption: e.target.value })} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-600">Category</label>
                <Select value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })}>
                  <option value="">None</option>
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-600">Date</label>
                <TextInput type="date" value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <SecondaryButton onClick={() => { setAdding(false); setDraft(EMPTY_DRAFT); }}>Cancel</SecondaryButton>
              <PrimaryButton onClick={handleSave} disabled={saving}>
                {saving ? "Saving…" : "Save Photo"}
              </PrimaryButton>
            </div>
          </div>
        )}

        {photos.length === 0 ? (
          <EmptyState>No photos yet.</EmptyState>
        ) : (
          <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2">
            {photos.map((p) => (
              <div key={p._id} className="flex items-center gap-3 rounded-lg border border-gray-200 p-3">
                <Image src={urlFor(p.image).width(96).height(96).url()} alt="" width={96} height={96} className="h-24 w-24 rounded-md object-cover" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-black">{p.caption || "Untitled"}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    {p.category && <StatusBadge tone="gray">{p.category}</StatusBadge>}
                    {p.date && <span className="font-mono-brand text-xs text-gray-400">{new Date(p.date).getFullYear()}</span>}
                  </div>
                </div>
                <DangerButton onClick={() => handleDelete(p._id)}>
                  <Trash2 size={12} aria-hidden="true" />
                </DangerButton>
              </div>
            ))}
          </div>
        )}
      </Card>

      <ToastStack toasts={toasts} onDismiss={dismiss} />
    </div>
  );
}

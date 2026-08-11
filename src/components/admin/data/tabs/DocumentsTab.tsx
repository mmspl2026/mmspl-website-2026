"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Plus, Trash2, Upload, Eye, Download } from "lucide-react";
import type { LeagueDocument } from "@/lib/types";
import {
  Card,
  CardHeader,
  PrimaryButton,
  SecondaryButton,
  DangerButton,
  StatusBadge,
  TextInput,
  TextArea,
  Select,
  Modal,
  Spinner,
  EmptyState,
} from "../ui";
import { useToasts } from "@/components/admin/useToasts";
import ToastStack from "@/components/admin/ToastStack";

const CATEGORIES = ["Rules & Regulations", "AGM Documents", "General"] as const;
const BADGES = [
  { value: "", label: "None" },
  { value: "PASSED", label: "Passed" },
  { value: "FAILED", label: "Failed" },
  { value: "NA", label: "N/A" },
];

type UploadedFile = { _type: "file"; asset: { _type: "reference"; _ref: string } };

interface Draft {
  title: string;
  category: (typeof CATEGORIES)[number];
  year: string;
  description: string;
  badge: string;
  file: UploadedFile | null;
  fileName: string;
}

const EMPTY_DRAFT: Draft = {
  title: "",
  category: "Rules & Regulations",
  year: String(new Date().getFullYear()),
  description: "",
  badge: "",
  file: null,
  fileName: "",
};

const BADGE_TONE: Record<string, "green" | "red" | "gray"> = {
  PASSED: "green",
  FAILED: "red",
  NA: "gray",
};

export default function DocumentsTab() {
  const [documents, setDocuments] = useState<LeagueDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const { toasts, push, dismiss } = useToasts();

  async function load() {
    setLoading(true);
    const res = await fetch("/api/admin/documents");
    const data = await res.json();
    setDocuments(data.documents ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  function closeModal() {
    setModalOpen(false);
    setDraft(EMPTY_DRAFT);
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== "application/pdf") {
      push({ tone: "error", message: "Only PDF files are accepted." });
      if (fileRef.current) fileRef.current.value = "";
      return;
    }
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/admin/documents/upload", { method: "POST", body: form });
      if (!res.ok) throw new Error("Upload failed.");
      const data = await res.json();
      setDraft((d) => ({ ...d, file: data.file, fileName: data.originalFilename || file.name }));
    } catch (err) {
      push({ tone: "error", message: err instanceof Error ? err.message : "Upload failed." });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function handleSave() {
    if (!draft.title.trim()) {
      push({ tone: "error", message: "Title is required." });
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: draft.title.trim(),
          category: draft.category,
          description: draft.description || undefined,
          year: draft.year || undefined,
          badge: draft.badge || undefined,
          file: draft.file || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Save failed.");
      }
      push({ tone: "success", message: "Document uploaded." });
      closeModal();
      load();
    } catch (err) {
      push({ tone: "error", message: err instanceof Error ? err.message : "Save failed." });
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!deleteId) return;
    const id = deleteId;
    setDeleteId(null);
    setDocuments((prev) => prev.filter((d) => d._id !== id));
    const res = await fetch(`/api/admin/documents/${id}`, { method: "DELETE" });
    if (!res.ok) {
      push({ tone: "error", message: "Delete failed." });
      load();
    } else {
      push({ tone: "success", message: "Document deleted." });
    }
  }

  const filtered = useMemo(
    () => (filter === "all" ? documents : documents.filter((d) => d.category === filter)),
    [documents, filter]
  );

  const grouped = useMemo(() => {
    const byCategory: Record<string, LeagueDocument[]> = {};
    for (const cat of CATEGORIES) {
      const items = filtered.filter((d) => d.category === cat);
      if (items.length > 0) byCategory[cat] = items;
    }
    return byCategory;
  }, [filtered]);

  if (loading) return <Spinner />;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader
          title="Official Documents"
          action={
            <div className="flex flex-wrap items-center gap-2">
              <Select value={filter} onChange={(e) => setFilter(e.target.value)}>
                <option value="all">All Documents</option>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
              <PrimaryButton onClick={() => setModalOpen(true)}>
                <Plus size={14} aria-hidden="true" />
                Upload PDF
              </PrimaryButton>
            </div>
          }
        />

        {filtered.length === 0 ? (
          <EmptyState>No documents found.</EmptyState>
        ) : (
          <div className="space-y-6 p-5">
            {Object.entries(grouped).map(([cat, items]) => (
              <div key={cat}>
                <h4 className="mb-3 text-xs font-bold uppercase tracking-widest text-gray-400">
                  {cat} ({items.length})
                </h4>
                <div className="space-y-2">
                  {items.map((doc) => {
                    const fileUrl = doc.file?.asset?.url;
                    return (
                      <div
                        key={doc._id}
                        className="flex flex-wrap items-center gap-3 rounded-lg border border-gray-200 px-4 py-3"
                      >
                        {doc.category === "AGM Documents" && doc.badge && (
                          <StatusBadge tone={BADGE_TONE[doc.badge] ?? "gray"}>
                            {doc.badge === "NA" ? "N/A" : doc.badge}
                          </StatusBadge>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-semibold text-black">{doc.title}</p>
                          {doc.description && (
                            <p className="mt-0.5 truncate text-sm text-gray-500">{doc.description}</p>
                          )}
                        </div>
                        {doc.year && <span className="font-mono-brand text-xs text-gray-400">{doc.year}</span>}
                        <div className="flex shrink-0 gap-1.5">
                          {fileUrl ? (
                            <>
                              <SecondaryButton
                                className="h-8 px-2.5 text-xs"
                                onClick={() => window.open(fileUrl, "_blank", "noopener,noreferrer")}
                                aria-label={`View ${doc.title}`}
                              >
                                <Eye size={13} aria-hidden="true" />
                              </SecondaryButton>
                              <a
                                href={fileUrl}
                                download
                                target="_blank"
                                rel="noopener noreferrer"
                                aria-label={`Download ${doc.title}`}
                                className="inline-flex h-8 items-center justify-center rounded-[3px] border-2 border-gray-300 bg-white px-2.5 text-xs font-semibold text-gray-700 transition-colors hover:border-brand hover:text-brand"
                              >
                                <Download size={13} aria-hidden="true" />
                              </a>
                            </>
                          ) : (
                            <span className="text-xs italic text-gray-400">No file</span>
                          )}
                          <DangerButton onClick={() => setDeleteId(doc._id)} aria-label={`Delete ${doc.title}`}>
                            <Trash2 size={12} aria-hidden="true" />
                          </DangerButton>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Modal open={modalOpen} onClose={closeModal} title="Upload PDF">
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-600">Title *</label>
            <TextInput value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-600">Category</label>
              <Select
                className="w-full"
                value={draft.category}
                onChange={(e) => setDraft({ ...draft, category: e.target.value as Draft["category"], badge: "" })}
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-600">Year</label>
              <TextInput
                type="number"
                value={draft.year}
                onChange={(e) => setDraft({ ...draft, year: e.target.value })}
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-600">Description / Notes</label>
            <TextArea
              rows={3}
              value={draft.description}
              onChange={(e) => setDraft({ ...draft, description: e.target.value })}
            />
          </div>
          {draft.category === "AGM Documents" && (
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-600">Status</label>
              <Select
                className="w-full"
                value={draft.badge}
                onChange={(e) => setDraft({ ...draft, badge: e.target.value })}
              >
                {BADGES.map((b) => (
                  <option key={b.value} value={b.value}>
                    {b.label}
                  </option>
                ))}
              </Select>
            </div>
          )}
          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-600">PDF File</label>
            <div className="flex items-center gap-3">
              <SecondaryButton onClick={() => fileRef.current?.click()} disabled={uploading}>
                <Upload size={14} aria-hidden="true" />
                {uploading ? "Uploading…" : draft.file ? "Replace PDF" : "Upload PDF"}
              </SecondaryButton>
              {draft.fileName && <span className="truncate text-sm text-gray-600">{draft.fileName}</span>}
              <input ref={fileRef} type="file" accept="application/pdf" className="hidden" onChange={handleUpload} />
            </div>
          </div>

          <div className="flex justify-end gap-2 border-t border-gray-100 pt-4">
            <SecondaryButton onClick={closeModal}>Cancel</SecondaryButton>
            <PrimaryButton onClick={handleSave} disabled={saving || uploading}>
              {saving ? "Saving…" : "Save"}
            </PrimaryButton>
          </div>
        </div>
      </Modal>

      <Modal open={!!deleteId} onClose={() => setDeleteId(null)} title="Delete document?">
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            This permanently deletes the document and its PDF file. This can&apos;t be undone.
          </p>
          <div className="flex justify-end gap-2">
            <SecondaryButton onClick={() => setDeleteId(null)}>Cancel</SecondaryButton>
            <DangerButton className="h-9 px-4 text-sm" onClick={confirmDelete}>
              Delete
            </DangerButton>
          </div>
        </div>
      </Modal>

      <ToastStack toasts={toasts} onDismiss={dismiss} />
    </div>
  );
}

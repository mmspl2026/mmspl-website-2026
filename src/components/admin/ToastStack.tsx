"use client";

import { Check, AlertTriangle, Info, RotateCcw, X } from "lucide-react";
import clsx from "clsx";
import type { Toast } from "./useToasts";

const ICONS = { success: Check, error: AlertTriangle, info: Info };

export default function ToastStack({
  toasts,
  onDismiss,
}: {
  toasts: Toast[];
  onDismiss: (id: number) => void;
}) {
  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-[90] flex flex-col items-stretch gap-2 p-4 sm:items-end"
      role="region"
      aria-label="Notifications"
    >
      {toasts.map((toast) => {
        const Icon = ICONS[toast.tone];
        return (
          <div
            key={toast.id}
            role="status"
            className={clsx(
              "flex w-full max-w-sm items-center gap-3 rounded-lg border p-4 shadow-lg sm:w-auto",
              toast.tone === "success" && "border-green-700 bg-green-950 text-green-100",
              toast.tone === "error" && "border-brand-700 bg-brand-950 text-brand-100",
              toast.tone === "info" && "border-white/20 bg-[#1a1a1a] text-white"
            )}
          >
            <Icon size={18} aria-hidden="true" className="shrink-0" />
            <p className="flex-1 text-sm">{toast.message}</p>
            {toast.onUndo && (
              <button
                type="button"
                onClick={() => {
                  toast.onUndo?.();
                  onDismiss(toast.id);
                }}
                className="flex shrink-0 items-center gap-1 rounded bg-white/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide hover:bg-white/20"
              >
                <RotateCcw size={14} aria-hidden="true" />
                Undo
              </button>
            )}
            <button
              type="button"
              onClick={() => onDismiss(toast.id)}
              aria-label="Dismiss notification"
              className="shrink-0 text-white/40 hover:text-white"
            >
              <X size={16} aria-hidden="true" />
            </button>
          </div>
        );
      })}
    </div>
  );
}

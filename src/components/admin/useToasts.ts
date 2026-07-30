"use client";

import { useCallback, useRef, useState } from "react";

export interface Toast {
  id: number;
  message: string;
  tone: "success" | "error" | "info";
  onUndo?: () => void;
}

const UNDO_WINDOW_MS = 30_000;
const DEFAULT_DISMISS_MS = 5_000;

export function useToasts() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const counter = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (toast: Omit<Toast, "id">) => {
      const id = ++counter.current;
      setToasts((prev) => [...prev, { ...toast, id }]);
      window.setTimeout(() => dismiss(id), toast.onUndo ? UNDO_WINDOW_MS : DEFAULT_DISMISS_MS);
      return id;
    },
    [dismiss]
  );

  return { toasts, push, dismiss };
}

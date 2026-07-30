"use client";

import { useEffect, useState } from "react";
import { Bell, Check, Loader2, AlertCircle } from "lucide-react";

type Status = "idle" | "unsupported" | "subscribing" | "subscribed" | "denied" | "error";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from(Array.from(rawData).map((char) => char.charCodeAt(0)));
}

export default function PushNotificationButton() {
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setStatus("unsupported");
      return;
    }
    if (Notification.permission === "denied") {
      setStatus("denied");
    }
  }, []);

  async function handleEnable() {
    setStatus("subscribing");
    setErrorMessage("");

    try {
      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidPublicKey) {
        throw new Error("Push notifications aren't configured yet — check back soon.");
      }

      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setStatus("denied");
        return;
      }

      const registration = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) as BufferSource,
      });

      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subscription),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Something went wrong. Please try again.");
      }

      setStatus("subscribed");
    } catch (err) {
      setStatus("error");
      setErrorMessage(err instanceof Error ? err.message : "Something went wrong.");
    }
  }

  if (status === "unsupported") {
    return (
      <p className="flex items-center gap-2 text-sm text-black/60">
        <AlertCircle size={16} aria-hidden="true" />
        Push notifications aren&rsquo;t supported in this browser.
      </p>
    );
  }

  if (status === "subscribed") {
    return (
      <p role="status" className="flex items-center gap-2 text-sm font-semibold text-green-700">
        <Check size={18} aria-hidden="true" />
        Push notifications enabled on this device.
      </p>
    );
  }

  if (status === "denied") {
    return (
      <p role="alert" className="text-sm text-black/60">
        Notifications are blocked for this site. Enable them in your browser&rsquo;s site
        settings, then try again.
      </p>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleEnable}
        disabled={status === "subscribing"}
        className="inline-flex w-full items-center justify-center gap-2 rounded bg-black px-6 py-3 text-sm font-semibold uppercase tracking-wide text-white transition-colors hover:bg-black/80 disabled:opacity-50"
      >
        {status === "subscribing" ? (
          <Loader2 size={18} className="animate-spin" aria-hidden="true" />
        ) : (
          <Bell size={18} aria-hidden="true" />
        )}
        {status === "subscribing" ? "Enabling…" : "Enable Push Notifications"}
      </button>
      {status === "error" && (
        <p role="alert" className="mt-2 text-sm text-brand-700">
          {errorMessage}
        </p>
      )}
    </div>
  );
}

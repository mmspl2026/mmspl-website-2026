"use client";

import { useEffect, useState } from "react";
import { Send, Mail, Bell } from "lucide-react";
import type { NotificationLog } from "@/lib/types";
import { Card, CardHeader, PrimaryButton, SecondaryButton, TextInput, TextArea, Spinner, EmptyState } from "../ui";
import { useToasts } from "@/components/admin/useToasts";
import ToastStack from "@/components/admin/ToastStack";

const QUICK_MESSAGES = [
  {
    label: "Centennial cancelled",
    title: "Games at Centennial Cancelled",
    message: "All games scheduled at Centennial Park today have been cancelled due to field conditions.",
  },
  {
    label: "Mintleaf cancelled",
    title: "Games at Mintleaf Cancelled",
    message: "All games scheduled at Mintleaf Park today have been cancelled due to field conditions.",
  },
  {
    label: "All cancelled",
    title: "All Games Cancelled",
    message: "All games scheduled today have been cancelled due to field conditions.",
  },
  {
    label: "Fields good",
    title: "Fields Are Good — Games On",
    message: "Field conditions have been inspected and are good to play. All games scheduled today will proceed as planned.",
  },
];

export default function NotifyTab() {
  const [counts, setCounts] = useState({ emailCount: 0, pushCount: 0 });
  const [logs, setLogs] = useState<NotificationLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [testEmail, setTestEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);
  const { toasts, push, dismiss } = useToasts();

  async function load() {
    setLoading(true);
    const [countsRes, logsRes] = await Promise.all([fetch("/api/admin/notify/counts"), fetch("/api/admin/notify/logs")]);
    setCounts(await countsRes.json());
    const logsData = await logsRes.json();
    setLogs(logsData.logs ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleSend() {
    if (!title.trim() || !message.trim()) {
      push({ tone: "error", message: "Title and message are required." });
      return;
    }
    if (!confirm(`Send this notification to ${counts.emailCount} email subscribers and ${counts.pushCount} push subscribers?`)) return;
    setSending(true);
    try {
      const res = await fetch("/api/admin/notify/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, message }),
      });
      if (!res.ok) throw new Error("Send failed.");
      const data = await res.json();
      push({ tone: "success", message: `Sent to ${data.emailCount} emails, ${data.pushCount} push subscribers.` });
      setTitle("");
      setMessage("");
      load();
    } catch (err) {
      push({ tone: "error", message: err instanceof Error ? err.message : "Send failed." });
    } finally {
      setSending(false);
    }
  }

  async function handleSendTest() {
    if (!testEmail.trim() || !title.trim() || !message.trim()) {
      push({ tone: "error", message: "Fill in title, message, and a test email address." });
      return;
    }
    setSendingTest(true);
    try {
      const res = await fetch("/api/admin/notify/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: testEmail, title, message }),
      });
      if (!res.ok) throw new Error("Test send failed.");
      push({ tone: "success", message: `Test email sent to ${testEmail}.` });
    } catch (err) {
      push({ tone: "error", message: err instanceof Error ? err.message : "Test send failed." });
    } finally {
      setSendingTest(false);
    }
  }

  if (loading) return <Spinner />;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card className="flex items-center gap-4 p-5">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 text-brand">
            <Mail size={22} aria-hidden="true" />
          </div>
          <div>
            <p className="font-mono-brand text-2xl font-bold text-black">{counts.emailCount}</p>
            <p className="text-sm text-gray-500">Confirmed Email Subscribers</p>
          </div>
        </Card>
        <Card className="flex items-center gap-4 p-5">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 text-brand">
            <Bell size={22} aria-hidden="true" />
          </div>
          <div>
            <p className="font-mono-brand text-2xl font-bold text-black">{counts.pushCount}</p>
            <p className="text-sm text-gray-500">Push Subscribers</p>
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader title="Compose Notification" />
        <div className="space-y-3 p-5">
          <div className="flex flex-wrap gap-2">
            {QUICK_MESSAGES.map((q) => (
              <SecondaryButton
                key={q.label}
                className="h-8 px-3 text-xs"
                onClick={() => {
                  setTitle(q.title);
                  setMessage(q.message);
                }}
              >
                {q.label}
              </SecondaryButton>
            ))}
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-600">Subject / Title</label>
            <TextInput value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-600">Message</label>
            <TextArea rows={4} value={message} onChange={(e) => setMessage(e.target.value)} />
          </div>
          <PrimaryButton onClick={handleSend} disabled={sending}>
            <Send size={14} aria-hidden="true" />
            {sending ? "Sending…" : "Send to All Subscribers"}
          </PrimaryButton>

          <div className="flex flex-wrap items-end gap-3 border-t border-gray-100 pt-4">
            <div className="min-w-[220px] flex-1">
              <label className="mb-1 block text-xs font-semibold text-gray-600">Test Before Sending</label>
              <TextInput type="email" placeholder="you@example.com" value={testEmail} onChange={(e) => setTestEmail(e.target.value)} />
            </div>
            <SecondaryButton onClick={handleSendTest} disabled={sendingTest}>
              {sendingTest ? "Sending…" : "Send Test"}
            </SecondaryButton>
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader title="Recent Notifications" />
        {logs.length === 0 ? (
          <EmptyState>No notifications sent yet.</EmptyState>
        ) : (
          <div className="divide-y divide-gray-100">
            {logs.map((log) => (
              <div key={log._id} className="p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold text-black">{log.title}</p>
                  <span className="font-mono-brand text-xs text-gray-400">{new Date(log.sentAt).toLocaleString()}</span>
                </div>
                <p className="mt-1 line-clamp-1 text-sm text-gray-500">{log.message}</p>
                <p className="mt-1 text-xs text-gray-400">
                  {log.emailCount} emails &middot; {log.pushCount} push
                </p>
              </div>
            ))}
          </div>
        )}
      </Card>

      <ToastStack toasts={toasts} onDismiss={dismiss} />
    </div>
  );
}

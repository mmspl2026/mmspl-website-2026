"use client";

import { useEffect, useState } from "react";
import { Send } from "lucide-react";
import type { AdminSettings } from "@/lib/types";
import { Card, CardHeader, PrimaryButton, SecondaryButton, StatusBadge, TextInput, Spinner } from "../ui";
import { useToasts } from "@/components/admin/useToasts";
import ToastStack from "@/components/admin/ToastStack";

export default function EmailTab() {
  const [settings, setSettings] = useState<AdminSettings | null>(null);
  const [apiKeyConfigured, setApiKeyConfigured] = useState(false);
  const [fromAddress, setFromAddress] = useState("");
  const [contactRecipients, setContactRecipients] = useState("");
  const [replacingKey, setReplacingKey] = useState(false);
  const [newApiKey, setNewApiKey] = useState("");
  const [testTo, setTestTo] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);
  const { toasts, push, dismiss } = useToasts();

  async function load() {
    setLoading(true);
    const res = await fetch("/api/admin/settings");
    const data = await res.json();
    setSettings(data.settings ?? {});
    setApiKeyConfigured(data.resendApiKeyConfigured ?? false);
    setFromAddress(data.settings?.fromAddress ?? "");
    setContactRecipients(data.settings?.contactRecipients ?? "");
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const senderDomain = (fromAddress.match(/@([^\s>]+)/) || [])[1] || "not set";

  async function handleSave() {
    setSaving(true);
    try {
      const payload: Record<string, string> = { fromAddress, contactRecipients };
      if (replacingKey && newApiKey.trim()) payload.resendApiKey = newApiKey.trim();

      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed.");
      setApiKeyConfigured(data.resendApiKeyConfigured ?? apiKeyConfigured);
      setReplacingKey(false);
      setNewApiKey("");
      push({ tone: "success", message: "Email settings saved." });
    } catch (err) {
      push({ tone: "error", message: err instanceof Error ? err.message : "Save failed." });
    } finally {
      setSaving(false);
    }
  }

  async function handleSendTest() {
    setSendingTest(true);
    try {
      const res = await fetch("/api/admin/email/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: testTo }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Test send failed.");
      push({ tone: "success", message: `Test email sent to ${testTo}.` });
    } catch (err) {
      push({ tone: "error", message: err instanceof Error ? err.message : "Test send failed." });
    } finally {
      setSendingTest(false);
    }
  }

  if (loading || !settings) return <Spinner />;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader title="Email Configuration" />
        <div className="grid gap-4 p-5 sm:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase text-gray-500">Sender Domain</p>
            <p className="mt-1 font-mono-brand text-sm text-black">{senderDomain}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase text-gray-500">API Key Status</p>
            <div className="mt-1">
              <StatusBadge tone={apiKeyConfigured ? "green" : "red"}>
                {apiKeyConfigured ? "Configured" : "Not configured"}
              </StatusBadge>
            </div>
          </div>
        </div>

        <div className="space-y-4 border-t border-gray-100 p-5">
          <div>
            <label className="mb-1 block text-sm font-semibold text-black">From Address</label>
            <TextInput
              value={fromAddress}
              onChange={(e) => setFromAddress(e.target.value)}
              placeholder="MMSPL <no-reply@mmspl.ca>"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold text-black">Contact Recipients</label>
            <TextInput
              value={contactRecipients}
              onChange={(e) => setContactRecipients(e.target.value)}
              placeholder="info@mmspl.ca, president@mmspl.ca"
            />
            <p className="mt-1 text-xs text-gray-500">Comma-separated — receives contact form notifications.</p>
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold text-black">Resend API Key</label>
            {!replacingKey ? (
              <div className="flex items-center gap-3">
                <TextInput
                  value={apiKeyConfigured ? "••••••••••••••••" : "Not set"}
                  disabled
                  className="flex-1 bg-gray-50 text-gray-400"
                />
                <SecondaryButton onClick={() => setReplacingKey(true)}>{apiKeyConfigured ? "Replace" : "Set Key"}</SecondaryButton>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <TextInput
                  type="password"
                  autoFocus
                  value={newApiKey}
                  onChange={(e) => setNewApiKey(e.target.value)}
                  placeholder="re_xxxxxxxx"
                  className="flex-1"
                />
                <SecondaryButton
                  onClick={() => {
                    setReplacingKey(false);
                    setNewApiKey("");
                  }}
                >
                  Cancel
                </SecondaryButton>
              </div>
            )}
          </div>

          <div className="flex justify-end">
            <PrimaryButton onClick={handleSave} disabled={saving}>
              {saving ? "Saving…" : "Save Settings"}
            </PrimaryButton>
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader title="Send Test Email" subtitle="Verify the configuration above actually works." />
        <div className="flex flex-wrap items-center gap-3 p-5">
          <TextInput
            type="email"
            value={testTo}
            onChange={(e) => setTestTo(e.target.value)}
            placeholder="you@example.com"
            className="max-w-xs"
          />
          <PrimaryButton onClick={handleSendTest} disabled={sendingTest || !testTo}>
            <Send size={14} aria-hidden="true" />
            {sendingTest ? "Sending…" : "Send Test"}
          </PrimaryButton>
        </div>
      </Card>

      <ToastStack toasts={toasts} onDismiss={dismiss} />
    </div>
  );
}

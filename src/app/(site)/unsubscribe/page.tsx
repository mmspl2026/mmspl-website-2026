import type { Metadata } from "next";
import Link from "next/link";
import { MailX } from "lucide-react";
import EmailUnsubscribeForm from "@/components/EmailUnsubscribeForm";

export const metadata: Metadata = { title: "Unsubscribe" };

export default function UnsubscribePage() {
  return (
    <div className="bg-neutral-50 py-16">
      <div className="container-page">
        <div className="mx-auto max-w-md rounded-lg border border-black/10 bg-white p-8 text-center">
          <MailX className="mx-auto text-brand" size={36} aria-hidden="true" />
          <h1 className="mt-4 text-xl">Unsubscribe</h1>
          <p className="mt-2 text-sm text-black/60">
            Enter the email address you subscribed with, and we&rsquo;ll stop sending you MMSPL notifications.
          </p>
          <div className="mt-6">
            <EmailUnsubscribeForm />
          </div>
          <p className="mt-8 text-xs text-black/40">
            Changed your mind? You can{" "}
            <Link href="/notifications" className="underline hover:text-brand">
              subscribe again
            </Link>{" "}
            any time.
          </p>
        </div>
      </div>
    </div>
  );
}

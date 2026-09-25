import { Resend } from "resend";
import { writeClient } from "./sanity/client";
import { isSanityConfigured } from "./sanity/env";
import { renderEmail, SITE_URL, type RenderEmailOptions } from "./emailTemplate";
import type { SubscriberRecipient } from "./types";

export const ADMIN_EMAIL = process.env.MMSPL_ADMIN_EMAIL || "info@mmspl.ca";

interface EmailConfig {
  apiKey: string | undefined;
  fromEmail: string;
  contactRecipients: string[];
  registrationRecipients: string[];
}

let cachedConfig: { value: EmailConfig; expiresAt: number } | null = null;

/**
 * Resolves email sending config from Sanity's adminSettings (editable via
 * the admin panel's Email tab), falling back to environment variables.
 * Cached briefly so every outgoing email doesn't re-query Sanity.
 */
async function getEmailConfig(): Promise<EmailConfig> {
  if (cachedConfig && cachedConfig.expiresAt > Date.now()) return cachedConfig.value;

  let resendApiKey: string | undefined;
  let fromAddress: string | undefined;
  let contactRecipients: string | undefined;
  let registrationRecipients: string | undefined;

  if (isSanityConfigured) {
    const settings = await writeClient
      .fetch<{
        resendApiKey?: string;
        fromAddress?: string;
        contactRecipients?: string;
        registrationRecipients?: string;
      } | null>(
        `*[_type == "adminSettings"][0]{ resendApiKey, fromAddress, contactRecipients, registrationRecipients }`
      )
      .catch(() => null);
    resendApiKey = settings?.resendApiKey;
    fromAddress = settings?.fromAddress;
    contactRecipients = settings?.contactRecipients;
    registrationRecipients = settings?.registrationRecipients;
  }

  const splitRecipients = (value: string | undefined) =>
    (value || process.env.MMSPL_ADMIN_EMAIL || ADMIN_EMAIL)
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

  const value: EmailConfig = {
    apiKey: resendApiKey || process.env.RESEND_API_KEY,
    fromEmail: fromAddress || process.env.RESEND_FROM_EMAIL || "MMSPL <no-reply@mmspl.ca>",
    contactRecipients: splitRecipients(contactRecipients),
    registrationRecipients: splitRecipients(registrationRecipients),
  };
  cachedConfig = { value, expiresAt: Date.now() + 60_000 };
  return value;
}

export async function isResendConfigured(): Promise<boolean> {
  const config = await getEmailConfig();
  return Boolean(config.apiKey);
}

async function send(to: string | string[], subject: string, html: string) {
  const config = await getEmailConfig();
  if (!config.apiKey) {
    console.warn(`Resend API key not set — skipping email "${subject}" to`, to);
    return { skipped: true as const };
  }
  const resend = new Resend(config.apiKey);
  return resend.emails.send({ from: config.fromEmail, to, subject, html });
}

/** True if the send actually went out (not skipped, no error reported). */
export function wasEmailSent(result: Awaited<ReturnType<typeof send>>): boolean {
  if (!result) return false;
  if ("skipped" in result && result.skipped) return false;
  if ("error" in result && result.error) return false;
  return true;
}

const MAX_RECIPIENTS_PER_SEND = 45;

function chunk<T>(items: T[], size: number): T[][] {
  const batches: T[][] = [];
  for (let i = 0; i < items.length; i += size) batches.push(items.slice(i, i + size));
  return batches;
}

/**
 * Sends one email to a large recipient list, BCC'd and batched to stay
 * under Resend's per-request recipient cap (50 total across to/cc/bcc). A
 * single call with all subscribers crammed into `to` doesn't queue
 * anything — Resend rejects the whole request before it ever reaches the
 * send log, which is why "notify subscribers" news emails were silently
 * going nowhere once the subscriber list passed that cap (push notifications
 * were unaffected since those send one at a time per subscription, not as
 * one batched recipient list). BCC also keeps subscribers from seeing each
 * other's addresses.
 */
async function sendBulk(to: string[], subject: string, html: string) {
  if (to.length === 0) return { skipped: true as const };
  const config = await getEmailConfig();
  if (!config.apiKey) {
    console.warn(`Resend API key not set — skipping email "${subject}" to ${to.length} recipients`);
    return { skipped: true as const };
  }
  const resend = new Resend(config.apiKey);
  const batches = chunk(to, MAX_RECIPIENTS_PER_SEND);
  const results = await Promise.allSettled(
    batches.map((batch) => resend.emails.send({ from: config.fromEmail, to: config.fromEmail, bcc: batch, subject, html }))
  );

  let sent = 0;
  results.forEach((result, i) => {
    if (result.status === "fulfilled" && !result.value.error) {
      sent += batches[i].length;
    } else {
      console.error(
        `Bulk email batch ${i + 1}/${batches.length} failed for "${subject}":`,
        result.status === "fulfilled" ? result.value.error : result.reason
      );
    }
  });
  return { sent, total: to.length };
}

const MAX_EMAILS_PER_BATCH = 90;

/**
 * Sends a subscriber broadcast (news, cancellations, manual notify) as one
 * individual email per recipient via Resend's batch API — unlike sendBulk's
 * shared BCC'd copy, this lets each email carry that recipient's own
 * one-click unsubscribe link. Still batched (not one API call per person)
 * to stay well under Resend's per-request cap.
 */
async function sendToSubscribers(
  recipients: SubscriberRecipient[],
  subject: string,
  renderOptions: Omit<RenderEmailOptions, "unsubscribeUrl">
) {
  if (recipients.length === 0) return { skipped: true as const };
  const config = await getEmailConfig();
  if (!config.apiKey) {
    console.warn(`Resend API key not set — skipping email "${subject}" to ${recipients.length} subscribers`);
    return { skipped: true as const };
  }
  const resend = new Resend(config.apiKey);
  const batches = chunk(recipients, MAX_EMAILS_PER_BATCH);

  let sent = 0;
  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    const payload = batch.map((recipient) => ({
      from: config.fromEmail,
      // Resend's /emails/batch endpoint rejects a bare string here at
      // runtime ("Invalid `to` field") even though the SDK's shared type
      // (string | string[]) allows it for the single-send endpoint --
      // must be an array for batch sends specifically.
      to: [recipient.email],
      subject,
      html: renderEmail({
        ...renderOptions,
        unsubscribeUrl: recipient.unsubscribeToken
          ? `${SITE_URL}/api/unsubscribe?token=${recipient.unsubscribeToken}`
          : undefined,
      }),
    }));
    try {
      // Permissive validation means one bad address (a stray test entry, a
      // typo, a blocked domain like example.com) only drops that one email
      // instead of failing the whole batch — a single subscriber shouldn't
      // ever be able to silently block delivery to everyone else.
      const result = await resend.batch.send(payload, { batchValidation: "permissive" });
      if (result.error) {
        console.error(`Subscriber email batch ${i + 1}/${batches.length} failed entirely for "${subject}":`, result.error);
      } else {
        sent += result.data.data.length;
        if (result.data.errors.length > 0) {
          console.error(
            `Subscriber email batch ${i + 1}/${batches.length}: ${result.data.errors.length} of ${batch.length} rejected for "${subject}":`,
            result.data.errors.map((e) => `[${batch[e.index]?.email}] ${e.message}`)
          );
        }
      }
    } catch (err) {
      console.error(`Subscriber email batch ${i + 1}/${batches.length} threw for "${subject}":`, err);
    }
  }
  return { sent, total: recipients.length };
}

export async function sendRegistrationConfirmation(to: string, playerName: string) {
  const html = renderEmail({
    title: "You're Registered!",
    bodyHtml: `<p>Hi ${playerName},</p>
     <p>Thanks for registering with the Markham Men's Slo-Pitch League. We've received your application and our executive will follow up with next steps, including your Rookie Evaluation session if you're a new player.</p>
     <p>Questions in the meantime? Just reply to this email.</p>`,
    cta: { label: "Visit Website", url: SITE_URL },
  });
  return send(to, "MMSPL Registration Received", html);
}

/** Notifies the league's configured registration recipients that a new player signed up. */
export async function sendRegistrationAdminNotification(fields: { playerName: string; email: string; category: string }) {
  const config = await getEmailConfig();
  const html = renderEmail({
    title: "New Registration Received",
    bodyHtml: `<p><strong>Player:</strong> ${fields.playerName}</p>
     <p><strong>Email:</strong> ${fields.email}</p>
     <p><strong>Category:</strong> ${fields.category}</p>`,
    cta: { label: "View in Admin", url: `${SITE_URL}/admin/data` },
  });
  return send(config.registrationRecipients, `MMSPL Registration: ${fields.playerName}`, html);
}

interface CancelledGameSummary {
  homeTeam: string;
  awayTeam: string;
  date: string;
  time: string;
  field: string;
  status: string;
}

export async function sendGameCancellationAlert(to: SubscriberRecipient[], games: CancelledGameSummary[]) {
  if (to.length === 0 || games.length === 0) return { skipped: true as const };

  const single = games.length === 1;
  const rowsHtml = games
    .map((game) => {
      const verb = game.status === "postponed" ? "Postponed" : "Cancelled";
      const dateStr = new Date(game.date).toLocaleDateString("en-CA", {
        weekday: "long",
        month: "long",
        day: "numeric",
      });
      return `<p style="margin: 16px 0;">
        <span style="font-size:16px; font-weight:bold;">${game.homeTeam} vs ${game.awayTeam}</span><br/>
        <span style="color:#AA1111; font-weight:600;">${verb}</span> &middot; ${dateStr} at ${game.time} &middot; ${game.field}
      </p>`;
    })
    .join("");

  const title = single ? `Game ${games[0].status === "postponed" ? "Postponed" : "Cancelled"}` : "Games Cancelled";
  const subject = single
    ? `MMSPL: Game ${games[0].status === "postponed" ? "Postponed" : "Cancelled"} — ${games[0].homeTeam} vs ${games[0].awayTeam}`
    : `MMSPL: ${games.length} Games Cancelled`;

  return sendToSubscribers(to, subject, {
    title,
    bodyHtml: `<p>${single ? "The following game has been affected" : `${games.length} games have been affected`}:</p>${rowsHtml}`,
    cta: { label: "View Schedule", url: `${SITE_URL}/schedule` },
  });
}

export async function sendNewsAnnouncement(to: SubscriberRecipient[], title: string, slug: string) {
  if (to.length === 0) return { skipped: true as const };
  const url = `${SITE_URL}/news/${slug}`;
  return sendToSubscribers(to, `MMSPL News: ${title}`, {
    title: "New Announcement",
    bodyHtml: `<p style="font-size:16px; font-weight:bold;">${title}</p>`,
    cta: { label: "Read Full Story", url },
  });
}

export async function sendSubscriptionWelcome(to: string, unsubscribeToken?: string) {
  const html = renderEmail({
    title: "You're Subscribed!",
    bodyHtml: `<p>Thanks for signing up for MMSPL email notifications.</p>
     <p>You'll hear from us when a game gets cancelled or postponed, and when we post league news and announcements — nothing more.</p>
     <p>You can unsubscribe at any time using the link at the bottom of any of our emails.</p>`,
    cta: { label: "Visit Website", url: SITE_URL },
    unsubscribeUrl: unsubscribeToken ? `${SITE_URL}/api/unsubscribe?token=${unsubscribeToken}` : undefined,
  });
  return send(to, "Welcome to MMSPL Notifications", html);
}

export async function sendContactNotification(fields: { name: string; email: string; subject?: string; message: string }) {
  const config = await getEmailConfig();
  const html = renderEmail({
    title: "New Contact Form Submission",
    bodyHtml: `<p><strong>From:</strong> ${fields.name} (${fields.email})</p>
     ${fields.subject ? `<p><strong>Subject:</strong> ${fields.subject}</p>` : ""}
     <p>${fields.message.replace(/\n/g, "<br/>")}</p>`,
  });
  return send(config.contactRecipients, `MMSPL Contact Form: ${fields.subject || fields.name}`, html);
}

/** Auto-reply sent to whoever submitted the contact form, confirming receipt. */
export async function sendContactConfirmation(to: string, name: string) {
  const html = renderEmail({
    title: "We Got Your Message",
    bodyHtml: `<p>Hi ${name},</p>
     <p>Thanks for reaching out to the Markham Men's Slo-Pitch League. We've received your message and someone from our executive will get back to you soon.</p>
     <p>In the meantime, feel free to have a look around the site.</p>`,
    cta: { label: "Visit Website", url: SITE_URL },
  });
  return send(to, "We Received Your Message — MMSPL", html);
}

export async function sendCustomNotificationEmail(to: string[], subject: string, message: string) {
  if (to.length === 0) return { skipped: true as const };
  const html = renderEmail({ title: subject, bodyHtml: `<p>${message.replace(/\n/g, "<br/>")}</p>` });
  return sendBulk(to, `MMSPL: ${subject}`, html);
}

export async function sendBroadcastEmail(to: SubscriberRecipient[], subject: string, message: string) {
  if (to.length === 0) return { skipped: true as const };
  return sendToSubscribers(to, `MMSPL: ${subject}`, {
    title: subject,
    bodyHtml: `<p>${message.replace(/\n/g, "<br/>")}</p>`,
  });
}

export async function sendAdminPasswordReset(to: string, name: string, tempPassword: string) {
  const html = renderEmail({
    title: "Admin Password Reset",
    bodyHtml: `<p>Hi ${name},</p>
     <p>A temporary password was generated for your MMSPL admin account. It expires in 24 hours and must be changed the next time you sign in.</p>
     <p style="font-size:18px; font-weight:bold; font-family:monospace; letter-spacing:1px; background:#f5f5f5; padding:12px 16px; border-radius:6px; display:inline-block;">${tempPassword}</p>
     <p>If you didn't request this, contact another superadmin right away.</p>`,
    cta: { label: "Sign In", url: `${SITE_URL}/admin/login` },
  });
  return send(to, "MMSPL Admin: Temporary Password", html);
}

export async function sendTestEmail(to: string) {
  const html = renderEmail({
    title: "Test Email",
    bodyHtml: `<p>This is a test email from the MMSPL admin panel's Email settings tab. If you're reading this, your Resend configuration works.</p>`,
  });
  return send(to, "MMSPL Admin: Test Email", html);
}

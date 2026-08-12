import { Resend } from "resend";
import { writeClient } from "./sanity/client";
import { isSanityConfigured } from "./sanity/env";
import { renderEmail, SITE_URL } from "./emailTemplate";

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

export async function sendGameCancellationAlert(to: string[], games: CancelledGameSummary[]) {
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

  const html = renderEmail({
    title,
    bodyHtml: `<p>${single ? "The following game has been affected" : `${games.length} games have been affected`}:</p>${rowsHtml}`,
    cta: { label: "View Schedule", url: `${SITE_URL}/schedule` },
  });
  return send(to, subject, html);
}

export async function sendNewsAnnouncement(to: string[], title: string, slug: string) {
  if (to.length === 0) return { skipped: true as const };
  const url = `${SITE_URL}/news/${slug}`;
  const html = renderEmail({
    title: "New Announcement",
    bodyHtml: `<p style="font-size:16px; font-weight:bold;">${title}</p>`,
    cta: { label: "Read Full Story", url },
  });
  return send(to, `MMSPL News: ${title}`, html);
}

export async function sendSubscriptionWelcome(to: string) {
  const html = renderEmail({
    title: "You're Subscribed!",
    bodyHtml: `<p>Thanks for signing up for MMSPL email notifications.</p>
     <p>You'll hear from us when a game gets cancelled or postponed, and when we post league news and announcements — nothing more.</p>
     <p>You can unsubscribe at any time by replying to one of these emails.</p>`,
    cta: { label: "Visit Website", url: SITE_URL },
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
  return send(to, `MMSPL: ${subject}`, html);
}

export async function sendBroadcastEmail(to: string[], subject: string, message: string) {
  if (to.length === 0) return { skipped: true as const };
  const config = await getEmailConfig();
  if (!config.apiKey) {
    console.warn(`Resend API key not set — skipping broadcast email "${subject}"`);
    return { skipped: true as const };
  }
  const html = renderEmail({ title: subject, bodyHtml: `<p>${message.replace(/\n/g, "<br/>")}</p>` });
  const resend = new Resend(config.apiKey);
  return resend.emails.send({ from: config.fromEmail, to: config.fromEmail, bcc: to, subject: `MMSPL: ${subject}`, html });
}

export async function sendTestEmail(to: string) {
  const html = renderEmail({
    title: "Test Email",
    bodyHtml: `<p>This is a test email from the MMSPL admin panel's Email settings tab. If you're reading this, your Resend configuration works.</p>`,
  });
  return send(to, "MMSPL Admin: Test Email", html);
}

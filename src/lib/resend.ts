import { Resend } from "resend";

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || "MMSPL <no-reply@mmspl.ca>";
export const ADMIN_EMAIL = process.env.MMSPL_ADMIN_EMAIL || "info@mmspl.ca";

let resendClient: Resend | null = null;

function getResend(): Resend | null {
  if (!process.env.RESEND_API_KEY) return null;
  if (!resendClient) resendClient = new Resend(process.env.RESEND_API_KEY);
  return resendClient;
}

export const isResendConfigured = Boolean(process.env.RESEND_API_KEY);

async function send(to: string | string[], subject: string, html: string) {
  const resend = getResend();
  if (!resend) {
    console.warn(`RESEND_API_KEY not set — skipping email "${subject}" to`, to);
    return { skipped: true };
  }
  return resend.emails.send({ from: FROM_EMAIL, to, subject, html });
}

function wrapEmail(title: string, bodyHtml: string) {
  return `
  <div style="font-family: Arial, Helvetica, sans-serif; max-width: 560px; margin: 0 auto; color: #171717;">
    <div style="background:#000; padding: 24px; text-align:center;">
      <span style="color:#fff; font-size: 20px; font-weight: bold; letter-spacing: 0.05em;">MMSPL</span>
    </div>
    <div style="padding: 24px; border: 1px solid #eee; border-top: none;">
      <h1 style="font-size: 20px; color:#AA1111; margin-top:0;">${title}</h1>
      ${bodyHtml}
      <p style="margin-top:32px; font-size: 12px; color:#888;">
        Markham Men's Slo-Pitch League &middot; 6579 Highway 7, PO Box 77073, Markham, ON, L3P 0C8
      </p>
    </div>
  </div>`;
}

export async function sendRegistrationConfirmation(to: string, playerName: string) {
  const html = wrapEmail(
    "You're Registered!",
    `<p>Hi ${playerName},</p>
     <p>Thanks for registering with the Markham Men's Slo-Pitch League. We've received your application and our executive will follow up with next steps, including your Rookie Evaluation session if you're a new player.</p>
     <p>Questions in the meantime? Just reply to this email.</p>`
  );
  return send(to, "MMSPL Registration Received", html);
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
  if (to.length === 0 || games.length === 0) return { skipped: true };

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

  const html = wrapEmail(
    title,
    `<p>${single ? "The following game has been affected" : `${games.length} games have been affected`}:</p>${rowsHtml}`
  );
  return send(to, subject, html);
}

export async function sendNewsAnnouncement(to: string[], title: string, slug: string) {
  if (to.length === 0) return { skipped: true };
  const url = `https://mmspl.ca/news/${slug}`;
  const html = wrapEmail(
    "New Announcement",
    `<p style="font-size:16px; font-weight:bold;">${title}</p>
     <p><a href="${url}" style="color:#AA1111;">Read the full story &rarr;</a></p>`
  );
  return send(to, `MMSPL News: ${title}`, html);
}

export async function sendSubscriptionWelcome(to: string) {
  const html = wrapEmail(
    "You're Subscribed!",
    `<p>Thanks for signing up for MMSPL email notifications.</p>
     <p>You'll hear from us when a game gets cancelled or postponed, and when we post league news and announcements — nothing more.</p>
     <p>You can unsubscribe at any time by replying to one of these emails.</p>`
  );
  return send(to, "Welcome to MMSPL Notifications", html);
}

export async function sendContactNotification(fields: { name: string; email: string; message: string }) {
  const html = wrapEmail(
    "New Contact Form Submission",
    `<p><strong>From:</strong> ${fields.name} (${fields.email})</p>
     <p>${fields.message.replace(/\n/g, "<br/>")}</p>`
  );
  return send(ADMIN_EMAIL, `MMSPL Contact Form: ${fields.name}`, html);
}

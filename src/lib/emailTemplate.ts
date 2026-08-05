/**
 * Shared branded HTML wrapper for every email the site sends via Resend.
 * Email-safe by design: inline styles only, no external CSS, system/Arial
 * fonts, fluid (not fixed-table) widths so it degrades gracefully in
 * clients that ignore the <style> media query.
 */

export const SITE_URL = "https://mmspl-website-2026.vercel.app";
export const LOGO_URL = `${SITE_URL}/mmspl-logo.png`;
export const BRAND_RED = "#AA1111";

export interface EmailCTA {
  label: string;
  url: string;
}

export interface RenderEmailOptions {
  title: string;
  /** Pre-built inner HTML for the body — the caller controls the copy. */
  bodyHtml: string;
  cta?: EmailCTA;
}

export function renderEmail({ title, bodyHtml, cta }: RenderEmailOptions): string {
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title}</title>
    <style>
      @media (max-width: 480px) {
        .mmspl-container { width: 100% !important; }
        .mmspl-pad { padding-left: 20px !important; padding-right: 20px !important; }
      }
    </style>
  </head>
  <body style="margin:0; padding:0; background:#f4f4f4; font-family: Arial, Helvetica, sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4; padding: 24px 0;">
      <tr>
        <td align="center">
          <table role="presentation" class="mmspl-container" width="560" cellpadding="0" cellspacing="0" style="width:560px; max-width:100%; background:#ffffff; border: 1px solid #eee;">
            <!-- Header -->
            <tr>
              <td class="mmspl-pad" align="center" style="background:#000000; padding: 28px 24px 20px;">
                <img src="${LOGO_URL}" alt="MMSPL" width="120" height="69" style="display:block; margin:0 auto 10px; border:0; outline:none; text-decoration:none; max-width:120px; height:auto;" />
                <p style="margin:0; color:#ffffff; font-size:11px; letter-spacing:0.06em; text-transform:uppercase; opacity:0.7;">
                  Markham Men&rsquo;s Slo-Pitch League &middot; Est. 1968
                </p>
              </td>
            </tr>
            <!-- Red divider -->
            <tr>
              <td style="background:${BRAND_RED}; height:4px; line-height:4px; font-size:0;">&nbsp;</td>
            </tr>
            <!-- Body -->
            <tr>
              <td class="mmspl-pad" style="padding: 28px 32px; background:#ffffff;">
                <h1 style="font-size:20px; color:${BRAND_RED}; margin:0 0 16px;">${title}</h1>
                <div style="font-size:15px; line-height:1.6; color:#222222;">
                  ${bodyHtml}
                </div>
                ${
                  cta
                    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:24px;">
                        <tr>
                          <td align="center" style="border-radius:4px; background:${BRAND_RED};">
                            <a href="${cta.url}" style="display:inline-block; padding:12px 28px; font-size:14px; font-weight:bold; color:#ffffff; text-decoration:none; border-radius:4px;">
                              ${cta.label}
                            </a>
                          </td>
                        </tr>
                      </table>`
                    : ""
                }
              </td>
            </tr>
            <!-- Footer -->
            <tr>
              <td class="mmspl-pad" align="center" style="background:#000000; padding: 24px;">
                <p style="margin:0 0 10px; font-size:12px;">
                  <a href="https://www.facebook.com/markhammmspl" style="color:#ffffff; text-decoration:none; margin:0 8px;">Facebook</a>
                  <span style="color:#555555;">&middot;</span>
                  <a href="https://www.youtube.com/@MarkhamMMSPL" style="color:#ffffff; text-decoration:none; margin:0 8px;">YouTube</a>
                  <span style="color:#555555;">&middot;</span>
                  <a href="https://www.instagram.com/markham_mens_slopitch/" style="color:#ffffff; text-decoration:none; margin:0 8px;">Instagram</a>
                </p>
                <p style="margin:0 0 6px; font-size:11px; color:#888888;">
                  &copy; 2026 Markham Men&rsquo;s Slo-Pitch League &middot; info@mmspl.ca, admin@mmspl.ca
                </p>
                <p style="margin:0; font-size:11px; color:#666666;">
                  <a href="${SITE_URL}/notifications" style="color:#999999;">Manage your notification preferences</a>
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

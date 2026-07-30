# MMSPL — Markham Men's Slo-Pitch League

Next.js 14 (App Router) + Tailwind CSS + Sanity CMS site for MMSPL, established 1968.
All content (news, games, standings, awards, dates, gallery photos, site settings) is
managed by a non-technical admin through Sanity Studio at `/studio` — no code changes
needed for day-to-day updates.

## Stack

- **Next.js 14** App Router, TypeScript, Server Components
- **Tailwind CSS** — brand colour `#AA1111`, Inter (body) + Anton (headings)
- **Sanity CMS** (Studio v3, embedded at `/studio`)
- **Resend** for transactional/announcement email
- **Vercel** deploy target

## 1. Local setup

```bash
npm install
cp .env.local.example .env.local
```

### Create a Sanity project

```bash
npx sanity@latest init
```

Choose "Create new project," pick a dataset name (`production` is fine), and **don't**
let it overwrite the schema files in `src/sanity/schemaTypes` — this repo already has
them. Copy the project ID it prints into `.env.local`:

```
NEXT_PUBLIC_SANITY_PROJECT_ID=xxxxxxxx
NEXT_PUBLIC_SANITY_DATASET=production
```

### Create an API token (for write access)

Sanity manage console → your project → API → Tokens → Add API token → **Editor**
permission. Put it in `.env.local` as `SANITY_API_TOKEN`. This is what lets the
Register/Subscribe forms and the webhook handler write to your dataset.

### Resend (email)

Sign up at resend.com, verify a sending domain, create an API key, and set:

```
RESEND_API_KEY=re_xxxxx
RESEND_FROM_EMAIL="MMSPL <no-reply@yourdomain.com>"
MMSPL_ADMIN_EMAIL=you@yourdomain.com
```

Without `RESEND_API_KEY` set, the app still runs — emails are just skipped with a
console warning, so local dev doesn't require a Resend account.

### Web Push (browser push notifications)

Generate a VAPID key pair and set them:

```bash
npx web-push generate-vapid-keys
```

```
NEXT_PUBLIC_VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
VAPID_SUBJECT="mailto:you@yourdomain.com"
```

`.env.local` already has a working dev key pair checked in so push works out of the
box locally — generate a fresh pair for production and keep `VAPID_PRIVATE_KEY` secret.
Without these set, the "Enable Push Notifications" button on `/notifications` shows a
config error instead of crashing.

### Run it

```bash
npm run dev
```

- Site: http://localhost:3000
- Studio: http://localhost:3000/studio

Until you add real documents in Studio, every page renders realistic **seed content**
(the real league history, ballparks, important dates, and sample teams/standings/games)
so the site never looks empty. As soon as you add real `season`/`team`/`game`/etc.
documents in Studio, live data takes over automatically.

## 2. Content model (Sanity schemas)

All schemas live in `src/sanity/schemaTypes/`:

| Schema | Purpose |
|---|---|
| `season` | Year, active flag, regular season dates, playoff cutoff (# of teams) |
| `team` | Name, logo, division |
| `game` | Date/time/field, home/away team refs, score, status, cancellation-alert toggle |
| `standing` | Per-season, per-team W/L/T + run differential |
| `news` | Title, slug, rich-text body, photo, date, tag, "notify subscribers" toggle |
| `award` | Year, category, winner, team, photo, description |
| `importantDate` | Label, date (+ optional end date), description |
| `galleryPhoto` | Image (required alt text), caption, date |
| `subscriber` | Email, name, subscribed date (populated by the register/subscribe/notifications forms) |
| `pushSubscription` | Browser push endpoint + keys (populated by `/notifications` → Enable Push) |
| `adminSettings` | Singleton: hero image (+ one per page), sponsor CTA text, registration open/fee |

### Running a new season (2027, 2028, …)

1. Studio → Seasons → **Create** → set `year`, `playoffCutoff`, leave `isActive` off for now.
2. Add `team` documents if the roster of teams changed.
3. Add `game` documents referencing the new season (repeat per game, or ask your admin
   to bulk-import via the Sanity CLI / a spreadsheet-to-NDJSON script).
4. Add `standing` documents referencing the new season (one per team, updated weekly).
5. Once ready to go live, open the old season and switch `isActive` **off**, then switch
   the new season's `isActive` **on** — Home/Standings/Schedule default to whichever
   season has `isActive = true`, but the season selector on Standings/Schedule always
   lets visitors browse any past season.

### Registration on/off

Studio → Site Settings → `registrationOpen`. Toggling this off immediately closes the
Register page's form site-wide, no deploy needed.

## 3. Email notifications (Resend)

Three flows, all in `src/lib/resend.ts`:

- **Registration confirmation** — sent synchronously from `POST /api/register` the
  moment someone submits the Register form.
- **Contact form** — `POST /api/contact` emails `MMSPL_ADMIN_EMAIL`.
- **Game cancellation / news announcement** — these are triggered by a **Sanity
  webhook** hitting `POST /api/webhooks/sanity`, so an admin editing content in Studio
  is what fires the email, not a code deploy.

### Wiring the Sanity webhook

Sanity manage console → your project → API → Webhooks → Create webhook:

- **URL:** `https://<your-vercel-domain>/api/webhooks/sanity`
- **Dataset:** production
- **Trigger on:** Create, Update
- **Filter:** `_type == "game" || _type == "news"`
- **Projection:**
  ```groq
  {
    _type,
    _id,
    status,
    notifyOnCancellation,
    date,
    time,
    field,
    "homeTeamName": homeTeam->name,
    "awayTeamName": awayTeam->name,
    title,
    slug,
    notifySubscribers
  }
  ```
- **Secret:** any random string — put the same value in `SANITY_WEBHOOK_SECRET`

With this in place: checking "Email subscribers on cancellation" on a `game` document
and setting its status to Cancelled/Postponed emails every `subscriber`; checking
"Email subscribers when published" on a `news` document does the same for that story.
Both cases also push a browser notification to every `pushSubscription` (see below) —
`src/lib/push.ts` handles that side and no-ops quietly if VAPID keys aren't set.

### Browser push notifications

Visitors opt in at `/notifications` → **Enable Push Notifications**. That flow:
registers `public/sw.js` as a service worker, requests browser permission, subscribes
via the Push API, then POSTs the subscription to `/api/push/subscribe`, which stores it
as a `pushSubscription` document. The same game-cancellation/news-announcement webhook
above then fans a push out to every stored subscription via `web-push`
(`src/lib/push.ts`). No separate webhook config needed — it rides the same one.

## 4. Admin score entry (`/admin`)

A mobile-optimized, password-gated tool for entering scores during game nights, at
`/admin` (login at `/admin/login`).

### Setup

```
ADMIN_PASSWORD=whatever-you-want
```

That's the only requirement — login POSTs to `/api/admin/login`, which sets an
httpOnly cookie holding an HMAC of today's date signed with `ADMIN_PASSWORD`. There's
no session store: the token only verifies on the day it was issued, so it naturally
expires at midnight UTC without a database or a manual "log out everyone" switch. Every
`/api/admin/*` route re-checks this cookie independently (not just the `/admin` page),
so the API can't be hit directly without a valid session.

### How it works

- The date picker's arrows jump between dates that actually have games in the **active
  season** (`season.isActive == true`) — not just ±1 calendar day. The date input still
  lets you jump anywhere.
- Score `+`/`−` and the status toggle (Scheduled/Live/Final/Forfeit) only edit local
  draft state — nothing hits Sanity until **Save Score**. Cards with unsaved edits get
  an amber ring so you can see what still needs saving at a glance.
- **Save Score** patches the `game` document, recalculates standings for that game's
  season (`src/lib/standings.ts`, from `final` games only), and refreshes the standings
  panel — all in one round trip. Every save shows a toast with a 30-second **Undo**,
  which re-saves the pre-save values (itself triggering a fresh recalculation).
- **Cancelled (Rain-Out)** is a separate action from the status toggle — it always sets
  the score to 1-1 and status to `cancelled`, and requires a confirmation dialog because
  it immediately emails and push-notifies every subscriber
  (`POST /api/admin/games/cancel`, same `sendGameCancellationAlert` /
  `sendPushToAll` helpers the Studio webhook uses, just called directly instead of via
  webhook since these saves don't go through Studio). **Mark All Remaining as
  Cancelled** does the same for every non-final game on the visible date in one batched
  email/push instead of spamming one per game.
- **Sync Standings** forces a full recalculation for the active season from scratch —
  useful after bulk edits in Studio that didn't go through this page.

## 5. Images

Every content image (hero, news photos, award photos, gallery, team logos) goes through
Sanity's asset pipeline — uploaded in Studio, served via `cdn.sanity.io`, resized with
`@sanity/image-url` (`src/lib/sanity/image.ts`). The only non-Sanity image in the repo
is `public/mmspl-logo.png`, the league's own brand mark, self-hosted so the site has no
runtime dependency on `mmspl.ca`.

## 6. Deploying to Vercel

```bash
npm i -g vercel   # or use the Vercel dashboard
vercel
```

Or via the dashboard: **New Project → Import this repo**. Framework preset auto-detects
Next.js. Add every variable from `.env.local.example` under **Settings → Environment
Variables** (Production + Preview). Then redeploy.

After the first deploy, update the Sanity webhook URL (above) to point at your real
Vercel domain, and add that domain under Sanity manage console → API → CORS Origins
(with credentials) so `/studio` can talk to your dataset from production.

## 7. Project structure

```
src/
  app/                  routes (App Router)
    (site)/              home, standings, schedule, awards, register, about, contact,
                         notifications, news/[slug] — wrapped in the public Header/Footer
    admin/               /admin (score entry) + /admin/login — no site chrome, dark theme
    studio/[[...tool]]/ embedded Sanity Studio — no site chrome either
    api/
      admin/             login, logout, dates, games, games/save, games/cancel,
                         standings, standings/sync — all cookie-auth guarded
      register, subscribe, contact, push/subscribe, webhooks/sanity
  components/
    admin/               AdminDashboard, GameEntryCard, ScoreStepper, StatusToggle,
                         DateNav, ConfirmDialog, ToastStack, AdminStandingsPanel, LoginForm
    (site)               Header, Hero, GameRail, StandingsTable, forms, …
  lib/
    sanity/             client, image builder, GROQ queries, env
    resend.ts           email sending + templates
    push.ts             web-push sending helper
    standings.ts         recalculateStandings(seasonId) — shared by admin save/cancel/sync
    admin-auth.ts         session token + Server Component / Route Handler guards
    types.ts            shared content types
    seed-content.ts      seed-data.ts   real + sample fallback content
  sanity/
    schemaTypes/        the 11 document schemas
    structure.ts         custom Studio desk structure (Settings as a singleton)
sanity.config.ts        Studio config (schema + plugins)
public/sw.js            service worker for browser push notifications
```

## 8. Accessibility & responsiveness

- Semantic landmarks (`header`, `nav`, `main`, `footer`, `address`), skip-to-content
  link, `aria-current` on active nav links, `aria-pressed` on filter/toggle buttons.
- All content images require alt text in their schema; decorative images are marked
  `aria-hidden`.
- Tables (`Standings`, `Schedule`) use proper `<caption>`/`<th scope>` markup.
- Mobile-first layout throughout (`sm:`/`lg:` breakpoints), hamburger nav under
  `lg`, horizontally-scrollable game rail with `role="region"` + `tabIndex` for
  keyboard users.

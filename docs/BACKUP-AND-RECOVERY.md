# Backup & Disaster Recovery Guide

This document explains, in plain language, how the MMSPL website is backed up and
exactly what to do if something goes wrong — from "I accidentally deleted one game
score" up to "my laptop died and I need to rebuild everything from scratch." It's
written for someone comfortable using Terminal and following step-by-step
instructions, but who isn't a professional developer.

**If you only read one section, read [Part 4 — Recovery Playbook](#part-4--recovery-playbook).**
It has copy-paste steps for the situations you're actually likely to hit.

---

## Part 0 — The three things that make up "the website"

It helps to think of the site as three separate pieces, because each one is backed
up differently:

| Piece | What it is | Where it lives | How it's backed up |
|---|---|---|---|
| **Code** | Every page, button, and feature — the actual programming | GitHub | Automatic, every time a change is pushed |
| **Content / Data** | Games, scores, standings, news, teams, tournament results, registrations, photos | Sanity (a cloud content database) | `scripts/backup-sanity.sh` — you run this whenever you want a snapshot |
| **Secrets** | Passwords/keys that let the code talk to Sanity, send email, etc. | `.env.local` (your computer) + Vercel's dashboard | Not "backed up" as a file — recoverable from Vercel, see [Part 3](#part-3--secrets--configuration) |

Losing your laptop is recoverable in under an hour, because none of these three
things live *only* on your laptop. The real risk isn't hardware — it's losing
access to the **accounts** (GitHub, Vercel, Sanity) that hold all of this. See
[Part 5](#part-5--accounts-you-must-not-lose-access-to).

---

## Part 1 — The Code

Every change made to the website (by a developer, or by Claude Code) ends up as a
**commit** pushed to GitHub, at `github.com/mmspl2026/mmspl-website-2026`. GitHub
keeps the **entire history** of the project forever — every version of every file
that's ever existed, not just the latest one.

**This means the code is already fully backed up, automatically, with zero effort.**
There's nothing to run, nothing to remember.

### How to check the code is safe

```bash
cd ~/Desktop/mmspl-website
git status
```

If it says `nothing to commit, working tree clean` and doesn't mention being
"ahead" of `origin/master`, everything on your laptop matches what's saved on
GitHub. If it says "ahead," someone made changes locally that haven't been pushed
yet — run `git push` to save them.

### Recovering the code on a brand-new computer

```bash
git clone https://github.com/mmspl2026/mmspl-website-2026.git
cd mmspl-website-2026
npm install
```

That's the entire code side of a full rebuild. (You'll still need the secrets from
[Part 3](#part-3--secrets--configuration) to actually run it.)

### Undoing a bad code change

Every deploy is tied to a specific commit, and Vercel keeps every past deployment
live and reachable. If a change breaks the site:

1. Go to [vercel.com](https://vercel.com) → the project → **Deployments**.
2. Find the last deployment that was working (by date/time).
3. Click the **⋯** menu on it → **Promote to Production**.

The live site is back to the working version in seconds — no code changes needed.
(You can sort out what went wrong afterward, with no time pressure.)

---

## Part 2 — The Content / Data (Sanity)

This is the part that actually changes day-to-day: scores, standings, news posts,
tournament results, team info, registrations, photos — everything a league admin
enters through `/studio` or `/admin`. It lives in Sanity's cloud, not on anyone's
computer, and **it is not automatically backed up anywhere else** — this is the
one piece that needs you to actively take a snapshot.

### Running a backup

```bash
cd ~/Desktop/mmspl-website
./scripts/backup-sanity.sh
```

This downloads a complete copy of **every document and every image** — games,
teams, standings, news, tournament brackets, registrations, gallery photos, hero
images, everything — into one file, saved to `~/Desktop/mmspl-backups/` by
default, named with the date and time (e.g.
`mmspl-backup-2026-09-18_103201.tar.gz`).

It's **read-only** against Sanity — running it can never change or delete
anything live. Safe to run as often as you like.

### How often should you run it?

- **Before anything risky**: resetting/regenerating a tournament, rolling over to
  a new season, bulk-editing data, or asking Claude Code to make a large data
  change.
- **Periodically during the season** — weekly is a reasonable default once games
  are being played regularly, since that's when the most new data is being added.
- **After the season ends**, as a final snapshot of the completed year.

There's no harm in having lots of backup files sitting in
`~/Desktop/mmspl-backups/` — each one is small (roughly 25–30 MB) and they don't
need to be deleted. If you want to tidy up occasionally, keeping the most recent
few and one from the end of each season is plenty.

### Keeping backups safe off your laptop too

The `mmspl-backups` folder lives only on your computer by default. For real
disaster-proofing (e.g. your laptop is lost, stolen, or destroyed), copy that
folder somewhere off-machine every so often — the simplest options:

- Drag the `mmspl-backups` folder into **iCloud Drive**, **Dropbox**, or **Google
  Drive** (if you already have one syncing on your Mac).
- Email yourself the latest backup file occasionally.

This is optional but recommended — it's the difference between "recover in
5 minutes" and "recover in 5 minutes, even if my laptop is at the bottom of a
lake."

### Sanity's own safety net (good for small mistakes, not a replacement for backups)

Every document in Sanity Studio has a **History** panel (the clock icon, top
right, when viewing a document) that lets you see and restore *that specific
document's* past versions. This is the fastest fix for "I fat-fingered one score"
or "I accidentally deleted one team" — no need to touch backups at all for that.

Two important limits:
- It only helps if you catch the mistake within Sanity's history retention window
  for your plan (check **manage.sanity.io → your project → Settings** for the
  current limit) — it is *not* forever.
- It only recovers **one document at a time**. For anything bigger (accidentally
  deleted a whole season's worth of games, a corrupted bulk edit, etc.), you need
  an actual backup file — see the restore procedure below.

---

## Part 3 — Secrets & Configuration

The file `.env.local` (in the project root, never committed to GitHub on purpose)
holds the passwords and API keys that let the website function: the Sanity write
token, the admin login password, email sending keys, push notification keys.

**These are not "backed up" as a file anywhere** — that's intentional, so they can
never leak through GitHub. Instead, every value that matters for production is
also stored in **Vercel's dashboard** (Project → Settings → Environment
Variables), which is what the *live* site actually uses. As long as you (or a
teammate) can log into Vercel, every secret is recoverable from there — click a
variable to reveal its value.

### The one exception worth knowing about

If `VAPID_PRIVATE_KEY` / `NEXT_PUBLIC_VAPID_PUBLIC_KEY` (the browser push
notification keys) are ever truly lost — not in Vercel, not in any `.env.local`
anywhere — the only fix is generating a **new** pair with
`npx web-push generate-vapid-keys`. That works fine going forward, but it quietly
un-subscribes everyone who'd previously turned on push notifications — they'd need
to click "Enable Push Notifications" again. Not a disaster, just worth knowing
so it doesn't seem like a bigger bug than it is.

Every other secret (`SANITY_API_TOKEN`, `ADMIN_PASSWORD`, `RESEND_API_KEY`, etc.)
can be freely regenerated from its own source (Sanity's manage console, your own
choice of password, Resend's dashboard) with no side effects beyond updating the
new value in `.env.local` and Vercel.

---

## Part 4 — Recovery Playbook

Concrete steps for the situations you're actually likely to run into.

### "I accidentally deleted or broke one thing in Sanity Studio"

Use Sanity's built-in **History** panel first — open the document in Studio,
click the clock icon, and restore an earlier version. This is faster and safer
than touching a backup file, and works for a single game, team, news post, etc.

### "A deploy broke the live site"

No restore needed — see [Undoing a bad code change](#undoing-a-bad-code-change)
above. Promote the last working deployment in Vercel. Takes under a minute.

### "I need to set up the whole project on a new computer"

1. Install [Node.js](https://nodejs.org) (LTS version) if it's not already on the
   new machine.
2. Clone the code:
   ```bash
   git clone https://github.com/mmspl2026/mmspl-website-2026.git
   cd mmspl-website-2026
   npm install
   ```
3. Log into [vercel.com](https://vercel.com) → the project → **Settings →
   Environment Variables**, and copy every value into a new `.env.local` file in
   the project root (same names, same values).
4. `npm run dev` to confirm it runs locally at `localhost:3000`.

No Sanity restore needed for this scenario — the live data is still safely
sitting in Sanity's cloud regardless of what computer you're on.

### "A significant amount of real data was lost, corrupted, or needs to be rolled back" (full restore)

This is the scenario the backup script exists for. Two ways to do it, depending
on how much confidence you want before touching the live site:

**Option A — restore straight into the live site (fast, higher-stakes)**

This overwrites every document in the backup file with its backed-up version,
including anything that currently exists with the same ID. Anything created or
changed *after* that backup was taken and *not* also in a newer backup will not
be affected, but anything that existed at backup time reverts to that state.

```bash
cd ~/Desktop/mmspl-website
set -a; source .env.local; set +a
export SANITY_AUTH_TOKEN="$SANITY_API_TOKEN"
npx sanity dataset import ~/Desktop/mmspl-backups/mmspl-backup-YYYY-MM-DD_HHMMSS.tar.gz production --replace
```

(Replace the filename with whichever backup you're restoring from.)

**Option B — restore into a throwaway copy first, check it, then decide (safer)**

Recommended if you're not in a rush and want to see exactly what a restore would
look like before touching the real site:

1. Log into [manage.sanity.io](https://manage.sanity.io) → your project →
   **Datasets** → **Add dataset**. Name it something like `restore-check` and
   make it **private**. (Creating a new dataset needs your real Sanity login —
   the project's API token deliberately can't do this on its own, which is a
   safety feature, not a bug.)
2. Import the backup into that new dataset instead of `production`:
   ```bash
   cd ~/Desktop/mmspl-website
   set -a; source .env.local; set +a
   export SANITY_AUTH_TOKEN="$SANITY_API_TOKEN"
   npx sanity dataset import ~/Desktop/mmspl-backups/mmspl-backup-YYYY-MM-DD_HHMMSS.tar.gz restore-check
   ```
3. Browse `restore-check` in Sanity's Vision tool or Studio to confirm it looks
   right.
4. Once you're confident, run the same import again targeting `production`
   with `--replace` (Option A above), then delete the `restore-check` dataset
   from the Sanity dashboard — it was only for checking.

### "I lost access to my Sanity, Vercel, or GitHub account"

This is the actual worst-case scenario — worse than any hardware loss, since
these accounts *are* where everything lives. See
[Part 5](#part-5--accounts-you-must-not-lose-access-to) for how to prevent this
ahead of time. If it's already happened, each platform has an account-recovery
flow tied to your login email — start there, and use each platform's support if
that doesn't work.

---

## Part 5 — Accounts you must not lose access to

The website's real infrastructure is four SaaS accounts, not files on a laptop.
Losing password + two-factor access to any of these, with no one else able to get
in, is the actual disaster scenario:

| Account | What it controls |
|---|---|
| **GitHub** (`mmspl2026` org/user) | The code and its entire history |
| **Vercel** | The live site itself, and every secret/environment variable |
| **Sanity** (manage.sanity.io) | All content/data, and who else can access it |
| **Domain registrar** | Where `mmspl.ca` / `new.mmspl.ca` points on the internet |

Recommended, one-time housekeeping:

- Use a **password manager** for all four, with two-factor authentication turned
  on where available.
- Add at least one other trusted league exec as an **owner or admin** on GitHub,
  Vercel, and Sanity — not just yourself. A single-person point of failure on
  volunteer-run infrastructure is the single biggest realistic risk to this whole
  setup, well above anything a backup file protects against.

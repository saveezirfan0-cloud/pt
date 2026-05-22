# Luna — Period Tracker PWA

A privacy-first period and cycle tracking PWA with partner sharing. Built with Next.js 14 (App Router), Supabase, and Tailwind. Deploy-ready for Vercel.

## Features

- **Cycle tracking** — Log periods (flow, start day), symptoms, mood, energy, sleep, free-form notes.
- **Predictions** — Cycle-length and period-length averages computed from your last 6 cycles, with ovulation and fertile-window estimates.
- **Calendar view** — Month grid with past periods, predicted periods, fertile window, and per-day notes. Loads your entire history (tap the month title to jump to any month/year), so imported data going back years displays correctly.
- **Insights** — Full cycle history & statistics (average / shortest / longest cycle, variation, regularity assessment), a complete list of every cycle with its length and deviation from your average, a recent-cycle trend chart, an upcoming-periods forecast, and most-logged symptoms / moods. Built from your entire history, not just the last year.
- **Partner sharing** — Generate a single-use invite link, partner accepts, both sides can toggle exactly what is shared (periods, symptoms, predictions). Disconnect anytime.
- **Import from Flo (and others)** — Upload a Flo data-export `.json` and Luna parses your cycles, period days, symptoms, and moods, then imports them non-destructively (existing days are never overwritten). Tolerant of several export shapes; also accepts plain JSON arrays.
- **Password reset** — "Forgot password?" on the sign-in screen sends a secure reset link.
- **PWA** — Installable on iOS/Android, offline app-shell via service worker.
- **Dark mode** — Light / dark / system themes with no flash on load; the whole palette flips via CSS variables. Quick toggle on the dashboard, full control in Settings.
- **Gentle reminders** — Opt-in daily check-in nudge and "period approaching" alerts (2 days / 1 day / day-of), with a test button. Foreground/installed-PWA scheduling out of the box (see notes below).
- **Encouragement** — A phase-aware daily affirmation and self-care suggestion, plus a low-pressure logging-streak chip.
- **Pregnancy mode** — Switch on with your due date, last period, or conception date. Week-by-week fetal development (size comparisons, length/weight, milestones) with a scrubber to look ahead or back, a due-date countdown and trimester tracker, a kick counter, a contraction timer, and weight-gain tracking. Partners can follow along too.
- **Row-level security** — All data scoped by RLS policies in Postgres. A partner can only see what you explicitly enabled.

## Stack

- Next.js 14 (App Router, RSC, middleware-based auth)
- Supabase (Postgres, Auth, RLS)
- Tailwind CSS, Instrument Serif + Manrope (Google Fonts)
- Lucide icons, date-fns
- Service worker for PWA offline support

---

## 1 · Set up Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. In **SQL Editor**, paste the entire contents of `supabase/schema.sql` and run it. This creates the tables, RLS policies, triggers, and RPCs. Then run `supabase/pregnancy.sql` to add pregnancy mode (additive — safe to run on an existing database).
3. In **Authentication → Providers**, make sure **Email** is enabled. For local testing you can also disable "Confirm email" under Auth settings so signups work without verifying.
4. In **Authentication → URL Configuration**, set:
   - **Site URL:** `https://your-app.vercel.app` (after deploy) — for local dev, `http://localhost:3000`
   - **Redirect URLs:** add **every exact callback URL** you use, including the wildcard path. At minimum:
     - `https://your-app.vercel.app/auth/callback`
     - `http://localhost:3000/auth/callback`

     > ⚠️ If a confirmation or reset link sends you to `/auth/login?error=auth_callback_failed`, the #1 cause is that the callback URL isn't in this allowlist. Supabase refuses to redirect to URLs it doesn't recognize. Add it here (no trailing slash) and re-test.
5. Grab your **Project URL** and **anon public key** from **Project Settings → API**.

## 2 · Local development

```bash
cp .env.local.example .env.local
# fill in NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, NEXT_PUBLIC_SITE_URL
npm install
npm run dev
```

Open `http://localhost:3000`.

## 3 · Push to GitHub

```bash
git init
git add .
git commit -m "feat: initial Luna build"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main
```

## 4 · Deploy to Vercel

1. Go to [vercel.com/new](https://vercel.com/new) and import your repo.
2. Framework preset: **Next.js** (auto-detected). Build & install commands: defaults.
3. Under **Environment Variables**, add:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_SITE_URL` — set to your final Vercel URL (e.g. `https://luna.vercel.app`)
4. Click **Deploy**.
5. After the first deploy, go back into Supabase → Auth → URL Config and add the Vercel URL to both **Site URL** and **Redirect URLs**.

That's it.

---

## How partner sharing works

1. User A taps **Create new invite link**. A row is inserted in `partner_invites` with a random `invite_code` and a 14-day expiry.
2. User A copies the link (`/partner/accept?code=XXX`) and sends it to User B by any channel.
3. User B opens the link. If not signed in, they're sent through signup/login first.
4. User B taps **Accept connection** → calls the `accept_partner_invite(code)` RPC.
5. The RPC (security definer) atomically:
   - Inserts a row in `partner_connections (user_id = A, partner_id = B)`.
   - Inserts a mirror row `(user_id = B, partner_id = A)`.
   - Marks the invite `accepted`.
6. Both users now see each other's data **only where the corresponding `share_*` flag is `true`** on the row owned by the data owner. Either side can disconnect with the `disconnect_partner` RPC, which deletes both rows.

The two-row symmetric model means RLS policies for partner reads are simple — they just check for an existing connection from the requester to the data owner. Each user independently controls what they share.

## Data model

| Table | Purpose |
|---|---|
| `profiles` | One row per user. Email, display name, cycle averages. |
| `period_logs` | (user, date) bleeding entries with flow level and start flag. |
| `daily_logs` | (user, date) symptoms, mood, energy, sleep, notes. |
| `partner_invites` | Pending invite codes with 14-day expiry. |
| `partner_connections` | Bidirectional partner links with per-category share toggles. |

All RLS policies are in `supabase/schema.sql`. A user can `select` their own rows always, and a partner's rows only when the relevant `share_*` flag is set.

## File map

```
src/
  app/
    page.tsx                   landing
    auth/login                 sign in
    auth/signup                sign up
    auth/callback              OAuth/magic-link return
    dashboard                  home: cycle ring + partner card
    calendar                   month grid
    log                        daily log form
    insights                   stats & charts
    partner                    sharing settings
    partner/accept             invite acceptance flow
  components/                  UI components
  lib/
    cycle.ts                   prediction math
    supabase/
      client.ts                browser client
      server.ts                RSC/route-handler client
      middleware.ts            session refresh + auth gating
  middleware.ts                root middleware
supabase/
  schema.sql                   tables + RLS + RPCs (run this)
public/
  manifest.json                PWA manifest
  sw.js                        service worker
  icons/                       PWA icons
```

## Customizing

- **Palette / fonts** — `tailwind.config.ts` (colors), `src/app/layout.tsx` (fonts).
- **Cycle math** — `src/lib/cycle.ts`. The averaging window and fertile-window definition are tweakable there.
- **Symptom / mood options** — exported arrays in `src/lib/cycle.ts`.

## Email confirmation & password reset

`src/app/auth/callback/route.ts` handles **both** auth link styles, so it works whether your Supabase email templates use the default PKCE link or the token-hash style:

- **`?code=…`** (PKCE / OAuth) → exchanged with `exchangeCodeForSession`.
- **`?token_hash=…&type=…`** (OTP) → verified with `verifyOtp`. This style works even when the link is opened on a different device or browser from the one that signed up.

If you want the most reliable cross-device email confirmation, set the **Confirm signup** template (Supabase → Authentication → Email Templates) to:

```
{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=email
```

Password reset is already wired up: **Forgot password?** on the sign-in page calls `resetPasswordForEmail` with a redirect to `/auth/callback?next=/auth/reset`. The callback establishes the recovery session and forwards the user to `/auth/reset`, where they set a new password via `updateUser`. The default recovery email template (`{{ .ConfirmationURL }}`) works as-is.

Any failure now lands on `/auth/login` with a **human-readable** message instead of a bare `auth_callback_failed` code.

## Importing from Flo

Tap the **import icon** in Settings (or go to `/import`). Both Flo export formats are supported: the **`.txt`** file Flo emails when you request your data, and **`.json`** exports (from Flo or other apps).

1. In Flo: **Settings → Download my data** (or **Help → Contact us → request a data export**). Flo emails you a `.txt` file.
2. Upload it on the Import screen. Luna shows a **preview** — cycles, period days, symptom days, and the date range — before anything is saved.
3. Confirm. Days you've **already** logged in Luna are skipped; only new dates are added. Your most recent imported period start becomes the basis for predictions.

Two parsers feed one shared pipeline (`buildPreview`) so both formats behave identically:

- **Text** (`src/lib/import-text.ts`) reads Flo's two-section `.txt`: `cycle N` blocks (`Period start date` / `Period end date` / `Pregnant` / `Period intensity`, plus optional per-day `Day N: intensity:` lines) and the `manual events` table (`index - start - end - Type - Subtype - value`). It imports periods + `Symptom`/`Mood` events, skips pregnancy cycles, and ignores Sleep/Water/Weight/Fluid/Disturber (Luna doesn't track those).
- **JSON** (`src/lib/import.ts`) is intentionally tolerant: cycle objects (`period_start_date` / `period_end_date` / `period_length`), per-day events (`point_date` + `symptoms` / `mood`), and plain arrays like `[{ "date": "2024-01-01", "flow": "medium" }]`.

`src/lib/import-file.ts` auto-detects which to use from the content and extension. Flow intensities and symptom/mood names map to Luna's vocabulary; genuinely unmappable types are reported in the preview. To support another format, extend the mapping tables at the top of the relevant parser.

## Theming (dark mode)

The palette lives entirely in CSS variables in `src/app/globals.css`. `:root` holds the light values and `.dark` remaps the same variable names (neutrals invert: `cream` = surfaces, `ink` = text; accents `rose` / `sage` / `mauve` are re-tuned). `tailwind.config.ts` maps every color token to `rgb(var(--token) / <alpha>)`, so existing utility classes (`bg-cream-50`, `text-ink-900`, …) are theme-aware with no per-component changes.

`ThemeProvider` (`src/components/theme/`) persists the choice (`light` / `dark` / `system`) to `localStorage` and an inline script in `layout.tsx` applies the class before first paint to avoid a flash. To add a brand color, add a `--token` to both `:root` and `.dark`, then expose it in `tailwind.config.ts`.

## Reminders & notifications

Settings → **Reminders** asks for the Web Notification permission and stores preferences (`enabled`, daily time, period alerts) in `localStorage`. `ReminderScheduler` (mounted in `AppShell`) checks every minute while the app is open and fires at most one daily and one period reminder per day; the predicted next-period date is synced to `localStorage` by `PredictionSync` on the dashboard so alerts work without a round-trip.

This is **foreground / installed-PWA** scheduling — it runs while Luna is open or running as an installed app. For true background push when the app is fully closed, add a server with VAPID keys: subscribe via `pushManager.subscribe`, store the subscription, and send pushes from a cron/server that your `public/sw.js` handles in a `push` event listener. The client pieces (permission flow, `showNotification`, SW registration) are already in place to build on.

## Pregnancy mode

Switch on from the dashboard ("Expecting? Track your pregnancy") or Settings → Pregnancy. You enter one date — **due date**, **last period**, or **conception** — and Luna derives an effective LMP (week 0) and due date (`src/lib/pregnancy.ts`), then computes your current week, day-in-week, trimester, progress, and countdown.

What you get:

- **Week-by-week fetal development** (`src/lib/fetal-development.ts`, weeks 4–40): produce size comparison, length, weight, and a milestone, with a scrubber to look ahead/back.
- **Kick counter** — tap-to-count with a session timer; sessions saved to `kick_sessions`.
- **Contraction timer** — start/stop timing with duration + frequency (gap-to-previous) and a 5-1-1 reference; saved to `contractions`.
- **Weight-gain tracking** — log in kg or lb, see gain since start and a sparkline; stored in `pregnancy_weights`.
- **Partner view** — a connected partner sees a read-only pregnancy card on their dashboard, gated by the new `share_pregnancy` flag on `partner_connections`.

**Setup:** run `supabase/pregnancy.sql` in the Supabase SQL Editor once (after `schema.sql`). It's additive and idempotent — it adds the `pregnancies`, `pregnancy_weights`, `kick_sessions`, and `contractions` tables (with RLS), and the `share_pregnancy` column. One active pregnancy per user is enforced by a partial unique index; ending a pregnancy moves it to history (`status = 'ended'`) and returns you to cycle tracking.

All fetal data are general averages, not medical advice — the app says so where it matters, and dating from your provider's scans is always the most accurate.

## Disclaimer

This app is not a medical device. It is not a contraceptive. It does not diagnose anything. If anything feels off about your cycle, talk to a clinician.

# Luna — Period Tracker PWA

A privacy-first period and cycle tracking PWA with partner sharing. Built with Next.js 14 (App Router), Supabase, and Tailwind. Deploy-ready for Vercel.

## Features

- **Cycle tracking** — Log periods (flow, start day), symptoms, mood, energy, sleep, free-form notes.
- **Predictions** — Cycle-length and period-length averages computed from your last 6 cycles, with ovulation and fertile-window estimates.
- **Calendar view** — Month grid with past periods, predicted periods, fertile window, and per-day notes.
- **Insights** — Cycle-length history chart and most-logged symptoms / moods.
- **Partner sharing** — Generate a single-use invite link, partner accepts, both sides can toggle exactly what is shared (periods, symptoms, predictions). Disconnect anytime.
- **PWA** — Installable on iOS/Android, offline app-shell via service worker.
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
2. In **SQL Editor**, paste the entire contents of `supabase/schema.sql` and run it. This creates the tables, RLS policies, triggers, and RPCs.
3. In **Authentication → Providers**, make sure **Email** is enabled. For local testing you can also disable "Confirm email" under Auth settings so signups work without verifying.
4. In **Authentication → URL Configuration**, set:
   - **Site URL:** `https://your-app.vercel.app` (after deploy) — for local dev, `http://localhost:3000`
   - **Redirect URLs:** add both your Vercel URL and `http://localhost:3000/auth/callback`
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

## Disclaimer

This app is not a medical device. It is not a contraceptive. It does not diagnose anything. If anything feels off about your cycle, talk to a clinician.

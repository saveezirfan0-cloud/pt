-- =====================================================================
-- Luna — Insights & symptom-detail migration
-- Additive & idempotent. Run AFTER schema.sql (pregnancy.sql optional).
-- Adds: custom_symptoms table + symptom_details (intensity) on daily_logs.
-- =====================================================================

-- ---------- custom_symptoms ----------
-- User-defined symptom names, on top of the built-in list.
create table if not exists public.custom_symptoms (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 40),
  created_at timestamptz default now(),
  unique (user_id, name)
);
create index if not exists custom_symptoms_user_idx on public.custom_symptoms (user_id);

-- ---------- daily_logs.symptom_details ----------
-- Maps a symptom name -> intensity (1..5). Keys mirror the `symptoms` array;
-- this column adds the "how strong" dimension without breaking old rows.
alter table public.daily_logs
  add column if not exists symptom_details jsonb default '{}'::jsonb;

-- =====================================================================
-- Row Level Security
-- =====================================================================
alter table public.custom_symptoms enable row level security;

drop policy if exists "own custom symptoms" on public.custom_symptoms;
create policy "own custom symptoms" on public.custom_symptoms
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "partner custom symptoms select" on public.custom_symptoms;
create policy "partner custom symptoms select" on public.custom_symptoms
  for select using (
    exists (
      select 1 from public.partner_connections pc
      where pc.user_id = auth.uid()
        and pc.partner_id = custom_symptoms.user_id
        and pc.share_symptoms = true
    )
  );

-- =====================================================================
-- Done.
-- =====================================================================

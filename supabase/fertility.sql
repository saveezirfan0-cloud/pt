-- =====================================================================
-- Luna — Fertility & FAM (TTC / fertility-awareness) migration
-- Additive & idempotent. Run AFTER schema.sql.
--
-- Stores daily fertility-awareness signs: basal body temperature (BBT),
-- cervical mucus, LH (ovulation) test results, and intercourse. These power
-- charting, ovulation confirmation, fertile-window and pregnancy-probability
-- estimates. Observational only — NOT a contraceptive guarantee.
-- =====================================================================

create table if not exists public.fertility_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  -- BBT in Celsius (store one unit; convert for display). 30–45 sane range.
  bbt_c numeric(4,2) check (bbt_c is null or (bbt_c >= 30 and bbt_c <= 45)),
  -- Cervical mucus: dry < sticky < creamy < watery < eggwhite (most fertile).
  mucus text check (mucus is null or mucus in ('dry','sticky','creamy','watery','eggwhite')),
  -- LH / ovulation test result.
  lh text check (lh is null or lh in ('low','high','peak','negative','positive')),
  intercourse boolean not null default false,
  -- Optional cervix observations (position/firmness/openness), free-ish text.
  cervix text check (cervix is null or cervix in ('low_firm_closed','medium','high_soft_open')),
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (user_id, date)
);
create index if not exists fertility_logs_idx on public.fertility_logs (user_id, date);

-- goal: are they trying to conceive, avoiding, or just observing?
alter table public.profiles
  add column if not exists fertility_goal text
    check (fertility_goal is null or fertility_goal in ('ttc','avoid','observe'));
alter table public.profiles
  add column if not exists temp_unit text default 'c'
    check (temp_unit in ('c','f'));

drop trigger if exists fertility_logs_updated_at on public.fertility_logs;
create trigger fertility_logs_updated_at before update on public.fertility_logs
  for each row execute function public.touch_updated_at();

alter table public.fertility_logs enable row level security;

drop policy if exists "own fertility all" on public.fertility_logs;
create policy "own fertility all" on public.fertility_logs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "partner fertility select" on public.fertility_logs;
create policy "partner fertility select" on public.fertility_logs
  for select using (
    exists (
      select 1 from public.partner_connections pc
      where pc.user_id = auth.uid()
        and pc.partner_id = fertility_logs.user_id
        and pc.share_predictions = true
    )
  );

-- =====================================================================
-- Done.
-- =====================================================================

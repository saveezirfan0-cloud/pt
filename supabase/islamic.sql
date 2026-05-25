-- =====================================================================
-- Luna — Faith & purity (Islamic mode) migration
-- Additive & idempotent. Run AFTER schema.sql.
--
-- Stores per-user, EDITABLE day-limits used only to *flag* possibilities
-- (e.g. bleeding exceeding a school's commonly-cited maximum). The app does
-- not issue rulings; it helps with organisation and reminders.
-- =====================================================================

create table if not exists public.islamic_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  enabled boolean not null default false,
  madhhab text not null default 'hanafi'
    check (madhhab in ('hanafi','shafii','maliki','hanbali','jafari','custom')),
  -- Day limits (editable). Commonly-cited defaults are applied per madhhab
  -- in the app; users can override any of them.
  min_hayd int not null default 3 check (min_hayd between 1 and 15),
  max_hayd int not null default 10 check (max_hayd between 1 and 15),
  min_tuhr int not null default 15 check (min_tuhr between 1 and 40),
  max_nifas int not null default 40 check (max_nifas between 1 and 80),
  ghusl_reminders boolean not null default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

drop trigger if exists islamic_settings_updated_at on public.islamic_settings;
create trigger islamic_settings_updated_at before update on public.islamic_settings
  for each row execute function public.touch_updated_at();

alter table public.islamic_settings enable row level security;

drop policy if exists "own islamic settings" on public.islamic_settings;
create policy "own islamic settings" on public.islamic_settings
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- =====================================================================
-- Done.
-- =====================================================================

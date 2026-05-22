-- =====================================================================
-- Luna — Pregnancy mode migration
-- Additive & idempotent. Run this in the Supabase SQL Editor AFTER schema.sql.
-- Adds: pregnancies, pregnancy_weights, kick_sessions, contractions,
--       and a share_pregnancy flag on partner_connections.
-- =====================================================================

-- ---------- pregnancies ----------
-- One active pregnancy per user at a time (enforced by partial unique index).
create table if not exists public.pregnancies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  -- Anchor used to compute weeks. We always store an effective LMP (week 0).
  lmp_date date not null,
  due_date date not null,
  method text not null default 'lmp' check (method in ('lmp','due_date','conception')),
  baby_name text,
  status text not null default 'active' check (status in ('active','ended')),
  end_date date,
  end_reason text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists pregnancies_user_idx on public.pregnancies (user_id, status);
-- At most one ACTIVE pregnancy per user.
create unique index if not exists pregnancies_one_active
  on public.pregnancies (user_id) where (status = 'active');

-- ---------- pregnancy_weights ----------
create table if not exists public.pregnancy_weights (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  pregnancy_id uuid not null references public.pregnancies(id) on delete cascade,
  date date not null,
  weight_kg numeric(5,2) not null check (weight_kg > 0 and weight_kg < 400),
  created_at timestamptz default now(),
  unique (pregnancy_id, date)
);
create index if not exists pregnancy_weights_idx on public.pregnancy_weights (pregnancy_id, date);

-- ---------- kick_sessions ----------
create table if not exists public.kick_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  pregnancy_id uuid references public.pregnancies(id) on delete cascade,
  started_at timestamptz not null,
  ended_at timestamptz,
  kick_count int not null default 0 check (kick_count >= 0),
  created_at timestamptz default now()
);
create index if not exists kick_sessions_idx on public.kick_sessions (user_id, started_at desc);

-- ---------- contractions ----------
create table if not exists public.contractions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  pregnancy_id uuid references public.pregnancies(id) on delete cascade,
  started_at timestamptz not null,
  ended_at timestamptz not null,
  duration_seconds int not null check (duration_seconds >= 0),
  created_at timestamptz default now()
);
create index if not exists contractions_idx on public.contractions (user_id, started_at desc);

-- ---------- partner_connections: add share_pregnancy ----------
alter table public.partner_connections
  add column if not exists share_pregnancy boolean default true;

-- =====================================================================
-- updated_at trigger for pregnancies
-- =====================================================================
drop trigger if exists pregnancies_updated_at on public.pregnancies;
create trigger pregnancies_updated_at before update on public.pregnancies
  for each row execute function public.touch_updated_at();

-- =====================================================================
-- Row Level Security
-- =====================================================================
alter table public.pregnancies enable row level security;
alter table public.pregnancy_weights enable row level security;
alter table public.kick_sessions enable row level security;
alter table public.contractions enable row level security;

-- ---------- pregnancies ----------
drop policy if exists "own pregnancy select" on public.pregnancies;
create policy "own pregnancy select" on public.pregnancies
  for select using (auth.uid() = user_id);

drop policy if exists "partner pregnancy select" on public.pregnancies;
create policy "partner pregnancy select" on public.pregnancies
  for select using (
    exists (
      select 1 from public.partner_connections pc
      where pc.user_id = auth.uid()
        and pc.partner_id = pregnancies.user_id
        and pc.share_pregnancy = true
    )
  );

drop policy if exists "own pregnancy write" on public.pregnancies;
create policy "own pregnancy write" on public.pregnancies
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------- pregnancy_weights ----------
drop policy if exists "own weight all" on public.pregnancy_weights;
create policy "own weight all" on public.pregnancy_weights
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "partner weight select" on public.pregnancy_weights;
create policy "partner weight select" on public.pregnancy_weights
  for select using (
    exists (
      select 1 from public.partner_connections pc
      where pc.user_id = auth.uid()
        and pc.partner_id = pregnancy_weights.user_id
        and pc.share_pregnancy = true
    )
  );

-- ---------- kick_sessions ----------
drop policy if exists "own kicks all" on public.kick_sessions;
create policy "own kicks all" on public.kick_sessions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------- contractions ----------
drop policy if exists "own contractions all" on public.contractions;
create policy "own contractions all" on public.contractions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- =====================================================================
-- Done.
-- =====================================================================

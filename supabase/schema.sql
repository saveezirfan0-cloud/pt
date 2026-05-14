-- =====================================================================
-- Period Tracker — Supabase Schema
-- Run this entire file in the Supabase SQL Editor (Dashboard > SQL Editor)
-- =====================================================================

-- ---------- Extensions ----------
create extension if not exists "pgcrypto";

-- ---------- profiles ----------
-- One row per user (auto-created via trigger when a user signs up).
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique,
  display_name text,
  average_cycle_length int default 28 check (average_cycle_length between 15 and 60),
  average_period_length int default 5 check (average_period_length between 1 and 15),
  last_period_start date,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ---------- period_logs ----------
-- One row per (user, date) when there is bleeding.
create table if not exists public.period_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  flow text not null check (flow in ('spotting','light','medium','heavy')),
  is_period_start boolean default false,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (user_id, date)
);
create index if not exists period_logs_user_date_idx on public.period_logs (user_id, date desc);

-- ---------- daily_logs ----------
-- One row per (user, date) for symptoms/mood/notes — independent of bleeding.
create table if not exists public.daily_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  mood text[] default '{}',
  symptoms text[] default '{}',
  energy_level int check (energy_level between 1 and 5),
  sleep_hours numeric(3,1),
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (user_id, date)
);
create index if not exists daily_logs_user_date_idx on public.daily_logs (user_id, date desc);

-- ---------- partner_invites ----------
-- A pending invite created by `inviter_id`. Accepted by anyone with the code.
create table if not exists public.partner_invites (
  id uuid primary key default gen_random_uuid(),
  inviter_id uuid not null references auth.users(id) on delete cascade,
  invite_code text unique not null default encode(gen_random_bytes(8), 'hex'),
  status text not null default 'pending' check (status in ('pending','accepted','revoked','expired')),
  created_at timestamptz default now(),
  expires_at timestamptz default (now() + interval '14 days'),
  accepted_at timestamptz,
  accepted_by uuid references auth.users(id)
);
create index if not exists partner_invites_code_idx on public.partner_invites (invite_code);

-- ---------- partner_connections ----------
-- A bidirectional connection. Two rows are inserted on acceptance,
-- one for each direction, so RLS lookups are symmetric and simple.
create table if not exists public.partner_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  partner_id uuid not null references auth.users(id) on delete cascade,
  share_periods boolean default true,
  share_symptoms boolean default true,
  share_predictions boolean default true,
  created_at timestamptz default now(),
  unique (user_id, partner_id),
  check (user_id <> partner_id)
);
create index if not exists partner_connections_user_idx on public.partner_connections (user_id);
create index if not exists partner_connections_partner_idx on public.partner_connections (partner_id);

-- =====================================================================
-- Trigger: auto-create profile row when a new auth user is created
-- =====================================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =====================================================================
-- updated_at triggers
-- =====================================================================
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.touch_updated_at();

drop trigger if exists period_logs_updated_at on public.period_logs;
create trigger period_logs_updated_at before update on public.period_logs
  for each row execute function public.touch_updated_at();

drop trigger if exists daily_logs_updated_at on public.daily_logs;
create trigger daily_logs_updated_at before update on public.daily_logs
  for each row execute function public.touch_updated_at();

-- =====================================================================
-- RPC: accept_partner_invite(code)
-- Atomically inserts a bidirectional partner connection and marks the
-- invite accepted. Runs as security definer so a user can look up an
-- invite they don't own (by code) and create the inviter's mirror row.
-- =====================================================================
create or replace function public.accept_partner_invite(p_code text)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  v_invite public.partner_invites%rowtype;
  v_me uuid := auth.uid();
begin
  if v_me is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  select * into v_invite
  from public.partner_invites
  where invite_code = p_code
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'invalid_code');
  end if;

  if v_invite.status <> 'pending' then
    return jsonb_build_object('ok', false, 'error', 'invite_' || v_invite.status);
  end if;

  if v_invite.expires_at < now() then
    update public.partner_invites set status = 'expired' where id = v_invite.id;
    return jsonb_build_object('ok', false, 'error', 'expired');
  end if;

  if v_invite.inviter_id = v_me then
    return jsonb_build_object('ok', false, 'error', 'cannot_accept_own_invite');
  end if;

  insert into public.partner_connections (user_id, partner_id)
  values (v_invite.inviter_id, v_me)
  on conflict do nothing;

  insert into public.partner_connections (user_id, partner_id)
  values (v_me, v_invite.inviter_id)
  on conflict do nothing;

  update public.partner_invites
  set status = 'accepted', accepted_at = now(), accepted_by = v_me
  where id = v_invite.id;

  return jsonb_build_object('ok', true, 'partner_id', v_invite.inviter_id);
end;
$$;

grant execute on function public.accept_partner_invite(text) to authenticated;

-- =====================================================================
-- RPC: disconnect_partner(partner_user_id) — removes both rows
-- =====================================================================
create or replace function public.disconnect_partner(p_partner uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
declare v_me uuid := auth.uid();
begin
  if v_me is null then raise exception 'not authenticated'; end if;
  delete from public.partner_connections
   where (user_id = v_me and partner_id = p_partner)
      or (user_id = p_partner and partner_id = v_me);
end;
$$;

grant execute on function public.disconnect_partner(uuid) to authenticated;

-- =====================================================================
-- Row Level Security
-- =====================================================================
alter table public.profiles enable row level security;
alter table public.period_logs enable row level security;
alter table public.daily_logs enable row level security;
alter table public.partner_invites enable row level security;
alter table public.partner_connections enable row level security;

-- ---------- profiles ----------
drop policy if exists "own profile select" on public.profiles;
create policy "own profile select" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "partner profile select" on public.profiles;
create policy "partner profile select" on public.profiles
  for select using (
    exists (
      select 1 from public.partner_connections pc
      where pc.user_id = auth.uid() and pc.partner_id = profiles.id
    )
  );

drop policy if exists "own profile update" on public.profiles;
create policy "own profile update" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "own profile insert" on public.profiles;
create policy "own profile insert" on public.profiles
  for insert with check (auth.uid() = id);

-- ---------- period_logs ----------
drop policy if exists "own period select" on public.period_logs;
create policy "own period select" on public.period_logs
  for select using (auth.uid() = user_id);

drop policy if exists "partner period select" on public.period_logs;
create policy "partner period select" on public.period_logs
  for select using (
    exists (
      select 1 from public.partner_connections pc
      where pc.user_id = auth.uid()
        and pc.partner_id = period_logs.user_id
        and pc.share_periods = true
    )
  );

drop policy if exists "own period write" on public.period_logs;
create policy "own period write" on public.period_logs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------- daily_logs ----------
drop policy if exists "own daily select" on public.daily_logs;
create policy "own daily select" on public.daily_logs
  for select using (auth.uid() = user_id);

drop policy if exists "partner daily select" on public.daily_logs;
create policy "partner daily select" on public.daily_logs
  for select using (
    exists (
      select 1 from public.partner_connections pc
      where pc.user_id = auth.uid()
        and pc.partner_id = daily_logs.user_id
        and pc.share_symptoms = true
    )
  );

drop policy if exists "own daily write" on public.daily_logs;
create policy "own daily write" on public.daily_logs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------- partner_invites ----------
drop policy if exists "inviter manages invites" on public.partner_invites;
create policy "inviter manages invites" on public.partner_invites
  for all using (auth.uid() = inviter_id) with check (auth.uid() = inviter_id);

-- ---------- partner_connections ----------
drop policy if exists "see own connections" on public.partner_connections;
create policy "see own connections" on public.partner_connections
  for select using (auth.uid() = user_id or auth.uid() = partner_id);

drop policy if exists "update own settings" on public.partner_connections;
create policy "update own settings" on public.partner_connections
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "delete own connection" on public.partner_connections;
create policy "delete own connection" on public.partner_connections
  for delete using (auth.uid() = user_id);

-- =====================================================================
-- Done.
-- =====================================================================

-- =====================================================================
-- Luna — Partner experience migration
-- Additive & idempotent. Run AFTER schema.sql (and pregnancy.sql for the
-- share_pregnancy column; this re-adds it defensively).
--
-- Adds a partner ROLE so the app can show a supporter-focused experience,
-- a per-connection nickname, and granular share flags for the new modules.
-- =====================================================================

alter table public.partner_connections
  add column if not exists role text not null default 'partner'
    check (role in ('owner','partner'));
alter table public.partner_connections
  add column if not exists nickname text;
alter table public.partner_connections
  add column if not exists share_pregnancy boolean default true;
alter table public.partner_connections
  add column if not exists share_fertility boolean default false;
alter table public.partner_connections
  add column if not exists share_tips boolean default true;

-- Track whether a user primarily uses Luna as the tracker or as a supporter.
-- Purely a UI hint; data access is still governed by share_* flags + RLS.
alter table public.profiles
  add column if not exists account_kind text default 'tracker'
    check (account_kind in ('tracker','supporter'));

-- =====================================================================
-- Updated accept RPC: records roles. The inviter is the 'owner' (the person
-- being tracked); the accepter is the 'partner' (supporter). Marks the
-- accepter's profile as a supporter if they have no cycle data of their own.
-- =====================================================================
create or replace function public.accept_partner_invite(p_code text)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  v_invite public.partner_invites%rowtype;
  v_me uuid := auth.uid();
  v_has_data boolean;
begin
  if v_me is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  select * into v_invite from public.partner_invites
  where invite_code = p_code for update;

  if not found then return jsonb_build_object('ok', false, 'error', 'invalid_code'); end if;
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

  -- inviter = owner (the tracked person); accepter = partner (supporter)
  insert into public.partner_connections (user_id, partner_id, role)
  values (v_invite.inviter_id, v_me, 'partner')
  on conflict (user_id, partner_id) do update set role = 'partner';

  insert into public.partner_connections (user_id, partner_id, role)
  values (v_me, v_invite.inviter_id, 'owner')
  on conflict (user_id, partner_id) do update set role = 'owner';

  -- If the accepter has never logged a period, treat them as a supporter.
  select exists (select 1 from public.period_logs where user_id = v_me) into v_has_data;
  if not v_has_data then
    update public.profiles set account_kind = 'supporter' where id = v_me;
  end if;

  update public.partner_invites
  set status = 'accepted', accepted_at = now(), accepted_by = v_me
  where id = v_invite.id;

  return jsonb_build_object('ok', true, 'partner_id', v_invite.inviter_id);
end;
$$;

grant execute on function public.accept_partner_invite(text) to authenticated;

-- =====================================================================
-- RLS: allow a partner to read the owner's fertility logs when share_fertility
-- (fertility.sql already adds a share_predictions-based policy; this adds the
-- dedicated flag). Safe if fertility_logs doesn't exist yet — guarded.
-- =====================================================================
do $$
begin
  if exists (select 1 from information_schema.tables
             where table_schema = 'public' and table_name = 'fertility_logs') then
    drop policy if exists "partner fertility flag select" on public.fertility_logs;
    create policy "partner fertility flag select" on public.fertility_logs
      for select using (
        exists (
          select 1 from public.partner_connections pc
          where pc.user_id = auth.uid()
            and pc.partner_id = fertility_logs.user_id
            and pc.share_fertility = true
        )
      );
  end if;
end $$;

-- =====================================================================
-- Done.
-- =====================================================================

-- Admin "Thành viên & quyền" (Owner request 14/11): the Owner invites or adds admin accounts, picks a role and sees
-- what that role may and may not do. One canonical role -> capability map: the CASE that lived inside
-- nilaza_private.has_capability (20260902131408) moves, unchanged, into nilaza_private.roles_have_capability, and
-- has_capability, get_admin_access and the new get_admin_role_matrix all read it, so the Admin list cannot drift
-- from what the database enforces. The map itself is NOT changed here (admin keeps ai.manage and content.publish).
-- Guard rails: nobody changes their own roles through these RPCs, the last active owner cannot be revoked or demoted
-- (the 20260902131408 trigger stays as the final backstop), granting owner needs an explicit confirmation, and every
-- change writes a role.* audit row (clients cannot insert role.% rows, so these are trustworthy). New emails are
-- invited by the admin-team-invite Edge Function with the service role; invite_begin / invite_finish are service-role
-- only and re-check from admin_role_assignments that the actor is an active owner. Error codes the Admin maps to text:
-- 42501 not authorized, 22023 invalid input, NZT01 self change, NZT02 last owner, NZT03 owner needs confirmation,
-- NZT04 member not found, NZT05 daily invite limit, NZT06 existing account whose email was never confirmed.
-- Nothing is applied by this file on its own.
begin;

-- 1. The single role -> capability map -------------------------------------------------------------------------
create or replace function nilaza_private.admin_capability_list() returns text[]
language sql immutable set search_path = '' as $$
  select array['hub.read','content.read','content.draft','content.publish','content.delete',
    'ai.read','ai.manage','roles.manage','overview.read','notifications.dispatch','safety.review']::text[];
$$;
create or replace function nilaza_private.admin_role_list() returns text[]
language sql immutable set search_path = '' as $$
  select array['owner','admin','editor','safety_reviewer']::text[];
$$;
-- Same CASE as 20260902131408 has_capability; null roles answer false instead of null.
create or replace function nilaza_private.roles_have_capability(roles text[], capability text) returns boolean
language sql immutable set search_path = '' as $$
  select coalesce(case capability
    when 'hub.read' then roles && array['owner','admin','editor','safety_reviewer']
    when 'content.read' then roles && array['owner','admin','editor','safety_reviewer']
    when 'content.draft' then roles && array['owner','admin','editor']
    when 'content.publish' then roles && array['owner','admin']
    when 'content.delete' then roles && array['owner']
    when 'ai.read' then roles && array['owner','admin','editor','safety_reviewer']
    when 'ai.manage' then roles && array['owner','admin']
    when 'roles.manage' then roles && array['owner']
    when 'overview.read' then roles && array['owner','admin']
    when 'notifications.dispatch' then roles && array['owner','admin']
    when 'safety.review' then roles && array['owner','admin','safety_reviewer']
    else false end, false);
$$;
-- Same signature, rights and answers as before; every existing policy and RPC keeps working unchanged.
create or replace function nilaza_private.has_capability(capability text) returns boolean
language sql stable security invoker set search_path = '' as $$
  select nilaza_private.roles_have_capability(nilaza_private.current_roles(), capability);
$$;
create or replace function public.get_admin_access() returns jsonb
language sql stable security invoker set search_path = '' as $$
  select jsonb_build_object('userId', auth.uid(), 'roles', r.roles,
    'capabilities', coalesce((select jsonb_agg(cap order by cap) from unnest(nilaza_private.admin_capability_list()) cap
      where nilaza_private.roles_have_capability(r.roles, cap)), '[]'::jsonb))
  from (select nilaza_private.current_roles() as roles) r;
$$;
revoke all on function nilaza_private.admin_capability_list(), nilaza_private.admin_role_list(),
  nilaza_private.roles_have_capability(text[], text) from public, anon;
grant execute on function nilaza_private.admin_capability_list(), nilaza_private.admin_role_list(),
  nilaza_private.roles_have_capability(text[], text) to authenticated, service_role;

-- 2. Private helpers ------------------------------------------------------------------------------------------
-- Active roles of any account. Internal only: used by the definer RPCs below, never granted to clients.
create or replace function nilaza_private.roles_of(user_input uuid) returns text[]
language sql stable security definer set search_path = '' as $$
  select coalesce(array_agg(a.role order by a.role), '{}'::text[])
  from public.admin_role_assignments a
  where a.user_id = user_input and a.status = 'active';
$$;
create or replace function nilaza_private.admin_team_invite_daily_cap() returns integer
language sql immutable set search_path = '' as $$ select 10 $$;
create or replace function nilaza_private.admin_team_email_ok(email_input text) returns boolean
language sql immutable set search_path = '' as $$
  select email_input is not null and char_length(email_input) between 3 and 254
    and email_input ~ '^[^@[:space:][:cntrl:]]+@[^@[:space:][:cntrl:]]+\.[^@[:space:][:cntrl:].]+$';
$$;

-- Invites that actually send an email, per owner and Vietnam calendar day. No client access.
create table if not exists nilaza_private.admin_team_invite_days (
  actor_id uuid not null references auth.users(id) on delete cascade,
  usage_day date not null,
  invites integer not null default 0 check (invites >= 0),
  primary key (actor_id, usage_day)
);
alter table nilaza_private.admin_team_invite_days enable row level security;
revoke all on table nilaza_private.admin_team_invite_days from public, anon, authenticated;

-- Give target exactly one active role. Refuses self changes and removing the last active owner. Shares the
-- advisory lock of the guard_role_change trigger so two owners cannot demote each other at the same time.
create or replace function nilaza_private.admin_team_apply_role(actor_input uuid, target_input uuid, role_input text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_previous text[];
  v_changed boolean;
begin
  if actor_input is null or target_input is null then raise exception 'Not authorized' using errcode = '42501'; end if;
  if role_input is null or not (role_input = any(nilaza_private.admin_role_list())) then
    raise exception 'invalid_admin_role' using errcode = '22023';
  end if;
  if target_input = actor_input then raise exception 'admin_team_self_change' using errcode = 'NZT01'; end if;
  perform pg_advisory_xact_lock(820260902);
  -- The caller checked the actor before waiting for the lock; an owner demoted in the meantime must not act any more.
  if not nilaza_private.roles_have_capability(nilaza_private.roles_of(actor_input), 'roles.manage') then
    raise exception 'Not authorized' using errcode = '42501';
  end if;
  if not exists (select 1 from auth.users u where u.id = target_input) then
    raise exception 'admin_member_not_found' using errcode = 'NZT04';
  end if;
  v_previous := nilaza_private.roles_of(target_input);
  if 'owner' = any(v_previous) and role_input <> 'owner' and not exists (
    select 1 from public.admin_role_assignments a where a.role = 'owner' and a.status = 'active' and a.user_id <> target_input
  ) then
    raise exception 'admin_team_last_owner' using errcode = 'NZT02';
  end if;
  v_changed := v_previous is distinct from array[role_input];
  if v_changed then
    insert into public.admin_role_assignments(user_id, role, status) values (target_input, role_input, 'active')
      on conflict (user_id, role) do update set status = 'active' where public.admin_role_assignments.status <> 'active';
    update public.admin_role_assignments set status = 'revoked'
      where user_id = target_input and role <> role_input and status = 'active';
  end if;
  return jsonb_build_object('userId', target_input, 'role', role_input, 'previousRoles', to_jsonb(v_previous),
    'changed', v_changed);
end;
$$;
revoke all on function nilaza_private.roles_of(uuid), nilaza_private.admin_team_invite_daily_cap(),
  nilaza_private.admin_team_email_ok(text), nilaza_private.admin_team_apply_role(uuid, uuid, text)
  from public, anon, authenticated;

-- 3. Owner RPCs (roles.manage) ---------------------------------------------------------------------------------
-- Staff accounts only (anyone with a row in admin_role_assignments). Never tokens, password hashes or metadata.
create or replace function public.list_admin_team() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  actor uuid := auth.uid();
  v_day date := (now() at time zone 'Asia/Ho_Chi_Minh')::date;
begin
  if actor is null or not nilaza_private.has_capability('roles.manage') then
    raise exception 'Not authorized' using errcode = '42501';
  end if;
  return jsonb_build_object(
    'members', coalesce((
      select jsonb_agg(jsonb_build_object(
        'userId', u.id, 'email', u.email, 'isMe', u.id = actor,
        'createdAt', u.created_at, 'invitedAt', u.invited_at, 'emailConfirmedAt', u.email_confirmed_at,
        'lastSignInAt', u.last_sign_in_at,
        'activeRoles', coalesce(m.active_roles, '[]'::jsonb), 'assignments', m.assignments
      ) order by (m.active_roles is null), u.email)
      from (
        select a.user_id,
          jsonb_agg(a.role order by a.role) filter (where a.status = 'active') as active_roles,
          jsonb_agg(jsonb_build_object('id', a.id, 'role', a.role, 'status', a.status, 'createdAt', a.created_at)
            order by a.created_at, a.role) as assignments
        from public.admin_role_assignments a group by a.user_id
      ) m join auth.users u on u.id = m.user_id
    ), '[]'::jsonb),
    'invitesToday', coalesce((select d.invites from nilaza_private.admin_team_invite_days d
      where d.actor_id = actor and d.usage_day = v_day), 0),
    'inviteDailyCap', nilaza_private.admin_team_invite_daily_cap());
end;
$$;

-- What each role may do, computed from the canonical map (the Admin shows can / cannot from this answer).
create or replace function public.get_admin_role_matrix() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  if auth.uid() is null or not nilaza_private.has_capability('roles.manage') then
    raise exception 'Not authorized' using errcode = '42501';
  end if;
  return jsonb_build_object(
    'capabilities', to_jsonb(nilaza_private.admin_capability_list()),
    'roles', (select jsonb_agg(jsonb_build_object('role', r.role,
        'capabilities', (select coalesce(jsonb_agg(c.cap order by c.ord), '[]'::jsonb)
          from unnest(nilaza_private.admin_capability_list()) with ordinality c(cap, ord)
          where nilaza_private.roles_have_capability(array[r.role], c.cap)))
      order by r.ord)
      from unnest(nilaza_private.admin_role_list()) with ordinality r(role, ord)));
end;
$$;

create or replace function public.set_admin_member_role(target_user_id uuid, role_input text, confirm_owner boolean default false)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  actor uuid := auth.uid();
  v_result jsonb;
begin
  if actor is null or not nilaza_private.has_capability('roles.manage') then
    raise exception 'Not authorized' using errcode = '42501';
  end if;
  if target_user_id is null or role_input is null or not (role_input = any(nilaza_private.admin_role_list())) then
    raise exception 'invalid_admin_role' using errcode = '22023';
  end if;
  if target_user_id = actor then raise exception 'admin_team_self_change' using errcode = 'NZT01'; end if;
  if role_input = 'owner' and confirm_owner is not true then
    raise exception 'admin_team_owner_confirm_required' using errcode = 'NZT03';
  end if;
  if not exists (select 1 from public.admin_role_assignments a where a.user_id = target_user_id) then
    raise exception 'admin_member_not_found' using errcode = 'NZT04';
  end if;
  v_result := nilaza_private.admin_team_apply_role(actor, target_user_id, role_input);
  if (v_result->>'changed')::boolean then
    insert into public.admin_audit_logs(admin_user_id, action, target_table, target_id, metadata)
      values (actor, 'role.set', 'auth.users', target_user_id, jsonb_build_object('role', role_input,
        'previousRoles', v_result->'previousRoles', 'source', 'admin_team'));
  end if;
  return v_result;
end;
$$;

create or replace function public.revoke_admin_member(target_user_id uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  actor uuid := auth.uid();
  v_previous text[];
begin
  if actor is null or not nilaza_private.has_capability('roles.manage') then
    raise exception 'Not authorized' using errcode = '42501';
  end if;
  if target_user_id is null then raise exception 'admin_member_not_found' using errcode = 'NZT04'; end if;
  if target_user_id = actor then raise exception 'admin_team_self_change' using errcode = 'NZT01'; end if;
  perform pg_advisory_xact_lock(820260902);
  if not nilaza_private.has_capability('roles.manage') then
    raise exception 'Not authorized' using errcode = '42501';
  end if;
  if not exists (select 1 from public.admin_role_assignments a where a.user_id = target_user_id) then
    raise exception 'admin_member_not_found' using errcode = 'NZT04';
  end if;
  v_previous := nilaza_private.roles_of(target_user_id);
  if cardinality(v_previous) = 0 then
    return jsonb_build_object('userId', target_user_id, 'previousRoles', '[]'::jsonb, 'changed', false);
  end if;
  if 'owner' = any(v_previous) and not exists (
    select 1 from public.admin_role_assignments a where a.role = 'owner' and a.status = 'active' and a.user_id <> target_user_id
  ) then
    raise exception 'admin_team_last_owner' using errcode = 'NZT02';
  end if;
  update public.admin_role_assignments set status = 'revoked' where user_id = target_user_id and status = 'active';
  insert into public.admin_audit_logs(admin_user_id, action, target_table, target_id, metadata)
    values (actor, 'role.revoke', 'auth.users', target_user_id, jsonb_build_object(
      'role', array_to_string(v_previous, ', '), 'previousRoles', to_jsonb(v_previous), 'source', 'admin_team'));
  return jsonb_build_object('userId', target_user_id, 'previousRoles', to_jsonb(v_previous), 'changed', true);
end;
$$;

revoke all on function public.list_admin_team(), public.get_admin_role_matrix(),
  public.set_admin_member_role(uuid, text, boolean), public.revoke_admin_member(uuid) from public, anon, authenticated;
grant execute on function public.list_admin_team(), public.get_admin_role_matrix(),
  public.set_admin_member_role(uuid, text, boolean), public.revoke_admin_member(uuid) to authenticated;

-- 4. Invite (service role only, called by the admin-team-invite Edge Function) ------------------------------------
-- auth.uid() is the service here, so the actor id comes from the function (which verified the caller's session)
-- and is re-checked against admin_role_assignments. Statuses: already_member (has an active role: use "Đổi vai trò"),
-- assigned (existing account, role given, no email), invite_unavailable (no redirect configured, nothing changed),
-- invite_needed (new email, counted against today's cap; the function then invites and calls invite_finish).
create or replace function public.admin_team_invite_begin(actor_input uuid, email_input text, role_input text,
  confirm_owner boolean default false, can_invite boolean default true)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_email text := lower(btrim(coalesce(email_input, '')));
  v_user uuid;
  v_verified boolean;
  v_roles text[];
  v_result jsonb;
  v_count integer;
  v_day date := (now() at time zone 'Asia/Ho_Chi_Minh')::date;
begin
  if actor_input is null or not nilaza_private.roles_have_capability(nilaza_private.roles_of(actor_input), 'roles.manage') then
    raise exception 'Not authorized' using errcode = '42501';
  end if;
  if role_input is null or not (role_input = any(nilaza_private.admin_role_list())) then
    raise exception 'invalid_admin_role' using errcode = '22023';
  end if;
  if not nilaza_private.admin_team_email_ok(v_email) then raise exception 'invalid_email' using errcode = '22023'; end if;
  if role_input = 'owner' and confirm_owner is not true then
    raise exception 'admin_team_owner_confirm_required' using errcode = 'NZT03';
  end if;
  select u.id, (u.email_confirmed_at is not null or u.invited_at is not null) into v_user, v_verified
    from auth.users u where lower(u.email) = v_email order by u.created_at limit 1;
  if v_user is not null then
    if v_user = actor_input then raise exception 'admin_team_self_change' using errcode = 'NZT01'; end if;
    v_roles := nilaza_private.roles_of(v_user);
    if cardinality(v_roles) > 0 then
      return jsonb_build_object('status', 'already_member', 'userId', v_user, 'roles', to_jsonb(v_roles));
    end if;
    -- Never hand a role to an account that someone may have registered with an address they do not own: the email
    -- must be confirmed, or the account was created by an Admin invite (only the mailbox owner can open that link).
    if v_verified is not true then raise exception 'admin_team_email_unconfirmed' using errcode = 'NZT06'; end if;
    v_result := nilaza_private.admin_team_apply_role(actor_input, v_user, role_input);
    insert into public.admin_audit_logs(admin_user_id, action, target_table, target_id, metadata)
      values (actor_input, 'role.invite', 'auth.users', v_user, jsonb_build_object('role', role_input,
        'previousRoles', v_result->'previousRoles', 'invited', false, 'source', 'admin_team'));
    return jsonb_build_object('status', 'assigned', 'userId', v_user, 'role', role_input);
  end if;
  if can_invite is not true then return jsonb_build_object('status', 'invite_unavailable'); end if;
  insert into nilaza_private.admin_team_invite_days as d (actor_id, usage_day, invites) values (actor_input, v_day, 1)
    on conflict (actor_id, usage_day) do update set invites = d.invites + 1
      where d.invites < nilaza_private.admin_team_invite_daily_cap()
    returning d.invites into v_count;
  if v_count is null then raise exception 'admin_team_invite_limit' using errcode = 'NZT05'; end if;
  return jsonb_build_object('status', 'invite_needed', 'email', v_email, 'invitesToday', v_count,
    'inviteDailyCap', nilaza_private.admin_team_invite_daily_cap());
end;
$$;

create or replace function public.admin_team_invite_finish(actor_input uuid, user_id_input uuid, role_input text,
  confirm_owner boolean default false)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_roles text[];
  v_result jsonb;
begin
  if actor_input is null or not nilaza_private.roles_have_capability(nilaza_private.roles_of(actor_input), 'roles.manage') then
    raise exception 'Not authorized' using errcode = '42501';
  end if;
  if role_input is null or not (role_input = any(nilaza_private.admin_role_list())) then
    raise exception 'invalid_admin_role' using errcode = '22023';
  end if;
  if role_input = 'owner' and confirm_owner is not true then
    raise exception 'admin_team_owner_confirm_required' using errcode = 'NZT03';
  end if;
  if user_id_input is null then raise exception 'admin_member_not_found' using errcode = 'NZT04'; end if;
  if user_id_input = actor_input then raise exception 'admin_team_self_change' using errcode = 'NZT01'; end if;
  v_roles := nilaza_private.roles_of(user_id_input);
  if cardinality(v_roles) > 0 then
    return jsonb_build_object('status', 'already_member', 'userId', user_id_input, 'roles', to_jsonb(v_roles));
  end if;
  v_result := nilaza_private.admin_team_apply_role(actor_input, user_id_input, role_input);
  insert into public.admin_audit_logs(admin_user_id, action, target_table, target_id, metadata)
    values (actor_input, 'role.invite', 'auth.users', user_id_input, jsonb_build_object('role', role_input,
      'previousRoles', v_result->'previousRoles', 'invited', true, 'source', 'admin_team'));
  return jsonb_build_object('status', 'invited', 'userId', user_id_input, 'role', role_input);
end;
$$;

revoke all on function public.admin_team_invite_begin(uuid, text, text, boolean, boolean),
  public.admin_team_invite_finish(uuid, uuid, text, boolean) from public, anon, authenticated;
grant execute on function public.admin_team_invite_begin(uuid, text, text, boolean, boolean),
  public.admin_team_invite_finish(uuid, uuid, text, boolean) to service_role;

comment on function public.list_admin_team() is 'Admin Thành viên & quyền (14/11): staff accounts with roles and auth timestamps; roles.manage only.';
comment on function nilaza_private.roles_have_capability(text[], text) is 'The single role -> capability map (moved unchanged from has_capability, 20260902131408).';
commit;

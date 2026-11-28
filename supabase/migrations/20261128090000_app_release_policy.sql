-- Owner decisions 27-28/11/2026 (docs/proposals/STARTUP_GATE_SERVER_CONTENT_2026-11-27.vi.md, "Việc 1"): every app start
-- asks the server once, before showing content, for the minimum app version and the published Free / Premium switch.
-- Record: docs/feature-plans/startup-gate-2026-11-28.json.
-- - public.app_release_policies: versioned minimum app version + grace days (one active row). An app older than the
--   minimum keeps working for grace_days days after effective_at with a reminder and a Google Play button; after that
--   it shows "Cần cập nhật". min_version null means "no minimum" (no reminder, no block).
-- - set_app_release_policy(min_version, grace_days, reason): Owner only (ai.manage), reason 10-500 characters, audited
--   in admin_audit_logs as app_release_policy.set with the previous and the new value.
-- - get_app_release_policies(): Admin reader (ai.read): current row and recent history with who / when / why.
-- - get_app_bootstrap(): anon + authenticated, read-only, no user data: {serverTime, releasePolicy, featureAccess}.
--   featureAccess is exactly public.get_feature_access_config() (20261127090000), so that migration must be applied
--   first. One RPC, no Edge Function: nothing to deploy.
-- The app treats a missing function, an error or a timeout as "server unreachable" (24-hour offline window), so the
-- Android build that calls get_app_bootstrap must not ship before this file is applied.
-- Nothing is applied by this file on its own: it needs Owner approval to run.
-- Rollback (Owner-approved; apps then see the bootstrap as unreachable and fall back to the 24-hour offline rule, so
-- roll back only together with a build that no longer calls it):
--   drop function if exists public.get_app_bootstrap(), public.get_app_release_policies(),
--     public.set_app_release_policy(text,integer,text), nilaza_private.app_release_policy_json(public.app_release_policies);
--   drop table if exists public.app_release_policies;
--   (admin_audit_logs rows written by set_app_release_policy stay as history.)
create table public.app_release_policies (
  id uuid primary key default gen_random_uuid(),
  version integer not null unique check (version >= 1),
  status text not null default 'active' check (status in ('active','archived')),
  -- Strict three-part version, digits only, no leading zeros (0.1.3, 1.10.0). Null = no minimum.
  min_version text check (min_version is null or min_version ~ '^(0|[1-9][0-9]{0,5})\.(0|[1-9][0-9]{0,5})\.(0|[1-9][0-9]{0,5})$'),
  grace_days integer not null check (grace_days between 0 and 30),
  reason text not null check (char_length(reason) between 10 and 500),
  effective_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create unique index app_release_policies_one_active on public.app_release_policies((true)) where status = 'active';
alter table public.app_release_policies enable row level security;
-- No policies: clients never read or write the table directly; Admin goes through the RPCs below and the app reads the
-- active row through get_app_bootstrap().
revoke all on table public.app_release_policies from public, anon, authenticated, service_role;
grant select on table public.app_release_policies to service_role;
comment on table public.app_release_policies is 'Versioned minimum app version and grace days (one active row). Read by the app through get_app_bootstrap(); written only by set_app_release_policy (Owner, audited).';

-- Admin JSON shape of one row (camelCase). The email lets Admin show who set it.
create function nilaza_private.app_release_policy_json(row_input public.app_release_policies) returns jsonb
language sql stable set search_path = '' as $$
  select jsonb_build_object(
    'id', row_input.id, 'version', row_input.version, 'status', row_input.status,
    'minVersion', row_input.min_version, 'graceDays', row_input.grace_days, 'reason', row_input.reason,
    'effectiveAt', row_input.effective_at, 'createdAt', row_input.created_at,
    'createdBy', row_input.created_by, 'createdByEmail', (select u.email from auth.users u where u.id = row_input.created_by));
$$;

-- Sets a new active policy and archives the previous one. min_version_input: 'x.y.z' (digits, no leading zeros) or
-- null / blank to clear the minimum. grace_days_input: 0-30 whole days counted from now. reason: 10-500 characters.
-- Needs ai.manage (Owner). Audited as app_release_policy.set.
create function public.set_app_release_policy(min_version_input text, grace_days_input integer, reason_input text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  actor uuid := auth.uid();
  clean_version text := nullif(btrim(coalesce(min_version_input, '')), '');
  clean_reason text := btrim(coalesce(reason_input, ''));
  previous public.app_release_policies;
  result public.app_release_policies;
  next_version integer;
begin
  if actor is null or not nilaza_private.has_capability('ai.manage') then raise exception 'Not authorized' using errcode='42501'; end if;
  if clean_version is not null and clean_version !~ '^(0|[1-9][0-9]{0,5})\.(0|[1-9][0-9]{0,5})\.(0|[1-9][0-9]{0,5})$' then
    raise exception 'invalid_app_release_policy' using errcode='22023', detail = 'min_version';
  end if;
  if grace_days_input is null or grace_days_input not between 0 and 30 then
    raise exception 'invalid_app_release_policy' using errcode='22023', detail = 'grace_days';
  end if;
  if char_length(clean_reason) not between 10 and 500 then
    raise exception 'invalid_app_release_policy' using errcode='22023', detail = 'reason';
  end if;
  perform pg_advisory_xact_lock(hashtext('app_release_policies')::bigint);
  select * into previous from public.app_release_policies where status = 'active' for update;
  select coalesce(max(version), 0) + 1 into next_version from public.app_release_policies;
  update public.app_release_policies set status = 'archived' where status = 'active';
  insert into public.app_release_policies(version, status, min_version, grace_days, reason, created_by)
    values(next_version, 'active', clean_version, grace_days_input, clean_reason, actor)
    returning * into result;
  insert into public.admin_audit_logs(admin_user_id,action,target_table,target_id,metadata)
    values(actor,'app_release_policy.set','app_release_policies',result.id,
      jsonb_build_object('version',result.version,'minVersion',result.min_version,'graceDays',result.grace_days,
        'reason',clean_reason,'effectiveAt',result.effective_at,'previousVersion',previous.version,
        'previousMinVersion',previous.min_version,'previousGraceDays',previous.grace_days));
  return nilaza_private.app_release_policy_json(result);
end;
$$;

-- Admin view: {current: <active row>|null, history: [up to 20 rows, newest first]}. Needs ai.read.
create function public.get_app_release_policies() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  if auth.uid() is null or not nilaza_private.has_capability('ai.read') then raise exception 'Not authorized' using errcode='42501'; end if;
  return jsonb_build_object(
    'current', (select nilaza_private.app_release_policy_json(t) from public.app_release_policies t where t.status = 'active' limit 1),
    'history', coalesce((select jsonb_agg(nilaza_private.app_release_policy_json(h) order by h.version desc)
      from (select * from public.app_release_policies order by version desc limit 20) h), '[]'::jsonb));
end;
$$;

-- The one read the app makes at start (guest or signed in). Public configuration and server time only, no user data:
-- releasePolicy is null when nothing is set or the minimum was cleared; featureAccess is get_feature_access_config().
create function public.get_app_bootstrap() returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'serverTime', now(),
    'releasePolicy', (select jsonb_build_object('minVersion', t.min_version, 'graceDays', t.grace_days, 'effectiveAt', t.effective_at)
      from public.app_release_policies t where t.status = 'active' and t.min_version is not null limit 1),
    'featureAccess', public.get_feature_access_config());
$$;

comment on function public.set_app_release_policy(text,integer,text) is 'Sets the minimum app version (null clears it) and grace days 0-30. ai.manage only; reason 10-500 characters. Audited as app_release_policy.set.';
comment on function public.get_app_release_policies() is 'Current minimum app version policy and recent history for Admin. ai.read only.';
comment on function public.get_app_bootstrap() is 'App start check (anon and authenticated): server time, minimum app version policy and the published Free / Premium config. No user data.';

revoke all on function nilaza_private.app_release_policy_json(public.app_release_policies) from public, anon, authenticated;
revoke all on function public.set_app_release_policy(text,integer,text), public.get_app_release_policies(),
  public.get_app_bootstrap() from public, anon, authenticated;
grant execute on function public.set_app_release_policy(text,integer,text), public.get_app_release_policies() to authenticated;
grant execute on function public.get_app_bootstrap() to anon, authenticated;

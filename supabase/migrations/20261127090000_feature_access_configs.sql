-- Owner decision 27/11/2026 (docs/proposals/NEW_REFLECTION_MODALITIES_2026-11-27.vi.md section 10): Admin sets, per
-- on-device reflection feature, whether it is Free or Premium and the free / premium limits (per day, per item per day,
-- retake after N days, unlimited). Admin edits it Draft -> Publish (Owner only, reason required) like
-- ai_persona_model_tiers (20261125100000), sees a change log and can roll back to the previous version in one step.
-- Code defaults and bounds: packages/agent-config/feature-access.json. nilaza_private.feature_access_spec() mirrors them
-- and scripts/admin-feature-access.test.mjs keeps the JSON, this SQL, the Admin copy and the app copy equal.
-- The app reads only the active row through get_feature_access_config() (anon + authenticated, no user data in it),
-- caches it and refreshes about every 5 minutes; no row, no function, offline or a malformed copy keeps the built-in
-- defaults, so this migration changes nothing in the app until a version is published.
-- Rules kept by the app, not by this table: switching a feature to Premium never deletes or hides what a user already
-- saved; Premium accounts keep access; a feature turned off elsewhere (ai_feature_switches or a release flag) is never
-- turned back on by this table. Existing AI features are not editable here (their quotas stay in the Edge Functions).
-- Admin RPCs: get_feature_access_configs, save_feature_access_draft, publish_feature_access_config,
-- rollback_feature_access_config, get_feature_access_audience. All writes are audited in admin_audit_logs
-- (feature_access.draft / .publish / .rollback) with the previous and new config and the reason.
-- Nothing is applied by this file on its own: it needs Owner approval to run.
-- Rollback (Owner-approved; the app falls back to its built-in defaults once the function is gone):
--   drop function if exists public.get_feature_access_config(), public.get_feature_access_audience(),
--     public.rollback_feature_access_config(integer,text), public.publish_feature_access_config(integer,integer,text),
--     public.save_feature_access_draft(jsonb,text), public.get_feature_access_configs(),
--     nilaza_private.feature_access_json(public.feature_access_configs), nilaza_private.feature_access_errors(jsonb),
--     nilaza_private.feature_access_limit_errors(text,text,jsonb), nilaza_private.feature_access_spec();
--   drop table if exists public.feature_access_configs;
--   (admin_audit_logs rows written by these RPCs stay as history.)
create table public.feature_access_configs (
  id uuid primary key default gen_random_uuid(),
  version integer not null unique check (version >= 1),
  status text not null default 'draft' check (status in ('draft','active','archived')),
  config jsonb not null check (jsonb_typeof(config) = 'object'),
  note text check (note is null or char_length(note) <= 500),
  restored_from_version integer check (restored_from_version is null or restored_from_version >= 1),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_by uuid references auth.users(id) on delete set null,
  published_at timestamptz,
  constraint feature_access_configs_published check (status = 'draft' or (published_at is not null and published_by is not null))
);
create unique index feature_access_configs_one_active on public.feature_access_configs((true)) where status = 'active';
create unique index feature_access_configs_one_draft on public.feature_access_configs((true)) where status = 'draft';
alter table public.feature_access_configs enable row level security;
-- No policies: clients never read or write the table directly; Admin goes through the RPCs below and the app reads the
-- active config through get_feature_access_config().
revoke all on table public.feature_access_configs from public, anon, authenticated, service_role;
grant select on table public.feature_access_configs to service_role;
comment on table public.feature_access_configs is 'Versioned Free / Premium switch and limits per on-device reflection feature (draft/active/archived, one active). Read by the app through get_feature_access_config(); written only by save_feature_access_draft, publish_feature_access_config and rollback_feature_access_config (audited).';

-- Must equal packages/agent-config/feature-access.json (tiers, limitKinds, bounds, editableFeatures, allowedKinds;
-- test-checked).
create function nilaza_private.feature_access_spec() returns jsonb
language sql immutable set search_path = '' as $$
  select $spec${
    "tiers": ["free", "premium"],
    "limitKinds": ["unlimited", "per_day", "per_item_per_day", "retake_after_days"],
    "bounds": {
      "count": {"min": 1, "max": 100},
      "days": {"min": 1, "max": 365}
    },
    "editableFeatures": ["book_quote", "boi_kieu", "rune_draw", "big_five", "enneagram"],
    "allowedKinds": {
      "book_quote": ["per_item_per_day", "per_day", "unlimited"],
      "boi_kieu": ["per_day", "unlimited"],
      "rune_draw": ["per_day", "unlimited"],
      "big_five": ["retake_after_days", "unlimited"],
      "enneagram": ["retake_after_days", "unlimited"]
    }
  }$spec$::jsonb;
$$;

-- Problems in one limit ({kind, count?|days?}) of one feature, as codes prefixed with "<feature>:<side>:".
-- unlimited takes no other key; per_day / per_item_per_day need a whole count; retake_after_days needs whole days.
create function nilaza_private.feature_access_limit_errors(feature_input text, side_input text, limit_input jsonb) returns text[]
language plpgsql immutable set search_path = '' as $$
declare
  spec jsonb := nilaza_private.feature_access_spec();
  prefix text := feature_input || ':' || side_input || ':';
  errors text[] := '{}';
  kind text; amount_key text; amount jsonb; n numeric; key text;
begin
  if limit_input is null or jsonb_typeof(limit_input) <> 'object' then return array[prefix || 'not_object']; end if;
  if jsonb_typeof(limit_input -> 'kind') is distinct from 'string' or not (spec -> 'limitKinds') ? (limit_input ->> 'kind') then
    return array[prefix || 'kind'];
  end if;
  kind := limit_input ->> 'kind';
  if not (spec -> 'allowedKinds' -> feature_input) ? kind then errors := errors || (prefix || 'kind_not_allowed'); end if;
  amount_key := case kind when 'per_day' then 'count' when 'per_item_per_day' then 'count' when 'retake_after_days' then 'days' else null end;
  for key in select jsonb_object_keys(limit_input) loop
    if key <> 'kind' and key is distinct from amount_key then errors := errors || (prefix || 'unknown_key:' || left(key, 40)); end if;
  end loop;
  if amount_key is not null then
    amount := limit_input -> amount_key;
    if amount is null or jsonb_typeof(amount) <> 'number' then
      errors := errors || (prefix || amount_key);
    else
      n := (amount #>> '{}')::numeric;
      if n <> trunc(n) or n < (spec -> 'bounds' -> amount_key ->> 'min')::numeric or n > (spec -> 'bounds' -> amount_key ->> 'max')::numeric then
        errors := errors || (prefix || amount_key);
      end if;
    end if;
  end if;
  return errors;
end;
$$;

-- Every problem in an Admin payload, as short codes; empty means the config is valid. The config must name every
-- editable feature exactly once: {"features": {"<id>": {"tier": "free"|"premium", "free": limit, "premium": limit}}}.
create function nilaza_private.feature_access_errors(config_input jsonb) returns text[]
language plpgsql immutable set search_path = '' as $$
declare
  spec jsonb := nilaza_private.feature_access_spec();
  errors text[] := '{}';
  features jsonb; feature_id text; feature jsonb; key text;
begin
  if config_input is null or jsonb_typeof(config_input) <> 'object' then return array['config_not_object']; end if;
  for key in select jsonb_object_keys(config_input) loop
    if key <> 'features' then errors := errors || ('unknown_key:' || left(key, 40)); end if;
  end loop;
  features := config_input -> 'features';
  if features is null or jsonb_typeof(features) <> 'object' then return errors || 'features_not_object'::text; end if;
  for feature_id in select jsonb_array_elements_text(spec -> 'editableFeatures') loop
    if not features ? feature_id then errors := errors || ('feature_missing:' || feature_id); end if;
  end loop;
  for feature_id, feature in select * from jsonb_each(features) loop
    if not (spec -> 'editableFeatures') ? feature_id then errors := errors || ('unknown_feature:' || left(feature_id, 40)); continue; end if;
    if jsonb_typeof(feature) <> 'object' then errors := errors || (feature_id || ':not_object'); continue; end if;
    for key in select jsonb_object_keys(feature) loop
      if key not in ('tier', 'free', 'premium') then errors := errors || (feature_id || ':unknown_key:' || left(key, 40)); end if;
    end loop;
    if jsonb_typeof(feature -> 'tier') is distinct from 'string' or not (spec -> 'tiers') ? (feature ->> 'tier') then
      errors := errors || (feature_id || ':tier');
    end if;
    errors := errors || nilaza_private.feature_access_limit_errors(feature_id, 'free', feature -> 'free');
    errors := errors || nilaza_private.feature_access_limit_errors(feature_id, 'premium', feature -> 'premium');
  end loop;
  return errors;
end;
$$;

-- Admin JSON shape of one row (camelCase), shared by the RPCs. Emails let the change log show who acted.
create function nilaza_private.feature_access_json(row_input public.feature_access_configs) returns jsonb
language sql stable set search_path = '' as $$
  select jsonb_build_object(
    'id', row_input.id, 'version', row_input.version, 'status', row_input.status, 'config', row_input.config,
    'note', row_input.note, 'restoredFromVersion', row_input.restored_from_version,
    'createdBy', row_input.created_by, 'createdByEmail', (select u.email from auth.users u where u.id = row_input.created_by),
    'createdAt', row_input.created_at, 'updatedAt', row_input.updated_at,
    'publishedBy', row_input.published_by, 'publishedByEmail', (select u.email from auth.users u where u.id = row_input.published_by),
    'publishedAt', row_input.published_at);
$$;

-- Every version, newest first. Needs ai.read.
create function public.get_feature_access_configs() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  if auth.uid() is null or not nilaza_private.has_capability('ai.read') then raise exception 'Not authorized' using errcode='42501'; end if;
  return coalesce((select jsonb_agg(nilaza_private.feature_access_json(t) order by t.version desc)
    from public.feature_access_configs t), '[]'::jsonb);
end;
$$;

-- Creates or replaces the single draft. config_input is the whole config; it is refused with the list of problems when
-- invalid. note: optional, at most 500 characters. Needs ai.manage, or ai.read plus content.draft (editor). Publishing
-- stays ai.manage (Owner) only.
create function public.save_feature_access_draft(config_input jsonb, note_input text default null) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  actor uuid := auth.uid();
  clean_note text := nullif(btrim(coalesce(note_input, '')), '');
  problems text[];
  result public.feature_access_configs;
  next_version integer;
begin
  if actor is null or not (nilaza_private.has_capability('ai.manage')
    or (nilaza_private.has_capability('ai.read') and nilaza_private.has_capability('content.draft'))) then
    raise exception 'Not authorized' using errcode='42501';
  end if;
  if clean_note is not null and char_length(clean_note) > 500 then raise exception 'invalid_feature_access' using errcode='22023'; end if;
  problems := nilaza_private.feature_access_errors(config_input);
  if cardinality(problems) > 0 then
    raise exception 'invalid_feature_access' using errcode='22023', detail = left(array_to_string(problems, ', '), 1000);
  end if;

  perform pg_advisory_xact_lock(hashtext('feature_access_configs')::bigint);
  update public.feature_access_configs set config=config_input, note=clean_note, created_by=actor, updated_at=now()
    where status='draft' returning * into result;
  if not found then
    select coalesce(max(version), 0) + 1 into next_version from public.feature_access_configs;
    insert into public.feature_access_configs(version, status, config, note, created_by)
      values(next_version, 'draft', config_input, clean_note, actor)
      returning * into result;
  end if;
  insert into public.admin_audit_logs(admin_user_id,action,target_table,target_id,metadata)
    values(actor,'feature_access.draft','feature_access_configs',result.id,
      jsonb_build_object('version',result.version,'config',result.config));
  return nilaza_private.feature_access_json(result);
end;
$$;

-- Publishes the draft with this version number: the active version becomes archived and the draft becomes active, in one
-- transaction. expected_active_version is the active version the Owner reviewed (null = none yet); a different active
-- version means someone else published meanwhile and the call is refused (40001) so nothing is overwritten unseen.
-- The draft is validated again. reason: 10-500 characters, stored as the version note. Needs ai.manage (Owner).
create function public.publish_feature_access_config(version_input integer, expected_active_version integer, reason_input text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  actor uuid := auth.uid();
  clean_reason text := btrim(coalesce(reason_input, ''));
  draft public.feature_access_configs;
  result public.feature_access_configs;
  previous public.feature_access_configs;
begin
  if actor is null or not nilaza_private.has_capability('ai.manage') then raise exception 'Not authorized' using errcode='42501'; end if;
  if version_input is null or char_length(clean_reason) not between 10 and 500 then
    raise exception 'invalid_feature_access' using errcode='22023';
  end if;
  perform pg_advisory_xact_lock(hashtext('feature_access_configs')::bigint);
  select * into previous from public.feature_access_configs where status='active' for update;
  if previous.version is distinct from expected_active_version then
    raise exception 'feature_access_conflict' using errcode='40001';
  end if;
  select * into draft from public.feature_access_configs where version=version_input for update;
  if not found or draft.status <> 'draft' then raise exception 'feature_access_not_draft' using errcode='22023'; end if;
  if cardinality(nilaza_private.feature_access_errors(draft.config)) > 0 then
    raise exception 'invalid_feature_access' using errcode='22023';
  end if;
  update public.feature_access_configs set status='archived', updated_at=now()
    where status='active';
  update public.feature_access_configs set status='active', note=clean_reason, published_by=actor, published_at=now(), updated_at=now()
    where id=draft.id returning * into result;
  insert into public.admin_audit_logs(admin_user_id,action,target_table,target_id,metadata)
    values(actor,'feature_access.publish','feature_access_configs',result.id,
      jsonb_build_object('version',result.version,'archivedVersion',previous.version,'reason',clean_reason,
        'config',result.config,'previousConfig',previous.config));
  return nilaza_private.feature_access_json(result) || jsonb_build_object('archivedVersion', previous.version);
end;
$$;

-- One-step rollback: the version that was active just before the current one (the archived version published most
-- recently) is copied into a new active version, and the current one is archived. History is never rewritten, so a
-- rollback is itself a version in the change log (restoredFromVersion). The draft, if any, is left untouched.
-- expected_active_version must equal the current active version (40001 otherwise); no earlier version -> P0002.
-- reason: 10-500 characters. Needs ai.manage (Owner).
create function public.rollback_feature_access_config(expected_active_version integer, reason_input text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  actor uuid := auth.uid();
  clean_reason text := btrim(coalesce(reason_input, ''));
  current_row public.feature_access_configs;
  source_row public.feature_access_configs;
  result public.feature_access_configs;
  next_version integer;
begin
  if actor is null or not nilaza_private.has_capability('ai.manage') then raise exception 'Not authorized' using errcode='42501'; end if;
  if expected_active_version is null or char_length(clean_reason) not between 10 and 500 then
    raise exception 'invalid_feature_access' using errcode='22023';
  end if;
  perform pg_advisory_xact_lock(hashtext('feature_access_configs')::bigint);
  select * into current_row from public.feature_access_configs where status='active' for update;
  if not found or current_row.version <> expected_active_version then
    raise exception 'feature_access_conflict' using errcode='40001';
  end if;
  select * into source_row from public.feature_access_configs
    where status='archived' and published_at is not null
    order by published_at desc, version desc limit 1;
  if not found then raise exception 'feature_access_no_previous_version' using errcode='P0002'; end if;
  if cardinality(nilaza_private.feature_access_errors(source_row.config)) > 0 then
    raise exception 'invalid_feature_access' using errcode='22023';
  end if;
  select coalesce(max(version), 0) + 1 into next_version from public.feature_access_configs;
  update public.feature_access_configs set status='archived', updated_at=now() where id=current_row.id;
  insert into public.feature_access_configs(version, status, config, note, restored_from_version, created_by, published_by, published_at)
    values(next_version, 'active', source_row.config, clean_reason, source_row.version, actor, actor, now())
    returning * into result;
  insert into public.admin_audit_logs(admin_user_id,action,target_table,target_id,metadata)
    values(actor,'feature_access.rollback','feature_access_configs',result.id,
      jsonb_build_object('version',result.version,'archivedVersion',current_row.version,
        'restoredFromVersion',source_row.version,'reason',clean_reason,
        'config',result.config,'previousConfig',current_row.config));
  return nilaza_private.feature_access_json(result) || jsonb_build_object('archivedVersion', current_row.version);
end;
$$;

-- How many accounts a Free / Premium change can reach: all accounts, accounts with a paid Premium entitlement (same rule
-- as supabase/functions/_shared/premium-entitlement.ts isPremiumEntitled) and the rest. Counts only, no ids or emails.
-- The account tier switch (account-tier-policy.json, all_premium during closed testing) is shown by Admin next to it.
-- Needs ai.read.
create function public.get_feature_access_audience() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  total_count bigint;
  premium_count bigint;
begin
  if auth.uid() is null or not nilaza_private.has_capability('ai.read') then raise exception 'Not authorized' using errcode='42501'; end if;
  select count(*) into total_count from auth.users;
  select count(distinct s.user_id) into premium_count from public.subscriptions s
    where s.entitlement in ('premium', 'premium_astrology_ai')
      and ((s.status in ('active', 'trialing') and (s.current_period_end is null or s.current_period_end > now()))
        or (s.status in ('canceled', 'past_due') and s.current_period_end is not null and s.current_period_end > now()));
  return jsonb_build_object('totalAccounts', total_count, 'premiumAccounts', premium_count,
    'freeAccounts', greatest(total_count - premium_count, 0), 'countedAt', now());
end;
$$;

-- The published config for the app: {version, publishedAt, config} of the active row, or null when nothing is published.
-- It holds no user data, so guests (anon) may read it too; the app validates it again and keeps its defaults otherwise.
create function public.get_feature_access_config() returns jsonb
language sql stable security definer set search_path = '' as $$
  select (select jsonb_build_object('version', t.version, 'publishedAt', t.published_at, 'config', t.config)
    from public.feature_access_configs t where t.status = 'active' limit 1);
$$;

comment on function public.save_feature_access_draft(jsonb,text) is 'Saves the single draft of the Free / Premium feature access config. Allowed for ai.manage or ai.read+content.draft (editors); publishing stays ai.manage only. Audited as feature_access.draft.';
comment on function public.publish_feature_access_config(integer,integer,text) is 'Publishes the feature access draft and archives the previous active version. ai.manage only; reason 10-500 characters; refused (40001) when the active version is not the expected one. Audited as feature_access.publish.';
comment on function public.rollback_feature_access_config(integer,text) is 'Restores the previously active feature access config as a new active version. ai.manage only; reason 10-500 characters. Audited as feature_access.rollback.';
comment on function public.get_feature_access_audience() is 'Counts all accounts and accounts with a paid Premium entitlement, for the Admin preview. ai.read only; counts, no personal data.';
comment on function public.get_feature_access_config() is 'Active feature access config for the app (anon and authenticated); null when nothing is published.';

revoke all on function nilaza_private.feature_access_spec(), nilaza_private.feature_access_limit_errors(text,text,jsonb),
  nilaza_private.feature_access_errors(jsonb), nilaza_private.feature_access_json(public.feature_access_configs)
  from public, anon, authenticated;
revoke all on function public.get_feature_access_configs(), public.save_feature_access_draft(jsonb,text),
  public.publish_feature_access_config(integer,integer,text), public.rollback_feature_access_config(integer,text),
  public.get_feature_access_audience(), public.get_feature_access_config() from public, anon, authenticated;
grant execute on function public.get_feature_access_configs(), public.save_feature_access_draft(jsonb,text),
  public.publish_feature_access_config(integer,integer,text), public.rollback_feature_access_config(integer,text),
  public.get_feature_access_audience() to authenticated;
grant execute on function public.get_feature_access_config() to anon, authenticated;

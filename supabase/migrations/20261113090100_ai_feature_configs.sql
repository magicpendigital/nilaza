-- Admin redesign A4 (spec ADMIN_SCREENS_SPEC_2026-11-04, row D2; Owner decisions 04/11): versioned settings per AI
-- feature. Edge Functions read only the active row (service key, short cache); with no active row, no table or a read
-- error they keep the code defaults (account-tier-policy.json and the 40 s / 60 s model wait), so this migration
-- changes nothing until a version is published.
-- Columns read today: quota_daily (all six features), follow_ups (ai_council), deadline_ms (total model wait).
-- Stored for later steps and not applied yet: quota_group (counters stay grouped in code: Chat+Oracle share one),
-- cost_cap_micro (A7), copy (app keeps its own messages), gate_status / gate_bypass_reason (release gate, A6).
-- Context variables, voice knobs and safety rules are A5; eval tables are A6.
create table public.ai_feature_configs (
  id uuid primary key default gen_random_uuid(),
  feature text not null check (feature in ('persona_chat','oracle_router','tarot_reading','daily_insight','astrology_insight','ai_council')),
  version integer not null check (version >= 1),
  status text not null default 'draft' check (status in ('draft','active','archived')),
  quota_daily integer check (quota_daily is null or quota_daily between 1 and 100),
  quota_group text check (quota_group is null or quota_group ~ '^[a-z][a-z0-9_]{2,39}$'),
  follow_ups integer check (follow_ups is null or follow_ups between 0 and 10),
  -- Total time for all model attempts of one request; stays under the 150 s Edge Function limit.
  deadline_ms integer check (deadline_ms is null or deadline_ms between 5000 and 140000),
  -- Micro-USD per request (Owner 04/11: 0.02 USD = 20000).
  cost_cap_micro bigint check (cost_cap_micro is null or cost_cap_micro between 1 and 1000000),
  copy jsonb not null default '{}'::jsonb check (jsonb_typeof(copy) = 'object'),
  note text check (note is null or char_length(note) <= 500),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_by uuid references auth.users(id) on delete set null,
  published_at timestamptz,
  gate_status text not null default 'not_run' check (gate_status in ('not_run','passed','bypassed_pending','bypassed_scored')),
  gate_bypass_reason text check (gate_bypass_reason is null or gate_bypass_reason in ('restore_passed_version','urgent_safety_fix')),
  constraint ai_feature_configs_feature_version_key unique (feature, version),
  constraint ai_feature_configs_follow_ups_council check (follow_ups is null or feature = 'ai_council'),
  constraint ai_feature_configs_published check (status = 'draft' or (published_at is not null and published_by is not null))
);
create unique index ai_feature_configs_one_active on public.ai_feature_configs(feature) where status = 'active';
create unique index ai_feature_configs_one_draft on public.ai_feature_configs(feature) where status = 'draft';
alter table public.ai_feature_configs enable row level security;
-- No policies: clients never read or write the table directly; Admin goes through the RPCs below and
-- Edge Functions read active rows with the service key.
revoke all on table public.ai_feature_configs from public, anon, authenticated;
grant select on table public.ai_feature_configs to service_role;
comment on table public.ai_feature_configs is 'Versioned AI feature settings (draft/active/archived, one active per feature). Read by Edge Functions with the service key; written only by save_ai_feature_config_draft and publish_ai_feature_config (ai.manage, audited).';

-- Admin JSON shape of one row (camelCase), shared by the three RPCs.
create function nilaza_private.ai_feature_config_json(row_input public.ai_feature_configs) returns jsonb
language sql stable set search_path = '' as $$
  select jsonb_build_object(
    'id', row_input.id, 'feature', row_input.feature, 'version', row_input.version, 'status', row_input.status,
    'quotaDaily', row_input.quota_daily, 'quotaGroup', row_input.quota_group, 'followUps', row_input.follow_ups,
    'deadlineMs', row_input.deadline_ms, 'costCapMicro', row_input.cost_cap_micro, 'copy', row_input.copy,
    'note', row_input.note, 'createdBy', row_input.created_by, 'createdAt', row_input.created_at,
    'updatedAt', row_input.updated_at, 'publishedBy', row_input.published_by, 'publishedAt', row_input.published_at,
    'gateStatus', row_input.gate_status, 'gateBypassReason', row_input.gate_bypass_reason);
$$;

-- Whole number from a payload field: absent or JSON null means "use the code default" (null).
create function nilaza_private.ai_feature_config_int(value_input jsonb, min_input bigint, max_input bigint) returns bigint
language plpgsql immutable set search_path = '' as $$
declare n numeric;
begin
  if value_input is null or jsonb_typeof(value_input) = 'null' then return null; end if;
  if jsonb_typeof(value_input) <> 'number' then raise exception 'invalid_feature_config' using errcode='22023'; end if;
  n := (value_input #>> '{}')::numeric;
  if n <> trunc(n) or n < min_input or n > max_input then raise exception 'invalid_feature_config' using errcode='22023'; end if;
  return n::bigint;
end;
$$;

-- copy: {} or {quotaExhausted?: {vi, en}, paused?: {vi, en}}; each text 1-300 characters after trimming.
create function nilaza_private.ai_feature_config_copy(value_input jsonb) returns jsonb
language plpgsql immutable set search_path = '' as $$
declare k text; entry jsonb; lang text; result jsonb := '{}'::jsonb;
begin
  if value_input is null or jsonb_typeof(value_input) = 'null' then return '{}'::jsonb; end if;
  if jsonb_typeof(value_input) <> 'object' then raise exception 'invalid_feature_config' using errcode='22023'; end if;
  for k in select jsonb_object_keys(value_input) loop
    if k not in ('quotaExhausted','paused') then raise exception 'invalid_feature_config' using errcode='22023'; end if;
    entry := value_input -> k;
    if jsonb_typeof(entry) <> 'object' or (select count(*) from jsonb_object_keys(entry)) <> 2 then
      raise exception 'invalid_feature_config' using errcode='22023';
    end if;
    foreach lang in array array['vi','en'] loop
      if jsonb_typeof(entry -> lang) is distinct from 'string' or char_length(btrim(entry ->> lang)) not between 1 and 300 then
        raise exception 'invalid_feature_config' using errcode='22023';
      end if;
    end loop;
    result := result || jsonb_build_object(k, jsonb_build_object('vi', btrim(entry ->> 'vi'), 'en', btrim(entry ->> 'en')));
  end loop;
  return result;
end;
$$;

-- Every version of every feature, newest first within a feature. Needs ai.read.
create function public.get_ai_feature_configs() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  if auth.uid() is null or not nilaza_private.has_capability('ai.read') then raise exception 'Not authorized' using errcode='42501'; end if;
  return coalesce((select jsonb_agg(nilaza_private.ai_feature_config_json(c) order by c.feature, c.version desc)
    from public.ai_feature_configs c), '[]'::jsonb);
end;
$$;

-- Creates or replaces the single draft of a feature. payload describes the whole draft: a missing or null field
-- means "use the code default". Allowed keys: quotaDaily, quotaGroup, followUps (ai_council only), deadlineMs,
-- costCapMicro, copy, note. Unknown keys are refused so an Admin typo cannot be silently ignored. Needs ai.manage.
create function public.save_ai_feature_config_draft(feature_input text, payload jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  actor uuid := auth.uid();
  result public.ai_feature_configs;
  v_quota integer; v_group text; v_follow integer; v_deadline integer; v_cost bigint; v_copy jsonb; v_note text;
  next_version integer;
begin
  if actor is null or not nilaza_private.has_capability('ai.manage') then raise exception 'Not authorized' using errcode='42501'; end if;
  if feature_input is null or feature_input not in ('persona_chat','oracle_router','tarot_reading','daily_insight','astrology_insight','ai_council')
    or payload is null or jsonb_typeof(payload) <> 'object'
    or exists (select 1 from jsonb_object_keys(payload) k where k not in ('quotaDaily','quotaGroup','followUps','deadlineMs','costCapMicro','copy','note')) then
    raise exception 'invalid_feature_config' using errcode='22023';
  end if;
  v_quota := nilaza_private.ai_feature_config_int(payload -> 'quotaDaily', 1, 100);
  v_follow := nilaza_private.ai_feature_config_int(payload -> 'followUps', 0, 10);
  v_deadline := nilaza_private.ai_feature_config_int(payload -> 'deadlineMs', 5000, 140000);
  v_cost := nilaza_private.ai_feature_config_int(payload -> 'costCapMicro', 1, 1000000);
  v_copy := nilaza_private.ai_feature_config_copy(payload -> 'copy');
  if v_follow is not null and feature_input <> 'ai_council' then raise exception 'invalid_feature_config' using errcode='22023'; end if;
  if payload ? 'quotaGroup' and jsonb_typeof(payload -> 'quotaGroup') <> 'null' then
    if jsonb_typeof(payload -> 'quotaGroup') <> 'string' or (payload ->> 'quotaGroup') !~ '^[a-z][a-z0-9_]{2,39}$' then
      raise exception 'invalid_feature_config' using errcode='22023';
    end if;
    v_group := payload ->> 'quotaGroup';
  end if;
  if payload ? 'note' and jsonb_typeof(payload -> 'note') <> 'null' then
    if jsonb_typeof(payload -> 'note') <> 'string' or char_length(btrim(payload ->> 'note')) > 500 then
      raise exception 'invalid_feature_config' using errcode='22023';
    end if;
    v_note := nullif(btrim(payload ->> 'note'), '');
  end if;

  perform pg_advisory_xact_lock(hashtext('ai_feature_configs:' || feature_input)::bigint);
  update public.ai_feature_configs set quota_daily=v_quota, quota_group=v_group, follow_ups=v_follow, deadline_ms=v_deadline,
      cost_cap_micro=v_cost, copy=v_copy, note=v_note, created_by=actor, updated_at=now()
    where feature=feature_input and status='draft' returning * into result;
  if not found then
    select coalesce(max(version), 0) + 1 into next_version from public.ai_feature_configs where feature=feature_input;
    insert into public.ai_feature_configs(feature, version, status, quota_daily, quota_group, follow_ups, deadline_ms, cost_cap_micro, copy, note, created_by)
      values(feature_input, next_version, 'draft', v_quota, v_group, v_follow, v_deadline, v_cost, v_copy, v_note, actor)
      returning * into result;
  end if;
  insert into public.admin_audit_logs(admin_user_id,action,target_table,target_id,metadata)
    values(actor,'ai.feature_config.draft','ai_feature_configs',result.id,
      jsonb_build_object('feature',result.feature,'version',result.version,'quotaDaily',result.quota_daily,'followUps',result.follow_ups,
        'deadlineMs',result.deadline_ms,'costCapMicro',result.cost_cap_micro));
  return nilaza_private.ai_feature_config_json(result);
end;
$$;

-- Publishes the feature's draft with this version number: the previous active version becomes archived and the
-- draft becomes active, in one transaction. Active and archived rows never change content; to restore an older
-- version, save a draft with its values and publish that. note: 10-500 characters, kept on the row and in the
-- audit log. The release gate (gate_status) is recorded but not enforced until the eval step (A6). Needs ai.manage.
create function public.publish_ai_feature_config(feature_input text, version_input integer, note_input text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  actor uuid := auth.uid();
  clean_note text := btrim(coalesce(note_input, ''));
  draft public.ai_feature_configs;
  result public.ai_feature_configs;
  previous_version integer;
begin
  if actor is null or not nilaza_private.has_capability('ai.manage') then raise exception 'Not authorized' using errcode='42501'; end if;
  if feature_input is null or feature_input not in ('persona_chat','oracle_router','tarot_reading','daily_insight','astrology_insight','ai_council')
    or version_input is null or char_length(clean_note) not between 10 and 500 then
    raise exception 'invalid_feature_config' using errcode='22023';
  end if;
  perform pg_advisory_xact_lock(hashtext('ai_feature_configs:' || feature_input)::bigint);
  select * into draft from public.ai_feature_configs where feature=feature_input and version=version_input for update;
  if not found or draft.status <> 'draft' then raise exception 'feature_config_not_draft' using errcode='22023'; end if;
  update public.ai_feature_configs set status='archived', updated_at=now()
    where feature=feature_input and status='active' returning version into previous_version;
  update public.ai_feature_configs set status='active', note=clean_note, published_by=actor, published_at=now(), updated_at=now()
    where id=draft.id returning * into result;
  insert into public.admin_audit_logs(admin_user_id,action,target_table,target_id,metadata)
    values(actor,'ai.feature_config.publish','ai_feature_configs',result.id,
      jsonb_build_object('feature',result.feature,'version',result.version,'archivedVersion',previous_version,'note',clean_note,
        'quotaDaily',result.quota_daily,'followUps',result.follow_ups,'deadlineMs',result.deadline_ms,'costCapMicro',result.cost_cap_micro,
        'gateStatus',result.gate_status));
  return nilaza_private.ai_feature_config_json(result) || jsonb_build_object('archivedVersion', previous_version);
end;
$$;

revoke all on function nilaza_private.ai_feature_config_json(public.ai_feature_configs),
  nilaza_private.ai_feature_config_int(jsonb,bigint,bigint), nilaza_private.ai_feature_config_copy(jsonb)
  from public, anon, authenticated;
revoke all on function public.get_ai_feature_configs(), public.save_ai_feature_config_draft(text,jsonb),
  public.publish_ai_feature_config(text,integer,text) from public, anon, authenticated;
grant execute on function public.get_ai_feature_configs(), public.save_ai_feature_config_draft(text,jsonb),
  public.publish_ai_feature_config(text,integer,text) to authenticated;

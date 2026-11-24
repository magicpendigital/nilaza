-- Model campaigns (proposal TAROT_NOTE_READER_ROUTER_CAMPAIGNS_2026-11-23 section 3).
--
-- A campaign splits the users of one AI feature between 2-4 model routes ("variants") by a stable hash of
-- campaign id + user id. Admin creates a draft, starts, pauses or ends it, reads per-variant counts and publishes
-- the winning route through the existing nilaza_private.publish_model_route_config (the only route publish path).
--
-- Route shape of a variant: {"steps": [step, ...], "total_deadline_ms": integer | null}; a step is the snake_case step
-- of the route publish contract and is checked by nilaza_private.model_route_steps_valid.
--
-- Access: both tables have RLS on and no grants to anon or authenticated; they are written only by the admin RPCs
-- below (ai.manage) and read by the admin RPCs (ai.read) and by runtime_model_campaign_for_feature (service_role only).
-- The metrics RPC returns counts and rates per variant; no user id, question or answer leaves the database.
--
-- Trace tagging: the runtime adds campaignId and variant to ai_trace_runs.metadata (see _shared/ai-trace.ts
-- ANSWER_METADATA_KEYS). Product signals arrive in usage_events (feature 'product_signal') with the same two keys.
--
-- Depends on 20261124090000 for the tarot_note and reader_router route features (publishing a winner for those two
-- needs that migration). Nothing is applied by this file on its own.
--
-- Rollback:
--   drop function if exists public.admin_get_model_campaign_metrics(uuid);
--   drop function if exists public.admin_list_model_campaigns(text);
--   drop function if exists public.admin_pick_model_campaign_winner(jsonb);
--   drop function if exists public.admin_set_model_campaign_status(uuid, text, text);
--   drop function if exists public.admin_save_model_campaign_draft(jsonb);
--   drop function if exists public.runtime_model_campaign_for_feature(text);
--   drop function if exists nilaza_private.model_campaign_route_valid(jsonb);
--   drop function if exists nilaza_private.model_campaign_feature_valid(text);
--   drop index if exists public.ai_trace_runs_campaign_idx;
--   drop index if exists public.usage_events_product_signal_campaign_idx;
--   drop table if exists public.model_campaign_variants;
--   drop table if exists public.model_campaigns;
begin;

create or replace function nilaza_private.model_campaign_feature_valid(feature_input text) returns boolean
language sql immutable set search_path = '' as $$
  select coalesce(feature_input in ('oracle_router','persona_chat','ai_council','tarot_reading','daily_insight',
    'astrology_report','tarot_note','reader_router'), false);
$$;

-- {"steps": [...1-4 steps], "total_deadline_ms": 5000-140000 | null}. Unknown keys are refused; no step may wait
-- longer than the total deadline.
create or replace function nilaza_private.model_campaign_route_valid(route_input jsonb) returns boolean
language plpgsql immutable set search_path = '' as $$
declare
  deadline numeric;
begin
  if jsonb_typeof(route_input) is distinct from 'object'
    or exists(select 1 from jsonb_object_keys(route_input) k where k not in ('steps','total_deadline_ms'))
    or jsonb_typeof(route_input->'steps') is distinct from 'array'
    or not nilaza_private.model_route_steps_valid(route_input->'steps') then
    return false;
  end if;
  if route_input ? 'total_deadline_ms' and jsonb_typeof(route_input->'total_deadline_ms') <> 'null' then
    if jsonb_typeof(route_input->'total_deadline_ms') <> 'number' then return false; end if;
    deadline := (route_input->>'total_deadline_ms')::numeric;
    if deadline <> trunc(deadline) or deadline < 5000 or deadline > 140000 then return false; end if;
    if exists(select 1 from jsonb_array_elements(route_input->'steps') s where (s->>'timeout_ms')::numeric > deadline) then
      return false;
    end if;
  end if;
  return true;
exception when others then
  return false;
end;
$$;

revoke all on function nilaza_private.model_campaign_feature_valid(text) from public, anon;
revoke all on function nilaza_private.model_campaign_route_valid(jsonb) from public, anon;
grant execute on function nilaza_private.model_campaign_feature_valid(text) to authenticated, service_role;
grant execute on function nilaza_private.model_campaign_route_valid(jsonb) to authenticated, service_role;

create table if not exists public.model_campaigns (
  id uuid primary key default gen_random_uuid(),
  feature text not null check (nilaza_private.model_campaign_feature_valid(feature)),
  name text not null check (length(btrim(name)) between 3 and 120),
  status text not null default 'draft' check (status in ('draft','running','paused','ended')),
  starts_at timestamptz,
  ends_at timestamptz,
  audience jsonb not null default '{"signedInOnly": true}'::jsonb check (jsonb_typeof(audience) = 'object'),
  stop_rules jsonb not null default '{}'::jsonb check (jsonb_typeof(stop_rules) = 'object'),
  winner_variant text check (winner_variant is null or winner_variant in ('A','B','C','D')),
  winner_route_id uuid,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  started_at timestamptz,
  ended_at timestamptz,
  constraint model_campaigns_dates_check check (starts_at is null or ends_at is null or ends_at > starts_at)
);

create table if not exists public.model_campaign_variants (
  campaign_id uuid not null references public.model_campaigns(id) on delete cascade,
  key text not null check (key in ('A','B','C','D')),
  label text not null check (length(btrim(label)) between 1 and 80),
  route jsonb not null check (nilaza_private.model_campaign_route_valid(route)),
  traffic_percent integer not null check (traffic_percent between 1 and 99),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (campaign_id, key)
);

-- At most one running campaign per feature, so the runtime never has to choose between two.
create unique index if not exists model_campaigns_one_running_per_feature
  on public.model_campaigns(feature) where status = 'running';
create index if not exists model_campaigns_feature_created_idx on public.model_campaigns(feature, created_at desc);
create index if not exists ai_trace_runs_campaign_idx
  on public.ai_trace_runs((metadata->>'campaignId'), (metadata->>'variant')) where metadata ? 'campaignId';
create index if not exists usage_events_product_signal_campaign_idx
  on public.usage_events((metadata->>'campaignId'), (metadata->>'variant'), event_name) where feature = 'product_signal';

alter table public.model_campaigns enable row level security;
alter table public.model_campaign_variants enable row level security;
revoke all on public.model_campaigns from public, anon, authenticated;
revoke all on public.model_campaign_variants from public, anon, authenticated;
grant select on public.model_campaigns to service_role;
grant select on public.model_campaign_variants to service_role;

-- One campaign with its variants as JSON, for the admin RPCs and the runtime.
create or replace function nilaza_private.model_campaign_json(campaign public.model_campaigns) returns jsonb
language sql stable set search_path = '' as $$
  select jsonb_build_object(
    'id', campaign.id, 'feature', campaign.feature, 'name', campaign.name, 'status', campaign.status,
    'startsAt', campaign.starts_at, 'endsAt', campaign.ends_at, 'audience', campaign.audience,
    'stopRules', campaign.stop_rules, 'winnerVariant', campaign.winner_variant, 'winnerRouteId', campaign.winner_route_id,
    'createdAt', campaign.created_at, 'updatedAt', campaign.updated_at, 'startedAt', campaign.started_at,
    'endedAt', campaign.ended_at,
    'variants', coalesce((select jsonb_agg(jsonb_build_object('key', v.key, 'label', v.label, 'route', v.route,
      'trafficPercent', v.traffic_percent) order by v.key)
      from public.model_campaign_variants v where v.campaign_id = campaign.id), '[]'::jsonb));
$$;
revoke all on function nilaza_private.model_campaign_json(public.model_campaigns) from public, anon, authenticated;
grant execute on function nilaza_private.model_campaign_json(public.model_campaigns) to service_role;

-- Create or update a draft. payload: {id?, feature, name, starts_at?, ends_at?, audience?, stop_rules?,
-- variants: [{key, label, route, traffic_percent}]}. Variants are replaced as a whole; traffic must total 100.
create or replace function public.admin_save_model_campaign_draft(payload jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  campaign public.model_campaigns;
  target_id uuid;
  feature_name text := payload->>'feature';
  campaign_name text := btrim(coalesce(payload->>'name', ''));
  start_at timestamptz;
  end_at timestamptz;
  audience_input jsonb := coalesce(nullif(payload->'audience', 'null'::jsonb), '{"signedInOnly": true}'::jsonb);
  rules_input jsonb := coalesce(nullif(payload->'stop_rules', 'null'::jsonb), '{}'::jsonb);
  variants_input jsonb := payload->'variants';
  variant_count integer;
  traffic_total integer;
begin
  if auth.uid() is null or not nilaza_private.has_capability('ai.manage') then
    raise exception 'Not authorized' using errcode = '42501';
  end if;
  if jsonb_typeof(payload) is distinct from 'object'
    or exists(select 1 from jsonb_object_keys(payload) k
      where k not in ('id','feature','name','starts_at','ends_at','audience','stop_rules','variants'))
    or not nilaza_private.model_campaign_feature_valid(feature_name)
    or length(campaign_name) not between 3 and 120
    or jsonb_typeof(variants_input) is distinct from 'array' then
    raise exception 'Invalid campaign' using errcode = '22023';
  end if;
  begin
    start_at := nullif(payload->>'starts_at', '')::timestamptz;
    end_at := nullif(payload->>'ends_at', '')::timestamptz;
  exception when others then
    raise exception 'Invalid campaign dates' using errcode = '22023';
  end;
  if start_at is not null and end_at is not null and end_at <= start_at then
    raise exception 'Invalid campaign dates' using errcode = '22023';
  end if;
  -- audience: {signedInOnly: boolean, locales?: ['vi'|'en'] (1-2, distinct)}
  if jsonb_typeof(audience_input) is distinct from 'object'
    or exists(select 1 from jsonb_object_keys(audience_input) k where k not in ('signedInOnly','locales'))
    or (audience_input ? 'signedInOnly' and jsonb_typeof(audience_input->'signedInOnly') <> 'boolean')
    or (audience_input ? 'locales' and (jsonb_typeof(audience_input->'locales') <> 'array'
      or jsonb_array_length(audience_input->'locales') not between 1 and 2
      or exists(select 1 from jsonb_array_elements(audience_input->'locales') l
        where jsonb_typeof(l) <> 'string' or l #>> '{}' not in ('vi','en'))
      or (select count(*) <> count(distinct l) from jsonb_array_elements_text(audience_input->'locales') l))) then
    raise exception 'Invalid campaign audience' using errcode = '22023';
  end if;
  -- stop_rules: {maxFormatFailRate?: 0..1, maxCostMultiplier?: 1..10}
  if jsonb_typeof(rules_input) is distinct from 'object'
    or exists(select 1 from jsonb_object_keys(rules_input) k where k not in ('maxFormatFailRate','maxCostMultiplier'))
    or (rules_input ? 'maxFormatFailRate' and (jsonb_typeof(rules_input->'maxFormatFailRate') <> 'number'
      or (rules_input->>'maxFormatFailRate')::numeric not between 0 and 1))
    or (rules_input ? 'maxCostMultiplier' and (jsonb_typeof(rules_input->'maxCostMultiplier') <> 'number'
      or (rules_input->>'maxCostMultiplier')::numeric not between 1 and 10)) then
    raise exception 'Invalid campaign stop rules' using errcode = '22023';
  end if;
  variant_count := jsonb_array_length(variants_input);
  if variant_count not between 2 and 4
    or exists(select 1 from jsonb_array_elements(variants_input) v
      where jsonb_typeof(v) <> 'object'
        or exists(select 1 from jsonb_object_keys(v) k where k not in ('key','label','route','traffic_percent'))
        or coalesce(v->>'key' not in ('A','B','C','D'), true)
        or coalesce(length(btrim(v->>'label')) not between 1 and 80, true)
        or jsonb_typeof(v->'traffic_percent') is distinct from 'number'
        or (v->>'traffic_percent')::numeric <> trunc((v->>'traffic_percent')::numeric)
        or (v->>'traffic_percent')::numeric not between 1 and 99
        or not nilaza_private.model_campaign_route_valid(v->'route'))
    or (select count(distinct v->>'key') from jsonb_array_elements(variants_input) v) <> variant_count then
    raise exception 'Invalid campaign variants' using errcode = '22023';
  end if;
  select sum((v->>'traffic_percent')::integer) into traffic_total from jsonb_array_elements(variants_input) v;
  if traffic_total <> 100 then
    raise exception 'Variant traffic must total 100' using errcode = '22023';
  end if;

  if payload ? 'id' and jsonb_typeof(payload->'id') <> 'null' then
    begin
      target_id := (payload->>'id')::uuid;
    exception when others then
      raise exception 'Invalid campaign id' using errcode = '22023';
    end;
    select * into campaign from public.model_campaigns where id = target_id for update;
    if not found then raise exception 'Campaign not found' using errcode = 'P0002'; end if;
    if campaign.status <> 'draft' then
      raise exception 'Only a draft campaign can be edited' using errcode = '40001';
    end if;
    update public.model_campaigns set feature = feature_name, name = campaign_name, starts_at = start_at,
      ends_at = end_at, audience = audience_input, stop_rules = rules_input, updated_by = auth.uid(), updated_at = now()
      where id = target_id returning * into campaign;
    delete from public.model_campaign_variants where model_campaign_variants.campaign_id = campaign.id;
  else
    insert into public.model_campaigns(feature, name, starts_at, ends_at, audience, stop_rules, created_by, updated_by)
      values(feature_name, campaign_name, start_at, end_at, audience_input, rules_input, auth.uid(), auth.uid())
      returning * into campaign;
  end if;
  insert into public.model_campaign_variants(campaign_id, key, label, route, traffic_percent)
    select campaign.id, v->>'key', btrim(v->>'label'), v->'route', (v->>'traffic_percent')::integer
    from jsonb_array_elements(variants_input) v;
  insert into public.admin_audit_logs(admin_user_id, action, target_table, target_id, metadata)
    values(auth.uid(), 'ai.model_campaign.save_draft', 'model_campaigns', campaign.id,
      jsonb_build_object('feature', feature_name, 'name', campaign_name, 'variantCount', variant_count,
        'traffic', (select jsonb_object_agg(v->>'key', (v->>'traffic_percent')::integer) from jsonb_array_elements(variants_input) v),
        'startsAt', start_at, 'endsAt', end_at, 'audience', audience_input, 'stopRules', rules_input));
  return nilaza_private.model_campaign_json(campaign);
end;
$$;

-- start: draft|paused -> running; pause: running -> paused; end: draft|running|paused -> ended.
create or replace function public.admin_set_model_campaign_status(campaign_id uuid, action text, note text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  campaign public.model_campaigns;
  previous_status text;
  variant_count integer;
  traffic_total integer;
begin
  if auth.uid() is null or not nilaza_private.has_capability('ai.manage') then
    raise exception 'Not authorized' using errcode = '42501';
  end if;
  if action is null or action not in ('start','pause','end') or (note is not null and length(note) > 500) then
    raise exception 'Invalid campaign action' using errcode = '22023';
  end if;
  select * into campaign from public.model_campaigns where id = campaign_id for update;
  if not found then raise exception 'Campaign not found' using errcode = 'P0002'; end if;
  previous_status := campaign.status;
  if action = 'start' then
    if campaign.status not in ('draft','paused') then
      raise exception 'Campaign cannot start from this status' using errcode = '40001';
    end if;
    if campaign.ends_at is not null and campaign.ends_at <= now() then
      raise exception 'Campaign end date has passed' using errcode = '22023';
    end if;
    select count(*), coalesce(sum(traffic_percent), 0) into variant_count, traffic_total
      from public.model_campaign_variants v where v.campaign_id = campaign.id;
    if variant_count not between 2 and 4 or traffic_total <> 100 then
      raise exception 'Variant traffic must total 100' using errcode = '22023';
    end if;
    begin
      update public.model_campaigns set status = 'running', started_at = coalesce(started_at, now()),
        updated_by = auth.uid(), updated_at = now() where id = campaign.id returning * into campaign;
    exception when unique_violation then
      raise exception 'Another campaign is already running for this feature' using errcode = '23505';
    end;
  elsif action = 'pause' then
    if campaign.status <> 'running' then
      raise exception 'Only a running campaign can be paused' using errcode = '40001';
    end if;
    update public.model_campaigns set status = 'paused', updated_by = auth.uid(), updated_at = now()
      where id = campaign.id returning * into campaign;
  else
    if campaign.status = 'ended' then
      raise exception 'Campaign already ended' using errcode = '40001';
    end if;
    update public.model_campaigns set status = 'ended', ended_at = now(), updated_by = auth.uid(), updated_at = now()
      where id = campaign.id returning * into campaign;
  end if;
  insert into public.admin_audit_logs(admin_user_id, action, target_table, target_id, metadata)
    values(auth.uid(), 'ai.model_campaign.' || action, 'model_campaigns', campaign.id,
      jsonb_build_object('feature', campaign.feature, 'from', previous_status, 'to', campaign.status, 'note', note));
  return nilaza_private.model_campaign_json(campaign);
end;
$$;

-- payload: {campaign_id, variant, note (10-500), expected_active_id (uuid|null), publish_request_id?, version?,
-- response_schema?}. Publishes the variant route as the active route through publish_model_route_config, which
-- checks ai.manage, compare-and-swaps on expected_active_id and writes its own audit row; then ends the campaign.
-- response_schema, fallback_when and safety_policy are kept from the active route; with no active route the caller's
-- response_schema or the feature default (tarot_note_output_v1, reader_router_choice_v1) is used. primary, fallback,
-- temperature and max_output_tokens come from the chat steps only: a reader_router chain may start with a decision step.
create or replace function public.admin_pick_model_campaign_winner(payload jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  campaign public.model_campaigns;
  chosen public.model_campaign_variants;
  active public.model_route_versions;
  target_id uuid;
  variant_key text := payload->>'variant';
  publish_note text := btrim(coalesce(payload->>'note', ''));
  request_id uuid;
  route_version text;
  steps jsonb;
  chat_steps jsonb;
  config jsonb;
  published jsonb;
begin
  if auth.uid() is null or not nilaza_private.has_capability('ai.manage') then
    raise exception 'Not authorized' using errcode = '42501';
  end if;
  if jsonb_typeof(payload) is distinct from 'object'
    or exists(select 1 from jsonb_object_keys(payload) k where k not in ('campaign_id','variant','note',
      'expected_active_id','publish_request_id','version','response_schema'))
    or not (payload ? 'expected_active_id')
    or coalesce(variant_key not in ('A','B','C','D'), true)
    or length(publish_note) not between 10 and 500
    or (payload ? 'version' and coalesce(length(btrim(payload->>'version')) not between 1 and 96, true))
    or (payload ? 'response_schema' and coalesce(length(btrim(payload->>'response_schema')) not between 1 and 96, true)) then
    raise exception 'Invalid winner request' using errcode = '22023';
  end if;
  begin
    target_id := (payload->>'campaign_id')::uuid;
    request_id := coalesce(nullif(payload->>'publish_request_id', '')::uuid, gen_random_uuid());
  exception when others then
    raise exception 'Invalid winner request' using errcode = '22023';
  end;
  select * into campaign from public.model_campaigns where id = target_id for update;
  if not found then raise exception 'Campaign not found' using errcode = 'P0002'; end if;
  if campaign.status = 'draft' or campaign.winner_variant is not null then
    raise exception 'Campaign cannot pick a winner from this status' using errcode = '40001';
  end if;
  select * into chosen from public.model_campaign_variants v where v.campaign_id = campaign.id and v.key = variant_key;
  if not found then raise exception 'Variant not found' using errcode = 'P0002'; end if;
  select * into active from public.model_route_versions r where r.feature = campaign.feature and r.status = 'active'
    order by r.published_at desc nulls last limit 1;
  steps := chosen.route->'steps';
  select coalesce(jsonb_agg(e.step order by e.ord), '[]'::jsonb) into chat_steps
    from jsonb_array_elements(steps) with ordinality as e(step, ord)
    where e.step->>'provider' not in ('openrouter_decisions','openai_decisions','gemini_decisions');
  if jsonb_array_length(chat_steps) = 0 then
    raise exception 'The winning route needs a chat step' using errcode = '22023';
  end if;
  route_version := coalesce(nullif(btrim(payload->>'version'), ''),
    'campaign-' || left(campaign.id::text, 8) || '-' || chosen.key);
  config := jsonb_build_object(
    'contract_version', 'model_route_publish_v2',
    'publish_request_id', request_id,
    'expected_active_id', payload->'expected_active_id',
    'feature', campaign.feature,
    'version', route_version,
    'status', 'active',
    'primary', jsonb_build_object('provider', chat_steps->0->>'provider', 'model', chat_steps->0->>'model'),
    'fallback', case when jsonb_array_length(chat_steps) > 1
      then jsonb_build_object('provider', chat_steps->1->>'provider', 'model', chat_steps->1->>'model') else 'null'::jsonb end,
    'temperature', chat_steps->0->'temperature',
    'max_output_tokens', chat_steps->0->'max_tokens',
    'response_schema', coalesce(nullif(btrim(payload->>'response_schema'), ''), active.response_schema,
      case campaign.feature when 'tarot_note' then 'tarot_note_output_v1' when 'reader_router' then 'reader_router_choice_v1' end),
    'fallback_when', coalesce(to_jsonb(active.fallback_when),
      '["provider_timeout","rate_limit","provider_5xx","malformed_response"]'::jsonb),
    'safety_policy', coalesce(active.safety_policy, '{}'::jsonb),
    'steps', steps,
    'total_deadline_ms', coalesce(chosen.route->'total_deadline_ms', 'null'::jsonb),
    'note', publish_note);
  if config->>'response_schema' is null then
    raise exception 'response_schema is required when the feature has no active route' using errcode = '22023';
  end if;
  published := nilaza_private.publish_model_route_config(config);
  update public.model_campaigns set status = 'ended', ended_at = coalesce(ended_at, now()), winner_variant = chosen.key,
    winner_route_id = (published->>'id')::uuid, updated_by = auth.uid(), updated_at = now()
    where id = campaign.id returning * into campaign;
  insert into public.admin_audit_logs(admin_user_id, action, target_table, target_id, metadata)
    values(auth.uid(), 'ai.model_campaign.pick_winner', 'model_campaigns', campaign.id,
      jsonb_build_object('feature', campaign.feature, 'variant', chosen.key, 'routeId', published->>'id',
        'routeVersion', route_version, 'publishRequestId', request_id, 'note', publish_note));
  return jsonb_build_object('campaign', nilaza_private.model_campaign_json(campaign), 'route', published);
end;
$$;

create or replace function public.admin_list_model_campaigns(feature_filter text default null) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  if auth.uid() is null or not nilaza_private.has_capability('ai.read') then
    raise exception 'Not authorized' using errcode = '42501';
  end if;
  if feature_filter is not null and not nilaza_private.model_campaign_feature_valid(feature_filter) then
    raise exception 'Invalid feature' using errcode = '22023';
  end if;
  return coalesce((select jsonb_agg(nilaza_private.model_campaign_json(c) order by c.created_at desc)
    from public.model_campaigns c
    where c.id in (select m.id from public.model_campaigns m
      where feature_filter is null or m.feature = feature_filter
      order by m.created_at desc limit 100)), '[]'::jsonb);
end;
$$;

-- Counts and rates per variant. Trace rows are matched on metadata campaignId + variant; product signals on
-- usage_events (feature product_signal) with the same keys. No user id, text or per-user row is returned.
create or replace function public.admin_get_model_campaign_metrics(campaign_id uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  campaign public.model_campaigns;
  result jsonb;
begin
  if auth.uid() is null or not nilaza_private.has_capability('ai.read') then
    raise exception 'Not authorized' using errcode = '42501';
  end if;
  select * into campaign from public.model_campaigns where id = campaign_id;
  if not found then raise exception 'Campaign not found' using errcode = 'P0002'; end if;
  with runs as (
    select r.id, r.status, r.metadata->>'variant' as variant
    from public.ai_trace_runs r
    where r.metadata ? 'campaignId' and r.metadata->>'campaignId' = campaign.id::text
      and r.metadata->>'variant' in ('A','B','C','D')
  ),
  run_calls as (
    select runs.id, runs.variant, runs.status,
      coalesce(sum(c.cost_micro), 0) as cost_micro,
      bool_or(coalesce(c.fallback_used, false)) as model_fallback
    from runs left join nilaza_private.ai_cost_calls c on c.run_id = runs.id
    group by runs.id, runs.variant, runs.status
  ),
  run_spans as (
    select runs.id,
      extract(epoch from (max(s.ended_at) - min(s.started_at))) * 1000 as latency_ms,
      bool_or(s.attributes->>'errorClass' = 'format' or s.attributes->>'outcome' = 'rejected_format') as format_fail
    from runs join public.ai_trace_spans s on s.run_id = runs.id
    group by runs.id
  ),
  per_variant as (
    select rc.variant,
      count(*) as calls,
      round(avg(rc.cost_micro)) as avg_cost_micro,
      round((percentile_cont(0.95) within group (order by rs.latency_ms))::numeric) as p95_latency_ms,
      count(*) filter (where coalesce(rs.format_fail, false)) as format_fail_calls,
      count(*) filter (where rc.model_fallback) as model_fallback_calls,
      count(*) filter (where rc.status = 'fallback') as canned_fallback_calls,
      count(*) filter (where rc.status = 'error') as error_calls,
      count(*) filter (where rc.status = 'blocked') as blocked_calls
    from run_calls rc left join run_spans rs on rs.id = rc.id
    group by rc.variant
  ),
  signals as (
    select e.metadata->>'variant' as variant,
      count(*) filter (where e.event_name = 'tarot_note_feedback' and e.metadata->>'value' = 'yes') as note_yes,
      count(*) filter (where e.event_name = 'tarot_note_feedback' and e.metadata->>'value' = 'no') as note_no,
      count(*) filter (where e.event_name = 'tarot_report_opened') as report_opened,
      count(*) filter (where e.event_name = 'reader_suggestion_shown') as suggestion_shown,
      count(*) filter (where e.event_name = 'reader_suggestion_accepted') as suggestion_accepted,
      count(*) filter (where e.event_name = 'reader_mismatch_switched') as mismatch_switched,
      count(*) filter (where e.event_name = 'tarot_followup_started') as followup_started
    from public.usage_events e
    where e.feature = 'product_signal' and e.metadata->>'campaignId' = campaign.id::text
    group by e.metadata->>'variant'
  )
  select coalesce(jsonb_agg(jsonb_build_object(
      'variant', v.key, 'label', v.label, 'trafficPercent', v.traffic_percent,
      'calls', coalesce(p.calls, 0),
      'enoughData', coalesce(p.calls, 0) >= 100,
      'avgCostMicro', p.avg_cost_micro,
      'p95LatencyMs', p.p95_latency_ms,
      'formatFailCalls', coalesce(p.format_fail_calls, 0),
      'modelFallbackCalls', coalesce(p.model_fallback_calls, 0),
      'cannedFallbackCalls', coalesce(p.canned_fallback_calls, 0),
      'errorCalls', coalesce(p.error_calls, 0),
      'blockedCalls', coalesce(p.blocked_calls, 0),
      'noteFeedbackYes', coalesce(sg.note_yes, 0),
      'noteFeedbackNo', coalesce(sg.note_no, 0),
      'reportOpened', coalesce(sg.report_opened, 0),
      'readerSuggestionShown', coalesce(sg.suggestion_shown, 0),
      'readerSuggestionAccepted', coalesce(sg.suggestion_accepted, 0),
      'readerMismatchSwitched', coalesce(sg.mismatch_switched, 0),
      'followupStarted', coalesce(sg.followup_started, 0)) order by v.key), '[]'::jsonb)
    into result
  from public.model_campaign_variants v
  left join per_variant p on p.variant = v.key
  left join signals sg on sg.variant = v.key
  where v.campaign_id = campaign.id;
  return jsonb_build_object('campaignId', campaign.id, 'feature', campaign.feature, 'status', campaign.status,
    'minCalls', 100, 'variants', result, 'generatedAt', now());
end;
$$;

-- Runtime read: the running campaign of one feature with its variants, or null. service_role only; the caller checks
-- dates and audience against the request and buckets the user.
create or replace function public.runtime_model_campaign_for_feature(feature_input text) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  claims jsonb := coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb, '{}'::jsonb);
  campaign public.model_campaigns;
begin
  if coalesce(coalesce(claims->>'role', current_setting('request.jwt.claim.role', true)) = 'service_role', false) is false then
    raise exception 'Not authorized' using errcode = '42501';
  end if;
  if not nilaza_private.model_campaign_feature_valid(feature_input) then return null; end if;
  select * into campaign from public.model_campaigns m where m.feature = feature_input and m.status = 'running' limit 1;
  if not found then return null; end if;
  return nilaza_private.model_campaign_json(campaign);
end;
$$;

revoke all on function public.admin_save_model_campaign_draft(jsonb) from public, anon;
revoke all on function public.admin_set_model_campaign_status(uuid, text, text) from public, anon;
revoke all on function public.admin_pick_model_campaign_winner(jsonb) from public, anon;
revoke all on function public.admin_list_model_campaigns(text) from public, anon;
revoke all on function public.admin_get_model_campaign_metrics(uuid) from public, anon;
revoke all on function public.runtime_model_campaign_for_feature(text) from public, anon, authenticated;
grant execute on function public.admin_save_model_campaign_draft(jsonb) to authenticated;
grant execute on function public.admin_set_model_campaign_status(uuid, text, text) to authenticated;
grant execute on function public.admin_pick_model_campaign_winner(jsonb) to authenticated;
grant execute on function public.admin_list_model_campaigns(text) to authenticated;
grant execute on function public.admin_get_model_campaign_metrics(uuid) to authenticated;
grant execute on function public.runtime_model_campaign_for_feature(text) to service_role;

commit;

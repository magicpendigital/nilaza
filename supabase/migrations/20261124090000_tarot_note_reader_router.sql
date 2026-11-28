-- Batch C (2026-11-24): the free daily private Tarot note (feature tarot_note) and the AI tier of the reader suggestion
-- (feature reader_router). Nothing is applied by this file on its own: running it needs the Owner's approval.
-- * model_route_versions: features tarot_note and reader_router. Steps may use the decision providers openrouter_decisions,
--   openai_decisions, gemini_decisions (one choice, no text) only when feature = 'reader_router' (table check and publish
--   RPC). The primary/fallback columns stay chat-only and describe the first two chat steps, so a router that ignores
--   steps never calls a decision API.
-- * ai_feature_switches: tarot_note and reader_router (enabled; a missing row is treated as on).
-- * Active routes for both features are inserted only when the feature has no active route (idempotent).
-- * tarot_readings: note, note_created_at, note_claim_token, note_claimed_at. tarot_note_claim (service role only) gives
--   one delivered note per account per Vietnam day, counted apart from interpret; a failed attempt does not use the note
--   and attempts are capped (usage_events tarot_note_attempted). The update trigger keeps the note immutable once written.
-- * jev (typesafe/jev-1.14 via OpenRouter Decisions, alpha): its data policy is not stated in the docs (unverified).
--
-- Rollback (Owner-approved, after redeploying the previous ai-tarot-reading and admin-model-router-config):
--   drop function if exists public.tarot_note_claim(uuid, uuid, uuid, timestamptz, integer, integer, integer);
--   re-run the guard_tarot_reading_update definition from 20261115100000_tarot_reading_lock.sql;
--   update public.model_route_versions set status = 'archived' where feature in ('tarot_note','reader_router');
--   alter table public.model_route_versions drop constraint if exists model_route_versions_decision_steps_check;
--   re-run model_route_steps_valid and publish_model_route_config from 20261113140000_model_route_steps.sql (only after
--   no row keeps a decision step: delete or archive-and-null steps of reader_router rows first);
--   the feature checks may stay widened; the note columns may stay (the previous code ignores them).
begin;

-- 1. Model routes ---------------------------------------------------------------------------------------------------
alter table public.model_route_versions drop constraint if exists model_route_versions_feature_check;
alter table public.model_route_versions add constraint model_route_versions_feature_check
  check (feature in ('oracle_router', 'persona_chat', 'ai_council', 'tarot_reading', 'daily_insight', 'astrology_report',
    'face_reading', 'tarot_note', 'reader_router'));

create or replace function nilaza_private.model_route_steps_valid(steps_input jsonb) returns boolean
language plpgsql immutable set search_path = '' as $$
declare
  step jsonb;
  k text;
  n numeric;
begin
  if steps_input is null then return true; end if;
  if jsonb_typeof(steps_input) <> 'array' or jsonb_array_length(steps_input) not between 1 and 4 then return false; end if;
  for step in select value from jsonb_array_elements(steps_input) loop
    if jsonb_typeof(step) <> 'object' then return false; end if;
    for k in select jsonb_object_keys(step) loop
      if k not in ('provider','model','timeout_ms','max_tokens','temperature','json_mode','reasoning') then return false; end if;
    end loop;
    if coalesce(step->>'provider', '') not in ('openai','openrouter','gemini','anthropic','deepseek',
      'openrouter_decisions','openai_decisions','gemini_decisions') then return false; end if;
    if jsonb_typeof(step->'model') is distinct from 'string' or length(btrim(step->>'model')) not between 1 and 160
      or step->>'model' <> btrim(step->>'model') or step->>'model' ~ '[[:cntrl:][:space:]]' then return false; end if;
    if jsonb_typeof(step->'timeout_ms') is distinct from 'number' then return false; end if;
    n := (step->>'timeout_ms')::numeric;
    if n <> trunc(n) or n < 1000 or n > 140000 then return false; end if;
    if jsonb_typeof(step->'max_tokens') is distinct from 'number' then return false; end if;
    n := (step->>'max_tokens')::numeric;
    if n <> trunc(n) or n < 64 or n > 8192 then return false; end if;
    if jsonb_typeof(step->'temperature') is distinct from 'number' then return false; end if;
    n := (step->>'temperature')::numeric;
    if n < 0 or n > 2 then return false; end if;
    if jsonb_typeof(step->'json_mode') is distinct from 'boolean' then return false; end if;
    if step ? 'reasoning' and jsonb_typeof(step->'reasoning') <> 'null' then
      if jsonb_typeof(step->'reasoning') <> 'object'
        or coalesce(step->'reasoning'->>'mode', '') not in ('off','minimal','low','medium','high') then return false; end if;
      for k in select jsonb_object_keys(step->'reasoning') loop
        if k not in ('mode','maxTokens') then return false; end if;
      end loop;
      if step->'reasoning' ? 'maxTokens' then
        if jsonb_typeof(step->'reasoning'->'maxTokens') <> 'number' then return false; end if;
        n := (step->'reasoning'->>'maxTokens')::numeric;
        if n <> trunc(n) or n < 64 or n > 8192 then return false; end if;
      end if;
    end if;
  end loop;
  return true;
end;
$$;

-- True when any step uses a decision provider.
create or replace function nilaza_private.model_route_steps_have_decision(steps_input jsonb) returns boolean
language sql immutable set search_path = '' as $$
  select coalesce(jsonb_typeof(steps_input) = 'array' and exists(
    select 1 from jsonb_array_elements(steps_input) s
    where s->>'provider' in ('openrouter_decisions','openai_decisions','gemini_decisions')), false);
$$;
revoke all on function nilaza_private.model_route_steps_have_decision(jsonb) from public, anon;
grant execute on function nilaza_private.model_route_steps_have_decision(jsonb) to authenticated, service_role;

alter table public.model_route_versions drop constraint if exists model_route_versions_decision_steps_check;
alter table public.model_route_versions add constraint model_route_versions_decision_steps_check
  check (feature = 'reader_router' or not nilaza_private.model_route_steps_have_decision(steps));

create or replace function nilaza_private.publish_model_route_config(config_input jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  inserted public.model_route_versions;
  prior public.model_route_versions;
  active_id uuid;
  active_count integer;
  expected_id uuid;
  request_id uuid;
  requested_status text := config_input->>'status';
  feature_name text := config_input->>'feature';
  route_version text := config_input->>'version';
  primary_provider_name text := config_input->'primary'->>'provider';
  primary_model_name text := config_input->'primary'->>'model';
  fallback_provider_name text := config_input->'fallback'->>'provider';
  fallback_model_name text := config_input->'fallback'->>'model';
  route_temperature numeric;
  route_max_tokens integer;
  route_steps jsonb := nullif(config_input->'steps', 'null'::jsonb);
  route_deadline integer;
  route_note text;
  chat_steps jsonb;
begin
  if auth.uid() is null or not nilaza_private.has_capability('ai.manage') then
    raise exception 'Not authorized' using errcode = '42501';
  end if;
  if jsonb_typeof(config_input) is distinct from 'object'
    or config_input->>'contract_version' is distinct from 'model_route_publish_v2'
    or not (config_input ? 'expected_active_id')
    or coalesce(config_input->>'publish_request_id', '') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    or coalesce(feature_name not in ('oracle_router','persona_chat','ai_council','tarot_reading','daily_insight','astrology_report',
      'tarot_note','reader_router'), true)
    or coalesce(length(btrim(route_version)) not between 1 and 96, true)
    or coalesce(primary_provider_name not in ('openai','openrouter','gemini','anthropic','deepseek'), true)
    or coalesce(length(btrim(primary_model_name)) not between 1 and 160, true)
    or coalesce(requested_status not in ('active','experimental','draft'), true)
    or jsonb_typeof(config_input->'temperature') is distinct from 'number'
    or jsonb_typeof(config_input->'max_output_tokens') is distinct from 'number'
    or coalesce(length(btrim(config_input->>'response_schema')) not between 1 and 96, true)
    or jsonb_typeof(config_input->'fallback_when') is distinct from 'array'
    or jsonb_typeof(config_input->'safety_policy') is distinct from 'object'
    or length(config_input->>'safety_policy') > 8192
    or not (config_input ? 'fallback') then
    raise exception 'Invalid route configuration v2' using errcode = '22023';
  end if;
  expected_id := (config_input->>'expected_active_id')::uuid;
  request_id := (config_input->>'publish_request_id')::uuid;
  route_temperature := (config_input->>'temperature')::numeric;
  route_max_tokens := (config_input->>'max_output_tokens')::integer;
  if route_temperature < 0 or route_temperature > 2 or route_max_tokens < 64 or route_max_tokens > 8192
    or (config_input->>'max_output_tokens')::numeric <> route_max_tokens
    or (config_input->'fallback' <> 'null'::jsonb and (
      jsonb_typeof(config_input->'fallback') is distinct from 'object'
      or coalesce(fallback_provider_name not in ('openai','openrouter','gemini','anthropic','deepseek'), true)
      or coalesce(length(btrim(fallback_model_name)) not between 1 and 160, true)))
    or jsonb_array_length(config_input->'fallback_when') > 5
    or exists(select 1 from jsonb_array_elements_text(config_input->'fallback_when') r
      where r not in ('missing_api_key','provider_timeout','rate_limit','provider_5xx','malformed_response'))
    or (select count(*) <> count(distinct r) from jsonb_array_elements_text(config_input->'fallback_when') r) then
    raise exception 'Invalid route values' using errcode = '22023';
  end if;
  -- A7 (D3) optional fields. Absent or null keeps the v2 behaviour unchanged.
  if config_input ? 'total_deadline_ms' and jsonb_typeof(config_input->'total_deadline_ms') <> 'null' then
    if jsonb_typeof(config_input->'total_deadline_ms') <> 'number'
      or (config_input->>'total_deadline_ms')::numeric <> trunc((config_input->>'total_deadline_ms')::numeric)
      or (config_input->>'total_deadline_ms')::numeric not between 5000 and 140000 then
      raise exception 'Invalid total deadline' using errcode = '22023';
    end if;
    route_deadline := (config_input->>'total_deadline_ms')::integer;
  end if;
  if config_input ? 'note' and jsonb_typeof(config_input->'note') <> 'null' then
    if jsonb_typeof(config_input->'note') <> 'string' or length(btrim(config_input->>'note')) not between 10 and 500 then
      raise exception 'Invalid publish note' using errcode = '22023';
    end if;
    route_note := btrim(config_input->>'note');
  end if;
  if route_steps is not null then
    if not nilaza_private.model_route_steps_valid(route_steps) then
      raise exception 'Invalid route steps' using errcode = '22023';
    end if;
    -- Batch C: decision providers (a choice, no text) are allowed only in a reader_router chain.
    if feature_name <> 'reader_router' and nilaza_private.model_route_steps_have_decision(route_steps) then
      raise exception 'Decision providers are only allowed for reader_router' using errcode = '22023';
    end if;
    -- The legacy columns are chat-only: they describe the first two chat steps, so an older router (which ignores
    -- steps) never calls a decision API. Without decision steps this is exactly the previous rule.
    select coalesce(jsonb_agg(e.s order by e.i), '[]'::jsonb) into chat_steps
      from jsonb_array_elements(route_steps) with ordinality as e(s, i)
      where e.s->>'provider' not in ('openrouter_decisions','openai_decisions','gemini_decisions');
    if jsonb_array_length(chat_steps) = 0 then
      raise exception 'A route needs at least one chat step' using errcode = '22023';
    end if;
    if chat_steps->0->>'provider' is distinct from primary_provider_name
      or chat_steps->0->>'model' is distinct from primary_model_name
      or (chat_steps->0->>'temperature')::numeric is distinct from route_temperature
      or (chat_steps->0->>'max_tokens')::integer is distinct from route_max_tokens
      or (jsonb_array_length(chat_steps) = 1 and config_input->'fallback' <> 'null'::jsonb)
      or (jsonb_array_length(chat_steps) > 1 and (chat_steps->1->>'provider' is distinct from fallback_provider_name
        or chat_steps->1->>'model' is distinct from fallback_model_name)) then
      raise exception 'Route steps do not match primary and fallback' using errcode = '22023';
    end if;
    if route_deadline is not null and exists(select 1 from jsonb_array_elements(route_steps) s
      where (s->>'timeout_ms')::integer > route_deadline) then
      raise exception 'A step waits longer than the total deadline' using errcode = '22023';
    end if;
    if requested_status = 'active' and route_note is null then
      raise exception 'A publish note is required for a step chain' using errcode = '22023';
    end if;
  end if;
  -- Serialize replay per actor before per-feature CAS, including cross-feature reuse.
  perform pg_advisory_xact_lock(hashtext(auth.uid()::text || ':' || request_id::text)::bigint);
  select * into prior from public.model_route_versions where created_by = auth.uid() and publish_request_id = request_id;
  if found then
    if prior.publish_payload is distinct from config_input then
      raise exception 'Publication request reused with different content' using errcode = '23505';
    end if;
    return jsonb_build_object('id', prior.id, 'version', prior.version, 'status', prior.status,
      'publishRequestId', request_id, 'replayed', true, 'config', to_jsonb(prior) - 'publish_payload');
  end if;
  perform pg_advisory_xact_lock(hashtext(feature_name)::bigint);
  select count(*) into active_count from public.model_route_versions where feature = feature_name and status = 'active';
  if active_count > 1 then raise exception 'Active route is ambiguous' using errcode = '40001'; end if;
  select id into active_id from public.model_route_versions where feature = feature_name and status = 'active' for update;
  if active_id is distinct from expected_id then
    raise exception 'Active route changed since loaded' using errcode = '40001';
  end if;
  if requested_status = 'active' then
    update public.model_route_versions set status = 'archived', updated_at = now()
      where id = active_id;
  end if;
  insert into public.model_route_versions(feature, version, status, primary_provider, primary_model,
    fallback_provider, fallback_model, temperature, max_output_tokens, response_schema, fallback_when,
    safety_policy, created_by, published_by, published_at, publish_request_id, publish_payload, supersedes_version_id,
    steps, total_deadline_ms, publish_note)
  values(feature_name, route_version, requested_status, primary_provider_name, primary_model_name,
    fallback_provider_name, fallback_model_name, route_temperature, route_max_tokens, config_input->>'response_schema',
    array(select jsonb_array_elements_text(config_input->'fallback_when')), config_input->'safety_policy',
    auth.uid(), case when requested_status = 'active' then auth.uid() end,
    case when requested_status = 'active' then now() end, request_id, config_input,
    case when requested_status = 'active' then active_id end,
    route_steps, route_deadline, route_note) returning * into inserted;
  insert into public.admin_audit_logs(admin_user_id, action, target_table, target_id, metadata)
    values(auth.uid(), 'ai.model_route.publish', 'model_route_versions', inserted.id,
      jsonb_build_object('contractVersion','model_route_publish_v2','feature', feature_name,'version',route_version,
        'status',requested_status,'supersedesVersionId',inserted.supersedes_version_id,'publishRequestId',request_id,
        'primary_provider',primary_provider_name,'primary_model',primary_model_name,
        'fallback_provider',fallback_provider_name,'fallback_model',fallback_model_name,
        'response_schema',inserted.response_schema,'temperature',route_temperature,'max_output_tokens',route_max_tokens,
        'stepCount', case when route_steps is null then null else jsonb_array_length(route_steps) end,
        'steps', route_steps, 'totalDeadlineMs', route_deadline, 'note', route_note));
  return jsonb_build_object('id', inserted.id, 'version', inserted.version, 'status', inserted.status,
    'publishRequestId', request_id, 'replayed', false, 'config', to_jsonb(inserted) - 'publish_payload');
end;
$$;

create or replace function public.publish_model_route_config(config_input jsonb)
returns jsonb language sql security invoker set search_path = '' as $$
  select nilaza_private.publish_model_route_config(config_input);
$$;
revoke all on function public.publish_model_route_config(jsonb) from public, anon;
revoke all on function nilaza_private.publish_model_route_config(jsonb) from public, anon;
grant execute on function public.publish_model_route_config(jsonb) to authenticated;
grant execute on function nilaza_private.publish_model_route_config(jsonb) to authenticated;

-- Code defaults (model-router.ts defaultModelRoutes) as the first active rows. Only when no active row exists.
insert into public.model_route_versions(feature, version, status, primary_provider, primary_model, fallback_provider,
  fallback_model, temperature, max_output_tokens, response_schema, fallback_when, safety_policy, published_at, steps,
  total_deadline_ms, publish_note)
select 'tarot_note', '2026-11-24-tarot-note-v1', 'active', 'openrouter', 'deepseek/deepseek-v4.1-flash', 'openrouter',
  'xiaomi/mimo-v2.6-flash', 0.7, 700, 'tarot_note_output_v1',
  array['missing_api_key','provider_timeout','rate_limit','provider_5xx','malformed_response']::text[],
  '{"allowSpiritualReflection":true,"blockDeterministicPredictions":true,"reasoning":{"mode":"off"}}'::jsonb, now(),
  '[{"provider":"openrouter","model":"deepseek/deepseek-v4.1-flash","timeout_ms":20000,"max_tokens":700,"temperature":0.7,"json_mode":true,"reasoning":{"mode":"off"}},
    {"provider":"openrouter","model":"xiaomi/mimo-v2.6-flash","timeout_ms":20000,"max_tokens":700,"temperature":0.7,"json_mode":true,"reasoning":{"mode":"off"}}]'::jsonb,
  40000, 'Batch C 2026-11-24: first route of the private Tarot note.'
where not exists (select 1 from public.model_route_versions where feature = 'tarot_note' and status = 'active')
on conflict (feature, version) do nothing;

insert into public.model_route_versions(feature, version, status, primary_provider, primary_model, fallback_provider,
  fallback_model, temperature, max_output_tokens, response_schema, fallback_when, safety_policy, published_at, steps,
  total_deadline_ms, publish_note)
select 'reader_router', '2026-11-24-reader-router-v1', 'active', 'openrouter', 'deepseek/deepseek-v4.1-flash', null, null,
  0.2, 200, 'reader_router_choice_v1',
  array['missing_api_key','provider_timeout','rate_limit','provider_5xx','malformed_response']::text[],
  '{"decisionOnly":true,"reasoning":{"mode":"off"}}'::jsonb, now(),
  '[{"provider":"openrouter_decisions","model":"typesafe/jev-1.14","timeout_ms":3000,"max_tokens":64,"temperature":0,"json_mode":false,"reasoning":null},
    {"provider":"openrouter","model":"deepseek/deepseek-v4.1-flash","timeout_ms":3000,"max_tokens":200,"temperature":0.2,"json_mode":true,"reasoning":{"mode":"off"}}]'::jsonb,
  5000, 'Batch C 2026-11-24: reader suggestion, decision model then chat; the 4 s budget is enforced in code.'
where not exists (select 1 from public.model_route_versions where feature = 'reader_router' and status = 'active')
on conflict (feature, version) do nothing;

-- 2. Feature switches -----------------------------------------------------------------------------------------------
alter table public.ai_feature_switches drop constraint if exists ai_feature_switches_feature_check;
alter table public.ai_feature_switches add constraint ai_feature_switches_feature_check
  check (feature in ('ai_council','persona_chat','astrology_insight','tarot_reading','daily_insight','astrology_report','oracle_router',
    'tarot_note','reader_router'));
insert into public.ai_feature_switches(feature) values ('tarot_note'), ('reader_router')
  on conflict (feature) do nothing;

create or replace function public.set_ai_feature_switch(feature_input text, enabled_input boolean, reason_input text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare actor uuid := auth.uid(); result public.ai_feature_switches; clean_reason text := btrim(coalesce(reason_input,''));
begin
  if actor is null or not nilaza_private.has_capability('ai.manage') then raise exception 'Not authorized' using errcode='42501'; end if;
  if feature_input is null
    or feature_input not in ('ai_council','persona_chat','astrology_insight','tarot_reading','daily_insight','astrology_report','oracle_router',
      'tarot_note','reader_router')
    or enabled_input is null
    or char_length(clean_reason) not between 3 and 200 then
    raise exception 'invalid_feature_switch' using errcode='22023';
  end if;
  update public.ai_feature_switches set enabled=enabled_input, reason=clean_reason, updated_by=actor, updated_at=now()
    where feature=feature_input returning * into result;
  if not found then raise exception 'invalid_feature_switch' using errcode='22023'; end if;
  insert into public.admin_audit_logs(admin_user_id,action,target_table,target_id,metadata)
    values(actor,'ai.feature_switch','ai_feature_switches',null,jsonb_build_object('feature',feature_input,'enabled',enabled_input,'reason',clean_reason));
  return jsonb_build_object('feature',result.feature,'enabled',result.enabled,'reason',result.reason,'updatedAt',result.updated_at);
end;
$$;
revoke all on function public.set_ai_feature_switch(text,boolean,text) from public, anon, authenticated;
grant execute on function public.set_ai_feature_switch(text,boolean,text) to authenticated;

-- 3. Private note on tarot_readings ---------------------------------------------------------------------------------
alter table public.tarot_readings
  add column if not exists note jsonb,
  add column if not exists note_created_at timestamptz,
  add column if not exists note_claim_token uuid,
  add column if not exists note_claimed_at timestamptz;

do $$
begin
  if not exists (select 1 from pg_constraint where conrelid = 'public.tarot_readings'::regclass and conname = 'tarot_readings_note_object') then
    alter table public.tarot_readings add constraint tarot_readings_note_object
      check ((note is null and note_created_at is null) or (jsonb_typeof(note) = 'object' and note_created_at is not null));
  end if;
end $$;

create index if not exists tarot_readings_user_note_created_idx on public.tarot_readings(user_id, note_created_at)
  where note_created_at is not null;

comment on column public.tarot_readings.note is
  'Batch C: the free daily private note {note:{text,need,askThem}, provenance, model, experiment}, written once.';

create or replace function nilaza_private.guard_tarot_reading_update() returns trigger
language plpgsql set search_path = '' as $$
declare
  mutable constant text[] := array['interpretation','status','claim_token','claimed_at','interpreted_at','prompt_version_id',
    'prompt_version_key','prompt_version','route_version_id','route_version','content_version','clarifier','deleted_at',
    'note','note_created_at','note_claim_token','note_claimed_at'];
  claim constant text[] := array['claim_token','claimed_at','note_claim_token','note_claimed_at'];
  written boolean := old.interpreted_at is not null or old.lock_key is null;
begin
  -- The draw (who, cards, spread, topic, question, day, lock) never changes after insert.
  if (to_jsonb(new) - mutable) is distinct from (to_jsonb(old) - mutable) then
    raise exception 'tarot_reading_draw_immutable' using errcode = '42501';
  end if;
  -- A soft-deleted reading is final; only a stale claim (interpret or note) may still be cleared.
  if old.deleted_at is not null and (to_jsonb(new) - claim) is distinct from (to_jsonb(old) - claim) then
    raise exception 'tarot_reading_deleted' using errcode = '42501';
  end if;
  if written then
    -- Readings saved before the lock (lock_key null) count as written too.
    if new.interpretation is distinct from old.interpretation and not (
      old.interpretation #> '{provenance,answerReceiptId}' is null
      and jsonb_typeof(new.interpretation #> '{provenance,answerReceiptId}') = 'string'
      and (new.interpretation #- '{provenance,answerReceiptId}') = old.interpretation
    ) then
      raise exception 'tarot_interpretation_immutable' using errcode = '42501';
    end if;
    if row(new.interpreted_at, new.prompt_version_id, new.prompt_version_key, new.prompt_version, new.route_version_id,
           new.route_version, new.content_version)
       is distinct from row(old.interpreted_at, old.prompt_version_id, old.prompt_version_key, old.prompt_version,
           old.route_version_id, old.route_version, old.content_version) then
      raise exception 'tarot_interpretation_versions_immutable' using errcode = '42501';
    end if;
  elsif new.interpreted_at is null and row(new.interpretation, new.prompt_version_id, new.prompt_version_key, new.prompt_version,
           new.route_version_id, new.route_version, new.content_version)
       is distinct from row(old.interpretation, old.prompt_version_id, old.prompt_version_key, old.prompt_version,
           old.route_version_id, old.route_version, old.content_version) then
    raise exception 'tarot_interpretation_requires_interpreted_at' using errcode = '42501';
  end if;
  if old.clarifier is not null and new.clarifier is distinct from old.clarifier then
    raise exception 'tarot_clarifier_immutable' using errcode = '42501';
  end if;
  -- Batch C: the note is written once, together with note_created_at, and never changes afterwards.
  if old.note_created_at is not null and row(new.note, new.note_created_at) is distinct from row(old.note, old.note_created_at) then
    raise exception 'tarot_note_immutable' using errcode = '42501';
  end if;
  if old.note_created_at is null and new.note is distinct from old.note and new.note_created_at is null then
    raise exception 'tarot_note_requires_created_at' using errcode = '42501';
  end if;
  if new.status is distinct from old.status and not (
    (old.status = 'queued' and new.status = 'completed' and new.interpreted_at is not null)
    or (old.status <> 'deleted' and new.status = 'deleted' and new.deleted_at is not null)
  ) then
    raise exception 'tarot_reading_status_transition' using errcode = '42501';
  end if;
  if new.deleted_at is not null and new.status <> 'deleted' then
    raise exception 'tarot_reading_deleted_status' using errcode = '42501';
  end if;
  return new;
end $$;
revoke all on function nilaza_private.guard_tarot_reading_update() from public, anon, authenticated;
drop trigger if exists guard_tarot_reading_update on public.tarot_readings;
create trigger guard_tarot_reading_update before update on public.tarot_readings
  for each row execute function nilaza_private.guard_tarot_reading_update();

-- One delivered note per account per Vietnam day (p_day_start), counted apart from interpret. Each claim records one
-- usage_events tarot_note_attempted; a failed note is released by the Edge Function, so it does not use the note,
-- but the attempts stay capped. Serialised with the draw and interpret claims by the same per-user advisory lock.
create or replace function public.tarot_note_claim(
  p_user_id uuid, p_reading_id uuid, p_claim_token uuid, p_day_start timestamptz, p_delivered_limit integer,
  p_attempt_limit integer, p_stale_seconds integer
) returns jsonb
language plpgsql security invoker set search_path = '' as $$
declare
  target public.tarot_readings;
  delivered integer;
  attempts integer;
begin
  if p_user_id is null or p_reading_id is null or p_claim_token is null or p_day_start is null
     or coalesce(p_delivered_limit, -1) < 0 or coalesce(p_attempt_limit, -1) < 0 or coalesce(p_stale_seconds, 0) < 1 then
    raise exception 'invalid_tarot_note_claim' using errcode = '22023';
  end if;
  perform pg_advisory_xact_lock(hashtextextended('nilaza.tarot:' || p_user_id::text, 0));
  select * into target from public.tarot_readings where id = p_reading_id and user_id = p_user_id for update;
  if not found or target.lock_key is null then
    return jsonb_build_object('status', 'not_found');
  end if;
  if target.deleted_at is not null then
    return jsonb_build_object('status', 'deleted');
  end if;
  if target.note_created_at is not null then
    return jsonb_build_object('status', 'completed', 'reading', to_jsonb(target) - 'claim_token' - 'note_claim_token');
  end if;
  if target.note_claim_token is not null and target.note_claimed_at > now() - make_interval(secs => p_stale_seconds) then
    return jsonb_build_object('status', 'in_progress');
  end if;
  -- A fresh, unexpired note claim on another reading of the same account blocks this claim too, so two draws cannot be
  -- written in parallel against a limit counted only on delivered notes (same stale window as above).
  if exists (select 1 from public.tarot_readings
    where user_id = p_user_id and id <> p_reading_id and deleted_at is null and note_created_at is null
      and note_claim_token is not null and note_claimed_at > now() - make_interval(secs => p_stale_seconds)) then
    return jsonb_build_object('status', 'in_progress');
  end if;
  select count(*) into delivered from public.tarot_readings
    where user_id = p_user_id and note_created_at >= p_day_start;
  if delivered >= p_delivered_limit then
    return jsonb_build_object('status', 'limit', 'reason', 'note_daily');
  end if;
  select count(*) into attempts from public.usage_events
    where user_id = p_user_id and event_name = 'tarot_note_attempted' and created_at >= p_day_start;
  if attempts >= p_attempt_limit then
    return jsonb_build_object('status', 'limit', 'reason', 'note_attempts');
  end if;
  insert into public.usage_events(user_id, event_name, feature, metadata)
  values (p_user_id, 'tarot_note_attempted', 'tarot_note',
    jsonb_build_object('attemptNumber', attempts + 1, 'limit', p_attempt_limit, 'drawId', p_reading_id));
  update public.tarot_readings set note_claim_token = p_claim_token, note_claimed_at = now() where id = p_reading_id;
  return jsonb_build_object('status', 'claimed', 'attemptNumber', attempts + 1,
    'reading', to_jsonb(target) - 'claim_token' - 'note_claim_token');
end $$;
revoke all on function public.tarot_note_claim(uuid, uuid, uuid, timestamptz, integer, integer, integer) from public, anon, authenticated;
grant execute on function public.tarot_note_claim(uuid, uuid, uuid, timestamptz, integer, integer, integer) to service_role;

commit;

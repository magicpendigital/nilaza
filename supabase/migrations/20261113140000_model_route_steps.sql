-- Admin redesign A7 (D3): a model route may carry an ordered chain of 1-4 steps and a total deadline.
-- Backward compatible: a row with steps = null keeps today's meaning (primary + optional fallback columns), and a
-- model_route_publish_v2 payload without steps, total_deadline_ms or note publishes exactly as before.
-- When steps are given, the primary/fallback columns must equal steps[0]/steps[1], so a router deployed before this
-- migration still runs the first two steps. Adds the provider deepseek. Nothing is applied by this file on its own.
begin;

alter table public.model_route_versions
  add column if not exists steps jsonb,
  add column if not exists total_deadline_ms integer,
  add column if not exists publish_note text;

-- One step: {provider, model, timeout_ms, max_tokens, temperature, json_mode, reasoning}. reasoning is null or
-- {mode: off|minimal|low|medium|high, maxTokens?: 64-8192}. Unknown keys are refused; every other key is required
-- (is distinct from, so a missing key is refused instead of evaluating to NULL and passing).
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
    if coalesce(step->>'provider', '') not in ('openai','openrouter','gemini','anthropic','deepseek') then return false; end if;
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
revoke all on function nilaza_private.model_route_steps_valid(jsonb) from public, anon;
grant execute on function nilaza_private.model_route_steps_valid(jsonb) to authenticated, service_role;

alter table public.model_route_versions drop constraint if exists model_route_versions_primary_provider_check;
alter table public.model_route_versions add constraint model_route_versions_primary_provider_check
  check (primary_provider in ('openai','openrouter','gemini','anthropic','deepseek'));
alter table public.model_route_versions drop constraint if exists model_route_versions_fallback_provider_check;
alter table public.model_route_versions add constraint model_route_versions_fallback_provider_check
  check (fallback_provider in ('openai','openrouter','gemini','anthropic','deepseek'));
alter table public.model_route_versions drop constraint if exists model_route_versions_steps_check;
alter table public.model_route_versions add constraint model_route_versions_steps_check
  check (nilaza_private.model_route_steps_valid(steps));
alter table public.model_route_versions drop constraint if exists model_route_versions_total_deadline_check;
alter table public.model_route_versions add constraint model_route_versions_total_deadline_check
  check (total_deadline_ms is null or total_deadline_ms between 5000 and 140000);
alter table public.model_route_versions drop constraint if exists model_route_versions_publish_note_check;
alter table public.model_route_versions add constraint model_route_versions_publish_note_check
  check (publish_note is null or length(publish_note) between 10 and 500);

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
begin
  if auth.uid() is null or not nilaza_private.has_capability('ai.manage') then
    raise exception 'Not authorized' using errcode = '42501';
  end if;
  if jsonb_typeof(config_input) is distinct from 'object'
    or config_input->>'contract_version' is distinct from 'model_route_publish_v2'
    or not (config_input ? 'expected_active_id')
    or coalesce(config_input->>'publish_request_id', '') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    or coalesce(feature_name not in ('oracle_router','persona_chat','ai_council','tarot_reading','daily_insight','astrology_report'), true)
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
    -- The legacy columns must describe the first two steps so an older router still runs them.
    if route_steps->0->>'provider' is distinct from primary_provider_name
      or route_steps->0->>'model' is distinct from primary_model_name
      or (route_steps->0->>'temperature')::numeric is distinct from route_temperature
      or (route_steps->0->>'max_tokens')::integer is distinct from route_max_tokens
      or (jsonb_array_length(route_steps) = 1 and config_input->'fallback' <> 'null'::jsonb)
      or (jsonb_array_length(route_steps) > 1 and (route_steps->1->>'provider' is distinct from fallback_provider_name
        or route_steps->1->>'model' is distinct from fallback_model_name)) then
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
commit;

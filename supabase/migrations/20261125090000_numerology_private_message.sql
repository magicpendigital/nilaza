-- Numerology "Lời nhắn riêng" (Owner approval 2026-11-25, items B1-B8): a Premium private message that joins 3-5 approved
-- Numerology content blocks (feature numerology_private_message, Edge Function ai-numerology-message). Nothing is applied
-- by this file on its own: running it needs the Owner's approval.
-- * ai_feature_switches: feature numerology_private_message, seeded OFF (enabled = false). The function reads the switch
--   strictly (featureEnabledStrict): a missing row, a read error or enabled = false all answer 503 feature_paused, so the
--   feature stays off until the Owner turns it on in Admin. set_ai_feature_switch accepts the new name.
-- * model_route_versions: feature numerology_private_message is allowed (table check and publish RPC); the code default
--   route (model-router.ts defaultModelRoutes) is inserted as the first active row only when none exists. The feature is
--   not added to model campaigns (nilaza_private.model_campaign_feature_valid is unchanged).
-- * prompt_versions: the feature name is allowed so the seed can write the library guide
--   (packages/agent-config/prompt-library.json numerology_private_message_system). The prompt is not Admin-editable in
--   this batch: save_prompt_draft, publish_prompt_version and list_prompt_versions are unchanged. Without a row the
--   function uses the library text.
-- * No new table and no stored message: usage_events keeps numerology_message_attempted (1 delivered + 2 failed attempts
--   per Vietnam day) and numerology_message_generated (counts and model data only), written with the caller's own JWT
--   under the existing RLS policies.
--
-- Rollback (Owner-approved, after removing or pausing ai-numerology-message):
--   update public.ai_feature_switches set enabled = false, reason = 'Rollback numerology private message'
--     where feature = 'numerology_private_message';
--   update public.model_route_versions set status = 'archived', updated_at = now()
--     where feature = 'numerology_private_message' and status = 'active';
--   update public.prompt_versions set status = 'archived', updated_at = now()
--     where feature = 'numerology_private_message' and status = 'active';
--   the widened feature checks and the publish/switch allowlists may stay (no other code writes the new name);
--   to narrow them, first delete the rows above, then re-run the check and function definitions from
--   20261124090000_tarot_note_reader_router.sql and 20261113095000_prompt_versions_admin_publish.sql.
begin;

-- 1. Model routes ---------------------------------------------------------------------------------------------------
alter table public.model_route_versions drop constraint if exists model_route_versions_feature_check;
alter table public.model_route_versions add constraint model_route_versions_feature_check
  check (feature in ('oracle_router', 'persona_chat', 'ai_council', 'tarot_reading', 'daily_insight', 'astrology_report',
    'face_reading', 'tarot_note', 'reader_router', 'numerology_private_message'));

-- Same definition as 20261124090000, with numerology_private_message added to the feature list.
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
      'tarot_note','reader_router','numerology_private_message'), true)
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

-- Code default (model-router.ts defaultModelRoutes.numerology_private_message) as the first active row, only when no
-- active row exists.
insert into public.model_route_versions(feature, version, status, primary_provider, primary_model, fallback_provider,
  fallback_model, temperature, max_output_tokens, response_schema, fallback_when, safety_policy, published_at, steps,
  total_deadline_ms, publish_note)
select 'numerology_private_message', '2026-11-25-numerology-message-v1', 'active', 'openrouter', 'deepseek/deepseek-v4.1-flash',
  'openrouter', 'xiaomi/mimo-v2.6-flash', 0.6, 600, 'numerology_private_message_v1',
  array['missing_api_key','provider_timeout','rate_limit','provider_5xx','malformed_response']::text[],
  '{"approvedBlocksOnly":true,"blockDeterministicPredictions":true,"reasoning":{"mode":"off"}}'::jsonb, now(),
  '[{"provider":"openrouter","model":"deepseek/deepseek-v4.1-flash","timeout_ms":20000,"max_tokens":600,"temperature":0.6,"json_mode":true,"reasoning":{"mode":"off"}},
    {"provider":"openrouter","model":"xiaomi/mimo-v2.6-flash","timeout_ms":20000,"max_tokens":600,"temperature":0.6,"json_mode":true,"reasoning":{"mode":"off"}}]'::jsonb,
  40000, 'Numerology private message 2026-11-25: first route.'
where not exists (select 1 from public.model_route_versions where feature = 'numerology_private_message' and status = 'active')
on conflict (feature, version) do nothing;

-- 2. Feature switch (seeded OFF) -------------------------------------------------------------------------------------
alter table public.ai_feature_switches drop constraint if exists ai_feature_switches_feature_check;
alter table public.ai_feature_switches add constraint ai_feature_switches_feature_check
  check (feature in ('ai_council','persona_chat','astrology_insight','tarot_reading','daily_insight','astrology_report','oracle_router',
    'tarot_note','reader_router','numerology_private_message'));
insert into public.ai_feature_switches(feature, enabled, reason)
  values ('numerology_private_message', false, 'Off until the Owner approves the content and turns it on')
  on conflict (feature) do nothing;

create or replace function public.set_ai_feature_switch(feature_input text, enabled_input boolean, reason_input text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare actor uuid := auth.uid(); result public.ai_feature_switches; clean_reason text := btrim(coalesce(reason_input,''));
begin
  if actor is null or not nilaza_private.has_capability('ai.manage') then raise exception 'Not authorized' using errcode='42501'; end if;
  if feature_input is null
    or feature_input not in ('ai_council','persona_chat','astrology_insight','tarot_reading','daily_insight','astrology_report','oracle_router',
      'tarot_note','reader_router','numerology_private_message')
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

-- 3. Prompt versions (feature name only; the guide row comes from the seed) -----------------------------------------
alter table public.prompt_versions drop constraint if exists prompt_versions_feature_check;
alter table public.prompt_versions add constraint prompt_versions_feature_check
  check (feature in ('persona_chat', 'tarot_reading', 'daily_insight', 'astrology_report', 'aura_reflection', 'face_reading',
    'safety_fallback', 'ai_council', 'oracle_router', 'astrology_insight', 'numerology_private_message'));

commit;

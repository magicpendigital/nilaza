begin;

-- Forward-only contract v2. No remote activation is performed by this file.
alter table public.model_route_versions
  add column if not exists publish_request_id uuid,
  add column if not exists publish_payload jsonb,
  add column if not exists supersedes_version_id uuid references public.model_route_versions(id);
create unique index if not exists model_route_publish_request_key
  on public.model_route_versions(created_by, publish_request_id) where publish_request_id is not null;
-- Publication must pass the guarded atomic RPC, including for admins.
revoke insert, update, delete on public.model_route_versions from authenticated, anon;

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
    or coalesce(primary_provider_name not in ('openai','openrouter','gemini','anthropic'), true)
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
      or coalesce(fallback_provider_name not in ('openai','openrouter','gemini','anthropic'), true)
      or coalesce(length(btrim(fallback_model_name)) not between 1 and 160, true)))
    or jsonb_array_length(config_input->'fallback_when') > 5
    or exists(select 1 from jsonb_array_elements_text(config_input->'fallback_when') r
      where r not in ('missing_api_key','provider_timeout','rate_limit','provider_5xx','malformed_response'))
    or (select count(*) <> count(distinct r) from jsonb_array_elements_text(config_input->'fallback_when') r) then
    raise exception 'Invalid route values' using errcode = '22023';
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
    safety_policy, created_by, published_by, published_at, publish_request_id, publish_payload, supersedes_version_id)
  values(feature_name, route_version, requested_status, primary_provider_name, primary_model_name,
    fallback_provider_name, fallback_model_name, route_temperature, route_max_tokens, config_input->>'response_schema',
    array(select jsonb_array_elements_text(config_input->'fallback_when')), config_input->'safety_policy',
    auth.uid(), case when requested_status = 'active' then auth.uid() end,
    case when requested_status = 'active' then now() end, request_id, config_input,
    case when requested_status = 'active' then active_id end) returning * into inserted;
  insert into public.admin_audit_logs(admin_user_id, action, target_table, target_id, metadata)
    values(auth.uid(), 'ai.model_route.publish', 'model_route_versions', inserted.id,
      jsonb_build_object('contractVersion','model_route_publish_v2','feature', feature_name,'version',route_version,
        'status',requested_status,'supersedesVersionId',inserted.supersedes_version_id,'publishRequestId',request_id,
        'primary_provider',primary_provider_name,'primary_model',primary_model_name,
        'fallback_provider',fallback_provider_name,'fallback_model',fallback_model_name,
        'response_schema',inserted.response_schema,'temperature',route_temperature,'max_output_tokens',route_max_tokens));
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

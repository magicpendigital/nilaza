begin;

-- Canonical route storage now includes the Oracle path used by the current app.
alter table public.model_route_versions drop constraint if exists model_route_versions_feature_check;
alter table public.model_route_versions add constraint model_route_versions_feature_check
  check (feature in ('oracle_router', 'persona_chat', 'ai_council', 'tarot_reading', 'daily_insight', 'astrology_report', 'face_reading'));

-- Keep configuration publications atomic: a new route and archiving its predecessor
-- either both commit or neither does.
create or replace function nilaza_private.publish_model_route_config(config_input jsonb)
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  inserted public.model_route_versions;
  requested_status text := coalesce(config_input->>'status', 'active');
  feature_name text := config_input->>'feature';
  route_version text := config_input->>'version';
  primary_provider_name text := config_input->'primary'->>'provider';
  primary_model_name text := config_input->'primary'->>'model';
  fallback_provider_name text := nullif(config_input->'fallback'->>'provider', '');
  fallback_model_name text := nullif(config_input->'fallback'->>'model', '');
  route_temperature numeric := coalesce((config_input->>'temperature')::numeric, 0.7);
  route_max_tokens integer := coalesce((config_input->>'max_output_tokens')::integer, 800);
begin
  if auth.uid() is null or not nilaza_private.has_capability('ai.manage') then
    raise exception 'Not authorized' using errcode = '42501';
  end if;
  if feature_name is null or route_version is null or length(route_version) > 96
    or primary_provider_name is null or primary_model_name is null
    or length(primary_model_name) > 160
    or requested_status not in ('active', 'experimental', 'draft')
    or route_temperature < 0 or route_temperature > 2
    or route_max_tokens < 64 or route_max_tokens > 8192
    or nullif(config_input->>'response_schema', '') is null then
    raise exception 'Invalid route configuration' using errcode = '22023';
  end if;
  if (fallback_provider_name is null) <> (fallback_model_name is null) then
    raise exception 'Fallback provider and model must be configured together' using errcode = '22023';
  end if;
  perform pg_advisory_xact_lock(hashtext(feature_name)::bigint);

  -- Keep the active-route invariant valid even when the database has a partial
  -- unique index. Both this archive and the insert roll back together on error.
  if requested_status = 'active' then
    update public.model_route_versions
      set status = 'archived', updated_at = now()
      where feature = feature_name and status = 'active';
  end if;

  insert into public.model_route_versions (
    feature, version, status, primary_provider, primary_model,
    fallback_provider, fallback_model, temperature, max_output_tokens,
    response_schema, fallback_when, safety_policy, created_by, published_by, published_at
  ) values (
    feature_name, route_version, requested_status, primary_provider_name, primary_model_name,
    fallback_provider_name, fallback_model_name, route_temperature, route_max_tokens,
    config_input->>'response_schema',
    array(select jsonb_array_elements_text(coalesce(config_input->'fallback_when', '[]'::jsonb))),
    coalesce(config_input->'safety_policy', '{}'::jsonb), auth.uid(),
    case when requested_status = 'active' then auth.uid() else null end,
    case when requested_status = 'active' then now() else null end
  ) returning * into inserted;

  insert into public.admin_audit_logs(admin_user_id, action, target_table, target_id, metadata)
  values (auth.uid(), 'ai.model_route.publish', 'model_route_versions', inserted.id,
    jsonb_build_object('feature', feature_name, 'version', route_version, 'status', requested_status,
      'primary_provider', primary_provider_name, 'primary_model', primary_model_name,
      'fallback_provider', fallback_provider_name, 'fallback_model', fallback_model_name,
      'response_schema', config_input->>'response_schema', 'temperature', route_temperature,
      'max_output_tokens', route_max_tokens));
  return jsonb_build_object('id', inserted.id, 'version', inserted.version, 'status', inserted.status);
end;
$$;

create or replace function public.publish_model_route_config(config_input jsonb)
returns jsonb language sql security invoker set search_path = '' as $$
  select nilaza_private.publish_model_route_config(config_input);
$$;

-- Load and publish an Astrology prompt pair as one immutable version.
create or replace function nilaza_private.get_astrology_prompt_config()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if auth.uid() is null or not nilaza_private.has_capability('ai.read') then
    raise exception 'Not authorized' using errcode = '42501';
  end if;
  return jsonb_build_object(
    'active', coalesce((select jsonb_object_agg(locale, jsonb_build_object(
    'id', id, 'version', version, 'prompt_text', prompt_text, 'published_at', published_at
  )) from public.prompt_versions
    where feature = 'astrology_report' and owner_type = 'global' and owner_id is null
      and status = 'active' and locale in ('vi', 'en')), '{}'::jsonb),
    'history', coalesce((select jsonb_agg(jsonb_build_object('locale', locale, 'version', version,
      'status', status, 'published_at', published_at) order by published_at desc nulls last)
      from public.prompt_versions where feature = 'astrology_report' and owner_type = 'global'
        and owner_id is null and locale in ('vi', 'en')), '[]'::jsonb)
  );
end;
$$;
create or replace function public.get_astrology_prompt_config()
returns jsonb language sql security invoker set search_path = '' as $$
  select nilaza_private.get_astrology_prompt_config();
$$;

create or replace function nilaza_private.publish_astrology_prompt_pair(
  new_version text,
  expected_vi_version text,
  expected_en_version text,
  prompt_vi text,
  prompt_en text
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  current_vi text;
  current_en text;
  previous_vi uuid;
  previous_en uuid;
  new_vi uuid;
  new_en uuid;
begin
  if auth.uid() is null or not nilaza_private.has_capability('ai.manage') then
    raise exception 'Not authorized' using errcode = '42501';
  end if;
  perform pg_advisory_xact_lock(hashtext('astrology_prompt_pair')::bigint);
  if new_version is null or length(new_version) < 3 or length(new_version) > 96
    or prompt_vi is null or length(btrim(prompt_vi)) < 100 or length(prompt_vi) > 12000
    or prompt_en is null or length(btrim(prompt_en)) < 100 or length(prompt_en) > 12000 then
    raise exception 'Invalid Astrology prompt pair' using errcode = '22023';
  end if;

  select version, id into current_vi, previous_vi from public.prompt_versions
    where feature = 'astrology_report' and owner_type = 'global' and owner_id is null and locale = 'vi' and status = 'active'
    order by published_at desc nulls last limit 1 for update;
  select version, id into current_en, previous_en from public.prompt_versions
    where feature = 'astrology_report' and owner_type = 'global' and owner_id is null and locale = 'en' and status = 'active'
    order by published_at desc nulls last limit 1 for update;
  if current_vi is distinct from expected_vi_version or current_en is distinct from expected_en_version then
    raise exception 'Active Astrology prompts changed since they were loaded' using errcode = '40001';
  end if;

  update public.prompt_versions set status = 'archived', updated_at = now()
    where feature = 'astrology_report' and owner_type = 'global' and owner_id is null
      and locale in ('vi', 'en') and status = 'active';
  insert into public.prompt_versions(
    feature, owner_type, owner_id, version, status, locale, prompt_text, safety_notes,
    created_by, published_by, published_at, supersedes_version_id, updated_at
  ) values (
    'astrology_report', 'global', null, new_version, 'active', 'vi', prompt_vi,
    'Astrology AI contract v1; backend appends safety and output-schema guidance.',
    auth.uid(), auth.uid(), now(), previous_vi, now()
  ) returning id into new_vi;
  insert into public.prompt_versions(
    feature, owner_type, owner_id, version, status, locale, prompt_text, safety_notes,
    created_by, published_by, published_at, supersedes_version_id, updated_at
  ) values (
    'astrology_report', 'global', null, new_version, 'active', 'en', prompt_en,
    'Astrology AI contract v1; backend appends safety and output-schema guidance.',
    auth.uid(), auth.uid(), now(), previous_en, now()
  ) returning id into new_en;

  insert into public.admin_audit_logs(admin_user_id, action, target_table, target_id, metadata)
  values (auth.uid(), 'ai.astrology_prompt.publish', 'prompt_versions', new_vi,
    jsonb_build_object('version', new_version, 'locales', jsonb_build_array('vi', 'en'),
      'previousViVersion', current_vi, 'previousEnVersion', current_en,
      'viCharacters', length(prompt_vi), 'enCharacters', length(prompt_en)));
  return jsonb_build_object('version', new_version, 'viId', new_vi, 'enId', new_en, 'status', 'active');
end;
$$;
create or replace function public.publish_astrology_prompt_pair(
  new_version text, expected_vi_version text, expected_en_version text, prompt_vi text, prompt_en text
) returns jsonb language sql security invoker set search_path = '' as $$
  select nilaza_private.publish_astrology_prompt_pair(new_version, expected_vi_version, expected_en_version, prompt_vi, prompt_en);
$$;

-- The default trace remains redacted. Exact provider payload capture is a separate,
-- owner-only, staging-only encrypted object with a hard 24-hour lifetime.
create table if not exists public.ai_trace_qa_captures (
  id uuid primary key default gen_random_uuid(),
  trace_id text not null unique references public.ai_trace_runs(trace_id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  nonce_base64 text not null,
  ciphertext_base64 text not null,
  content_sha256 text not null check (content_sha256 ~ '^[a-f0-9]{64}$'),
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  check (expires_at <= created_at + interval '24 hours' and expires_at > created_at)
);
alter table public.ai_trace_qa_captures enable row level security;
revoke all on public.ai_trace_qa_captures from public, anon, authenticated;

create or replace function nilaza_private.save_ai_trace_qa_capture(
  trace_id_input text, nonce_input text, ciphertext_input text, content_sha256_input text
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare trace_environment text; trace_user_id uuid; capture_id uuid; expiry timestamptz := now() + interval '24 hours';
begin
  if auth.uid() is null or not nilaza_private.has_capability('roles.manage') then
    raise exception 'Not authorized' using errcode = '42501';
  end if;
  if trace_id_input is null or nonce_input is null or ciphertext_input is null or content_sha256_input is null
    or nonce_input !~ '^[A-Za-z0-9+/]{16}$'
    or length(ciphertext_input) = 0 or length(ciphertext_input) > 400000
    or length(ciphertext_input) % 4 <> 0
    or ciphertext_input !~ '^[A-Za-z0-9+/]+={0,2}$'
    or content_sha256_input !~ '^[a-f0-9]{64}$' then
    raise exception 'Invalid QA capture' using errcode = '22023';
  end if;
  select environment, user_id into trace_environment, trace_user_id from public.ai_trace_runs where trace_id = trace_id_input;
  if trace_environment is distinct from 'staging' or trace_user_id is distinct from auth.uid() then
    raise exception 'QA capture is restricted to staging traces' using errcode = '42501';
  end if;
  delete from public.ai_trace_qa_captures where expires_at <= now();
  insert into public.ai_trace_qa_captures(trace_id, owner_id, nonce_base64, ciphertext_base64, content_sha256, expires_at)
    values (trace_id_input, auth.uid(), nonce_input, ciphertext_input, content_sha256_input, expiry)
    on conflict (trace_id) do update set owner_id = excluded.owner_id, nonce_base64 = excluded.nonce_base64,
      ciphertext_base64 = excluded.ciphertext_base64, content_sha256 = excluded.content_sha256, expires_at = excluded.expires_at
    returning id into capture_id;
  insert into public.admin_audit_logs(admin_user_id, action, target_table, metadata)
    values (auth.uid(), 'ai.trace_qa_capture.store', 'ai_trace_qa_captures',
      jsonb_build_object('traceId', trace_id_input, 'expiresAt', expiry));
  return jsonb_build_object('id', capture_id, 'expiresAt', expiry);
end;
$$;
create or replace function public.save_ai_trace_qa_capture(
  trace_id_input text, nonce_input text, ciphertext_input text, content_sha256_input text
) returns jsonb language sql security invoker set search_path = '' as $$
  select nilaza_private.save_ai_trace_qa_capture(trace_id_input, nonce_input, ciphertext_input, content_sha256_input);
$$;

create or replace function nilaza_private.get_ai_trace_qa_capture(trace_id_input text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare capture public.ai_trace_qa_captures;
begin
  if auth.uid() is null or not nilaza_private.has_capability('roles.manage') then
    raise exception 'Not authorized' using errcode = '42501';
  end if;
  delete from public.ai_trace_qa_captures where expires_at <= now();
  select * into capture from public.ai_trace_qa_captures
    where trace_id = trace_id_input and owner_id = auth.uid() and expires_at > now();
  if not found then return null; end if;
  insert into public.admin_audit_logs(admin_user_id, action, target_table, metadata)
    values (auth.uid(), 'ai.trace_qa_capture.view', 'ai_trace_qa_captures',
      jsonb_build_object('traceId', trace_id_input, 'expiresAt', capture.expires_at));
  return jsonb_build_object('nonce', capture.nonce_base64, 'ciphertext', capture.ciphertext_base64,
    'contentSha256', capture.content_sha256, 'expiresAt', capture.expires_at);
end;
$$;

create or replace function public.get_ai_trace_qa_capture(trace_id_input text)
returns jsonb language sql security invoker set search_path = '' as $$
  select nilaza_private.get_ai_trace_qa_capture(trace_id_input);
$$;

-- Searchable redacted trace list. Search is limited to trace/request IDs and model names.
create or replace function nilaza_private.search_ai_trace_runs(
  limit_count integer default 50,
  feature_filter text default null,
  status_filter text default null,
  query_text text default null
) returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare q text := nullif(left(btrim(coalesce(query_text, '')), 100), '');
begin
  if auth.uid() is null or not nilaza_private.has_capability('ai.read') then
    raise exception 'Not authorized' using errcode = '42501';
  end if;
  return coalesce((select jsonb_agg(row_to_json(r) order by r.created_at desc) from (
    select run.trace_id, run.client_request_id, run.feature, run.endpoint, run.environment,
      run.status, run.redaction_mode, run.root_input, run.root_output, run.metadata,
      run.created_at, run.completed_at, run.retention_expires_at
    from public.ai_trace_runs run
    where (feature_filter is null or run.feature = feature_filter)
      and (status_filter is null or run.status = status_filter)
      and (q is null or run.trace_id ilike '%' || q || '%'
        or coalesce(run.client_request_id, '') ilike '%' || q || '%'
        or exists (select 1 from public.ai_trace_spans span where span.trace_id = run.trace_id
          and coalesce(span.attributes->>'model', span.input->>'model', '') ilike '%' || q || '%'))
    order by run.created_at desc limit greatest(1, least(coalesce(limit_count, 50), 200))
  ) r), '[]'::jsonb);
end;
$$;
create or replace function public.search_ai_trace_runs(
  limit_count integer default 50, feature_filter text default null, status_filter text default null, query_text text default null
) returns jsonb language sql security invoker set search_path = '' as $$
  select nilaza_private.search_ai_trace_runs(limit_count, feature_filter, status_filter, query_text);
$$;

create or replace function nilaza_private.get_ai_admin_audit_events(limit_count integer default 100)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if auth.uid() is null or not nilaza_private.has_capability('ai.read') then
    raise exception 'Not authorized' using errcode = '42501';
  end if;
  return coalesce((select jsonb_agg(row_to_json(a) order by a.created_at desc) from (
    select id, action, target_table, target_id, metadata, created_at
    from public.admin_audit_logs
    where action in (
      'ai.model_route.publish',
      'ai.astrology_prompt.publish',
      'ai.trace_qa_capture.store',
      'ai.trace_qa_capture.view'
    )
    order by created_at desc limit greatest(1, least(coalesce(limit_count, 100), 200))
  ) a), '[]'::jsonb);
end;
$$;
create or replace function public.get_ai_admin_audit_events(limit_count integer default 100)
returns jsonb language sql security invoker set search_path = '' as $$
  select nilaza_private.get_ai_admin_audit_events(limit_count);
$$;

create or replace function nilaza_private.prune_ai_traces() returns integer
language plpgsql security definer set search_path = '' as $$
declare deleted_count integer;
begin
  delete from public.ai_trace_qa_captures where expires_at <= now();
  delete from public.ai_trace_runs where retention_expires_at is not null and retention_expires_at < now();
  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;

-- Purge expired encrypted QA payloads hourly when pg_cron is available.
-- Keep the existing trace-retention job name so deployments do not accumulate jobs.
do $$
declare existing_job record;
begin
  if exists (select 1 from pg_catalog.pg_extension where extname = 'pg_cron')
    and exists (select 1 from pg_catalog.pg_namespace where nspname = 'cron') then
    for existing_job in execute 'select jobid from cron.job where jobname = $1' using 'ai-trace-retention' loop
      execute 'select cron.unschedule($1)' using existing_job.jobid;
    end loop;
    execute 'select cron.schedule($1, $2, $3)'
      using 'ai-trace-retention', '20 * * * *', 'select nilaza_private.prune_ai_traces();';
  else
    raise notice 'pg_cron is not installed; expired QA ciphertext remains unreadable after expiry but needs an operator purge schedule.';
  end if;
end $$;

revoke all on function nilaza_private.publish_model_route_config(jsonb), public.publish_model_route_config(jsonb),
  nilaza_private.get_astrology_prompt_config(), public.get_astrology_prompt_config(),
  nilaza_private.publish_astrology_prompt_pair(text,text,text,text,text), public.publish_astrology_prompt_pair(text,text,text,text,text),
  nilaza_private.save_ai_trace_qa_capture(text,text,text,text), nilaza_private.get_ai_trace_qa_capture(text), public.get_ai_trace_qa_capture(text),
  public.save_ai_trace_qa_capture(text,text,text,text),
  nilaza_private.search_ai_trace_runs(integer,text,text,text), public.search_ai_trace_runs(integer,text,text,text),
  nilaza_private.get_ai_admin_audit_events(integer), public.get_ai_admin_audit_events(integer), nilaza_private.prune_ai_traces()
  from public, anon, authenticated;
grant execute on function public.publish_model_route_config(jsonb), public.get_astrology_prompt_config(),
  public.publish_astrology_prompt_pair(text,text,text,text,text), public.get_ai_trace_qa_capture(text),
  public.save_ai_trace_qa_capture(text,text,text,text),
  public.search_ai_trace_runs(integer,text,text,text), public.get_ai_admin_audit_events(integer)
  to authenticated;
grant execute on function nilaza_private.save_ai_trace_qa_capture(text,text,text,text)
  to authenticated;
grant execute on function nilaza_private.publish_model_route_config(jsonb),
  nilaza_private.get_astrology_prompt_config(),
  nilaza_private.publish_astrology_prompt_pair(text,text,text,text,text),
  nilaza_private.save_ai_trace_qa_capture(text,text,text,text),
  nilaza_private.get_ai_trace_qa_capture(text),
  nilaza_private.search_ai_trace_runs(integer,text,text,text),
  nilaza_private.get_ai_admin_audit_events(integer)
  to authenticated;

comment on table public.ai_trace_qa_captures is 'Owner-only encrypted staging AI request/response capture. Rows expire within 24 hours; key is held only in Edge Function secrets.';
comment on function public.search_ai_trace_runs(integer,text,text,text) is 'Owner/admin read-only search across redacted AI traces by trace/request ID or model.';

commit;

-- Admin redesign A7 (D4): AI providers, their order and data limits, and a circuit breaker / key-check state.
-- Owner decisions 04/11: OpenRouter first; direct providers Anthropic -> Gemini (paid key only) -> OpenAI -> DeepSeek;
-- DeepSeek direct may only receive public data. Direct providers are seeded switched off: the router also skips any
-- provider whose secret is missing at runtime. Key values never reach the database; only the secret NAME is stored
-- and "configured" is a yes/no reported by the probe function or the router. Nothing is applied by this file on its own.
begin;

create table if not exists public.ai_providers (
  provider text primary key check (provider in ('openrouter','anthropic','gemini','openai','deepseek')),
  priority integer not null check (priority between 1 and 99),
  enabled boolean not null default false,
  secret_name text not null check (secret_name ~ '^[A-Z][A-Z0-9_]{2,63}$'),
  allowed_data_class text not null check (allowed_data_class in ('public','personal','sensitive')),
  phase smallint not null default 0 check (phase between 0 and 9),
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Owner 04/11: DeepSeek direct receives public data only.
  constraint ai_providers_deepseek_public_only check (provider <> 'deepseek' or allowed_data_class = 'public')
);

insert into public.ai_providers(provider, priority, enabled, secret_name, allowed_data_class, phase) values
  ('openrouter', 1, true,  'OPENROUTER_API_KEY', 'sensitive', 0),
  ('anthropic',  2, false, 'ANTHROPIC_API_KEY',  'personal',  2),
  ('gemini',     3, false, 'GEMINI_API_KEY',     'personal',  3),
  ('openai',     4, false, 'OPENAI_API_KEY',     'personal',  3),
  ('deepseek',   5, false, 'DEEPSEEK_API_KEY',   'public',    3)
on conflict (provider) do nothing;

create table if not exists public.ai_provider_health (
  provider text primary key references public.ai_providers(provider) on delete cascade,
  configured boolean,
  configured_source text check (configured_source in ('probe','runtime')),
  configured_at timestamptz,
  failures integer not null default 0 check (failures >= 0),
  opened_until timestamptz,
  last_failure_at timestamptz,
  last_failure_class text check (last_failure_class in ('transient','rate_limit','payment','auth','config','bad_key','no_credit','unreachable')),
  last_success_at timestamptz,
  last_probe_at timestamptz,
  last_probe_result text check (last_probe_result in ('ok','bad_key','no_credit','unreachable','not_configured')),
  last_probe_status integer check (last_probe_status between 100 and 599),
  last_probe_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

alter table public.ai_providers enable row level security;
alter table public.ai_provider_health enable row level security;
-- No client table access: reads go through list_ai_providers, writes through set_ai_provider / record_ai_provider_probe.
revoke all on table public.ai_providers, public.ai_provider_health from public, anon, authenticated;
grant select on table public.ai_providers, public.ai_provider_health to service_role;

-- 24 h provider counts in list_ai_providers read generation spans by time.
create index if not exists ai_trace_spans_generation_started_idx
  on public.ai_trace_spans(started_at desc) where span_type = 'generation';

-- Providers in priority order with configured yes/no, circuit and 24 h trace counts. Never a secret value. Needs ai.read.
create or replace function public.list_ai_providers() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  if auth.uid() is null or not nilaza_private.has_capability('ai.read') then raise exception 'Not authorized' using errcode='42501'; end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'provider', p.provider, 'priority', p.priority, 'enabled', p.enabled, 'secretName', p.secret_name,
      'allowedDataClass', p.allowed_data_class, 'phase', p.phase, 'updatedAt', p.updated_at,
      'configured', h.configured, 'configuredSource', h.configured_source, 'configuredAt', h.configured_at,
      'failures', coalesce(h.failures, 0), 'openedUntil', h.opened_until,
      'circuitOpen', coalesce(h.opened_until > now(), false),
      'lastFailureAt', h.last_failure_at, 'lastFailureClass', h.last_failure_class, 'lastSuccessAt', h.last_success_at,
      'lastProbeAt', h.last_probe_at, 'lastProbeResult', h.last_probe_result, 'lastProbeStatus', h.last_probe_status,
      'attempts24h', coalesce(t.attempts, 0), 'errors24h', coalesce(t.errors, 0))
      order by p.priority, p.provider)
    from public.ai_providers p
    left join public.ai_provider_health h on h.provider = p.provider
    left join (
      select s.attributes->>'provider' as provider, count(*)::integer as attempts,
        count(*) filter (where s.status = 'error')::integer as errors
      from public.ai_trace_spans s
      where s.span_type = 'generation' and s.started_at > now() - interval '24 hours'
      group by 1
    ) t on t.provider = p.provider), '[]'::jsonb);
end;
$$;

-- Changes order, switch or allowed data class of one provider. payload keys: enabled, priority, allowedDataClass,
-- note (10-300 characters, required). The secret name is fixed. Needs ai.manage; audited.
create or replace function public.set_ai_provider(provider_input text, payload jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  actor uuid := auth.uid();
  before_row public.ai_providers;
  after_row public.ai_providers;
  k text;
  v_note text;
begin
  if actor is null or not nilaza_private.has_capability('ai.manage') then raise exception 'Not authorized' using errcode='42501'; end if;
  if jsonb_typeof(payload) is distinct from 'object' then raise exception 'invalid_ai_provider' using errcode='22023'; end if;
  for k in select jsonb_object_keys(payload) loop
    if k not in ('enabled','priority','allowedDataClass','note') then raise exception 'invalid_ai_provider' using errcode='22023'; end if;
  end loop;
  if jsonb_typeof(payload->'note') is distinct from 'string' or length(btrim(payload->>'note')) not between 10 and 300 then
    raise exception 'invalid_ai_provider_note' using errcode='22023';
  end if;
  v_note := btrim(payload->>'note');
  if payload ? 'enabled' and jsonb_typeof(payload->'enabled') <> 'boolean' then raise exception 'invalid_ai_provider' using errcode='22023'; end if;
  if payload ? 'priority' and (jsonb_typeof(payload->'priority') <> 'number'
    or (payload->>'priority')::numeric <> trunc((payload->>'priority')::numeric)
    or (payload->>'priority')::numeric not between 1 and 99) then raise exception 'invalid_ai_provider' using errcode='22023'; end if;
  if payload ? 'allowedDataClass' and coalesce(payload->>'allowedDataClass', '') not in ('public','personal','sensitive') then
    raise exception 'invalid_ai_provider' using errcode='22023';
  end if;
  select * into before_row from public.ai_providers where provider = provider_input for update;
  if not found then raise exception 'unknown_ai_provider' using errcode='22023'; end if;
  if provider_input = 'deepseek' and coalesce(payload->>'allowedDataClass', 'public') <> 'public' then
    raise exception 'deepseek_public_only' using errcode='22023';
  end if;
  update public.ai_providers set
    enabled = case when payload ? 'enabled' then (payload->>'enabled')::boolean else enabled end,
    priority = case when payload ? 'priority' then (payload->>'priority')::integer else priority end,
    allowed_data_class = coalesce(payload->>'allowedDataClass', allowed_data_class),
    updated_by = actor, updated_at = now()
  where provider = provider_input returning * into after_row;
  insert into public.admin_audit_logs(admin_user_id, action, target_table, target_id, metadata)
    values(actor, 'ai.provider.update', 'ai_providers', null, jsonb_build_object('provider', provider_input, 'note', v_note,
      'before', jsonb_build_object('enabled', before_row.enabled, 'priority', before_row.priority, 'allowedDataClass', before_row.allowed_data_class),
      'after', jsonb_build_object('enabled', after_row.enabled, 'priority', after_row.priority, 'allowedDataClass', after_row.allowed_data_class)));
  return jsonb_build_object('provider', after_row.provider, 'priority', after_row.priority, 'enabled', after_row.enabled,
    'secretName', after_row.secret_name, 'allowedDataClass', after_row.allowed_data_class, 'phase', after_row.phase,
    'updatedAt', after_row.updated_at);
end;
$$;

-- Service role only (Edge): a key check by admin-ai-provider-probe (source 'probe', with the admin who pressed it) or a
-- runtime report from the router (source 'runtime'). Keeps the circuit breaker: an auth or billing failure opens it
-- for 5 minutes (10 after a failed key check), three failures in a row open it for 60 seconds, a success closes it.
create or replace function public.record_ai_provider_probe(provider_input text, payload jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_source text := payload->>'source';
  v_result text := payload->>'result';
  v_class text := payload->>'errorClass';
  v_status integer;
  v_actor uuid;
  v_configured boolean;
  row_out public.ai_provider_health;
begin
  if jsonb_typeof(payload) is distinct from 'object' or v_source is null or v_source not in ('probe','runtime')
    or not exists(select 1 from public.ai_providers where provider = provider_input) then
    raise exception 'invalid_provider_report' using errcode='22023';
  end if;
  if payload ? 'configured' and jsonb_typeof(payload->'configured') <> 'null' then
    if jsonb_typeof(payload->'configured') <> 'boolean' then raise exception 'invalid_provider_report' using errcode='22023'; end if;
    v_configured := (payload->>'configured')::boolean;
  end if;
  if payload ? 'httpStatus' and jsonb_typeof(payload->'httpStatus') <> 'null' then
    if jsonb_typeof(payload->'httpStatus') <> 'number' or (payload->>'httpStatus')::numeric not between 100 and 599 then
      raise exception 'invalid_provider_report' using errcode='22023';
    end if;
    v_status := (payload->>'httpStatus')::integer;
  end if;
  if v_source = 'probe' then
    if coalesce(v_result, '') not in ('ok','bad_key','no_credit','unreachable','not_configured') then raise exception 'invalid_provider_report' using errcode='22023'; end if;
    if coalesce(payload->>'actor', '') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then raise exception 'invalid_provider_report' using errcode='22023'; end if;
    v_actor := (payload->>'actor')::uuid;
    if v_result = 'not_configured' then v_configured := false; elsif v_configured is null then v_configured := true; end if;
  else
    if coalesce(v_result, '') not in ('ok','failure','not_configured') then raise exception 'invalid_provider_report' using errcode='22023'; end if;
    if v_result = 'failure' and coalesce(v_class, '') not in ('transient','rate_limit','payment','auth','config') then raise exception 'invalid_provider_report' using errcode='22023'; end if;
    if v_result = 'not_configured' then v_configured := false; end if;
  end if;

  insert into public.ai_provider_health(provider) values (provider_input) on conflict (provider) do nothing;
  update public.ai_provider_health h set
    configured = coalesce(v_configured, h.configured),
    configured_source = case when v_configured is null then h.configured_source else v_source end,
    configured_at = case when v_configured is null then h.configured_at else now() end,
    failures = case
      when v_result = 'ok' then 0
      when v_result in ('bad_key','no_credit','unreachable','failure') then h.failures + 1
      else h.failures end,
    opened_until = case
      when v_result = 'ok' then null
      when v_result in ('bad_key','no_credit') then now() + interval '10 minutes'
      when v_result = 'failure' and v_class in ('payment','auth') then now() + interval '5 minutes'
      when v_result in ('failure','unreachable') and h.failures + 1 >= 3 then now() + interval '60 seconds'
      else h.opened_until end,
    last_failure_at = case when v_result in ('bad_key','no_credit','unreachable','failure') then now() else h.last_failure_at end,
    last_failure_class = case when v_result = 'failure' then v_class
      when v_result in ('bad_key','no_credit','unreachable') then v_result else h.last_failure_class end,
    last_success_at = case when v_result = 'ok' then now() else h.last_success_at end,
    last_probe_at = case when v_source = 'probe' then now() else h.last_probe_at end,
    last_probe_result = case when v_source = 'probe' then v_result else h.last_probe_result end,
    last_probe_status = case when v_source = 'probe' then v_status else h.last_probe_status end,
    last_probe_by = case when v_source = 'probe' then v_actor else h.last_probe_by end,
    updated_at = now()
  where h.provider = provider_input returning * into row_out;
  if v_source = 'probe' then
    insert into public.admin_audit_logs(admin_user_id, action, target_table, target_id, metadata)
      values(v_actor, 'ai.provider.probe', 'ai_provider_health', null, jsonb_build_object('provider', provider_input,
        'result', v_result, 'httpStatus', v_status, 'configured', row_out.configured));
  end if;
  return jsonb_build_object('provider', row_out.provider, 'configured', row_out.configured, 'failures', row_out.failures,
    'openedUntil', row_out.opened_until, 'lastProbeResult', row_out.last_probe_result, 'lastProbeAt', row_out.last_probe_at);
end;
$$;

revoke all on function public.list_ai_providers(), public.set_ai_provider(text, jsonb), public.record_ai_provider_probe(text, jsonb)
  from public, anon, authenticated;
grant execute on function public.list_ai_providers(), public.set_ai_provider(text, jsonb) to authenticated;
grant execute on function public.record_ai_provider_probe(text, jsonb) to service_role;
commit;

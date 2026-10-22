-- AI observability index for prompt/workflow optimization.
--
-- Production user content is never required in these tables. Edge Functions
-- write redacted/metadata payloads with the caller's JWT. Full debug payloads
-- are opt-in and exported to Langfuse only from a non-production environment.

create table if not exists public.ai_trace_runs (
  id uuid primary key default gen_random_uuid(),
  trace_id text not null unique,
  user_id uuid references auth.users(id) on delete cascade,
  session_id uuid,
  client_request_id text,
  feature text not null,
  endpoint text,
  environment text not null default 'development',
  status text not null default 'completed' check (status in ('completed','blocked','error','fallback')),
  redaction_mode text not null default 'redacted' check (redaction_mode in ('metadata','redacted','full_debug')),
  root_input jsonb not null default '{}'::jsonb,
  root_output jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  retention_expires_at timestamptz,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists ai_trace_runs_feature_created_idx
  on public.ai_trace_runs(feature, created_at desc);
create index if not exists ai_trace_runs_user_created_idx
  on public.ai_trace_runs(user_id, created_at desc);
create index if not exists ai_trace_runs_retention_idx
  on public.ai_trace_runs(retention_expires_at);

create table if not exists public.ai_trace_spans (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.ai_trace_runs(id) on delete cascade,
  trace_id text not null,
  span_id text not null,
  parent_span_id text,
  user_id uuid references auth.users(id) on delete cascade,
  span_name text not null,
  span_type text not null check (span_type in ('chain','generation','guardrail','tool')),
  status text not null default 'running' check (status in ('running','ok','error','blocked','fallback')),
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  input jsonb not null default '{}'::jsonb,
  output jsonb not null default '{}'::jsonb,
  attributes jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique(trace_id, span_id)
);

create index if not exists ai_trace_spans_run_started_idx
  on public.ai_trace_spans(run_id, started_at);
create index if not exists ai_trace_spans_user_started_idx
  on public.ai_trace_spans(user_id, started_at desc);

-- Reserved for durable object-storage references if a future debug workflow
-- needs larger artifacts. Raw content must not be put directly in this table.
create table if not exists public.ai_trace_payload_refs (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.ai_trace_runs(id) on delete cascade,
  span_id text,
  user_id uuid references auth.users(id) on delete cascade,
  payload_kind text not null check (payload_kind in ('input','output','provider_response','evaluation_attachment')),
  storage_path text not null,
  content_hash text,
  retention_expires_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.ai_trace_scores (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.ai_trace_runs(id) on delete cascade,
  span_id text,
  user_id uuid references auth.users(id) on delete cascade,
  score_name text not null,
  score numeric check (score is null or (score >= 0 and score <= 1)),
  label text,
  rationale text,
  source text not null default 'manual' check (source in ('manual','automated','user_feedback')),
  reviewer_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.ai_trace_runs enable row level security;
alter table public.ai_trace_spans enable row level security;
alter table public.ai_trace_payload_refs enable row level security;
alter table public.ai_trace_scores enable row level security;

revoke all on public.ai_trace_runs, public.ai_trace_spans, public.ai_trace_payload_refs, public.ai_trace_scores from anon, authenticated;
grant insert on public.ai_trace_runs, public.ai_trace_spans to authenticated;

create policy "trace runs insert own row" on public.ai_trace_runs
  for insert to authenticated
  with check ((select auth.uid()) is not null and user_id = (select auth.uid()));

create policy "trace spans insert own row" on public.ai_trace_spans
  for insert to authenticated
  with check ((select auth.uid()) is not null and user_id = (select auth.uid()));

create policy "trace payload refs insert own row" on public.ai_trace_payload_refs
  for insert to authenticated
  with check ((select auth.uid()) is not null and user_id = (select auth.uid()));

create policy "trace scores insert own row" on public.ai_trace_scores
  for insert to authenticated
  with check ((select auth.uid()) is not null and user_id = (select auth.uid()));

create function nilaza_private.ai_trace_runs(
  limit_count integer default 50,
  feature_filter text default null
) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  if auth.uid() is null or not nilaza_private.has_capability('ai.read') then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  return coalesce((select jsonb_agg(row_to_json(q) order by q.created_at desc) from (
    select
      trace_id,
      feature,
      endpoint,
      environment,
      status,
      redaction_mode,
      root_input,
      root_output,
      metadata,
      created_at,
      completed_at,
      retention_expires_at
    from public.ai_trace_runs
    where (feature_filter is null or feature = feature_filter)
    order by created_at desc
    limit greatest(1, least(coalesce(limit_count, 50), 200))
  ) q), '[]'::jsonb);
end;
$$;

create function public.get_ai_trace_runs(
  limit_count integer default 50,
  feature_filter text default null
) returns jsonb
language sql stable security invoker set search_path = '' as $$
  select nilaza_private.ai_trace_runs(limit_count, feature_filter);
$$;

create function nilaza_private.ai_trace_detail(trace_id_input text) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare run_payload jsonb;
begin
  if auth.uid() is null or not nilaza_private.has_capability('ai.read') then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  select row_to_json(q) into run_payload from (
    select
      trace_id,
      feature,
      endpoint,
      environment,
      status,
      redaction_mode,
      root_input,
      root_output,
      metadata,
      created_at,
      completed_at,
      retention_expires_at
    from public.ai_trace_runs
    where trace_id = trace_id_input
    limit 1
  ) q;

  if run_payload is null then
    return jsonb_build_object('run', null, 'spans', '[]'::jsonb);
  end if;

  return jsonb_build_object(
    'run', run_payload,
    'spans', coalesce((select jsonb_agg(row_to_json(s) order by s.started_at asc) from (
      select
        span_id,
        parent_span_id,
        span_name,
        span_type,
        status,
        started_at,
        ended_at,
        input,
        output,
        attributes
      from public.ai_trace_spans
      where trace_id = trace_id_input
      order by started_at asc
    ) s), '[]'::jsonb)
  );
end;
$$;

create function public.get_ai_trace_detail(trace_id_input text) returns jsonb
language sql stable security invoker set search_path = '' as $$
  select nilaza_private.ai_trace_detail(trace_id_input);
$$;

create function nilaza_private.prune_ai_traces() returns integer
language plpgsql security definer set search_path = '' as $$
declare deleted_count integer;
begin
  delete from public.ai_trace_runs
  where retention_expires_at is not null and retention_expires_at < now();
  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;

-- Optional production scheduling. Keep disabled in local/bootstrap projects;
-- operators can enable it with app.enable_ai_trace_prune_cron = 'on'.
do $$
begin
  if coalesce(current_setting('app.enable_ai_trace_prune_cron', true), 'off') <> 'on' then
    raise notice 'Skipping AI trace retention cron; app.enable_ai_trace_prune_cron is not on.';
    return;
  end if;
  execute 'create extension if not exists pg_cron';
  execute $cron$
    select cron.schedule(
      'ai-trace-retention',
      '20 3 * * *',
      $job$select nilaza_private.prune_ai_traces();$job$
    )
  $cron$;
end $$;

revoke all on function nilaza_private.ai_trace_runs(integer, text), public.get_ai_trace_runs(integer, text),
  nilaza_private.ai_trace_detail(text), public.get_ai_trace_detail(text), nilaza_private.prune_ai_traces() from public, anon, authenticated;
grant execute on function nilaza_private.ai_trace_runs(integer, text), public.get_ai_trace_runs(integer, text),
  nilaza_private.ai_trace_detail(text), public.get_ai_trace_detail(text) to authenticated;

comment on table public.ai_trace_runs is 'Redacted AI trace index. Raw user/provider content is intentionally excluded.';
comment on table public.ai_trace_spans is 'Redacted model route and provider-attempt spans linked to ai_trace_runs.';

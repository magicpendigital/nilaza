-- P1-C (15/11/2026): real AI cost per feature, read only.
--
-- Source: public.ai_trace_spans (span_type 'generation' = one model call) joined to public.ai_trace_runs (one turn).
-- The router writes cost_micro, cost_source (reported | estimated | unknown), price_verified, input_tokens and
-- output_tokens on every call from this change on; older spans only have charged_usd / costMicro / inputTokens and are
-- read with the same rules (charged_usd = reported).
--
-- Privacy: only technical columns are read (feature, provider, model, status, tokens, cost). No prompt, answer or
-- span input/output is selected. user_id is used only inside get_ai_cost_summary to group cost per user per day and
-- never leaves the function: the output carries percentiles only, and nothing below 5 user-days.
--
-- Access: the view is for service_role only. get_ai_cost_summary answers service_role (JWT role claim) or a signed-in
-- account with the ai.read capability; anon and other accounts get 42501. Nothing is written.
--
-- Idempotent: create or replace / drop if exists. Rollback:
--   drop function if exists public.get_ai_cost_summary(integer);
--   drop view if exists nilaza_private.ai_cost_calls;
--   drop function if exists nilaza_private.ai_cost_num(jsonb);

create or replace function nilaza_private.ai_cost_num(value jsonb) returns numeric
language sql immutable set search_path = '' as $$
  select case when jsonb_typeof(value) = 'number' then (value #>> '{}')::numeric end;
$$;

drop view if exists nilaza_private.ai_cost_calls;
create view nilaza_private.ai_cost_calls with (security_invoker = true) as
select
  s.id as call_id,
  r.id as run_id,
  s.started_at as called_at,
  (s.started_at at time zone 'Asia/Ho_Chi_Minh')::date as day_vn,
  r.feature,
  r.environment,
  case when coalesce(r.metadata -> 'adminEval', 'false'::jsonb) = 'true'::jsonb
         or coalesce(r.metadata -> 'keys', '[]'::jsonb) ? 'adminEval'
       then 'eval' else 'user' end as audience,
  r.status as run_status,
  s.status as call_status,
  coalesce(nullif(s.attributes ->> 'provider', ''), split_part(s.span_name, '.', 2)) as provider,
  coalesce(nullif(s.attributes ->> 'model', ''), 'unknown') as model,
  case when jsonb_typeof(s.attributes -> 'fallbackUsed') = 'boolean' then (s.attributes ->> 'fallbackUsed')::boolean
       else s.span_name like '%.fallback' end as fallback_used,
  coalesce(nilaza_private.ai_cost_num(s.attributes -> 'input_tokens'), nilaza_private.ai_cost_num(s.attributes -> 'inputTokens')) as input_tokens,
  coalesce(nilaza_private.ai_cost_num(s.attributes -> 'output_tokens'), nilaza_private.ai_cost_num(s.attributes -> 'outputTokens')) as output_tokens,
  case
    when s.attributes ? 'cost_source' then nilaza_private.ai_cost_num(s.attributes -> 'cost_micro')
    when nilaza_private.ai_cost_num(s.attributes -> 'charged_usd') is not null then round(nilaza_private.ai_cost_num(s.attributes -> 'charged_usd') * 1000000)
    when nilaza_private.ai_cost_num(s.attributes -> 'costMicro') > 0 then nilaza_private.ai_cost_num(s.attributes -> 'costMicro')
  end as cost_micro,
  case
    when s.attributes ->> 'cost_source' in ('reported', 'estimated', 'unknown') then s.attributes ->> 'cost_source'
    when nilaza_private.ai_cost_num(s.attributes -> 'charged_usd') is not null then 'reported'
    when nilaza_private.ai_cost_num(s.attributes -> 'costMicro') > 0 then 'estimated'
    else 'unknown'
  end as cost_source,
  case when jsonb_typeof(s.attributes -> 'price_verified') = 'boolean' then (s.attributes ->> 'price_verified')::boolean end as price_verified
from public.ai_trace_spans s
join public.ai_trace_runs r on r.id = s.run_id
where s.span_type = 'generation';

comment on view nilaza_private.ai_cost_calls is
  'P1-C: one row per AI model call with feature, model, tokens and cost. No user id, prompt or answer. service_role only.';

revoke all on nilaza_private.ai_cost_calls from public, anon, authenticated;
grant usage on schema nilaza_private to service_role;
grant select on nilaza_private.ai_cost_calls to service_role;
revoke all on function nilaza_private.ai_cost_num(jsonb) from public, anon, authenticated;
grant execute on function nilaza_private.ai_cost_num(jsonb) to service_role;

create or replace function public.get_ai_cost_summary(days_back integer default 7) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  claims jsonb := coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb, '{}'::jsonb);
  is_service boolean;
  span_days integer := greatest(1, least(coalesce(days_back, 7), 90));
  to_day date := (now() at time zone 'Asia/Ho_Chi_Minh')::date;
  from_day date;
  budget jsonb;
  result jsonb;
begin
  is_service := coalesce(coalesce(claims ->> 'role', current_setting('request.jwt.claim.role', true)) = 'service_role', false);
  if not is_service and (auth.uid() is null or not nilaza_private.has_capability('ai.read')) then
    raise exception 'Not authorized' using errcode = '42501';
  end if;
  from_day := to_day - (span_days - 1);

  -- Budget campaign (migration 20261002000000) is read only when that table exists; it is not applied everywhere.
  if to_regclass('nilaza_private.ai_budget_campaigns') is not null then
    execute $q$
      select jsonb_agg(jsonb_build_object(
        'id', id, 'policyVersion', policy_version, 'status', status,
        'dailyCapMicro', daily_cap_micro, 'totalCapMicro', total_cap_micro, 'evalCapMicro', eval_cap_micro,
        'usedMicro', used_micro, 'startsAt', starts_at, 'endsAt', ends_at) order by id)
      from nilaza_private.ai_budget_campaigns
    $q$ into budget;
  end if;

  with calls as (
    select c.*
    from nilaza_private.ai_cost_calls c
    where c.day_vn between from_day and to_day
  ),
  user_calls as (select * from calls where audience = 'user'),
  turns as (
    select run_id, feature, day_vn, run_status,
      sum(coalesce(cost_micro, 0)) as cost_micro,
      count(*) as calls
    from user_calls
    group by run_id, feature, day_vn, run_status
  ),
  feature_rows as (
    select
      u.feature,
      count(*) as calls,
      count(distinct u.run_id) as turns,
      coalesce(sum(u.input_tokens), 0) as input_tokens,
      coalesce(sum(u.output_tokens), 0) as output_tokens,
      coalesce(sum(u.cost_micro), 0) as cost_micro,
      count(*) filter (where u.call_status in ('error', 'running')) as failed_calls,
      count(*) filter (where u.call_status = 'blocked') as blocked_calls,
      count(*) filter (where u.fallback_used) as fallback_calls,
      count(*) filter (where u.cost_source = 'estimated') as estimated_calls,
      count(*) filter (where u.cost_source = 'unknown') as unknown_calls,
      count(*) filter (where u.price_verified is false) as unverified_price_calls,
      percentile_cont(0.5) within group (order by u.cost_micro) as call_p50,
      percentile_cont(0.95) within group (order by u.cost_micro) as call_p95,
      percentile_cont(0.99) within group (order by u.cost_micro) as call_p99
    from user_calls u
    group by u.feature
  ),
  feature_turns as (
    select feature,
      count(*) filter (where run_status in ('fallback', 'error')) as canned_turns,
      percentile_cont(0.5) within group (order by cost_micro) as turn_p50,
      percentile_cont(0.95) within group (order by cost_micro) as turn_p95,
      percentile_cont(0.99) within group (order by cost_micro) as turn_p99
    from turns group by feature
  ),
  model_rows as (
    select day_vn, feature, provider, model,
      count(*) as calls,
      coalesce(sum(input_tokens), 0) as input_tokens,
      coalesce(sum(output_tokens), 0) as output_tokens,
      coalesce(sum(cost_micro), 0) as cost_micro,
      percentile_cont(0.5) within group (order by cost_micro) as p50,
      percentile_cont(0.95) within group (order by cost_micro) as p95,
      percentile_cont(0.99) within group (order by cost_micro) as p99,
      count(*) filter (where call_status in ('error', 'running')) as failed_calls,
      count(*) filter (where fallback_used) as fallback_calls,
      count(*) filter (where cost_source = 'estimated') as estimated_calls,
      count(*) filter (where cost_source = 'unknown') as unknown_calls,
      bool_or(price_verified is false) as has_unverified_price
    from user_calls
    group by day_vn, feature, provider, model
  ),
  user_days as (
    select r.user_id, u.day_vn, sum(coalesce(u.cost_micro, 0)) as cost_micro
    from user_calls u
    join public.ai_trace_runs r on r.id = u.run_id
    where r.user_id is not null
    group by r.user_id, u.day_vn
  ),
  user_day_stats as (
    select count(*) as user_days,
      percentile_cont(0.5) within group (order by cost_micro) as p50,
      percentile_cont(0.95) within group (order by cost_micro) as p95,
      percentile_cont(0.99) within group (order by cost_micro) as p99
    from user_days
  )
  select jsonb_build_object(
    'generatedAt', now(),
    'timezone', 'Asia/Ho_Chi_Minh',
    'daysBack', span_days,
    'fromDay', from_day,
    'toDay', to_day,
    'totals', (select jsonb_build_object(
        'calls', count(*), 'turns', count(distinct run_id),
        'costMicro', coalesce(sum(cost_micro), 0),
        'estimatedCalls', count(*) filter (where cost_source = 'estimated'),
        'unknownCalls', count(*) filter (where cost_source = 'unknown'),
        'unverifiedPriceCalls', count(*) filter (where price_verified is false))
      from user_calls),
    'eval', (select jsonb_build_object('calls', count(*), 'costMicro', coalesce(sum(cost_micro), 0)) from calls where audience = 'eval'),
    'features', coalesce((select jsonb_agg(jsonb_build_object(
        'feature', f.feature, 'calls', f.calls, 'turns', f.turns,
        'inputTokens', f.input_tokens, 'outputTokens', f.output_tokens, 'costMicro', f.cost_micro,
        'turnCostP50', round(t.turn_p50::numeric, 1), 'turnCostP95', round(t.turn_p95::numeric, 1), 'turnCostP99', round(t.turn_p99::numeric, 1),
        'callCostP50', round(f.call_p50::numeric, 1), 'callCostP95', round(f.call_p95::numeric, 1), 'callCostP99', round(f.call_p99::numeric, 1),
        'failedCalls', f.failed_calls, 'blockedCalls', f.blocked_calls, 'fallbackCalls', f.fallback_calls, 'cannedTurns', coalesce(t.canned_turns, 0),
        'estimatedCalls', f.estimated_calls, 'unknownCalls', f.unknown_calls, 'unverifiedPriceCalls', f.unverified_price_calls
      ) order by f.cost_micro desc, f.feature)
      from feature_rows f left join feature_turns t on t.feature = f.feature), '[]'::jsonb),
    'byDayModel', coalesce((select jsonb_agg(jsonb_build_object(
        'day', m.day_vn, 'feature', m.feature, 'provider', m.provider, 'model', m.model,
        'calls', m.calls, 'inputTokens', m.input_tokens, 'outputTokens', m.output_tokens, 'costMicro', m.cost_micro,
        'callCostP50', round(m.p50::numeric, 1), 'callCostP95', round(m.p95::numeric, 1), 'callCostP99', round(m.p99::numeric, 1),
        'failedCalls', m.failed_calls, 'fallbackCalls', m.fallback_calls,
        'estimatedCalls', m.estimated_calls, 'unknownCalls', m.unknown_calls, 'hasUnverifiedPrice', m.has_unverified_price
      ) order by m.day_vn desc, m.feature, m.cost_micro desc)
      from model_rows m), '[]'::jsonb),
    'dailyTotals', coalesce((select jsonb_agg(jsonb_build_object('day', d.day_vn, 'calls', d.calls, 'turns', d.turns, 'costMicro', d.cost_micro) order by d.day_vn desc)
      from (select day_vn, count(*) as calls, count(distinct run_id) as turns, coalesce(sum(cost_micro), 0) as cost_micro from user_calls group by day_vn) d), '[]'::jsonb),
    'perUserDay', (select case when s.user_days >= 5 then jsonb_build_object(
        'userDays', s.user_days,
        'costP50', round(s.p50::numeric, 1), 'costP95', round(s.p95::numeric, 1), 'costP99', round(s.p99::numeric, 1))
      else jsonb_build_object('userDays', s.user_days, 'hidden', true, 'minUserDays', 5) end
      from user_day_stats s),
    'budget', jsonb_build_object('campaigns', budget, 'defaultTurnCapMicro', 20000)
  ) into result;
  return result;
end;
$$;

comment on function public.get_ai_cost_summary(integer) is
  'P1-C: AI cost per feature / model / Vietnam day for Admin (ai.read) and service_role. Aggregates only; no user id or content.';

revoke all on function public.get_ai_cost_summary(integer) from public, anon, authenticated;
grant execute on function public.get_ai_cost_summary(integer) to authenticated, service_role;

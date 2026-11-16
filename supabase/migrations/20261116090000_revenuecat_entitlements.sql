-- Billing lot 1 (2026-11-15): RevenueCat webhook -> public.subscriptions.
-- The revenuecat-webhook Edge Function (service role, shared-secret header) calls
-- public.nilaza_apply_revenuecat_event once per webhook. In one transaction the function
-- records the RevenueCat event id (a repeat answers 'duplicate'), ignores events older than
-- the one already applied for that user ('stale'), and upserts the user's revenuecat row.
-- Clients keep reading only their own subscriptions row through the existing RLS policy; nothing
-- here grants client roles any access. The event table lives in nilaza_private so the public
-- table allowlist of 20261004183447_client_table_privilege_boundary.sql stays unchanged.
-- Not applied by the agent: the Owner applies this forward migration after approval.
begin;

create schema if not exists nilaza_private;

create table if not exists nilaza_private.revenuecat_webhook_events (
  -- RevenueCat event id; retries of the same delivery reuse it.
  event_id text primary key check (char_length(event_id) between 1 and 200),
  event_type text not null check (event_type ~ '^[A-Z_]{1,64}$'),
  app_user_id uuid not null,
  event_timestamp timestamptz not null,
  outcome text not null check (outcome in ('applied', 'stale')),
  received_at timestamptz not null default now()
);
create index if not exists revenuecat_webhook_events_received_at_idx
  on nilaza_private.revenuecat_webhook_events (received_at);
alter table nilaza_private.revenuecat_webhook_events enable row level security;
alter table nilaza_private.revenuecat_webhook_events force row level security;
revoke all on table nilaza_private.revenuecat_webhook_events from public, anon, authenticated;
grant select, insert, delete on table nilaza_private.revenuecat_webhook_events to service_role;

-- Ordering and audit fields for rows written by the webhook. Nullable: older rows keep working.
alter table public.subscriptions add column if not exists provider_event_at timestamptz;
alter table public.subscriptions add column if not exists product_id text;
alter table public.subscriptions add column if not exists environment text;
comment on column public.subscriptions.provider_event_at is 'event_timestamp of the newest RevenueCat event applied to this row; older events are ignored.';
comment on column public.subscriptions.environment is 'RevenueCat store environment of the last applied event: SANDBOX or PRODUCTION.';

create or replace function public.nilaza_apply_revenuecat_event(
  p_event_id text,
  p_event_type text,
  p_user uuid,
  p_event_at timestamptz,
  p_status text,
  p_entitlement text,
  p_period_end timestamptz,
  p_product_id text default null,
  p_environment text default null
)
returns jsonb
language plpgsql
security invoker
set search_path = public, nilaza_private, pg_temp
as $$
declare
  applied_rows integer;
begin
  if p_event_id is null or char_length(p_event_id) not between 1 and 200
     or p_event_type is null or p_event_type !~ '^[A-Z_]{1,64}$'
     or p_user is null or p_event_at is null
     or p_status is null or p_status not in ('trialing', 'active', 'past_due', 'canceled', 'expired')
     or p_entitlement is distinct from 'premium'
     or (p_product_id is not null and char_length(p_product_id) > 200)
     or (p_environment is not null and p_environment not in ('SANDBOX', 'PRODUCTION')) then
    raise exception 'invalid_request' using errcode = '22023';
  end if;

  -- An id that is not a Supabase user (deleted account, other project) is acknowledged, not applied.
  if not exists (select 1 from auth.users where id = p_user) then
    return jsonb_build_object('status', 'unknown_user');
  end if;

  insert into nilaza_private.revenuecat_webhook_events (event_id, event_type, app_user_id, event_timestamp, outcome)
    values (p_event_id, p_event_type, p_user, p_event_at, 'applied')
    on conflict (event_id) do nothing;
  if not found then
    return jsonb_build_object('status', 'duplicate');
  end if;

  -- Atomic "newest event wins": the update branch runs only when this event is not older
  -- than the one already applied (or the row predates the webhook).
  insert into public.subscriptions as s
      (user_id, provider, entitlement, status, current_period_end, provider_event_at, product_id, environment, updated_at)
    values (p_user, 'revenuecat', p_entitlement, p_status, p_period_end, p_event_at, p_product_id, p_environment, now())
    on conflict (user_id, provider) do update
      set entitlement = excluded.entitlement,
          status = excluded.status,
          current_period_end = excluded.current_period_end,
          provider_event_at = excluded.provider_event_at,
          product_id = coalesce(excluded.product_id, s.product_id),
          environment = coalesce(excluded.environment, s.environment),
          updated_at = now()
      where s.provider_event_at is null or s.provider_event_at <= excluded.provider_event_at;
  get diagnostics applied_rows = row_count;

  if applied_rows = 0 then
    update nilaza_private.revenuecat_webhook_events set outcome = 'stale' where event_id = p_event_id;
    return jsonb_build_object('status', 'stale');
  end if;

  -- RevenueCat retries for about 80 minutes; keep ids well beyond that, then let them go.
  delete from nilaza_private.revenuecat_webhook_events where received_at < now() - interval '90 days';
  return jsonb_build_object('status', 'applied');
end;
$$;

revoke all on function public.nilaza_apply_revenuecat_event(text, text, uuid, timestamptz, text, text, timestamptz, text, text)
  from public, anon, authenticated;
grant execute on function public.nilaza_apply_revenuecat_event(text, text, uuid, timestamptz, text, text, timestamptz, text, text)
  to service_role;
grant usage on schema nilaza_private to service_role;
-- service_role reads auth.users on the managed platform (see 20261025000000_account_deletion_v1.sql).
grant select, insert, update on table public.subscriptions to service_role;

comment on function public.nilaza_apply_revenuecat_event(text, text, uuid, timestamptz, text, text, timestamptz, text, text)
  is 'Service-role only. Applies one RevenueCat webhook event to public.subscriptions once and in order; returns applied, duplicate, stale or unknown_user.';

commit;

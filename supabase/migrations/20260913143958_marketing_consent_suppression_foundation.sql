-- Consent and delivery-state foundation for Nilaza's public waitlist.
-- This migration stores consent history and suppression decisions, but it does
-- not schedule or send email. Public clients continue to write only through the
-- marketing-waitlist Edge Function.

begin;

alter table public.marketing_waitlist
  drop constraint marketing_waitlist_status_check;

alter table public.marketing_waitlist
  alter column status set default 'pending_confirmation',
  add constraint marketing_waitlist_status_check check (
    status in (
      'pending_confirmation',
      'confirmed',
      'invited',
      'unsubscribed',
      'bounced',
      'complained',
      'subscribed'
    )
  ),
  add column confirmed_at timestamptz,
  add column reconfirmation_requested_at timestamptz,
  add column unsubscribed_at timestamptz,
  add column invite_sent_at timestamptz,
  add column last_email_at timestamptz;

-- Rows collected before double opt-in existed must not be represented as
-- confirmed. Keep the legacy value in the constraint only for zero-downtime
-- compatibility while the Edge Function is rolled forward.
update public.marketing_waitlist
set status = 'pending_confirmation', updated_at = now()
where status = 'subscribed';

comment on column public.marketing_waitlist.status is
  'Consent/delivery state. subscribed is a temporary rollout-compatible legacy value and must not be treated as confirmed.';

create table public.marketing_consent_events (
  id bigint generated always as identity primary key,
  waitlist_id uuid not null references public.marketing_waitlist(id) on delete cascade,
  event_type text not null check (event_type in (
    'signup_requested',
    'confirmation_requested',
    'confirmed',
    'resubscribe_requested',
    'unsubscribed',
    'suppressed'
  )),
  consent_version text not null,
  source text not null,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  occurred_at timestamptz not null default now()
);

comment on table public.marketing_consent_events is
  'Append-only waitlist consent history. Metadata must not contain email addresses or raw tokens.';

create index marketing_consent_events_waitlist_time_idx
  on public.marketing_consent_events (waitlist_id, occurred_at desc);

create table public.marketing_suppressions (
  id bigint generated always as identity primary key,
  waitlist_id uuid not null references public.marketing_waitlist(id) on delete cascade,
  reason text not null check (reason in ('unsubscribe', 'bounce', 'complaint', 'manual')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  released_at timestamptz,
  check ((active and released_at is null) or (not active and released_at is not null))
);

create unique index marketing_suppressions_one_active_idx
  on public.marketing_suppressions (waitlist_id)
  where active;

create table public.marketing_email_tokens (
  id uuid primary key default gen_random_uuid(),
  waitlist_id uuid not null references public.marketing_waitlist(id) on delete cascade,
  purpose text not null check (purpose in ('confirm', 'unsubscribe')),
  token_hash text not null unique check (token_hash ~ '^[a-f0-9]{64}$'),
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now(),
  check (expires_at > created_at)
);

comment on table public.marketing_email_tokens is
  'One-time confirmation and unsubscribe token hashes. Raw tokens must never be stored.';

create index marketing_email_tokens_open_idx
  on public.marketing_email_tokens (token_hash, expires_at)
  where consumed_at is null;

create table public.marketing_deliveries (
  id uuid primary key default gen_random_uuid(),
  waitlist_id uuid not null references public.marketing_waitlist(id) on delete cascade,
  campaign_version text not null,
  step_id text not null,
  template_version text not null,
  locale text not null check (locale in ('vi', 'en')),
  idempotency_key text not null unique,
  provider_message_id text unique,
  status text not null default 'queued' check (status in (
    'queued',
    'sending',
    'sent',
    'delivered',
    'transient_failed',
    'permanent_failed',
    'bounced',
    'complained',
    'cancelled'
  )),
  attempt_count integer not null default 0 check (attempt_count >= 0),
  scheduled_at timestamptz not null,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.marketing_deliveries is
  'Delivery ledger without email body or address. Provider sends are not enabled by this migration.';

create index marketing_deliveries_dispatch_idx
  on public.marketing_deliveries (status, scheduled_at)
  where status in ('queued', 'transient_failed');

create table public.beta_invites (
  id uuid primary key default gen_random_uuid(),
  waitlist_id uuid not null references public.marketing_waitlist(id) on delete cascade,
  cohort text not null,
  status text not null default 'queued' check (status in ('queued', 'sent', 'accepted', 'expired', 'cancelled')),
  expires_at timestamptz,
  sent_at timestamptz,
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index beta_invites_waitlist_status_idx
  on public.beta_invites (waitlist_id, status);

alter table public.marketing_consent_events enable row level security;
alter table public.marketing_suppressions enable row level security;
alter table public.marketing_email_tokens enable row level security;
alter table public.marketing_deliveries enable row level security;
alter table public.beta_invites enable row level security;

revoke all on table public.marketing_consent_events from public, anon, authenticated;
revoke all on table public.marketing_suppressions from public, anon, authenticated;
revoke all on table public.marketing_email_tokens from public, anon, authenticated;
revoke all on table public.marketing_deliveries from public, anon, authenticated;
revoke all on table public.beta_invites from public, anon, authenticated;

grant select, insert on table public.marketing_consent_events to service_role;
grant select, insert, update on table public.marketing_suppressions to service_role;
grant select, insert, update on table public.marketing_email_tokens to service_role;
grant select, insert, update on table public.marketing_deliveries to service_role;
grant select, insert, update on table public.beta_invites to service_role;

grant usage, select on sequence public.marketing_consent_events_id_seq to service_role;
grant usage, select on sequence public.marketing_suppressions_id_seq to service_role;

-- One RPC keeps waitlist row changes and the append-only consent event in the
-- same transaction. It never returns the subscriber state to the public caller.
create or replace function public.register_marketing_waitlist_request(
  p_email text,
  p_email_hash text,
  p_locale text,
  p_interest text,
  p_utm jsonb,
  p_consent_version text,
  p_source text
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  target public.marketing_waitlist%rowtype;
  suppressed boolean := false;
begin
  insert into public.marketing_waitlist (
    email, email_hash, locale, interest, utm, consent_version,
    consented_at, source, status, updated_at
  ) values (
    p_email, p_email_hash, p_locale, p_interest, coalesce(p_utm, '{}'::jsonb),
    p_consent_version, now(), p_source, 'pending_confirmation', now()
  )
  on conflict (email_hash) do nothing
  returning * into target;

  if target.id is not null then
    insert into public.marketing_consent_events (
      waitlist_id, event_type, consent_version, source
    ) values (
      target.id, 'signup_requested', p_consent_version, p_source
    );
    return;
  end if;

  select * into target
  from public.marketing_waitlist
  where email_hash = p_email_hash
  for update;

  select exists (
    select 1 from public.marketing_suppressions
    where waitlist_id = target.id and active
  ) into suppressed;

  if suppressed or target.status in ('unsubscribed', 'bounced', 'complained') then
    update public.marketing_waitlist
    set reconfirmation_requested_at = now(), updated_at = now()
    where id = target.id;

    insert into public.marketing_consent_events (
      waitlist_id, event_type, consent_version, source,
      metadata
    ) values (
      target.id, 'resubscribe_requested', p_consent_version, p_source,
      jsonb_build_object('suppression_preserved', true)
    );
    return;
  end if;

  update public.marketing_waitlist
  set email = p_email,
      locale = p_locale,
      interest = p_interest,
      utm = coalesce(p_utm, '{}'::jsonb),
      consent_version = p_consent_version,
      consented_at = now(),
      updated_at = now()
  where id = target.id;

  insert into public.marketing_consent_events (
    waitlist_id, event_type, consent_version, source, metadata
  ) values (
    target.id, 'signup_requested', p_consent_version, p_source,
    jsonb_build_object('repeat_request', true)
  );
end;
$$;

comment on function public.register_marketing_waitlist_request(text, text, text, text, jsonb, text, text) is
  'Service-only atomic waitlist registration. Suppressed contacts remain suppressed.';

revoke all on function public.register_marketing_waitlist_request(text, text, text, text, jsonb, text, text)
  from public, anon, authenticated;
grant execute on function public.register_marketing_waitlist_request(text, text, text, text, jsonb, text, text)
  to service_role;

commit;

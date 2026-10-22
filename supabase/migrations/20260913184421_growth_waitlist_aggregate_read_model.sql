-- Aggregate-only Growth Operations read model.
-- No email address, hash, token, UTM payload, or message body is returned.
-- This migration does not schedule or send marketing email.

begin;

create index if not exists marketing_waitlist_status_locale_idx
  on public.marketing_waitlist (status, locale);

create index if not exists marketing_suppressions_active_reason_idx
  on public.marketing_suppressions (reason)
  where active;

create index if not exists marketing_deliveries_status_locale_step_idx
  on public.marketing_deliveries (status, locale, step_id);

create index if not exists beta_invites_status_waitlist_idx
  on public.beta_invites (status, waitlist_id);

create or replace function nilaza_private.growth_waitlist_overview()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  result jsonb;
begin
  if auth.uid() is null or not nilaza_private.has_capability('overview.read') then
    raise exception 'Admin overview permission required' using errcode = '42501';
  end if;

  with
  locale_keys(key) as (values ('all'::text), ('vi'::text), ('en'::text)),
  waitlist as materialized (
    select id, locale, status
    from public.marketing_waitlist
  ),
  invites as materialized (
    select waitlist_id,
      bool_or(status in ('sent', 'accepted')) as invited,
      bool_or(status = 'accepted') as accepted
    from public.beta_invites
    group by waitlist_id
  ),
  segment_rows as (
    select
      key,
      jsonb_build_object(
        'requested', count(w.id),
        'pending', count(w.id) filter (where w.status in ('pending_confirmation', 'subscribed')),
        'confirmed', count(w.id) filter (where w.status in ('confirmed', 'invited')),
        'engaged', null,
        'invited', count(w.id) filter (where w.status = 'invited' or coalesce(i.invited, false)),
        'accepted', count(w.id) filter (where coalesce(i.accepted, false)),
        'unsubscribed', count(w.id) filter (where w.status = 'unsubscribed'),
        'bounced', count(w.id) filter (where w.status = 'bounced'),
        'complained', count(w.id) filter (where w.status = 'complained')
      ) as metrics
    from locale_keys
    left join waitlist w on key = 'all' or w.locale = key
    left join invites i on i.waitlist_id = w.id
    group by key
  ),
  delivery_rows as (
    select
      key,
      jsonb_build_object(
        'queued', count(d.id) filter (where d.status = 'queued'),
        'retry', count(d.id) filter (where d.status = 'transient_failed'),
        'deadLetter', count(d.id) filter (where d.status = 'permanent_failed')
      ) as metrics
    from locale_keys
    left join public.marketing_deliveries d on key = 'all' or d.locale = key
    group by key
  ),
  suppression_rows as (
    select
      reason,
      jsonb_object_agg(key, suppression_count order by key) as counts
    from (
      select
        r.reason,
        l.key,
        count(s.id) as suppression_count
      from (values ('unsubscribe'::text), ('bounce'::text), ('complaint'::text), ('manual'::text)) r(reason)
      cross join locale_keys l
      left join public.marketing_suppressions s
        on s.reason = r.reason and s.active
      left join waitlist w
        on w.id = s.waitlist_id and (l.key = 'all' or w.locale = l.key)
      where l.key = 'all' or s.id is null or w.id is not null
      group by r.reason, l.key
    ) counts_by_locale
    group by reason
  ),
  delivered_steps as materialized (
    select
      d.step_id,
      d.locale,
      count(distinct d.waitlist_id) filter (where d.status in ('sent', 'delivered')) as advanced
    from public.marketing_deliveries d
    group by d.step_id, d.locale
  ),
  campaign_steps(id, label, timing, position) as (
    values
      ('confirm'::text, 'Confirm address'::text, 'Immediately'::text, 1),
      ('welcome', 'Welcome to Nilaza', 'After confirmation', 2),
      ('interest', 'Your reflection path', 'Day 2', 3),
      ('feature', 'Meet AI Guides', 'Day 5', 4),
      ('trust', 'Safety & boundaries', 'Day 10', 5),
      ('invite', 'Limited beta invite', 'Cohort release', 6)
  ),
  step_rows as (
    select jsonb_build_object(
      'id', step.id,
      'label', step.label,
      'timing', step.timing,
      'metricNote', case
        when step.id = 'confirm' then 'Unique waitlist contacts and confirmed contacts.'
        when step.id = 'invite' then 'Sent or accepted beta invites and accepted invites.'
        else 'Confirmed contacts eligible; distinct sent or delivered contacts advanced.'
      end,
      'all', jsonb_build_object(
        'eligible', case
          when step.id = 'confirm' then (select (metrics->>'requested')::bigint from segment_rows where key = 'all')
          when step.id = 'invite' then (select (metrics->>'invited')::bigint from segment_rows where key = 'all')
          else (select (metrics->>'confirmed')::bigint from segment_rows where key = 'all')
        end,
        'advanced', case
          when step.id = 'confirm' then (select (metrics->>'confirmed')::bigint from segment_rows where key = 'all')
          when step.id = 'invite' then (select (metrics->>'accepted')::bigint from segment_rows where key = 'all')
          else coalesce((select sum(advanced) from delivered_steps where step_id = step.id), 0)
        end
      ),
      'vi', jsonb_build_object(
        'eligible', case
          when step.id = 'confirm' then (select (metrics->>'requested')::bigint from segment_rows where key = 'vi')
          when step.id = 'invite' then (select (metrics->>'invited')::bigint from segment_rows where key = 'vi')
          else (select (metrics->>'confirmed')::bigint from segment_rows where key = 'vi')
        end,
        'advanced', case
          when step.id = 'confirm' then (select (metrics->>'confirmed')::bigint from segment_rows where key = 'vi')
          when step.id = 'invite' then (select (metrics->>'accepted')::bigint from segment_rows where key = 'vi')
          else coalesce((select sum(advanced) from delivered_steps where step_id = step.id and locale = 'vi'), 0)
        end
      ),
      'en', jsonb_build_object(
        'eligible', case
          when step.id = 'confirm' then (select (metrics->>'requested')::bigint from segment_rows where key = 'en')
          when step.id = 'invite' then (select (metrics->>'invited')::bigint from segment_rows where key = 'en')
          else (select (metrics->>'confirmed')::bigint from segment_rows where key = 'en')
        end,
        'advanced', case
          when step.id = 'confirm' then (select (metrics->>'confirmed')::bigint from segment_rows where key = 'en')
          when step.id = 'invite' then (select (metrics->>'accepted')::bigint from segment_rows where key = 'en')
          else coalesce((select sum(advanced) from delivered_steps where step_id = step.id and locale = 'en'), 0)
        end
      )
    ) as item
    from campaign_steps step
    order by step.position
  )
  select jsonb_build_object(
    'classification', 'live_aggregate',
    'label', 'Live aggregate — no subscriber PII',
    'source', 'Supabase aggregate read model',
    'generatedAt', now(),
    'campaign', 'Beta waitlist VI/EN',
    'segments', (select jsonb_object_agg(key, metrics) from segment_rows),
    'steps', (select jsonb_agg(item) from step_rows),
    'deliveryHealth', jsonb_build_object(
      'providerConnected', false,
      'all', (select metrics from delivery_rows where key = 'all'),
      'vi', (select metrics from delivery_rows where key = 'vi'),
      'en', (select metrics from delivery_rows where key = 'en')
    ),
    'suppressions', jsonb_build_array(
      jsonb_build_object('reason', 'Unsubscribe', 'behavior', 'Block all marketing until explicit re-confirmation', 'counts', (select counts from suppression_rows where reason = 'unsubscribe')),
      jsonb_build_object('reason', 'Hard bounce', 'behavior', 'Block delivery and flag address quality', 'counts', (select counts from suppression_rows where reason = 'bounce')),
      jsonb_build_object('reason', 'Complaint', 'behavior', 'Permanent block; Owner review required', 'counts', (select counts from suppression_rows where reason = 'complaint')),
      jsonb_build_object('reason', 'Manual', 'behavior', 'Policy block; Owner review required', 'counts', (select counts from suppression_rows where reason = 'manual'))
    ),
    'limitations', jsonb_build_array(
      'Engagement is unavailable until a consented provider event contract is connected.',
      'Provider connectivity remains false until outbound delivery is explicitly enabled.'
    )
  ) into result;

  return result;
end;
$$;

comment on function nilaza_private.growth_waitlist_overview() is
  'Capability-gated aggregate waitlist and delivery metrics. Returns no subscriber PII.';

create or replace function public.get_growth_waitlist_overview()
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  select nilaza_private.growth_waitlist_overview();
$$;

comment on function public.get_growth_waitlist_overview() is
  'Read-only Owner/Admin Growth Operations aggregate. Requires overview.read.';

revoke all on function nilaza_private.growth_waitlist_overview(), public.get_growth_waitlist_overview()
  from public, anon;
grant execute on function nilaza_private.growth_waitlist_overview(), public.get_growth_waitlist_overview()
  to authenticated;

commit;

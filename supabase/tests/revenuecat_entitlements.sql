-- Synthetic integration test for 20261116090000_revenuecat_entitlements.sql.
-- Run only on an isolated staging or local database after the migration, never production.
-- All fixtures and mutations are rolled back. Not yet executed (2026-11-15): written with the migration.
begin;
insert into auth.users(id,email) values
 ('00000000-0000-4000-8000-0000000000a1','buyer@qa.invalid'),
 ('00000000-0000-4000-8000-0000000000a2','other@qa.invalid');
-- A pre-webhook row (no provider_event_at) must be taken over by the first event.
insert into public.subscriptions(user_id,provider,entitlement,status)
 values ('00000000-0000-4000-8000-0000000000a2','revenuecat','free','free');

-- Client roles cannot call the function, read the event table or write subscriptions.
set local role authenticated;
do $$
declare changed integer;
begin
  perform set_config('request.jwt.claim.sub','00000000-0000-4000-8000-0000000000a1',true);
  begin
    perform public.nilaza_apply_revenuecat_event('evt-client','INITIAL_PURCHASE','00000000-0000-4000-8000-0000000000a1',now(),'active','premium',now()+interval '30 days');
    raise exception 'FAIL authenticated executed the webhook function';
  exception when insufficient_privilege then null; end;
  begin
    perform 1 from nilaza_private.revenuecat_webhook_events;
    raise exception 'FAIL authenticated read the event table';
  exception when insufficient_privilege then null; end;
  begin
    insert into public.subscriptions(user_id,provider,entitlement,status) values (auth.uid(),'manual','premium','active');
    raise exception 'FAIL authenticated inserted a subscription';
  exception when insufficient_privilege then null; end;
  update public.subscriptions set status='active' where user_id=auth.uid();
  get diagnostics changed = row_count;
  if changed <> 0 then raise exception 'FAIL authenticated updated a subscription'; end if;
end $$;
reset role;

set local role anon;
do $$
begin
  begin
    perform public.nilaza_apply_revenuecat_event('evt-anon','INITIAL_PURCHASE','00000000-0000-4000-8000-0000000000a1',now(),'active','premium',null);
    raise exception 'FAIL anon executed the webhook function';
  exception when insufficient_privilege then null; end;
end $$;
reset role;

set local role service_role;
do $$
declare r jsonb; sub public.subscriptions;
begin
  -- First purchase applies.
  r := public.nilaza_apply_revenuecat_event('evt-1','INITIAL_PURCHASE','00000000-0000-4000-8000-0000000000a1',
    '2026-11-15T10:00:00Z','trialing','premium','2026-11-22T10:00:00Z','nilaza_premium_monthly:monthly','SANDBOX');
  if r->>'status' <> 'applied' then raise exception 'FAIL first event %', r; end if;
  select * into sub from public.subscriptions where user_id='00000000-0000-4000-8000-0000000000a1' and provider='revenuecat';
  if sub.entitlement <> 'premium' or sub.status <> 'trialing' or sub.current_period_end <> '2026-11-22T10:00:00Z'
     or sub.environment <> 'SANDBOX' or sub.product_id <> 'nilaza_premium_monthly:monthly' then
    raise exception 'FAIL first event row %', row_to_json(sub);
  end if;

  -- The same event id again changes nothing.
  r := public.nilaza_apply_revenuecat_event('evt-1','INITIAL_PURCHASE','00000000-0000-4000-8000-0000000000a1',
    '2026-11-15T10:00:00Z','expired','premium',null,null,null);
  if r->>'status' <> 'duplicate' then raise exception 'FAIL duplicate %', r; end if;
  if (select status from public.subscriptions where user_id='00000000-0000-4000-8000-0000000000a1') <> 'trialing' then
    raise exception 'FAIL duplicate changed the row';
  end if;

  -- A newer renewal applies; an older expiration delivered late is stale.
  r := public.nilaza_apply_revenuecat_event('evt-2','RENEWAL','00000000-0000-4000-8000-0000000000a1',
    '2026-11-22T10:00:05Z','active','premium','2026-12-22T10:00:00Z',null,'SANDBOX');
  if r->>'status' <> 'applied' then raise exception 'FAIL renewal %', r; end if;
  r := public.nilaza_apply_revenuecat_event('evt-0','EXPIRATION','00000000-0000-4000-8000-0000000000a1',
    '2026-11-15T09:00:00Z','expired','premium','2026-11-15T09:00:00Z',null,'SANDBOX');
  if r->>'status' <> 'stale' then raise exception 'FAIL stale %', r; end if;
  select * into sub from public.subscriptions where user_id='00000000-0000-4000-8000-0000000000a1' and provider='revenuecat';
  if sub.status <> 'active' or sub.current_period_end <> '2026-12-22T10:00:00Z' or sub.product_id <> 'nilaza_premium_monthly:monthly' then
    raise exception 'FAIL stale event changed the row %', row_to_json(sub);
  end if;
  if (select outcome from nilaza_private.revenuecat_webhook_events where event_id='evt-0') <> 'stale' then
    raise exception 'FAIL stale outcome not recorded';
  end if;

  -- A row created before the webhook (no provider_event_at) is updated by the first event.
  r := public.nilaza_apply_revenuecat_event('evt-3','INITIAL_PURCHASE','00000000-0000-4000-8000-0000000000a2',
    '2026-11-15T11:00:00Z','active','premium','2026-12-15T11:00:00Z',null,'PRODUCTION');
  if r->>'status' <> 'applied' or (select entitlement from public.subscriptions where user_id='00000000-0000-4000-8000-0000000000a2') <> 'premium' then
    raise exception 'FAIL legacy row takeover %', r;
  end if;

  -- Unknown user is acknowledged without writing.
  r := public.nilaza_apply_revenuecat_event('evt-4','INITIAL_PURCHASE','00000000-0000-4000-8000-0000000000ff',
    now(),'active','premium',null,null,null);
  if r->>'status' <> 'unknown_user' or exists (select 1 from nilaza_private.revenuecat_webhook_events where event_id='evt-4') then
    raise exception 'FAIL unknown user %', r;
  end if;

  -- Invalid input is refused.
  begin
    perform public.nilaza_apply_revenuecat_event('evt-5','INITIAL_PURCHASE','00000000-0000-4000-8000-0000000000a1',now(),'active','premium_astrology_ai',null);
    raise exception 'FAIL wrong entitlement accepted';
  exception when invalid_parameter_value then null; end;
  begin
    perform public.nilaza_apply_revenuecat_event('evt-6','INITIAL_PURCHASE','00000000-0000-4000-8000-0000000000a1',now(),'free','premium',null);
    raise exception 'FAIL free status accepted';
  exception when invalid_parameter_value then null; end;
  begin
    perform public.nilaza_apply_revenuecat_event('evt-7','initial purchase','00000000-0000-4000-8000-0000000000a1',now(),'active','premium',null);
    raise exception 'FAIL bad event type accepted';
  exception when invalid_parameter_value then null; end;
end $$;
reset role;

-- Own-row read policy is unchanged: each user sees only their own row.
set local role authenticated;
do $$
begin
  perform set_config('request.jwt.claim.sub','00000000-0000-4000-8000-0000000000a1',true);
  if (select count(*) from public.subscriptions) <> 1 then raise exception 'FAIL own subscription visibility'; end if;
  if (select entitlement from public.subscriptions) <> 'premium' then raise exception 'FAIL own subscription read'; end if;
end $$;
reset role;

do $$
begin
  if not (select relrowsecurity and relforcerowsecurity from pg_class where oid = 'nilaza_private.revenuecat_webhook_events'::regclass) then
    raise exception 'FAIL event table RLS not forced';
  end if;
end $$;
rollback;

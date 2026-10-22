-- Aggregate Growth Operations contract test. All fixtures roll back and this
-- file deliberately avoids requiring pgTAP on the linked staging project.
begin;

do $$
begin
  if to_regprocedure('public.get_growth_waitlist_overview()') is null then
    raise exception 'FAIL missing aggregate Growth Operations RPC';
  end if;
  if has_function_privilege('anon', 'public.get_growth_waitlist_overview()', 'EXECUTE') then
    raise exception 'FAIL anonymous clients can execute aggregate RPC';
  end if;
  if not has_function_privilege('authenticated', 'public.get_growth_waitlist_overview()', 'EXECUTE') then
    raise exception 'FAIL authenticated role cannot reach capability gate';
  end if;
end $$;

insert into auth.users(id, email) values
  ('00000000-0000-4000-8000-000000000071', 'growth-owner@qa.invalid'),
  ('00000000-0000-4000-8000-000000000072', 'growth-user@qa.invalid');

insert into public.admin_role_assignments(user_id, role) values
  ('00000000-0000-4000-8000-000000000071', 'owner');

insert into public.marketing_waitlist(
  id, email, email_hash, locale, interest, consent_version, source, status
) values
  ('71000000-0000-4000-8000-000000000001', 'vi-growth@qa.invalid', repeat('7', 64), 'vi', 'reflection', 'qa-v1', 'qa', 'confirmed'),
  ('71000000-0000-4000-8000-000000000002', 'en-growth@qa.invalid', repeat('8', 64), 'en', 'guides', 'qa-v1', 'qa', 'pending_confirmation');

insert into public.beta_invites(waitlist_id, cohort, status)
values ('71000000-0000-4000-8000-000000000001', 'qa', 'accepted');

insert into public.marketing_suppressions(waitlist_id, reason)
values ('71000000-0000-4000-8000-000000000002', 'bounce');

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000072', true);

do $$
begin
  begin
    perform public.get_growth_waitlist_overview();
    raise exception 'FAIL ordinary authenticated user read aggregate';
  exception when insufficient_privilege then
    null;
  end;
end $$;

select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000071', true);

do $$
declare
  payload jsonb := public.get_growth_waitlist_overview();
begin
  if payload->>'classification' <> 'live_aggregate' then
    raise exception 'FAIL live aggregate classification';
  end if;
  if (payload->'segments'->'all'->>'requested')::bigint < 2 then
    raise exception 'FAIL waitlist aggregate count';
  end if;
  if (payload->'segments'->'vi'->>'accepted')::bigint < 1 then
    raise exception 'FAIL locale invite aggregate';
  end if;
  if payload->'segments'->'all'->'engaged' <> 'null'::jsonb then
    raise exception 'FAIL unavailable engagement must remain null';
  end if;
  if jsonb_array_length(payload->'steps') <> 6 then
    raise exception 'FAIL campaign stage contract';
  end if;
  if jsonb_array_length(payload->'suppressions') <> 4 then
    raise exception 'FAIL suppression reason contract';
  end if;
  if payload::text like '%vi-growth@qa.invalid%' or payload::text like '%' || repeat('7', 64) || '%' then
    raise exception 'FAIL aggregate leaks subscriber identifier';
  end if;
  if payload->'deliveryHealth'->>'providerConnected' <> 'false' then
    raise exception 'FAIL provider state must remain disconnected';
  end if;
end $$;

reset role;
select 'PASS: aggregate RPC capability, segmentation, unavailable metric, PII boundary, and provider state' as result;
rollback;

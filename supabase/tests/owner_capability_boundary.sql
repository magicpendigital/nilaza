-- Synthetic integration test. Run only on isolated staging, never production.
-- All fixtures and mutations are rolled back. Assertions run AS authenticated.
begin;
insert into auth.users(id,email) values
 ('00000000-0000-4000-8000-000000000001','owner@qa.invalid'),
 ('00000000-0000-4000-8000-000000000002','editor@qa.invalid'),
 ('00000000-0000-4000-8000-000000000003','user@qa.invalid'),
 ('00000000-0000-4000-8000-000000000004','admin@qa.invalid'),
 ('00000000-0000-4000-8000-000000000005','reviewer@qa.invalid'),
 ('00000000-0000-4000-8000-000000000006','multi@qa.invalid');
insert into public.admin_role_assignments(user_id,role) values
 ('00000000-0000-4000-8000-000000000001','owner'),
 ('00000000-0000-4000-8000-000000000002','editor'),
 ('00000000-0000-4000-8000-000000000004','admin'),
 ('00000000-0000-4000-8000-000000000005','safety_reviewer'),
 ('00000000-0000-4000-8000-000000000006','editor'),
 ('00000000-0000-4000-8000-000000000006','safety_reviewer');
insert into public.journal_entries(user_id,local_id,source_type,title,summary)
 values ('00000000-0000-4000-8000-000000000003','qa-private','manual','synthetic','private sentinel');
insert into public.chat_sessions(id,user_id) values ('10000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000003');
insert into public.device_push_tokens(user_id,expo_push_token) values ('00000000-0000-4000-8000-000000000003','synthetic-not-a-real-token');
insert into public.safety_events(id,user_id,feature,reason,summary) values ('20000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000003','journal','user_report','private sentinel');
insert into public.personas(id,slug,type,status,name,short_description,transparency_note) values
 ('30000000-0000-4000-8000-000000000001','qa-active','archetype','active','{}','{}','{}'),
 ('30000000-0000-4000-8000-000000000002','qa-draft','archetype','draft','{}','{}','{}');

set local role authenticated;
do $$
declare uid text; changed integer;
begin
  foreach uid in array array['1','2','4','5','6'] loop
    perform set_config('request.jwt.claim.sub','00000000-0000-4000-8000-' || lpad(uid,12,'0'),true);
    if exists(select 1 from public.journal_entries) then raise exception 'FAIL private journal for role %', uid; end if;
    if exists(select 1 from public.chat_sessions) then raise exception 'FAIL private chat for role %', uid; end if;
    if exists(select 1 from public.device_push_tokens) then raise exception 'FAIL private token for role %', uid; end if;
    if exists(select 1 from public.safety_events) then raise exception 'FAIL raw safety for role %', uid; end if;
    if uid <> '1' then
      begin
        insert into public.admin_role_assignments(user_id,role) values (auth.uid(),'owner');
        raise exception 'FAIL self promotion';
      exception when insufficient_privilege then null; end;
      update public.admin_role_assignments set role='owner' where user_id=auth.uid();
      get diagnostics changed = row_count;
      if changed <> 0 then raise exception 'FAIL role update'; end if;
    end if;
  end loop;

  perform set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000003',true);
  if (select count(*) from public.journal_entries) <> 1 then raise exception 'FAIL own Journal'; end if;
  update public.journal_entries set user_note='own update' where local_id='qa-private';
  get diagnostics changed = row_count;
  if changed <> 1 then raise exception 'FAIL own update'; end if;
  if public.has_admin_capability('hub.read') then raise exception 'FAIL ordinary hub'; end if;
  begin perform public.get_owner_overview(); raise exception 'FAIL ordinary overview'; exception when insufficient_privilege then null; end;

  perform set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000002',true);
  if not public.has_admin_capability('content.draft') or public.has_admin_capability('ai.manage') or public.is_admin() then raise exception 'FAIL editor matrix'; end if;
  begin
    insert into public.chat_messages(session_id,user_id,role,content) values ('10000000-0000-4000-8000-000000000001',auth.uid(),'user','synthetic');
    raise exception 'FAIL foreign chat parent';
  exception when insufficient_privilege then null; end;
  update public.personas set name='{"en":"Draft edit"}' where slug='qa-draft';
  get diagnostics changed = row_count;
  if changed <> 1 then raise exception 'FAIL draft edit'; end if;
  update public.personas set name='{"en":"Bad edit"}' where slug='qa-active';
  get diagnostics changed = row_count;
  if changed <> 0 then raise exception 'FAIL active edit'; end if;
  begin
    update public.personas set status='active' where slug='qa-draft';
    raise exception 'FAIL editor publish';
  exception when insufficient_privilege then null; end;
  begin perform public.get_safety_queue(); raise exception 'FAIL editor safety'; exception when insufficient_privilege then null; end;

  perform set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000006',true);
  if jsonb_array_length(public.get_admin_access()->'roles') <> 2 or not public.has_admin_capability('safety.review') or not public.has_admin_capability('content.draft') then raise exception 'FAIL multi role union'; end if;

  perform set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000005',true);
  if public.get_safety_queue()::text like '%private sentinel%' then raise exception 'FAIL raw review leak'; end if;
  if not public.review_safety_event('20000000-0000-4000-8000-000000000001','reviewed') then raise exception 'FAIL legitimate review'; end if;

  perform set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000004',true);
  if not public.has_admin_capability('notifications.dispatch') or not public.has_admin_capability('ai.manage') then raise exception 'FAIL ops permission'; end if;
  update public.personas set status='active' where slug='qa-draft';
  get diagnostics changed = row_count;
  if changed <> 1 then raise exception 'FAIL admin publish'; end if;
  delete from public.personas where slug='qa-draft';
  get diagnostics changed = row_count;
  if changed <> 0 then raise exception 'FAIL admin delete'; end if;

  perform set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',true);
  if not public.has_admin_capability('roles.manage') then raise exception 'FAIL owner roles'; end if;
  if (public.get_owner_overview()->>'activeAssignments')::int <> 6 then raise exception 'FAIL overview counts'; end if;
  begin
    update public.admin_role_assignments set status='revoked' where user_id=auth.uid() and role='owner';
    raise exception 'FAIL last owner removal';
  exception when check_violation then null; end;
  update public.admin_role_assignments set status='revoked' where user_id='00000000-0000-4000-8000-000000000002';
  get diagnostics changed = row_count;
  if changed <> 1 then raise exception 'FAIL owner revocation'; end if;
  if not exists(select 1 from public.admin_audit_logs where action='role.update') then raise exception 'FAIL role audit'; end if;
  perform set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000002',true);
  if public.has_admin_capability('content.draft') or public.has_admin_capability('hub.read') then raise exception 'FAIL same JWT revocation'; end if;
  if public.has_admin_capability('unknown') then raise exception 'FAIL unknown capability'; end if;
end $$;
reset role;
do $$
begin
  if has_function_privilege('anon','public.get_admin_access()','EXECUTE') or has_function_privilege('anon','public.get_owner_overview()','EXECUTE') then raise exception 'FAIL anon RPC ACL'; end if;
  if exists(select 1 from pg_policies where schemaname='public' and tablename in ('user_profiles','birth_profiles','chat_sessions','chat_messages','chat_session_personas','tarot_readings','journal_entries','astrology_reports','daily_insights','daily_zodiac_pulse','subscriptions','credit_ledger','generation_jobs','usage_events','safety_events','device_push_tokens','notification_preferences','notification_events','notification_deliveries','in_app_notifications') and (coalesce(qual,'') || coalesce(with_check,'')) like '%is_admin%') then raise exception 'FAIL surviving private bypass'; end if;
end $$;
select 'PASS: 6 identities; isolation, escalation, draft/publish, ownership, review, ops capability, last owner, audit, revocation, RPC ACL' as result;
rollback;

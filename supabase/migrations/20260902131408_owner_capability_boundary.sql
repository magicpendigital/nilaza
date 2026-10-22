-- Live capabilities: no JWT/user_metadata role cache, and no admin bypass of
-- personal data. Apply forward only, after the existing application migrations.
create schema if not exists nilaza_private;
revoke all on schema nilaza_private from public, anon;
grant usage on schema nilaza_private to authenticated;

create function nilaza_private.current_roles() returns text[]
language sql stable security definer set search_path = '' as $$
  select coalesce(array_agg(role order by role), '{}'::text[])
  from public.admin_role_assignments
  where user_id = (select auth.uid()) and status = 'active'
    and (select auth.uid()) is not null;
$$;
create function nilaza_private.has_capability(capability text) returns boolean
language sql stable security invoker set search_path = '' as $$
  select case capability
    when 'hub.read' then roles && array['owner','admin','editor','safety_reviewer']
    when 'content.read' then roles && array['owner','admin','editor','safety_reviewer']
    when 'content.draft' then roles && array['owner','admin','editor']
    when 'content.publish' then roles && array['owner','admin']
    when 'content.delete' then roles && array['owner']
    when 'ai.read' then roles && array['owner','admin','editor','safety_reviewer']
    when 'ai.manage' then roles && array['owner','admin']
    when 'roles.manage' then roles && array['owner']
    when 'overview.read' then roles && array['owner','admin']
    when 'notifications.dispatch' then roles && array['owner','admin']
    when 'safety.review' then roles && array['owner','admin','safety_reviewer']
    else false end
  from (select nilaza_private.current_roles() as roles) r;
$$;
create function public.has_admin_capability(capability text) returns boolean
language sql stable security invoker set search_path = '' as $$
  select nilaza_private.has_capability(capability);
$$;
create function public.get_admin_access() returns jsonb
language sql stable security invoker set search_path = '' as $$
  select jsonb_build_object('userId', auth.uid(), 'roles', nilaza_private.current_roles(),
    'capabilities', coalesce((select jsonb_agg(cap order by cap) from unnest(array[
      'hub.read','content.read','content.draft','content.publish','content.delete',
      'ai.read','ai.manage','roles.manage','overview.read','notifications.dispatch','safety.review'
    ]) cap where nilaza_private.has_capability(cap)), '[]'::jsonb));
$$;
-- Compatibility for older deployed Edge functions: publishers only, never editors.
create or replace function public.is_admin() returns boolean
language sql stable security invoker set search_path = '' as $$
  select nilaza_private.has_capability('ai.manage');
$$;
revoke all on function nilaza_private.current_roles(), nilaza_private.has_capability(text),
  public.has_admin_capability(text), public.get_admin_access(), public.is_admin() from public, anon;
grant execute on function nilaza_private.current_roles(), nilaza_private.has_capability(text),
  public.has_admin_capability(text), public.get_admin_access(), public.is_admin() to authenticated;

drop policy "admins can manage admin role assignments" on public.admin_role_assignments;
create policy "read own roles or owner directory" on public.admin_role_assignments for select to authenticated
  using (user_id = (select auth.uid()) or (select nilaza_private.has_capability('roles.manage')));
create policy "owner manages roles" on public.admin_role_assignments for all to authenticated
  using ((select nilaza_private.has_capability('roles.manage')))
  with check ((select nilaza_private.has_capability('roles.manage')));

create function nilaza_private.guard_role_change() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  -- Serialize removals so two owners cannot revoke each other concurrently.
  perform pg_advisory_xact_lock(820260902);
  if tg_op <> 'INSERT' and old.role = 'owner' and old.status = 'active' then
    if tg_op = 'DELETE' or new.role <> 'owner' or new.status <> 'active' or new.user_id <> old.user_id then
      if not exists (select 1 from public.admin_role_assignments where role = 'owner' and status = 'active' and id <> old.id) then
        raise exception 'Cannot remove the last active owner' using errcode = '23514';
      end if;
    end if;
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;
create function nilaza_private.audit_role_change() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.admin_audit_logs(admin_user_id, action, target_table, target_id, metadata)
    values(auth.uid(), 'role.' || lower(tg_op), 'admin_role_assignments', coalesce(new.id, old.id),
      jsonb_build_object('role', coalesce(new.role, old.role), 'status', coalesce(new.status, old.status)));
  return null;
end;
$$;
revoke all on function nilaza_private.guard_role_change(), nilaza_private.audit_role_change() from public, anon, authenticated;
create trigger guard_role_change before insert or update or delete on public.admin_role_assignments
  for each row execute function nilaza_private.guard_role_change();
create trigger audit_role_change after insert or update or delete on public.admin_role_assignments
  for each row execute function nilaza_private.audit_role_change();

-- Preserve each table's existing own-user operations, remove ONLY the old
-- elevated alternative. Includes notification private rows: workers use a
-- server-only client after capability verification, not a token-reading UI.
do $$
declare p record; statement text;
begin
  for p in select * from pg_policies where schemaname = 'public' and tablename = any(array[
    'user_profiles','birth_profiles','chat_sessions','chat_messages','chat_session_personas',
    'tarot_readings','journal_entries','astrology_reports','daily_insights','daily_zodiac_pulse',
    'subscriptions','credit_ledger','generation_jobs','usage_events','safety_events',
    'device_push_tokens','notification_preferences','notification_events','notification_deliveries','in_app_notifications'
  ]) loop
    statement := format('alter policy %I on public.%I to authenticated', p.policyname, p.tablename);
    if p.qual is not null then
      statement := statement || ' using (' || regexp_replace(p.qual, '(public\.)?is_admin\(\)', 'false', 'g') || ')';
    end if;
    if p.with_check is not null then
      statement := statement || ' with check (' || regexp_replace(p.with_check, '(public\.)?is_admin\(\)', 'false', 'g') || ')';
    end if;
    execute statement;
  end loop;
end $$;
-- Prevent writing a message into somebody else's session by supplying own user_id.
create policy "message parent belongs to caller" on public.chat_messages as restrictive for all to authenticated
  using (exists(select 1 from public.chat_sessions s where s.id = session_id and s.user_id = (select auth.uid())))
  with check (exists(select 1 from public.chat_sessions s where s.id = session_id and s.user_id = (select auth.uid())));

-- Draft-capable tables: both old and new row must stay draft for editors.
do $$
declare t text; p record; published text;
begin
  foreach t in array array['personas','tarot_decks','persona_sources','prompt_versions'] loop
    for p in select policyname from pg_policies where schemaname = 'public' and tablename = t loop
      execute format('drop policy %I on public.%I', p.policyname, t);
    end loop;
    published := case when t = 'persona_sources' then 'approved' else 'active' end;
    execute format('create policy "published or staff read" on public.%I for select to authenticated using (status = %L or (select nilaza_private.has_capability(''content.read'')))', t, published);
    execute format('create policy "create drafts or publish" on public.%I for insert to authenticated with check ((select nilaza_private.has_capability(''content.publish'')) or (status = ''draft'' and (select nilaza_private.has_capability(''content.draft''))))', t);
    execute format('create policy "edit drafts or publish" on public.%I for update to authenticated using ((select nilaza_private.has_capability(''content.publish'')) or (status = ''draft'' and (select nilaza_private.has_capability(''content.draft'')))) with check ((select nilaza_private.has_capability(''content.publish'')) or (status = ''draft'' and (select nilaza_private.has_capability(''content.draft''))))', t);
    execute format('create policy "owner deletes draft" on public.%I for delete to authenticated using (status = ''draft'' and (select nilaza_private.has_capability(''content.delete'')))', t);
  end loop;
end $$;
-- Unversioned card/source rows cannot safely offer draft editing.
alter policy "admins manage tarot cards" on public.tarot_cards to authenticated
  using ((select nilaza_private.has_capability('content.publish')))
  with check ((select nilaza_private.has_capability('content.publish')));
alter policy "admins manage source chunks" on public.source_chunks to authenticated
  using ((select nilaza_private.has_capability('content.publish')))
  with check ((select nilaza_private.has_capability('content.publish')));
alter policy "admins manage source embeddings" on public.source_embeddings to authenticated
  using ((select nilaza_private.has_capability('content.publish')))
  with check ((select nilaza_private.has_capability('content.publish')));
-- Keep active runtime configuration readable by authenticated generation calls;
-- staff can inspect drafts; all writes still require ai.manage via is_admin().
create policy "staff read council configs" on public.ai_council_config_versions for select to authenticated using ((select nilaza_private.has_capability('ai.read')));
create policy "staff read council templates" on public.ai_council_template_versions for select to authenticated using ((select nilaza_private.has_capability('ai.read')));
create policy "staff read model routes" on public.model_route_versions for select to authenticated using ((select nilaza_private.has_capability('ai.read')));

alter policy "admins create audit logs" on public.admin_audit_logs to authenticated
  with check (admin_user_id = (select auth.uid()) and (select nilaza_private.has_capability('ai.manage')) and action not like 'role.%');

create function nilaza_private.owner_overview() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  if auth.uid() is null or not nilaza_private.has_capability('overview.read') then
    raise exception 'Not authorized' using errcode = '42501';
  end if;
  -- Allowlisted counts only: never user text, tokens, metadata, IDs or profiles.
  return jsonb_build_object(
    'activePersonas', (select count(*) from public.personas where status = 'active'),
    'activeDecks', (select count(*) from public.tarot_decks where status = 'active'),
    'openSafetyReports', (select count(*) from public.safety_events where status = 'open'),
    'failedJobs', (select count(*) from public.generation_jobs where status = 'failed'),
    'activeAssignments', (select count(*) from public.admin_role_assignments where status = 'active')
  );
end;
$$;
create function public.get_owner_overview() returns jsonb
language sql stable security invoker set search_path = '' as $$ select nilaza_private.owner_overview(); $$;
revoke all on function nilaza_private.owner_overview(), public.get_owner_overview() from public, anon;
grant execute on function nilaza_private.owner_overview(), public.get_owner_overview() to authenticated;

-- Deletion is distinct from publishing even on unversioned content/config.
do $$
declare t text;
begin
  foreach t in array array['tarot_cards','source_chunks','source_embeddings','ai_council_config_versions','ai_council_template_versions','model_route_versions'] loop
    execute format('create policy "owner deletion boundary" on public.%I as restrictive for delete to authenticated using ((select nilaza_private.has_capability(''content.delete'')))', t);
  end loop;
end $$;

create function nilaza_private.safety_queue() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  if auth.uid() is null or not nilaza_private.has_capability('safety.review') then
    raise exception 'Not authorized' using errcode = '42501';
  end if;
  return coalesce((select jsonb_agg(row_to_json(q)) from (
    select id, feature, reason, status, created_at from public.safety_events
    where status = 'open' order by created_at desc limit 100
  ) q), '[]'::jsonb);
end;
$$;
create function nilaza_private.review_safety(event_id uuid, next_status text) returns boolean
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or not nilaza_private.has_capability('safety.review') then
    raise exception 'Not authorized' using errcode = '42501';
  end if;
  if next_status not in ('reviewed','dismissed','escalated') or next_status is null then
    raise exception 'Invalid review status' using errcode = '22023';
  end if;
  update public.safety_events set status = next_status, reviewer_id = auth.uid(), reviewed_at = now() where id = event_id;
  if not found then return false; end if;
  insert into public.admin_audit_logs(admin_user_id,action,target_table,target_id,metadata)
    values(auth.uid(),'safety.review','safety_events',event_id,jsonb_build_object('status',next_status));
  return true;
end;
$$;
create function public.get_safety_queue() returns jsonb
language sql stable security invoker set search_path = '' as $$ select nilaza_private.safety_queue(); $$;
create function public.review_safety_event(event_id uuid, next_status text) returns boolean
language sql security invoker set search_path = '' as $$ select nilaza_private.review_safety(event_id, next_status); $$;
revoke all on function nilaza_private.safety_queue(), nilaza_private.review_safety(uuid,text), public.get_safety_queue(), public.review_safety_event(uuid,text) from public, anon;
grant execute on function nilaza_private.safety_queue(), nilaza_private.review_safety(uuid,text), public.get_safety_queue(), public.review_safety_event(uuid,text) to authenticated;

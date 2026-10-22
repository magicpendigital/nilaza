-- Forward-only preparation. Apply only through a reviewed exact-target bootstrap
-- or upgrade packet. Ordinary client roles must not receive table-wide operations
-- that bypass row policies. CRUD, policies, service_role and rows are preserved.
begin;

do $$
declare
  tables text[] := array[
    'admin_audit_logs','admin_content_bundle_events','admin_content_bundles',
    'admin_document_access_log','admin_role_assignments',
    'ai_council_config_versions','ai_council_template_versions',
    'ai_trace_payload_refs','ai_trace_qa_captures','ai_trace_runs','ai_trace_scores','ai_trace_spans',
    'astrology_reports','beta_invites','birth_profiles','chat_messages','chat_session_personas',
    'chat_sessions','credit_ledger','daily_insights','daily_zodiac_pulse','device_push_tokens',
    'generation_jobs','in_app_notifications','journal_entries','marketing_consent_events',
    'marketing_deliveries','marketing_email_tokens','marketing_suppressions','marketing_waitlist',
    'model_route_versions','notification_deliveries','notification_events','notification_preferences',
    'persona_sources','personas','prompt_versions','safety_events','source_chunks','source_embeddings',
    'subscriptions','tarot_cards','tarot_decks','tarot_readings','usage_events','user_profiles'
  ];
  table_name text;
begin
  if current_user <> 'postgres' or current_setting('server_version_num')::integer < 170000 then
    raise exception 'Nilaza privilege migration requires reviewed postgres execution on PostgreSQL 17+';
  end if;
  if exists (
    select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind in ('r','p')
      and (not c.relname = any(tables) or not c.relrowsecurity)
  ) then
    raise exception 'Unexpected public table or disabled RLS: review target inventory before privilege migration';
  end if;
  foreach table_name in array tables loop
    if to_regclass(format('public.%I', table_name)) is null then
      raise exception 'Nilaza privilege prerequisite missing: %', table_name;
    end if;
    execute format('revoke truncate, references, trigger, maintain on table public.%I from public, anon, authenticated', table_name);
    if exists (
      select 1 from unnest(array['anon','authenticated']) client_role
      cross join unnest(array['TRUNCATE','REFERENCES','TRIGGER','MAINTAIN']) privilege
      where has_table_privilege(client_role, format('public.%I', table_name), privilege)
    ) then
      raise exception 'Inherited unsafe client privileges remain on %', table_name;
    end if;
  end loop;
end $$;

-- Supabase's observed public defaults granted ALL to both client roles. Restrict
-- future tables created by the reviewed postgres migration executor too.
-- Objects created by other owners require their own explicitly reviewed grants.
alter default privileges for role postgres in schema public
  revoke truncate, references, trigger, maintain on tables from public, anon, authenticated;

commit;

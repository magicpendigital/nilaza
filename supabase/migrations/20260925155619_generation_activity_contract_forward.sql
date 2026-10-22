-- Durable hand-off contract for long-running AI work.
-- The client-facing activity label is deliberately generic; raw prompts and
-- outputs stay in the feature tables behind the authenticated app session.

alter table public.generation_jobs
  add column if not exists client_request_id text,
  add column if not exists chat_session_id uuid references public.chat_sessions(id) on delete set null,
  add column if not exists presentation jsonb not null default '{}'::jsonb,
  add column if not exists canceled_at timestamptz;

create unique index if not exists generation_jobs_user_client_request_idx
  on public.generation_jobs(user_id, client_request_id)
  where client_request_id is not null;

create index if not exists generation_jobs_user_status_updated_idx
  on public.generation_jobs(user_id, status, updated_at desc);

-- Realtime is opt-in per table. The client subscribes only to its own
-- authenticated rows and receives status/presentation metadata, never prompt
-- text or generated output.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'generation_jobs'
  ) then
    alter publication supabase_realtime add table public.generation_jobs;
  end if;
end $$;

alter table public.notification_preferences
  drop constraint if exists notification_preferences_notification_type_check;
alter table public.notification_preferences
  add constraint notification_preferences_notification_type_check check (notification_type in (
    'daily_insight_ready', 'tarot_reading_ready', 'astrology_report_ready',
    'ai_response_ready', 'journal_reflection_reminder', 'account_security',
    'payment_subscription', 'admin_test'
  ));

alter table public.notification_events
  drop constraint if exists notification_events_notification_type_check;
alter table public.notification_events
  add constraint notification_events_notification_type_check check (notification_type in (
    'daily_insight_ready', 'tarot_reading_ready', 'astrology_report_ready',
    'ai_response_ready', 'journal_reflection_reminder', 'account_security',
    'payment_subscription', 'admin_test'
  ));
alter table public.notification_events
  drop constraint if exists notification_events_source_type_check;
alter table public.notification_events
  add constraint notification_events_source_type_check check (source_type in (
    'daily', 'tarot', 'astrology', 'journal', 'account', 'payment', 'admin', 'chat', 'council'
  ));

alter table public.in_app_notifications
  drop constraint if exists in_app_notifications_notification_type_check;
alter table public.in_app_notifications
  add constraint in_app_notifications_notification_type_check check (notification_type in (
    'daily_insight_ready', 'tarot_reading_ready', 'astrology_report_ready',
    'ai_response_ready', 'journal_reflection_reminder', 'account_security',
    'payment_subscription', 'admin_test'
  ));
alter table public.in_app_notifications
  drop constraint if exists in_app_notifications_source_type_check;
alter table public.in_app_notifications
  add constraint in_app_notifications_source_type_check check (source_type in (
    'daily', 'tarot', 'astrology', 'journal', 'account', 'payment', 'admin', 'chat', 'council'
  ));

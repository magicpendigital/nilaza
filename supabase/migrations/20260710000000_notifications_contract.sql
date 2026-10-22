-- Nilaza notification contract.
-- Adds opt-in preferences, sanitized notification events, Expo delivery tracking,
-- and a private in-app inbox. Push payloads must stay generic; detailed content
-- remains inside the authenticated app experience.

alter table public.device_push_tokens
  add column if not exists device_id text,
  add column if not exists app_version text,
  add column if not exists locale text not null default 'vi',
  add column if not exists timezone text,
  add column if not exists last_seen_at timestamptz,
  add column if not exists revoked_at timestamptz,
  add column if not exists failure_count integer not null default 0;

create table if not exists public.notification_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  channel text not null check (channel in ('in_app', 'push', 'email', 'sms', 'zalo', 'whatsapp')),
  notification_type text not null check (notification_type in (
    'daily_insight_ready',
    'tarot_reading_ready',
    'astrology_report_ready',
    'journal_reflection_reminder',
    'account_security',
    'payment_subscription',
    'admin_test'
  )),
  enabled boolean not null default true,
  locale text not null default 'vi',
  timezone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, channel, notification_type)
);

create table if not exists public.notification_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  notification_type text not null check (notification_type in (
    'daily_insight_ready',
    'tarot_reading_ready',
    'astrology_report_ready',
    'journal_reflection_reminder',
    'account_security',
    'payment_subscription',
    'admin_test'
  )),
  source_type text check (source_type in ('daily', 'tarot', 'astrology', 'journal', 'account', 'payment', 'admin')),
  source_id uuid,
  safe_title jsonb not null,
  safe_body jsonb not null,
  target_route text check (target_route in ('home', 'tarot', 'astrology', 'journal', 'profile', 'chat')),
  status text not null default 'pending' check (status in ('pending', 'in_app_created', 'queued', 'sent', 'partial', 'failed', 'canceled')),
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.notification_deliveries (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.notification_events(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  device_push_token_id uuid references public.device_push_tokens(id) on delete set null,
  channel text not null check (channel in ('push', 'email', 'sms', 'zalo', 'whatsapp')),
  provider text not null default 'expo',
  provider_ticket_id text,
  provider_receipt_status text,
  error_code text,
  error_message text,
  status text not null default 'pending' check (status in ('pending', 'sent', 'failed', 'invalid_token', 'skipped')),
  attempted_at timestamptz,
  receipt_checked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.in_app_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  local_id text,
  event_id uuid references public.notification_events(id) on delete set null,
  notification_type text not null check (notification_type in (
    'daily_insight_ready',
    'tarot_reading_ready',
    'astrology_report_ready',
    'journal_reflection_reminder',
    'account_security',
    'payment_subscription',
    'admin_test'
  )),
  title jsonb not null,
  body jsonb not null,
  source_type text check (source_type in ('daily', 'tarot', 'astrology', 'journal', 'account', 'payment', 'admin')),
  source_id uuid,
  target_route text check (target_route in ('home', 'tarot', 'astrology', 'journal', 'profile', 'chat')),
  status text not null default 'unread' check (status in ('unread', 'read', 'dismissed')),
  created_at timestamptz not null default now(),
  read_at timestamptz,
  dismissed_at timestamptz
);

create index if not exists notification_preferences_user_idx
  on public.notification_preferences(user_id, channel, notification_type);
create index if not exists notification_events_status_idx
  on public.notification_events(status, created_at desc);
create index if not exists notification_deliveries_event_idx
  on public.notification_deliveries(event_id, status);
create index if not exists in_app_notifications_user_idx
  on public.in_app_notifications(user_id, status, created_at desc);
create unique index if not exists in_app_notifications_user_local_id_idx
  on public.in_app_notifications(user_id, local_id)
  where local_id is not null;
create index if not exists device_push_tokens_user_status_idx
  on public.device_push_tokens(user_id, status, updated_at desc);

alter table public.notification_preferences enable row level security;
alter table public.notification_events enable row level security;
alter table public.notification_deliveries enable row level security;
alter table public.in_app_notifications enable row level security;

grant select, insert, update, delete on table public.notification_preferences to authenticated;
grant select, insert, update, delete on table public.notification_events to authenticated;
grant select, insert, update, delete on table public.notification_deliveries to authenticated;
grant select, insert, update, delete on table public.in_app_notifications to authenticated;

create policy "users manage own notification preferences"
  on public.notification_preferences for all
  using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid() or public.is_admin());

create policy "users read own notification events"
  on public.notification_events for select
  using (user_id = auth.uid() or public.is_admin());

create policy "users create own notification events"
  on public.notification_events for insert
  with check (user_id = auth.uid() or public.is_admin());

create policy "admins update notification events"
  on public.notification_events for update
  using (public.is_admin())
  with check (public.is_admin());

create policy "admins manage notification deliveries"
  on public.notification_deliveries for all
  using (public.is_admin())
  with check (public.is_admin());

create policy "users read own notification deliveries"
  on public.notification_deliveries for select
  using (user_id = auth.uid() or public.is_admin());

create policy "users manage own in app notifications"
  on public.in_app_notifications for all
  using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid() or public.is_admin());

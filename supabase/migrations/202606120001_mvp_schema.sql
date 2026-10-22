-- Nilaza MVP Supabase schema.
-- This migration defines the first durable contract for closed beta.
-- AI/provider keys stay outside the mobile client and outside this schema.

create extension if not exists pgcrypto;

create table if not exists public.admin_role_assignments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner', 'admin', 'editor', 'safety_reviewer')),
  status text not null default 'active' check (status in ('active', 'revoked')),
  created_at timestamptz not null default now(),
  unique (user_id, role)
);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admin_role_assignments ara
    where ara.user_id = auth.uid()
      and ara.status = 'active'
      and ara.role in ('owner', 'admin', 'editor', 'safety_reviewer')
  );
$$;

create table if not exists public.user_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  language text not null default 'vi',
  goals text[] not null default '{}',
  preferred_tone text not null default 'gentle',
  onboarding_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.birth_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  birth_date date,
  birth_time time,
  birth_time_known boolean not null default false,
  birth_place text,
  timezone text,
  consent_version text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.personas (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  type text not null check (type in ('historical_figure', 'book_inspired_guide', 'archetype')),
  status text not null default 'draft' check (status in ('draft', 'active', 'archived')),
  access_tier text not null default 'free' check (access_tier in ('free', 'premium-preview', 'premium')),
  default_locale text not null default 'vi',
  name jsonb not null,
  short_description jsonb not null,
  transparency_note jsonb not null,
  themes text[] not null default '{}',
  tone text[] not null default '{}',
  active_prompt_version_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.persona_sources (
  id uuid primary key default gen_random_uuid(),
  persona_id uuid not null references public.personas(id) on delete cascade,
  source_type text not null check (source_type in ('public_domain', 'licensed', 'internal_notes', 'inspired_theme')),
  title text not null,
  citation_url text,
  license_note text,
  status text not null default 'approved' check (status in ('draft', 'approved', 'blocked')),
  created_at timestamptz not null default now()
);

create table if not exists public.tarot_decks (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  status text not null default 'draft' check (status in ('draft', 'active', 'archived')),
  access_tier text not null default 'free' check (access_tier in ('free', 'premium-preview', 'premium')),
  default_locale text not null default 'vi',
  name jsonb not null,
  short_description jsonb not null,
  vibe jsonb not null,
  theme text[] not null default '{}',
  accent_color text,
  visual_direction jsonb,
  reading_style jsonb,
  active_prompt_version_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.tarot_cards (
  id uuid primary key default gen_random_uuid(),
  canonical_id text not null unique,
  arcana text not null check (arcana in ('major', 'minor')),
  number integer not null,
  suit text check (suit in ('wands', 'cups', 'swords', 'pentacles')),
  rank text,
  element text,
  name jsonb not null,
  keywords jsonb not null,
  intro jsonb,
  personality_portrait jsonb,
  upright_meaning jsonb not null,
  reversed_meaning jsonb not null,
  reflection_question jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.prompt_versions (
  id uuid primary key default gen_random_uuid(),
  feature text not null check (feature in ('persona_chat', 'tarot_reading', 'daily_insight', 'astrology_report', 'face_reading', 'safety_fallback')),
  owner_type text check (owner_type in ('persona', 'tarot_deck', 'global')),
  owner_id uuid,
  version text not null,
  status text not null default 'draft' check (status in ('draft', 'active', 'archived')),
  locale text not null default 'vi',
  prompt_text text not null,
  safety_notes text,
  reviewer_ids uuid[] not null default '{}',
  created_by uuid references auth.users(id),
  published_by uuid references auth.users(id),
  published_at timestamptz,
  supersedes_version_id uuid references public.prompt_versions(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (feature, owner_type, owner_id, version, locale)
);

alter table public.personas
  add constraint personas_active_prompt_version_fk
  foreign key (active_prompt_version_id) references public.prompt_versions(id);

alter table public.tarot_decks
  add constraint tarot_decks_active_prompt_version_fk
  foreign key (active_prompt_version_id) references public.prompt_versions(id);

create table if not exists public.chat_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  persona_id uuid references public.personas(id),
  title text,
  status text not null default 'active' check (status in ('active', 'archived', 'deleted')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.chat_sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  persona_id uuid references public.personas(id),
  role text not null check (role in ('user', 'guide', 'system')),
  content text not null,
  language text not null default 'vi',
  prompt_version_id uuid references public.prompt_versions(id),
  moderation_status text not null default 'not_reviewed' check (moderation_status in ('not_reviewed', 'passed', 'blocked', 'reported')),
  created_at timestamptz not null default now()
);

create table if not exists public.tarot_readings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  deck_id uuid references public.tarot_decks(id),
  topic text not null,
  spread text not null check (spread in ('daily-one', 'past-present-future', 'situation-challenge-advice')),
  question text,
  selected_cards jsonb not null,
  interpretation jsonb not null,
  prompt_version_id uuid references public.prompt_versions(id),
  language text not null default 'vi',
  status text not null default 'completed' check (status in ('queued', 'completed', 'failed', 'deleted')),
  created_at timestamptz not null default now()
);

create table if not exists public.journal_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source_type text not null check (source_type in ('daily', 'chat', 'tarot', 'astrology', 'face_reading', 'manual')),
  source_id uuid,
  title text not null,
  summary text not null,
  mood text,
  user_note text,
  visibility text not null default 'private' check (visibility in ('private', 'shared')),
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null default 'revenuecat',
  provider_customer_id text,
  entitlement text not null default 'free',
  status text not null default 'free' check (status in ('free', 'trialing', 'active', 'past_due', 'canceled', 'expired')),
  current_period_end timestamptz,
  updated_at timestamptz not null default now(),
  unique (user_id, provider)
);

create table if not exists public.credit_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  reason text not null,
  delta integer not null,
  balance_after integer not null,
  related_feature text,
  related_id uuid,
  created_at timestamptz not null default now()
);

create table if not exists public.generation_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  feature text not null,
  status text not null default 'queued' check (status in ('queued', 'running', 'completed', 'failed', 'canceled')),
  provider text,
  prompt_version_id uuid references public.prompt_versions(id),
  input_summary jsonb not null default '{}'::jsonb,
  result_table text,
  result_id uuid,
  error_code text,
  error_message text,
  retry_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists public.usage_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  event_name text not null,
  feature text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.safety_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  feature text not null check (feature in ('chat', 'tarot', 'journal', 'profile', 'astrology', 'face_reading')),
  source_id uuid,
  reason text not null check (reason in ('user_report', 'blocked_topic', 'generation_failure', 'moderation_failure')),
  summary text not null,
  status text not null default 'open' check (status in ('open', 'reviewed', 'dismissed', 'escalated')),
  reviewer_id uuid references auth.users(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.device_push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  expo_push_token text not null,
  platform text check (platform in ('ios', 'android', 'web')),
  status text not null default 'active' check (status in ('active', 'invalid', 'revoked')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (expo_push_token)
);

create table if not exists public.admin_audit_logs (
  id uuid primary key default gen_random_uuid(),
  admin_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  target_table text,
  target_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists birth_profiles_user_id_idx on public.birth_profiles(user_id);
create index if not exists chat_sessions_user_id_idx on public.chat_sessions(user_id);
create index if not exists chat_messages_session_id_idx on public.chat_messages(session_id);
create index if not exists tarot_readings_user_id_idx on public.tarot_readings(user_id);
create index if not exists journal_entries_user_id_created_at_idx on public.journal_entries(user_id, created_at desc);
create index if not exists safety_events_status_created_at_idx on public.safety_events(status, created_at desc);
create index if not exists generation_jobs_status_created_at_idx on public.generation_jobs(status, created_at desc);
create index if not exists usage_events_user_id_created_at_idx on public.usage_events(user_id, created_at desc);

alter table public.admin_role_assignments enable row level security;
alter table public.user_profiles enable row level security;
alter table public.birth_profiles enable row level security;
alter table public.personas enable row level security;
alter table public.persona_sources enable row level security;
alter table public.tarot_decks enable row level security;
alter table public.tarot_cards enable row level security;
alter table public.prompt_versions enable row level security;
alter table public.chat_sessions enable row level security;
alter table public.chat_messages enable row level security;
alter table public.tarot_readings enable row level security;
alter table public.journal_entries enable row level security;
alter table public.subscriptions enable row level security;
alter table public.credit_ledger enable row level security;
alter table public.generation_jobs enable row level security;
alter table public.usage_events enable row level security;
alter table public.safety_events enable row level security;
alter table public.device_push_tokens enable row level security;
alter table public.admin_audit_logs enable row level security;

create policy "admins can manage admin role assignments"
  on public.admin_role_assignments for all
  using (public.is_admin())
  with check (public.is_admin());

create policy "users can read own profile"
  on public.user_profiles for select
  using (user_id = auth.uid() or public.is_admin());

create policy "users can upsert own profile"
  on public.user_profiles for all
  using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid() or public.is_admin());

create policy "users manage own birth profiles"
  on public.birth_profiles for all
  using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid() or public.is_admin());

create policy "active personas are readable"
  on public.personas for select
  using (status = 'active' or public.is_admin());

create policy "admins manage personas"
  on public.personas for all
  using (public.is_admin())
  with check (public.is_admin());

create policy "approved persona sources are readable"
  on public.persona_sources for select
  using (status = 'approved' or public.is_admin());

create policy "admins manage persona sources"
  on public.persona_sources for all
  using (public.is_admin())
  with check (public.is_admin());

create policy "active tarot decks are readable"
  on public.tarot_decks for select
  using (status = 'active' or public.is_admin());

create policy "admins manage tarot decks"
  on public.tarot_decks for all
  using (public.is_admin())
  with check (public.is_admin());

create policy "tarot cards are readable"
  on public.tarot_cards for select
  using (true);

create policy "admins manage tarot cards"
  on public.tarot_cards for all
  using (public.is_admin())
  with check (public.is_admin());

create policy "active prompt versions are readable"
  on public.prompt_versions for select
  using (status = 'active' or public.is_admin());

create policy "admins manage prompt versions"
  on public.prompt_versions for all
  using (public.is_admin())
  with check (public.is_admin());

create policy "users manage own chat sessions"
  on public.chat_sessions for all
  using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid() or public.is_admin());

create policy "users manage own chat messages"
  on public.chat_messages for all
  using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid() or public.is_admin());

create policy "users manage own tarot readings"
  on public.tarot_readings for all
  using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid() or public.is_admin());

create policy "users manage own journal entries"
  on public.journal_entries for all
  using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid() or public.is_admin());

create policy "users read own subscriptions"
  on public.subscriptions for select
  using (user_id = auth.uid() or public.is_admin());

create policy "admins manage subscriptions"
  on public.subscriptions for all
  using (public.is_admin())
  with check (public.is_admin());

create policy "users read own credit ledger"
  on public.credit_ledger for select
  using (user_id = auth.uid() or public.is_admin());

create policy "admins manage credit ledger"
  on public.credit_ledger for all
  using (public.is_admin())
  with check (public.is_admin());

create policy "users read own generation jobs"
  on public.generation_jobs for select
  using (user_id = auth.uid() or public.is_admin());

create policy "users create own generation jobs"
  on public.generation_jobs for insert
  with check (user_id = auth.uid() or public.is_admin());

create policy "admins update generation jobs"
  on public.generation_jobs for update
  using (public.is_admin())
  with check (public.is_admin());

create policy "users create own usage events"
  on public.usage_events for insert
  with check (user_id = auth.uid() or public.is_admin());

create policy "users read own usage events"
  on public.usage_events for select
  using (user_id = auth.uid() or public.is_admin());

create policy "users create own safety reports"
  on public.safety_events for insert
  with check (user_id = auth.uid() or public.is_admin());

create policy "users read own safety reports"
  on public.safety_events for select
  using (user_id = auth.uid() or public.is_admin());

create policy "admins review safety events"
  on public.safety_events for update
  using (public.is_admin())
  with check (public.is_admin());

create policy "users manage own push tokens"
  on public.device_push_tokens for all
  using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid() or public.is_admin());

create policy "admins read audit logs"
  on public.admin_audit_logs for select
  using (public.is_admin());

create policy "admins create audit logs"
  on public.admin_audit_logs for insert
  with check (public.is_admin());

grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;

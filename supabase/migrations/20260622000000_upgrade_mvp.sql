-- Migration: Upgrade MVP for Daily Ritual, Group Chat, Gamification

-- 1. Create chat_session_personas for N:N group chat
create table if not exists public.chat_session_personas (
  session_id uuid not null references public.chat_sessions(id) on delete cascade,
  persona_id uuid not null references public.personas(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (session_id, persona_id)
);

-- Migrate existing persona_id if any data exists
insert into public.chat_session_personas (session_id, persona_id)
select id, persona_id from public.chat_sessions where persona_id is not null
on conflict do nothing;

-- Drop the old 1:1 column
alter table public.chat_sessions drop column persona_id;

-- Enable RLS on new table
alter table public.chat_session_personas enable row level security;

grant select, insert, update, delete on table public.chat_session_personas to authenticated;

-- Policy for chat_session_personas
create policy "users manage own chat_session_personas"
  on public.chat_session_personas for all
  using (
    exists (
      select 1 from public.chat_sessions cs
      where cs.id = session_id and cs.user_id = auth.uid()
    )
    or public.is_admin()
  )
  with check (
    exists (
      select 1 from public.chat_sessions cs
      where cs.id = session_id and cs.user_id = auth.uid()
    )
    or public.is_admin()
  );

-- 2. Rename face_reading -> aura_reflection in check constraints

-- Update existing data first
update public.prompt_versions set feature = 'aura_reflection' where feature = 'face_reading';
alter table public.prompt_versions drop constraint if exists prompt_versions_feature_check;
alter table public.prompt_versions add constraint prompt_versions_feature_check 
  check (feature in ('persona_chat', 'tarot_reading', 'daily_insight', 'astrology_report', 'aura_reflection', 'safety_fallback'));

update public.journal_entries set source_type = 'aura_reflection' where source_type = 'face_reading';
alter table public.journal_entries drop constraint if exists journal_entries_source_type_check;
alter table public.journal_entries add constraint journal_entries_source_type_check 
  check (source_type in ('daily', 'chat', 'tarot', 'astrology', 'aura_reflection', 'manual', 'weekly_reflection'));

update public.safety_events set feature = 'aura_reflection' where feature = 'face_reading';
alter table public.safety_events drop constraint if exists safety_events_feature_check;
alter table public.safety_events add constraint safety_events_feature_check 
  check (feature in ('chat', 'tarot', 'journal', 'profile', 'astrology', 'aura_reflection'));

-- 3. Add Gamification streak columns
alter table public.user_profiles 
  add column if not exists current_streak integer not null default 0,
  add column if not exists longest_streak integer not null default 0,
  add column if not exists last_activity_date date;

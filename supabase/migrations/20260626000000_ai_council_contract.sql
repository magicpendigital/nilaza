-- Migration: AI Council backend contract
-- Adds the minimum durable shape needed to persist multi-guide council turns
-- without changing the local-first mobile fallback.

alter table public.prompt_versions drop constraint if exists prompt_versions_feature_check;
alter table public.prompt_versions add constraint prompt_versions_feature_check
  check (feature in ('persona_chat', 'tarot_reading', 'daily_insight', 'astrology_report', 'aura_reflection', 'face_reading', 'safety_fallback', 'ai_council'));

alter table public.chat_sessions
  add column if not exists session_kind text not null default 'persona_chat',
  add column if not exists council_config_version text,
  add column if not exists council_prompt_version_id uuid references public.prompt_versions(id),
  add column if not exists transcript_summary jsonb not null default '{}'::jsonb;

alter table public.chat_sessions drop constraint if exists chat_sessions_session_kind_check;
alter table public.chat_sessions add constraint chat_sessions_session_kind_check
  check (session_kind in ('persona_chat', 'ai_council'));

alter table public.chat_messages
  add column if not exists council_round_id uuid,
  add column if not exists response_lens text,
  add column if not exists output_schema text;

create index if not exists chat_sessions_kind_user_created_at_idx
  on public.chat_sessions(session_kind, user_id, created_at desc);

create index if not exists chat_messages_council_round_id_idx
  on public.chat_messages(council_round_id);

alter table public.safety_events drop constraint if exists safety_events_feature_check;
alter table public.safety_events add constraint safety_events_feature_check
  check (feature in ('chat', 'tarot', 'journal', 'profile', 'astrology', 'aura_reflection', 'face_reading', 'ai_council'));

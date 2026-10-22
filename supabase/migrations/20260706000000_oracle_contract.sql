-- Migration: Nilaza Oracle contract
-- Adds the backend-facing surface for the Oracle router without removing
-- the existing persona chat, AI Council, tarot, or astrology contracts.

alter table public.prompt_versions drop constraint if exists prompt_versions_feature_check;
alter table public.prompt_versions add constraint prompt_versions_feature_check
  check (feature in ('persona_chat', 'tarot_reading', 'daily_insight', 'astrology_report', 'aura_reflection', 'face_reading', 'safety_fallback', 'ai_council', 'oracle_router'));

alter table public.chat_sessions drop constraint if exists chat_sessions_session_kind_check;
alter table public.chat_sessions add constraint chat_sessions_session_kind_check
  check (session_kind in ('persona_chat', 'ai_council', 'oracle'));

alter table public.chat_messages
  add column if not exists oracle_intent text,
  add column if not exists oracle_action_cards jsonb not null default '[]'::jsonb,
  add column if not exists handoff_context jsonb not null default '{}'::jsonb;

alter table public.safety_events drop constraint if exists safety_events_feature_check;
alter table public.safety_events add constraint safety_events_feature_check
  check (feature in ('chat', 'tarot', 'journal', 'profile', 'astrology', 'aura_reflection', 'face_reading', 'ai_council', 'oracle'));

create index if not exists chat_messages_oracle_intent_idx
  on public.chat_messages(oracle_intent);

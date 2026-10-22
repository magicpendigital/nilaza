-- Allow Nilaza Oracle to use the same admin-managed model routing contract as
-- the other AI features. This is forward-only so existing environments keep
-- their migration history intact.
alter table public.model_route_versions
  drop constraint if exists model_route_versions_feature_check;

alter table public.model_route_versions
  add constraint model_route_versions_feature_check
  check (feature in ('persona_chat', 'ai_council', 'tarot_reading', 'daily_insight', 'astrology_report', 'face_reading', 'oracle_router'));

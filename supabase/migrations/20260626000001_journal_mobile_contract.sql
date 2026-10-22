-- Migration: Journal mobile sync contract
-- Aligns backend journal persistence with the local-first mobile JournalEntry shape.

alter table public.journal_entries
  add column if not exists local_id text,
  add column if not exists source_snapshot jsonb not null default '{}'::jsonb;

alter table public.journal_entries drop constraint if exists journal_entries_source_type_check;
alter table public.journal_entries add constraint journal_entries_source_type_check
  check (source_type in ('daily', 'chat', 'tarot', 'astrology', 'aura_reflection', 'face_reading', 'manual', 'weekly_reflection', 'share_card'));

create unique index if not exists journal_entries_user_local_id_idx
  on public.journal_entries(user_id, local_id)
  where local_id is not null;

-- Ensure journal sync upserts can target (user_id, local_id) directly.
-- Supabase-js ON CONFLICT cannot target the previous partial unique index.
update public.journal_entries
set local_id = id::text
where local_id is null;

alter table public.journal_entries
  alter column local_id set not null;

drop index if exists public.journal_entries_user_local_id_idx;

alter table public.journal_entries
  drop constraint if exists journal_entries_user_local_id_key;

alter table public.journal_entries
  add constraint journal_entries_user_local_id_key unique (user_id, local_id);

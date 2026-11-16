-- P1-A "Khoá kết quả Tarot — một sự kiện, một câu trả lời" (2026-11-15). Owner review pending; nothing is applied by
-- this file on its own. Forward-only and safe to re-run (if not exists / create or replace / drop-then-create).
--
-- What changes for public.tarot_readings:
-- * The server (Edge Function ai-tarot-reading, service role) issues the cards with a CSPRNG and creates the row at draw
--   time (status 'queued'). lock_key = sha256(tarot-lock-v1|user|spread|topic|UTC+7 date) is unique, so the same
--   account, spread, topic and Vietnam day always gets the same row back.
-- * tarot_draw_claim and tarot_interpret_claim run under a per-user advisory lock: one row per lock key, one model call
--   per claim, attempts (usage_events tarot_reading_attempted) counted and written atomically.
-- * A BEFORE UPDATE trigger keeps the draw fixed and the interpretation immutable once written (only a missing answer
--   receipt id may be added); the clarifier and deleted_at can only go from null to a value; deleted is final.
-- * Clients keep SELECT of their own non-deleted rows only; INSERT/UPDATE/DELETE move to the service role.
--   "Delete" in the app is a soft delete (deleted_at) that still counts for the lock and the daily limits.
--
-- Rollback (Owner-approved, after redeploying the previous ai-tarot-reading):
--   drop function if exists public.tarot_draw_claim(uuid, text, date, timestamptz, text, text, text, text, uuid, jsonb, jsonb, integer, integer, integer);
--   drop function if exists public.tarot_interpret_claim(uuid, uuid, uuid, timestamptz, integer, integer, integer);
--   drop trigger if exists guard_tarot_reading_update on public.tarot_readings;
--   drop function if exists nilaza_private.guard_tarot_reading_update();
--   drop policy if exists "users read own tarot readings" on public.tarot_readings;
--   create policy "users manage own tarot readings" on public.tarot_readings for all to authenticated
--     using (user_id = auth.uid()) with check (user_id = auth.uid());
--   grant select, insert, update, delete on public.tarot_readings to authenticated;
-- The new nullable columns and constraints may stay; the previous code ignores them.
begin;

alter table public.tarot_readings
  add column if not exists lock_key text,
  add column if not exists lock_date date,
  add column if not exists draw_source text,
  add column if not exists deck_ref jsonb,
  add column if not exists claim_token uuid,
  add column if not exists claimed_at timestamptz,
  add column if not exists interpreted_at timestamptz,
  add column if not exists prompt_version_key text,
  add column if not exists prompt_version text,
  add column if not exists route_version_id text,
  add column if not exists route_version text,
  add column if not exists content_version text,
  add column if not exists clarifier jsonb,
  add column if not exists deleted_at timestamptz;

do $$
begin
  if not exists (select 1 from pg_constraint where conrelid = 'public.tarot_readings'::regclass and conname = 'tarot_readings_lock_key_key') then
    alter table public.tarot_readings add constraint tarot_readings_lock_key_key unique (lock_key);
  end if;
  if not exists (select 1 from pg_constraint where conrelid = 'public.tarot_readings'::regclass and conname = 'tarot_readings_lock_key_format') then
    alter table public.tarot_readings add constraint tarot_readings_lock_key_format check (lock_key is null or lock_key ~ '^[0-9a-f]{64}$');
  end if;
  if not exists (select 1 from pg_constraint where conrelid = 'public.tarot_readings'::regclass and conname = 'tarot_readings_lock_fields') then
    alter table public.tarot_readings add constraint tarot_readings_lock_fields check ((lock_key is null) = (lock_date is null));
  end if;
  if not exists (select 1 from pg_constraint where conrelid = 'public.tarot_readings'::regclass and conname = 'tarot_readings_draw_source') then
    alter table public.tarot_readings add constraint tarot_readings_draw_source check (draw_source is null or draw_source = 'server_csprng');
  end if;
  if not exists (select 1 from pg_constraint where conrelid = 'public.tarot_readings'::regclass and conname = 'tarot_readings_deck_ref_object') then
    alter table public.tarot_readings add constraint tarot_readings_deck_ref_object check (deck_ref is null or jsonb_typeof(deck_ref) = 'object');
  end if;
  if not exists (select 1 from pg_constraint where conrelid = 'public.tarot_readings'::regclass and conname = 'tarot_readings_clarifier_object') then
    alter table public.tarot_readings add constraint tarot_readings_clarifier_object check (clarifier is null or jsonb_typeof(clarifier) = 'object');
  end if;
  if not exists (select 1 from pg_constraint where conrelid = 'public.tarot_readings'::regclass and conname = 'tarot_readings_deleted_status') then
    alter table public.tarot_readings add constraint tarot_readings_deleted_status check (deleted_at is null or status = 'deleted');
  end if;
end $$;

create index if not exists tarot_readings_user_lock_date_idx on public.tarot_readings(user_id, lock_date);

comment on column public.tarot_readings.lock_key is
  'P1-A: sha256(tarot-lock-v1|user|spread|topic|UTC+7 date). Unique; null for readings saved before the lock.';
comment on column public.tarot_readings.deck_ref is
  'P1-A: the deck id/slug the app chose at draw time (key of the published card text and reading style).';
comment on column public.tarot_readings.clarifier is
  'P1-A: at most one server-drawn clarifier card with its library meaning, written once. Nil P2 placeholder: a later paid Nil interpretation of this card would be stored next to it; not used now.';
comment on column public.tarot_readings.deleted_at is
  'P1-A: soft delete from the app. The row stays for the lock and daily limits and is hidden from the client.';

create schema if not exists nilaza_private;

create or replace function nilaza_private.guard_tarot_reading_update() returns trigger
language plpgsql set search_path = '' as $$
declare
  mutable constant text[] := array['interpretation','status','claim_token','claimed_at','interpreted_at','prompt_version_id',
    'prompt_version_key','prompt_version','route_version_id','route_version','content_version','clarifier','deleted_at'];
  claim constant text[] := array['claim_token','claimed_at'];
  written boolean := old.interpreted_at is not null or old.lock_key is null;
begin
  -- The draw (who, cards, spread, topic, question, day, lock) never changes after insert.
  if (to_jsonb(new) - mutable) is distinct from (to_jsonb(old) - mutable) then
    raise exception 'tarot_reading_draw_immutable' using errcode = '42501';
  end if;
  -- A soft-deleted reading is final; only a stale claim may still be cleared.
  if old.deleted_at is not null and (to_jsonb(new) - claim) is distinct from (to_jsonb(old) - claim) then
    raise exception 'tarot_reading_deleted' using errcode = '42501';
  end if;
  if written then
    -- Readings saved before the lock (lock_key null) count as written too.
    if new.interpretation is distinct from old.interpretation and not (
      old.interpretation #> '{provenance,answerReceiptId}' is null
      and jsonb_typeof(new.interpretation #> '{provenance,answerReceiptId}') = 'string'
      and (new.interpretation #- '{provenance,answerReceiptId}') = old.interpretation
    ) then
      raise exception 'tarot_interpretation_immutable' using errcode = '42501';
    end if;
    if row(new.interpreted_at, new.prompt_version_id, new.prompt_version_key, new.prompt_version, new.route_version_id,
           new.route_version, new.content_version)
       is distinct from row(old.interpreted_at, old.prompt_version_id, old.prompt_version_key, old.prompt_version,
           old.route_version_id, old.route_version, old.content_version) then
      raise exception 'tarot_interpretation_versions_immutable' using errcode = '42501';
    end if;
  elsif new.interpreted_at is null and row(new.interpretation, new.prompt_version_id, new.prompt_version_key, new.prompt_version,
           new.route_version_id, new.route_version, new.content_version)
       is distinct from row(old.interpretation, old.prompt_version_id, old.prompt_version_key, old.prompt_version,
           old.route_version_id, old.route_version, old.content_version) then
    raise exception 'tarot_interpretation_requires_interpreted_at' using errcode = '42501';
  end if;
  if old.clarifier is not null and new.clarifier is distinct from old.clarifier then
    raise exception 'tarot_clarifier_immutable' using errcode = '42501';
  end if;
  if new.status is distinct from old.status and not (
    (old.status = 'queued' and new.status = 'completed' and new.interpreted_at is not null)
    or (old.status <> 'deleted' and new.status = 'deleted' and new.deleted_at is not null)
  ) then
    raise exception 'tarot_reading_status_transition' using errcode = '42501';
  end if;
  if new.deleted_at is not null and new.status <> 'deleted' then
    raise exception 'tarot_reading_deleted_status' using errcode = '42501';
  end if;
  return new;
end $$;

revoke all on function nilaza_private.guard_tarot_reading_update() from public, anon, authenticated;

drop trigger if exists guard_tarot_reading_update on public.tarot_readings;
create trigger guard_tarot_reading_update before update on public.tarot_readings
  for each row execute function nilaza_private.guard_tarot_reading_update();

-- Clients: read own, non-deleted readings only. Writes go through the Edge Function (service role).
drop policy if exists "users manage own tarot readings" on public.tarot_readings;
drop policy if exists "users read own tarot readings" on public.tarot_readings;
create policy "users read own tarot readings" on public.tarot_readings for select to authenticated
  using (user_id = (select auth.uid()) and deleted_at is null);
revoke insert, update, delete on table public.tarot_readings from public, anon, authenticated;
revoke select on table public.tarot_readings from public, anon;
grant select on table public.tarot_readings to authenticated;
grant select, insert, update, delete on table public.tarot_readings to service_role;
grant select, insert on table public.usage_events to service_role;

-- Draw claim: returns the existing row for this lock key, refuses a new draw over today's limits, or inserts the
-- server-drawn cards. p_cards come from the Edge Function's CSPRNG; they are ignored when the key already exists.
create or replace function public.tarot_draw_claim(
  p_user_id uuid, p_lock_key text, p_lock_date date, p_day_start timestamptz, p_topic text, p_spread text,
  p_question text, p_language text, p_deck_id uuid, p_deck_ref jsonb, p_cards jsonb, p_draw_cap integer,
  p_delivered_limit integer, p_attempt_limit integer
) returns jsonb
language plpgsql security invoker set search_path = '' as $$
declare
  existing public.tarot_readings;
  created public.tarot_readings;
  draws integer;
  delivered integer;
  attempts integer;
begin
  if p_user_id is null or p_lock_key is null or p_lock_key !~ '^[0-9a-f]{64}$' or p_lock_date is null or p_day_start is null
     or p_topic is null or p_spread is null or (p_deck_ref is not null and jsonb_typeof(p_deck_ref) <> 'object') or p_cards is null or jsonb_typeof(p_cards) <> 'array'
     or jsonb_array_length(p_cards) < 1 or coalesce(p_draw_cap, -1) < 0 or coalesce(p_delivered_limit, -1) < 0
     or coalesce(p_attempt_limit, -1) < 0 then
    raise exception 'invalid_tarot_draw_claim' using errcode = '22023';
  end if;
  perform pg_advisory_xact_lock(hashtextextended('nilaza.tarot:' || p_user_id::text, 0));
  select * into existing from public.tarot_readings where lock_key = p_lock_key;
  if found then
    if existing.user_id <> p_user_id then
      raise exception 'tarot_lock_key_conflict' using errcode = '42501';
    end if;
    return jsonb_build_object('status', 'existing', 'reading', to_jsonb(existing) - 'claim_token');
  end if;
  select count(*) into draws from public.tarot_readings where user_id = p_user_id and lock_date = p_lock_date;
  if draws >= p_draw_cap then
    return jsonb_build_object('status', 'limit', 'reason', 'draw_cap');
  end if;
  select count(*) into delivered from public.tarot_readings
    where user_id = p_user_id and interpretation->>'moderationStatus' = 'passed' and created_at >= p_day_start;
  if delivered >= p_delivered_limit then
    return jsonb_build_object('status', 'limit', 'reason', 'delivered');
  end if;
  select count(*) into attempts from public.usage_events
    where user_id = p_user_id and event_name = 'tarot_reading_attempted' and created_at >= p_day_start;
  if attempts >= p_attempt_limit then
    return jsonb_build_object('status', 'limit', 'reason', 'attempts');
  end if;
  insert into public.tarot_readings(user_id, deck_id, deck_ref, topic, spread, question, selected_cards, interpretation,
    language, status, lock_key, lock_date, draw_source)
  values (p_user_id, p_deck_id, p_deck_ref, p_topic, p_spread, p_question, p_cards, '{}'::jsonb, coalesce(p_language, 'vi'),
    'queued', p_lock_key, p_lock_date, 'server_csprng')
  returning * into created;
  return jsonb_build_object('status', 'created', 'reading', to_jsonb(created) - 'claim_token');
end $$;

-- Interpretation claim: one live claim per reading (stale after p_stale_seconds), delivered and attempt limits checked
-- and the attempt event written in the same transaction, so two concurrent requests cannot both reach the model.
create or replace function public.tarot_interpret_claim(
  p_user_id uuid, p_reading_id uuid, p_claim_token uuid, p_day_start timestamptz, p_delivered_limit integer,
  p_attempt_limit integer, p_stale_seconds integer
) returns jsonb
language plpgsql security invoker set search_path = '' as $$
declare
  target public.tarot_readings;
  delivered integer;
  attempts integer;
begin
  if p_user_id is null or p_reading_id is null or p_claim_token is null or p_day_start is null
     or coalesce(p_delivered_limit, -1) < 0 or coalesce(p_attempt_limit, -1) < 0 or coalesce(p_stale_seconds, 0) < 1 then
    raise exception 'invalid_tarot_interpret_claim' using errcode = '22023';
  end if;
  perform pg_advisory_xact_lock(hashtextextended('nilaza.tarot:' || p_user_id::text, 0));
  select * into target from public.tarot_readings where id = p_reading_id and user_id = p_user_id for update;
  if not found then
    return jsonb_build_object('status', 'not_found');
  end if;
  if target.deleted_at is not null then
    return jsonb_build_object('status', 'deleted');
  end if;
  if target.interpreted_at is not null or target.lock_key is null then
    return jsonb_build_object('status', 'completed', 'reading', to_jsonb(target) - 'claim_token');
  end if;
  if target.claim_token is not null and target.claimed_at > now() - make_interval(secs => p_stale_seconds) then
    return jsonb_build_object('status', 'in_progress');
  end if;
  select count(*) into delivered from public.tarot_readings
    where user_id = p_user_id and interpretation->>'moderationStatus' = 'passed' and created_at >= p_day_start;
  if delivered >= p_delivered_limit then
    return jsonb_build_object('status', 'limit', 'reason', 'delivered');
  end if;
  select count(*) into attempts from public.usage_events
    where user_id = p_user_id and event_name = 'tarot_reading_attempted' and created_at >= p_day_start;
  if attempts >= p_attempt_limit then
    return jsonb_build_object('status', 'limit', 'reason', 'attempts');
  end if;
  insert into public.usage_events(user_id, event_name, feature, metadata)
  values (p_user_id, 'tarot_reading_attempted', 'tarot_reading',
    jsonb_build_object('attemptNumber', attempts + 1, 'limit', p_attempt_limit, 'drawId', p_reading_id));
  update public.tarot_readings set claim_token = p_claim_token, claimed_at = now() where id = p_reading_id;
  return jsonb_build_object('status', 'claimed', 'attemptNumber', attempts + 1, 'reading', to_jsonb(target) - 'claim_token');
end $$;

revoke all on function public.tarot_draw_claim(uuid, text, date, timestamptz, text, text, text, text, uuid, jsonb, jsonb, integer, integer, integer) from public, anon, authenticated;
revoke all on function public.tarot_interpret_claim(uuid, uuid, uuid, timestamptz, integer, integer, integer) from public, anon, authenticated;
grant execute on function public.tarot_draw_claim(uuid, text, date, timestamptz, text, text, text, text, uuid, jsonb, jsonb, integer, integer, integer) to service_role;
grant execute on function public.tarot_interpret_claim(uuid, uuid, uuid, timestamptz, integer, integer, integer) to service_role;

commit;

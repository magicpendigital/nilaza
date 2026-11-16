-- Nil pricing P1-B (15/11/2026): lock and replay Astrology AI results.
-- One result per (user, server chart-identity hash, fixed topic, language, calculation version, prompt version),
-- stored as lock_key = sha256 of those parts (computed by ai-astrology-insight, never taken from the client).
-- * The same key replays the stored reading: no model call, no turn used.
-- * Results are immutable: identity columns never change, failed rows are final, completed rows change only by
--   soft delete (status deleted + deleted_at) and a one-time answer receipt link.
-- * Only the server writes: authenticated keeps SELECT on its own visible rows; anon has nothing; the Edge Function
--   claims a key through public.astrology_claim_report (service_role only, per-user advisory lock, unique index),
--   so two concurrent requests for one key make one row and one model call, and the daily limit cannot be raced.
-- * A failed generation marks its row failed; failed rows leave the unique index, so the key and the turn are free.
-- * The app deletes through public.astrology_soft_delete_reports; a deleted reading still counts toward its key
--   and the daily limit. Account deletion still removes every row (on delete cascade; no delete trigger).
-- Re-running is safe. Nothing is applied by this file on its own: the Owner applies it by its LF SHA-256 and then
-- deploys ai-astrology-insight. Rollback SQL is in docs/release/nil-p1-astrology-lock-2026-11-15/HANDOFF.vi.md.
begin;

alter table public.astrology_reports
  add column if not exists lock_key text,
  add column if not exists focus_topic text,
  add column if not exists prompt_version text,
  add column if not exists route_version text,
  add column if not exists completed_at timestamptz,
  add column if not exists deleted_at timestamptz;

do $$
begin
  if not exists (select 1 from pg_constraint where conrelid = 'public.astrology_reports'::regclass and conname = 'astrology_reports_lock_key_format') then
    alter table public.astrology_reports add constraint astrology_reports_lock_key_format
      check (lock_key is null or lock_key ~ '^[0-9a-f]{64}$');
  end if;
  if not exists (select 1 from pg_constraint where conrelid = 'public.astrology_reports'::regclass and conname = 'astrology_reports_focus_topic_catalog') then
    alter table public.astrology_reports add constraint astrology_reports_focus_topic_catalog
      check (focus_topic is null or focus_topic in ('overview','identity','relationships','work','family','money','wellbeing','study','decision','patterns','general'));
  end if;
end $$;

-- One live row per key. Failed rows stay as history and do not hold the key.
create unique index if not exists astrology_reports_user_lock_key_uidx
  on public.astrology_reports(user_id, lock_key)
  where lock_key is not null and status <> 'failed';

-- Immutability guard (applies to every role, service_role included).
create or replace function nilaza_private.astrology_reports_guard() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.id is distinct from old.id or new.user_id is distinct from old.user_id
    or new.lock_key is distinct from old.lock_key or new.input_hash is distinct from old.input_hash
    or new.focus_topic is distinct from old.focus_topic or new.created_at is distinct from old.created_at then
    raise exception 'astrology report identity is immutable' using errcode = '42501';
  end if;

  if old.status = 'queued' then
    if new.status not in ('queued', 'completed', 'failed') or new.deleted_at is not null then
      raise exception 'queued astrology report can only complete or fail' using errcode = '42501';
    end if;
    if new.status = 'completed' and new.completed_at is null then
      new.completed_at := now();
    end if;
    return new;
  end if;

  if old.status = 'failed' then
    if (to_jsonb(new) - 'updated_at') is distinct from (to_jsonb(old) - 'updated_at') then
      raise exception 'failed astrology report is final' using errcode = '42501';
    end if;
    return new;
  end if;

  -- completed or deleted: the reading itself never changes.
  if (to_jsonb(new) - array['status', 'deleted_at', 'updated_at', 'input_summary'])
    is distinct from (to_jsonb(old) - array['status', 'deleted_at', 'updated_at', 'input_summary']) then
    raise exception 'astrology report content is immutable' using errcode = '42501';
  end if;
  if not (new.status = old.status or (old.status = 'completed' and new.status = 'deleted')) then
    raise exception 'astrology report can only be soft deleted' using errcode = '42501';
  end if;
  if old.deleted_at is not null and new.deleted_at is distinct from old.deleted_at then
    raise exception 'astrology report deletion time is immutable' using errcode = '42501';
  end if;
  if new.status = 'deleted' and new.deleted_at is null then
    new.deleted_at := now();
  end if;
  if new.status <> 'deleted' and new.deleted_at is not null then
    raise exception 'deleted_at needs status deleted' using errcode = '42501';
  end if;
  if new.input_summary is distinct from old.input_summary then
    if old.input_summary #> '{answerProvenance,answerReceiptId}' is not null
      or jsonb_typeof(new.input_summary #> '{answerProvenance,answerReceiptId}') is distinct from 'string'
      or (new.input_summary #- '{answerProvenance,answerReceiptId}') is distinct from old.input_summary then
      raise exception 'only a one-time answer receipt link may be added' using errcode = '42501';
    end if;
  end if;
  return new;
end $$;
revoke all on function nilaza_private.astrology_reports_guard() from public;

drop trigger if exists astrology_reports_guard on public.astrology_reports;
create trigger astrology_reports_guard before update on public.astrology_reports
  for each row execute function nilaza_private.astrology_reports_guard();

-- Client roles: read own visible rows only.
revoke insert, update, delete on table public.astrology_reports from public, anon, authenticated;
revoke select on table public.astrology_reports from public, anon;
grant select on table public.astrology_reports to authenticated;
grant select, insert, update, delete on table public.astrology_reports to service_role;

drop policy if exists "users manage own astrology reports" on public.astrology_reports;
drop policy if exists "users read own astrology reports" on public.astrology_reports;
create policy "users read own astrology reports"
  on public.astrology_reports for select
  to authenticated
  using ((select auth.uid()) = user_id and deleted_at is null);

-- Server claim. Takes a user id, so it is service_role only (never client-callable).
create or replace function public.astrology_claim_report(
  p_user_id uuid,
  p_lock_key text,
  p_input_hash text,
  p_focus_topic text,
  p_language text,
  p_prompt_version text,
  p_route_version text,
  p_calculation_version text,
  p_daily_limit integer,
  p_failed_allowance integer,
  p_day_start timestamptz,
  p_report jsonb,
  p_usage_metadata jsonb default '{}'::jsonb
) returns jsonb
language plpgsql security invoker set search_path = '' as $$
declare
  stale_after constant interval := interval '3 minutes';
  existing record;
  attempts integer;
  delivered integer;
  new_id uuid;
  legacy_focus text;
begin
  if p_user_id is null or p_lock_key is null or p_lock_key !~ '^[0-9a-f]{64}$'
    or p_input_hash is null or p_input_hash !~ '^[0-9a-f]{64}$'
    or p_focus_topic is null or p_focus_topic not in ('overview','identity','relationships','work','family','money','wellbeing','study','decision','patterns','general')
    or p_language is null or p_language not in ('vi', 'en')
    or coalesce(length(p_prompt_version), 0) not between 1 and 128
    or coalesce(length(p_calculation_version), 0) not between 1 and 128
    or length(p_route_version) > 128
    or p_daily_limit is null or p_daily_limit not between 0 and 100
    or p_failed_allowance is null or p_failed_allowance not between 0 and 10
    or p_day_start is null or p_day_start > now() + interval '5 minutes' or p_day_start < now() - interval '2 days'
    or p_report is null or jsonb_typeof(p_report) <> 'object' or jsonb_typeof(p_report -> 'chart_data') is distinct from 'object' then
    return jsonb_build_object('outcome', 'invalid');
  end if;

  perform pg_advisory_xact_lock(hashtextextended('nilaza.astrology.claim:' || p_user_id::text, 0));

  select r.id, r.status, r.updated_at into existing
    from public.astrology_reports r
    where r.user_id = p_user_id and r.lock_key = p_lock_key and r.status <> 'failed'
    limit 1;
  if found then
    if existing.status in ('completed', 'deleted') then
      return jsonb_build_object('outcome', 'replay', 'report_id', existing.id);
    end if;
    if existing.updated_at > now() - stale_after then
      return jsonb_build_object('outcome', 'in_progress', 'report_id', existing.id);
    end if;
    -- A queued row older than any Edge request can live: release it so the key can be claimed again.
    update public.astrology_reports set status = 'failed', updated_at = now() where id = existing.id;
  end if;

  select count(*) into attempts from public.usage_events
    where user_id = p_user_id and event_name = 'astrology_ai_insight_attempted' and created_at >= p_day_start;
  -- Delivered today (a deleted reading still counts) plus readings being generated right now.
  select count(*) into delivered from public.astrology_reports r
    where r.user_id = p_user_id and r.input_summary ->> 'contractId' = 'nilaza.astrology.ai-insight'
      and ((r.status in ('completed', 'deleted') and coalesce(r.completed_at, r.created_at) >= p_day_start)
        or (r.status = 'queued' and r.updated_at > now() - stale_after));
  if delivered >= p_daily_limit or attempts >= p_daily_limit + p_failed_allowance then
    return jsonb_build_object('outcome', 'limit_reached', 'attempts', attempts, 'delivered', delivered);
  end if;

  legacy_focus := coalesce(p_report ->> 'focus', 'personality');
  if legacy_focus not in ('personality', 'love', 'career', 'inner_lesson') then legacy_focus := 'personality'; end if;
  insert into public.astrology_reports(
    user_id, birth_profile_id, focus, language, provider, provider_version, calculation_version, input_hash,
    input_summary, chart_data, interpretation, caveats, status, lock_key, focus_topic, prompt_version, route_version
  ) values (
    p_user_id, null, legacy_focus, p_language, 'model_router', p_route_version, p_calculation_version, p_input_hash,
    coalesce(p_report -> 'input_summary', '{}'::jsonb), p_report -> 'chart_data', '{}'::jsonb,
    coalesce(p_report -> 'caveats', '[]'::jsonb), 'queued', p_lock_key, p_focus_topic, p_prompt_version, p_route_version
  )
  on conflict (user_id, lock_key) where lock_key is not null and status <> 'failed' do nothing
  returning id into new_id;
  if new_id is null then
    return jsonb_build_object('outcome', 'in_progress');
  end if;

  insert into public.usage_events(user_id, event_name, feature, metadata)
    values (p_user_id, 'astrology_ai_insight_attempted', 'astrology_report', coalesce(p_usage_metadata, '{}'::jsonb));
  return jsonb_build_object('outcome', 'claimed', 'report_id', new_id, 'attempts', attempts + 1, 'delivered', delivered);
end $$;
revoke all on function public.astrology_claim_report(uuid, text, text, text, text, text, text, text, integer, integer, timestamptz, jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.astrology_claim_report(uuid, text, text, text, text, text, text, text, integer, integer, timestamptz, jsonb, jsonb) to service_role;

-- App delete: soft delete own completed AI readings (all, or one saved chart's).
create or replace function public.astrology_soft_delete_reports(p_client_chart_id text default null) returns integer
language plpgsql security definer set search_path = '' as $$
declare
  caller uuid := auth.uid();
  changed integer;
begin
  if caller is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;
  if p_client_chart_id is not null and length(p_client_chart_id) not between 1 and 200 then
    raise exception 'invalid chart id' using errcode = '22023';
  end if;
  update public.astrology_reports
    set status = 'deleted', deleted_at = now(), updated_at = now()
    where user_id = caller and status = 'completed'
      and input_summary ->> 'contractId' = 'nilaza.astrology.ai-insight'
      and (p_client_chart_id is null or input_summary ->> 'clientChartId' = p_client_chart_id);
  get diagnostics changed = row_count;
  return changed;
end $$;
revoke all on function public.astrology_soft_delete_reports(text) from public, anon;
grant execute on function public.astrology_soft_delete_reports(text) to authenticated, service_role;

commit;

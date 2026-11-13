-- Admin redesign A5 (spec ADMIN_SCREENS_SPEC_2026-11-04 row D5; review AI-03, AI-04, AD-11; Owner decisions 04/11 and
-- 13/11). One versioned, audited path to edit AI system prompts:
--   * feature astrology_insight is allowed (spec D5); ai_council and oracle_router were already allowed (20260706000000).
--   * AI-04: older duplicate active rows (and duplicate drafts) per (feature, owner_type, owner_id, locale) are archived,
--     then partial unique indexes keep one active and one draft per key (NULLS NOT DISTINCT: global rows have a null
--     owner_id). Nothing is deleted; every archived row gets an ai.prompt.dedupe audit row.
--   * Direct client writes to prompt_versions are removed: rows change only through save_prompt_draft and
--     publish_prompt_version (and the existing publish_astrology_prompt_pair), so the publish checks cannot be skipped.
--     Reading is unchanged (active rows for signed-in users, every row for content.read staff).
--   * list_prompt_versions (ai.read), save_prompt_draft (ai.manage, or ai.read + content.draft = editor; Owner 13/11)
--     and publish_prompt_version (ai.manage only) - security definer, empty search_path, audited.
-- Publish gate until the eval step (A6): the row must be a draft, text 20-12000 characters without control characters
-- or prompt-injection markers (same rules as isUsableTarotPromptText in supabase/functions/_shared/tarot-prompt.ts),
-- the other language (VI/EN) of the same prompt must exist as a draft or active row, and a note of 10-500 characters.
-- Edge Functions always add their locked safety and output rules after the configured text.
-- Runtime consumers of global/persona rows: persona_chat (ai-persona-chat), tarot_reading (ai-tarot-reading),
-- astrology_report (ai-astrology-insight), and after this step daily_insight and ai_council. oracle_router (pinned
-- prompt bundle) and astrology_insight have no runtime reader yet, so the RPCs refuse to write them.
-- Custom SQLSTATE codes let Admin explain a refusal without reading server text: NZP01 text refused, NZP02 the other
-- language is missing, NZP03 the row is not a draft; 40001 the draft changed after it was reviewed.

alter table public.prompt_versions drop constraint if exists prompt_versions_feature_check;
alter table public.prompt_versions add constraint prompt_versions_feature_check
  check (feature in ('persona_chat', 'tarot_reading', 'daily_insight', 'astrology_report', 'aura_reflection', 'face_reading',
    'safety_fallback', 'ai_council', 'oracle_router', 'astrology_insight'));

alter table public.prompt_versions
  add column if not exists note text check (note is null or char_length(note) <= 500),
  add column if not exists publish_note text check (publish_note is null or char_length(publish_note) <= 500);
comment on column public.prompt_versions.note is 'Draft note from the person who saved the draft (Admin A5).';
comment on column public.prompt_versions.publish_note is 'Required release note written by the ai.manage account that published this version.';

-- AI-04 dedupe. Order inside each key: the seeded persona_chat context_handoff_system prompt (version 2026-06-28-local-v1,
-- seeded as a second active global persona_chat row; handoff context is built in code, chat-handoff.ts) never wins over
-- the base persona_chat_system prompt; otherwise the latest published, then latest created/updated, then the highest id.
with ranked as (
  select id, status, row_number() over (
    partition by feature, owner_type, owner_id, locale, status
    order by (feature = 'persona_chat' and owner_type = 'global' and version = '2026-06-28-local-v1') asc,
      published_at desc nulls last, created_at desc, updated_at desc, id desc
  ) as position
  from public.prompt_versions
  where status in ('active', 'draft')
), archived as (
  update public.prompt_versions p set status = 'archived', updated_at = now()
  from ranked r
  where p.id = r.id and r.position > 1
  returning p.id, p.feature, p.owner_type, p.owner_id, p.locale, p.version, r.status as previous_status
)
insert into public.admin_audit_logs(admin_user_id, action, target_table, target_id, metadata)
select null, 'ai.prompt.dedupe', 'prompt_versions', a.id,
  jsonb_build_object('feature', a.feature, 'ownerType', a.owner_type, 'ownerId', a.owner_id, 'locale', a.locale,
    'version', a.version, 'previousStatus', a.previous_status, 'migration', '20261113095000')
from archived a;

create unique index if not exists prompt_versions_one_active on public.prompt_versions(feature, owner_type, owner_id, locale)
  nulls not distinct where status = 'active';
create unique index if not exists prompt_versions_one_draft on public.prompt_versions(feature, owner_type, owner_id, locale)
  nulls not distinct where status = 'draft';

drop policy if exists "create drafts or publish" on public.prompt_versions;
drop policy if exists "edit drafts or publish" on public.prompt_versions;
drop policy if exists "owner deletes draft" on public.prompt_versions;
revoke insert, update, delete on table public.prompt_versions from anon, authenticated;

-- Features the RPCs may write: each has an Edge Function that reads the active row.
create or replace function nilaza_private.prompt_feature_editable(feature_input text) returns boolean
language sql immutable set search_path = '' as $$
  select coalesce(feature_input in ('persona_chat', 'tarot_reading', 'daily_insight', 'ai_council', 'astrology_report'), false);
$$;

-- Null when the text may be stored; otherwise the reason. Mirrors isUsableTarotPromptText (defence in depth for operator
-- prose, not semantic safety): 1-12000 characters (here at least 20 after trimming), no control characters, no chat
-- template markers, no "ignore/override/bypass/disable safety|system|previous|guardrails|instructions" and no Vietnamese
-- "bỏ qua an toàn|hệ thống|chỉ dẫn|ranh giới".
create or replace function nilaza_private.prompt_text_problem(text_input text) returns text
language plpgsql immutable set search_path = '' as $$
begin
  if text_input is null or char_length(btrim(text_input, E' \t\r\n')) < 20 then return 'too_short'; end if;
  if char_length(text_input) > 12000 then return 'too_long'; end if;
  if text_input ~ '[\x01-\x08\x0b\x0c\x0e-\x1f]' then return 'control_characters'; end if;
  if text_input ~* '<\|[^>]+\|>|\[/?INST\]|\[/?(SYSTEM|ASSISTANT|USER)\]' then return 'injection_marker'; end if;
  if text_input ~* '(ignore|override|bypass|disable)\s+(all\s+)?(safety|system|previous|guardrails|instructions)' then return 'injection_marker'; end if;
  if text_input ~* 'bỏ qua\s+(mọi\s+)?(an toàn|hệ thống|chỉ dẫn|ranh giới)' then return 'injection_marker'; end if;
  return null;
end;
$$;

create or replace function nilaza_private.prompt_version_json(row_input public.prompt_versions) returns jsonb
language sql stable set search_path = '' as $$
  select jsonb_build_object(
    'id', row_input.id, 'feature', row_input.feature, 'ownerType', row_input.owner_type, 'ownerId', row_input.owner_id,
    'locale', row_input.locale, 'version', row_input.version, 'status', row_input.status, 'promptText', row_input.prompt_text,
    'characters', char_length(row_input.prompt_text),
    'textSha256', encode(sha256(convert_to(row_input.prompt_text, 'UTF8')), 'hex'),
    'note', row_input.note, 'publishNote', row_input.publish_note, 'createdBy', row_input.created_by,
    'createdAt', row_input.created_at, 'updatedAt', row_input.updated_at, 'publishedBy', row_input.published_by,
    'publishedAt', row_input.published_at, 'supersedesVersionId', row_input.supersedes_version_id,
    'editable', nilaza_private.prompt_feature_editable(row_input.feature) and coalesce(row_input.owner_type, '') in ('global', 'persona'));
$$;

-- Every prompt version (optionally one feature) plus the personas a persona prompt can belong to. Needs ai.read.
create or replace function public.list_prompt_versions(feature_input text default null) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  if auth.uid() is null or not nilaza_private.has_capability('ai.read') then raise exception 'Not authorized' using errcode = '42501'; end if;
  if feature_input is not null and feature_input not in ('persona_chat', 'tarot_reading', 'daily_insight', 'astrology_report',
    'aura_reflection', 'face_reading', 'safety_fallback', 'ai_council', 'oracle_router', 'astrology_insight') then
    raise exception 'invalid_prompt_input' using errcode = '22023';
  end if;
  return jsonb_build_object(
    'versions', coalesce((select jsonb_agg(nilaza_private.prompt_version_json(p)
        order by p.feature, p.owner_type, p.owner_id nulls first, p.locale, p.created_at desc, p.id desc)
      from public.prompt_versions p where feature_input is null or p.feature = feature_input), '[]'::jsonb),
    'personas', coalesce((select jsonb_agg(jsonb_build_object('id', r.id, 'slug', r.slug, 'name', r.name, 'status', r.status)
        order by r.slug) from public.personas r), '[]'::jsonb));
end;
$$;

-- Creates or replaces the single draft of one prompt (feature, owner, locale). owner_type 'global' needs a null owner_id;
-- 'persona' needs persona_chat and an existing persona id. The text is checked like at publish so a refused text is
-- reported at once. Needs ai.manage, or ai.read + content.draft (editor). A draft never reaches users.
create or replace function public.save_prompt_draft(feature_input text, owner_type_input text, owner_id_input uuid,
  locale_input text, prompt_text_input text, note_input text default null) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  actor uuid := auth.uid();
  clean_text text := regexp_replace(coalesce(prompt_text_input, ''), '^\s+|\s+$', '', 'g');
  clean_note text := nullif(btrim(coalesce(note_input, '')), '');
  result public.prompt_versions;
  key_count integer;
begin
  if actor is null or not (nilaza_private.has_capability('ai.manage')
    or (nilaza_private.has_capability('ai.read') and nilaza_private.has_capability('content.draft'))) then
    raise exception 'Not authorized' using errcode = '42501';
  end if;
  if not nilaza_private.prompt_feature_editable(feature_input) or locale_input is null or locale_input not in ('vi', 'en')
    or owner_type_input is null or owner_type_input not in ('global', 'persona')
    or (owner_type_input = 'global' and owner_id_input is not null)
    or (owner_type_input = 'persona' and (feature_input <> 'persona_chat' or owner_id_input is null
      or not exists (select 1 from public.personas r where r.id = owner_id_input)))
    or char_length(coalesce(clean_note, '')) > 500 then
    raise exception 'invalid_prompt_input' using errcode = '22023';
  end if;
  if nilaza_private.prompt_text_problem(clean_text) is not null then
    raise exception 'prompt_text_rejected' using errcode = 'NZP01';
  end if;

  perform pg_advisory_xact_lock(hashtext(concat_ws(':', 'prompt_versions', feature_input, owner_type_input,
    coalesce(owner_id_input::text, '-'), locale_input))::bigint);
  update public.prompt_versions set prompt_text = clean_text, note = clean_note, created_by = actor, updated_at = now()
    where feature = feature_input and owner_type = owner_type_input and owner_id is not distinct from owner_id_input
      and locale = locale_input and status = 'draft'
    returning * into result;
  if not found then
    select count(*) + 1 into key_count from public.prompt_versions
      where feature = feature_input and owner_type = owner_type_input and owner_id is not distinct from owner_id_input and locale = locale_input;
    insert into public.prompt_versions(feature, owner_type, owner_id, version, status, locale, prompt_text, note, safety_notes,
      created_by, updated_at)
    values (feature_input, owner_type_input, owner_id_input,
      'admin-' || to_char(now() at time zone 'UTC', 'YYYYMMDD"T"HH24MISS') || '-' || key_count, 'draft', locale_input,
      clean_text, clean_note, 'Admin A5 draft; Edge Functions append locked safety and output rules.', actor, now())
    returning * into result;
  end if;
  insert into public.admin_audit_logs(admin_user_id, action, target_table, target_id, metadata)
  values (actor, 'ai.prompt.draft', 'prompt_versions', result.id, jsonb_build_object(
    'feature', result.feature, 'ownerType', result.owner_type, 'ownerId', result.owner_id, 'locale', result.locale,
    'version', result.version, 'characters', char_length(result.prompt_text),
    'textSha256', encode(sha256(convert_to(result.prompt_text, 'UTF8')), 'hex')));
  return nilaza_private.prompt_version_json(result);
end;
$$;

-- Publishes one draft: the previous active row of the same prompt becomes archived and the draft becomes active in
-- one transaction. expected_sha256_input (hash shown in the review dialog) refuses a draft saved again after review.
-- Active and archived rows never change text; restoring an old version means saving its text as a new draft.
-- Needs ai.manage.
create or replace function public.publish_prompt_version(prompt_version_id_input uuid, note_input text,
  expected_sha256_input text default null) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  actor uuid := auth.uid();
  clean_note text := btrim(coalesce(note_input, ''));
  draft public.prompt_versions;
  result public.prompt_versions;
  previous_id uuid;
  previous_version text;
begin
  if actor is null or not nilaza_private.has_capability('ai.manage') then raise exception 'Not authorized' using errcode = '42501'; end if;
  if prompt_version_id_input is null or char_length(clean_note) not between 10 and 500 then
    raise exception 'invalid_prompt_input' using errcode = '22023';
  end if;
  select * into draft from public.prompt_versions where id = prompt_version_id_input;
  if not found then raise exception 'prompt_not_draft' using errcode = 'NZP03'; end if;
  perform pg_advisory_xact_lock(hashtext(concat_ws(':', 'prompt_versions', draft.feature, draft.owner_type,
    coalesce(draft.owner_id::text, '-'), draft.locale))::bigint);
  select * into draft from public.prompt_versions where id = prompt_version_id_input for update;
  if draft.status <> 'draft' then raise exception 'prompt_not_draft' using errcode = 'NZP03'; end if;
  if not nilaza_private.prompt_feature_editable(draft.feature) or coalesce(draft.owner_type, '') not in ('global', 'persona')
    or draft.locale not in ('vi', 'en') then
    raise exception 'invalid_prompt_input' using errcode = '22023';
  end if;
  if expected_sha256_input is not null
    and lower(expected_sha256_input) <> encode(sha256(convert_to(draft.prompt_text, 'UTF8')), 'hex') then
    raise exception 'prompt_changed' using errcode = '40001';
  end if;
  if nilaza_private.prompt_text_problem(draft.prompt_text) is not null then
    raise exception 'prompt_text_rejected' using errcode = 'NZP01';
  end if;
  if not exists (select 1 from public.prompt_versions o
    where o.feature = draft.feature and o.owner_type = draft.owner_type and o.owner_id is not distinct from draft.owner_id
      and o.locale = case when draft.locale = 'vi' then 'en' else 'vi' end and o.status in ('draft', 'active')) then
    raise exception 'prompt_pair_missing' using errcode = 'NZP02';
  end if;

  update public.prompt_versions set status = 'archived', updated_at = now()
    where feature = draft.feature and owner_type = draft.owner_type and owner_id is not distinct from draft.owner_id
      and locale = draft.locale and status = 'active'
    returning id, version into previous_id, previous_version;
  update public.prompt_versions set status = 'active', publish_note = clean_note, published_by = actor, published_at = now(),
      supersedes_version_id = coalesce(previous_id, supersedes_version_id), updated_at = now()
    where id = draft.id returning * into result;
  -- Keep the (informational) persona pointer on the Vietnamese persona prompt, as the seed does.
  if result.owner_type = 'persona' and result.locale = 'vi' then
    update public.personas set active_prompt_version_id = result.id, updated_at = now() where id = result.owner_id;
  end if;
  insert into public.admin_audit_logs(admin_user_id, action, target_table, target_id, metadata)
  values (actor, 'ai.prompt.publish', 'prompt_versions', result.id, jsonb_build_object(
    'feature', result.feature, 'ownerType', result.owner_type, 'ownerId', result.owner_id, 'locale', result.locale,
    'version', result.version, 'archivedVersion', previous_version, 'note', clean_note,
    'characters', char_length(result.prompt_text),
    'textSha256', encode(sha256(convert_to(result.prompt_text, 'UTF8')), 'hex'), 'gate', 'injection_and_pair_checks_only'));
  return nilaza_private.prompt_version_json(result) || jsonb_build_object('archivedVersion', previous_version);
end;
$$;

-- AI Studio "Thao tác AI" also lists prompt and feature-configuration changes (the A4 actions were stored but hidden).
create or replace function nilaza_private.get_ai_admin_audit_events(limit_count integer default 100)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if auth.uid() is null or not nilaza_private.has_capability('ai.read') then
    raise exception 'Not authorized' using errcode = '42501';
  end if;
  return coalesce((select jsonb_agg(row_to_json(a) order by a.created_at desc) from (
    select id, action, target_table, target_id, metadata, created_at
    from public.admin_audit_logs
    where action in (
      'ai.model_route.publish',
      'ai.astrology_prompt.publish',
      'ai.trace_qa_capture.store',
      'ai.trace_qa_capture.view',
      'ai.feature_switch',
      'ai.feature_config.draft',
      'ai.feature_config.publish',
      'ai.prompt.draft',
      'ai.prompt.publish',
      'ai.prompt.dedupe'
    )
    order by created_at desc limit greatest(1, least(coalesce(limit_count, 100), 200))
  ) a), '[]'::jsonb);
end;
$$;

comment on function public.save_prompt_draft(text, text, uuid, text, text, text) is 'Saves the single draft of one prompt (feature, owner, locale). ai.manage or ai.read+content.draft; audited as ai.prompt.draft.';
comment on function public.publish_prompt_version(uuid, text, text) is 'Publishes one prompt draft (ai.manage; text and VI+EN checks; archives the previous active row; audited as ai.prompt.publish).';

revoke all on function nilaza_private.prompt_feature_editable(text), nilaza_private.prompt_text_problem(text),
  nilaza_private.prompt_version_json(public.prompt_versions) from public, anon, authenticated;
revoke all on function public.list_prompt_versions(text), public.save_prompt_draft(text, text, uuid, text, text, text),
  public.publish_prompt_version(uuid, text, text) from public, anon, authenticated;
grant execute on function public.list_prompt_versions(text), public.save_prompt_draft(text, text, uuid, text, text, text),
  public.publish_prompt_version(uuid, text, text) to authenticated;
-- Same grants as 20260926152118: the security invoker wrapper public.get_ai_admin_audit_events calls this function.
revoke all on function nilaza_private.get_ai_admin_audit_events(integer) from public, anon;
grant execute on function nilaza_private.get_ai_admin_audit_events(integer) to authenticated;

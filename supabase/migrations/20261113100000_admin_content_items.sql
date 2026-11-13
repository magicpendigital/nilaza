-- Admin redesign A3 (spec ADMIN_SCREENS_SPEC_2026-11-04 row D7, sections 3.3-3.5; review AD-01, AD-03, AD-06, AD-07,
-- AD-15; Owner decision 6: editors only save drafts, content.publish publishes).
-- Server-side drafts and per-item publish on top of the existing published bundle (20260917172721):
--  * one shared draft per item (kind + item key), saved with an optimistic revision so a stale save is refused;
--  * publish_content_items copies only the named drafts into a NEW published admin_content_bundles version built from
--    the current published payload, so publishing one item never pushes anybody else's unpublished edits;
--  * every published item version stays as history; restore copies an old version into the draft (never deletes);
--  * publishing a persona also writes its canonical fields into public.personas, which chat and Council read.
-- Runtime readers (get_published_content_bundle, public.personas) keep their shape. The old whole-bundle path
-- (publish_content_bundle) is not changed and stays the fallback.
create table public.admin_content_item_versions (
  id uuid primary key default gen_random_uuid(),
  bundle_key text not null default 'nilaza_default' check (bundle_key ~ '^[a-z0-9][a-z0-9_-]{0,63}$'),
  kind text not null check (kind in ('persona','deck','card','frontend','asset')),
  item_key text not null check (item_key ~ '^[A-Za-z0-9][A-Za-z0-9_.:-]{0,159}$'),
  version integer not null check (version >= 1),
  status text not null default 'draft' check (status in ('draft','published','archived')),
  -- Increases on every save of the draft; the Admin sends the revision it edited to detect a concurrent save.
  revision integer not null default 1 check (revision >= 1),
  payload jsonb not null check (jsonb_typeof(payload) = 'object' and payload ->> 'id' = item_key),
  -- Published item version the draft started from (null: never published per item).
  base_version integer,
  restored_from_version integer,
  note text check (note is null or char_length(note) <= 500),
  -- Published bundle version that first carried this item version.
  bundle_version bigint,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  published_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz,
  constraint admin_content_item_versions_key unique (bundle_key, kind, item_key, version),
  constraint admin_content_item_versions_published check (status = 'draft' or published_at is not null)
);
create unique index admin_content_item_versions_one_draft on public.admin_content_item_versions(bundle_key, kind, item_key) where status = 'draft';
create unique index admin_content_item_versions_one_published on public.admin_content_item_versions(bundle_key, kind, item_key) where status = 'published';
create index admin_content_item_versions_drafts on public.admin_content_item_versions(bundle_key, updated_at desc) where status = 'draft';
alter table public.admin_content_item_versions enable row level security;
-- No policies: clients go through the RPCs below only.
revoke all on table public.admin_content_item_versions from public, anon, authenticated;
comment on table public.admin_content_item_versions is 'Per-item Admin content drafts and published item history (A3, D7). Written only by save/restore/discard/publish RPCs; publish merges named items into a new admin_content_bundles version.';

-- Bundle array that holds a kind.
create function nilaza_private.content_item_array(kind_input text) returns text
language sql immutable set search_path = '' as $$
  select case kind_input when 'persona' then 'personas' when 'deck' then 'decks' when 'card' then 'cards'
    when 'frontend' then 'frontendContent' when 'asset' then 'assets' end;
$$;

-- The item as it is in the current published bundle (null when absent).
create function nilaza_private.content_item_live(bundle_input text, kind_input text, key_input text) returns jsonb
language sql stable set search_path = '' as $$
  select item from public.admin_content_bundles b,
    jsonb_array_elements(b.payload -> nilaza_private.content_item_array(kind_input)) item
  where b.bundle_key = bundle_input and b.status = 'published' and item ->> 'id' = key_input
  limit 1;
$$;

-- Admin JSON shape of one row (camelCase).
create function nilaza_private.content_item_json(row_input public.admin_content_item_versions) returns jsonb
language sql stable set search_path = '' as $$
  select jsonb_build_object(
    'id', row_input.id, 'bundleKey', row_input.bundle_key, 'kind', row_input.kind, 'itemKey', row_input.item_key,
    'version', row_input.version, 'status', row_input.status, 'revision', row_input.revision, 'payload', row_input.payload,
    'baseVersion', row_input.base_version, 'restoredFromVersion', row_input.restored_from_version, 'note', row_input.note,
    'bundleVersion', row_input.bundle_version, 'createdBy', row_input.created_by, 'updatedBy', row_input.updated_by,
    'updatedByEmail', (select u.email from auth.users u where u.id = row_input.updated_by),
    'publishedBy', row_input.published_by, 'createdAt', row_input.created_at, 'updatedAt', row_input.updated_at,
    'publishedAt', row_input.published_at);
$$;

-- Creates or replaces the single draft of an item. Callers have already checked content.draft.
-- An account without content.publish cannot change the status the item has in the published bundle, except to
-- draft or review (AD-15); a restore keeps the published status instead of refusing (coerce_status_input).
create function nilaza_private.content_item_upsert_draft(
  actor_input uuid, bundle_input text, kind_input text, key_input text, payload_input jsonb,
  expected_revision_input integer, restored_from_input integer, coerce_status_input boolean
) returns public.admin_content_item_versions
language plpgsql set search_path = '' as $$
declare
  live jsonb;
  item jsonb := payload_input;
  draft public.admin_content_item_versions;
  result public.admin_content_item_versions;
  next_version integer;
  published_version integer;
begin
  if kind_input is null or nilaza_private.content_item_array(kind_input) is null
    or key_input is null or key_input !~ '^[A-Za-z0-9][A-Za-z0-9_.:-]{0,159}$'
    or bundle_input is null or bundle_input !~ '^[a-z0-9][a-z0-9_-]{0,63}$'
    or item is null or jsonb_typeof(item) <> 'object' or item ->> 'id' is distinct from key_input
    or octet_length(item::text) > 262144
    or (item ? 'status' and jsonb_typeof(item -> 'status') <> 'string') then
    raise exception 'invalid_content_item' using errcode = '22023';
  end if;
  if not nilaza_private.has_capability('content.publish') then
    live := nilaza_private.content_item_live(bundle_input, kind_input, key_input);
    if (item ->> 'status') is distinct from (live ->> 'status') and coalesce(item ->> 'status', 'draft') not in ('draft', 'review') then
      if not coerce_status_input then
        raise exception 'status_change_needs_publish' using errcode = '42501';
      end if;
      item := jsonb_set(item, '{status}', to_jsonb(coalesce(live ->> 'status', 'draft')));
    end if;
  end if;

  perform pg_advisory_xact_lock(hashtext('admin_content_items:' || bundle_input || ':' || kind_input || ':' || key_input)::bigint);
  select * into draft from public.admin_content_item_versions
    where bundle_key = bundle_input and kind = kind_input and item_key = key_input and status = 'draft' for update;
  if found then
    if expected_revision_input is not null and expected_revision_input <> draft.revision then
      raise exception 'content_item_draft_changed' using errcode = '40001';
    end if;
    update public.admin_content_item_versions
      set payload = item, revision = draft.revision + 1, restored_from_version = restored_from_input,
          updated_by = actor_input, updated_at = now()
      where id = draft.id returning * into result;
  else
    -- 0 or null: the caller started from no draft. Anything else means the draft it edited was published or discarded.
    if coalesce(expected_revision_input, 0) <> 0 then
      raise exception 'content_item_draft_changed' using errcode = '40001';
    end if;
    select coalesce(max(version), 0) + 1, max(version) filter (where status = 'published')
      into next_version, published_version
      from public.admin_content_item_versions
      where bundle_key = bundle_input and kind = kind_input and item_key = key_input;
    insert into public.admin_content_item_versions(bundle_key, kind, item_key, version, status, payload, base_version,
        restored_from_version, created_by, updated_by)
      values (bundle_input, kind_input, key_input, next_version, 'draft', item, published_version,
        restored_from_input, actor_input, actor_input)
      returning * into result;
  end if;
  return result;
end;
$$;

-- Writes the canonical persona fields of a published persona item into public.personas (matched by slug), the
-- table chat (persona-prompt-assembler) and Council read. Returns the slug, or null when the item has no usable slug.
create function nilaza_private.content_item_sync_persona(item jsonb) returns text
language plpgsql set search_path = '' as $$
declare
  v_slug text := item ->> 'slug';
  v_type text := case when item ->> 'type' in ('historical_figure','book_inspired_guide','archetype') then item ->> 'type' end;
  v_status text := case item ->> 'status' when 'active' then 'active' when 'archived' then 'archived' else 'draft' end;
  v_tier text := case when item ->> 'accessTier' in ('free','premium-preview','premium') then item ->> 'accessTier' else 'free' end;
  v_name jsonb := case when jsonb_typeof(item -> 'name') = 'object' then item -> 'name' else '{}'::jsonb end;
  v_description jsonb := case when jsonb_typeof(item -> 'description') = 'object' then item -> 'description'
    when jsonb_typeof(item -> 'shortDescription') = 'object' then item -> 'shortDescription' else '{}'::jsonb end;
  v_transparency jsonb := case when jsonb_typeof(item -> 'transparency') = 'object' then item -> 'transparency'
    when jsonb_typeof(item -> 'transparencyNote') = 'object' then item -> 'transparencyNote' else '{}'::jsonb end;
  v_themes text[] := case when jsonb_typeof(item -> 'themes') = 'array'
    then array(select jsonb_array_elements_text(item -> 'themes')) else '{}'::text[] end;
  v_tone text[] := case when jsonb_typeof(item -> 'tone') = 'array'
    then array(select jsonb_array_elements_text(item -> 'tone')) else '{}'::text[] end;
begin
  if v_slug is null or v_slug !~ '^[a-z0-9][a-z0-9-]{0,79}$' then return null; end if;
  insert into public.personas(slug, type, status, access_tier, name, short_description, transparency_note, themes, tone, updated_at)
    values (v_slug, coalesce(v_type, 'archetype'), v_status, v_tier, v_name, v_description, v_transparency, v_themes, v_tone, now())
    on conflict (slug) do update set
      type = coalesce(v_type, public.personas.type), status = excluded.status, access_tier = excluded.access_tier,
      name = excluded.name, short_description = excluded.short_description, transparency_note = excluded.transparency_note,
      themes = excluded.themes, tone = excluded.tone, updated_at = now();
  return v_slug;
end;
$$;

-- Every open draft of the bundle, newest first. Needs content.read.
create function public.list_content_item_drafts(p_bundle_key text default 'nilaza_default') returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  if auth.uid() is null or not nilaza_private.has_capability('content.read') then raise exception 'Not authorized' using errcode = '42501'; end if;
  return coalesce((select jsonb_agg(nilaza_private.content_item_json(v) order by v.updated_at desc)
    from public.admin_content_item_versions v where v.bundle_key = p_bundle_key and v.status = 'draft'), '[]'::jsonb);
end;
$$;

-- Saves the whole working item as its draft. p_expected_revision: the draft revision the editor started from
-- (0 or null when there was no draft); a different current revision is refused with 40001. Needs content.draft.
create function public.save_content_item_draft(
  p_kind text, p_item_key text, p_payload jsonb, p_expected_revision integer default null,
  p_bundle_key text default 'nilaza_default'
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  actor uuid := auth.uid();
  result public.admin_content_item_versions;
begin
  if actor is null or not nilaza_private.has_capability('content.draft') then raise exception 'Not authorized' using errcode = '42501'; end if;
  result := nilaza_private.content_item_upsert_draft(actor, p_bundle_key, p_kind, p_item_key, p_payload, p_expected_revision, null, false);
  insert into public.admin_audit_logs(admin_user_id, action, target_table, target_id, metadata)
    values (actor, 'content.item.draft', 'admin_content_item_versions', result.id,
      jsonb_build_object('kind', result.kind, 'key', result.item_key, 'version', result.version, 'revision', result.revision));
  return nilaza_private.content_item_json(result);
end;
$$;

-- Removes the open draft of an item (the published version is untouched). Needs content.draft.
create function public.discard_content_item_draft(
  p_kind text, p_item_key text, p_expected_revision integer default null, p_bundle_key text default 'nilaza_default'
) returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  actor uuid := auth.uid();
  draft public.admin_content_item_versions;
begin
  if actor is null or not nilaza_private.has_capability('content.draft') then raise exception 'Not authorized' using errcode = '42501'; end if;
  perform pg_advisory_xact_lock(hashtext('admin_content_items:' || coalesce(p_bundle_key, '') || ':' || coalesce(p_kind, '') || ':' || coalesce(p_item_key, ''))::bigint);
  select * into draft from public.admin_content_item_versions
    where bundle_key = p_bundle_key and kind = p_kind and item_key = p_item_key and status = 'draft' for update;
  if not found then return false; end if;
  if p_expected_revision is not null and p_expected_revision <> draft.revision then
    raise exception 'content_item_draft_changed' using errcode = '40001';
  end if;
  delete from public.admin_content_item_versions where id = draft.id;
  insert into public.admin_audit_logs(admin_user_id, action, target_table, target_id, metadata)
    values (actor, 'content.item.discard', 'admin_content_item_versions', draft.id,
      jsonb_build_object('kind', draft.kind, 'key', draft.item_key, 'version', draft.version));
  return true;
end;
$$;

-- Versions of one item, newest first (draft, published, archived). Needs content.read.
create function public.list_content_item_history(
  p_kind text, p_item_key text, p_limit integer default 50, p_bundle_key text default 'nilaza_default'
) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  if auth.uid() is null or not nilaza_private.has_capability('content.read') then raise exception 'Not authorized' using errcode = '42501'; end if;
  return coalesce((select jsonb_agg(nilaza_private.content_item_json(v) order by v.version desc) from (
    select * from public.admin_content_item_versions
    where bundle_key = p_bundle_key and kind = p_kind and item_key = p_item_key
    order by version desc limit greatest(1, least(coalesce(p_limit, 50), 200))) v), '[]'::jsonb);
end;
$$;

-- Copies an earlier version's content into the item's draft (creating or replacing it); history is never deleted.
-- Without content.publish the restored copy keeps the status the item has now. Needs content.draft.
create function public.restore_content_item_version(
  p_kind text, p_item_key text, p_version integer, p_expected_revision integer default null,
  p_bundle_key text default 'nilaza_default'
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  actor uuid := auth.uid();
  source public.admin_content_item_versions;
  result public.admin_content_item_versions;
begin
  if actor is null or not nilaza_private.has_capability('content.draft') then raise exception 'Not authorized' using errcode = '42501'; end if;
  select * into source from public.admin_content_item_versions
    where bundle_key = p_bundle_key and kind = p_kind and item_key = p_item_key and version = p_version and status <> 'draft';
  if not found then raise exception 'content_item_version_not_found' using errcode = '22023'; end if;
  result := nilaza_private.content_item_upsert_draft(actor, p_bundle_key, p_kind, p_item_key, source.payload, p_expected_revision, source.version, true);
  insert into public.admin_audit_logs(admin_user_id, action, target_table, target_id, metadata)
    values (actor, 'content.item.restore', 'admin_content_item_versions', result.id,
      jsonb_build_object('kind', result.kind, 'key', result.item_key, 'version', result.version, 'restoredFromVersion', source.version));
  return nilaza_private.content_item_json(result);
end;
$$;

-- Publishes the drafts named in p_keys ('kind/item-key', 1-200 distinct) as one new published bundle version:
-- the current published payload with only those items replaced (or appended when new). A draft still in draft or
-- review status becomes active (persona, deck) or published (card, app copy, asset); archived stays archived.
-- The previous bundle and the items' previous published versions become archived. Persona items are synced into
-- public.personas. p_note: 5-500 characters (kept on each item version, the bundle event and the audit row).
-- p_expected_published_version: refuse with 40001 when the published bundle changed. Needs content.publish.
create function public.publish_content_items(
  p_keys text[], p_note text, p_expected_published_version bigint default null,
  p_bundle_key text default 'nilaza_default'
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  actor uuid := auth.uid();
  clean_note text := btrim(coalesce(p_note, ''));
  current_bundle public.admin_content_bundles;
  new_bundle public.admin_content_bundles;
  new_payload jsonb;
  key_text text;
  v_kind text;
  v_key text;
  v_array text;
  draft public.admin_content_item_versions;
  item jsonb;
  position_index integer;
  draft_ids uuid[] := '{}';
  published jsonb := '[]'::jsonb;
  synced text[] := '{}';
  synced_slug text;
begin
  if actor is null or not nilaza_private.has_capability('content.publish') then raise exception 'Not authorized' using errcode = '42501'; end if;
  if p_keys is null or cardinality(p_keys) not between 1 and 200
    or (select count(distinct k) from unnest(p_keys) k) <> cardinality(p_keys)
    or exists (select 1 from unnest(p_keys) k where k is null or k !~ '^(persona|deck|card|frontend|asset)/[A-Za-z0-9][A-Za-z0-9_.:-]{0,159}$')
    or char_length(clean_note) not between 5 and 500 then
    raise exception 'invalid_content_publish' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(hashtext('admin_content_bundle:' || coalesce(p_bundle_key, ''))::bigint);
  select * into current_bundle from public.admin_content_bundles
    where bundle_key = p_bundle_key and status = 'published' for update;
  if not found then raise exception 'no_published_bundle' using errcode = '22023'; end if;
  if p_expected_published_version is not null and current_bundle.version <> p_expected_published_version then
    raise exception 'Published content changed; reload before publishing' using errcode = '40001';
  end if;
  new_payload := current_bundle.payload;

  foreach key_text in array p_keys loop
    v_kind := split_part(key_text, '/', 1);
    v_key := substr(key_text, char_length(v_kind) + 2);
    v_array := nilaza_private.content_item_array(v_kind);
    select * into draft from public.admin_content_item_versions
      where bundle_key = p_bundle_key and kind = v_kind and item_key = v_key and status = 'draft' for update;
    if not found then raise exception 'content_item_not_draft' using errcode = '22023', detail = key_text; end if;
    item := draft.payload;
    if coalesce(item ->> 'status', 'draft') in ('draft', 'review') then
      item := jsonb_set(item, '{status}', to_jsonb(case when v_kind in ('persona', 'deck') then 'active' else 'published' end));
    end if;
    select (e.ordinality - 1)::integer into position_index
      from jsonb_array_elements(new_payload -> v_array) with ordinality e(value, ordinality)
      where e.value ->> 'id' = v_key limit 1;
    if position_index is null then
      new_payload := jsonb_set(new_payload, array[v_array], (new_payload -> v_array) || jsonb_build_array(item));
    else
      new_payload := jsonb_set(new_payload, array[v_array, position_index::text], item);
    end if;
    position_index := null;
    update public.admin_content_item_versions set status = 'archived', updated_at = now()
      where bundle_key = p_bundle_key and kind = v_kind and item_key = v_key and status = 'published';
    update public.admin_content_item_versions
      set status = 'published', payload = item, note = clean_note, published_by = actor, published_at = now(), updated_at = now()
      where id = draft.id;
    draft_ids := draft_ids || draft.id;
    published := published || jsonb_build_array(jsonb_build_object('kind', v_kind, 'key', v_key, 'version', draft.version));
    if v_kind = 'persona' then
      synced_slug := nilaza_private.content_item_sync_persona(item);
      if synced_slug is not null then synced := synced || synced_slug; end if;
    end if;
  end loop;

  update public.admin_content_bundles set status = 'archived', updated_at = now() where id = current_bundle.id;
  insert into public.admin_content_bundles(bundle_key, schema_version, source_version, payload, status, base_published_version,
      created_by, updated_by, published_by, published_at, supersedes_id)
    values (current_bundle.bundle_key, current_bundle.schema_version, current_bundle.source_version, new_payload, 'published',
      current_bundle.version, actor, actor, actor, now(), current_bundle.id)
    returning * into new_bundle;
  update public.admin_content_item_versions set bundle_version = new_bundle.version where id = any(draft_ids);
  insert into public.admin_content_bundle_events(bundle_id, bundle_key, action, actor_id, metadata)
    values (new_bundle.id, new_bundle.bundle_key, 'published', actor,
      jsonb_build_object('version', new_bundle.version, 'previousVersion', current_bundle.version,
        'sourceVersion', new_bundle.source_version, 'items', to_jsonb(p_keys), 'note', clean_note));
  insert into public.admin_audit_logs(admin_user_id, action, target_table, target_id, metadata)
    values (actor, 'content.items.publish', 'admin_content_bundles', new_bundle.id,
      jsonb_build_object('items', to_jsonb(p_keys), 'note', clean_note, 'bundleVersion', new_bundle.version,
        'previousVersion', current_bundle.version, 'personasSynced', to_jsonb(synced)));
  return jsonb_build_object('bundleId', new_bundle.id, 'bundleVersion', new_bundle.version, 'previousVersion', current_bundle.version,
    'published', published, 'personasSynced', to_jsonb(synced));
end;
$$;

revoke all on function nilaza_private.content_item_array(text), nilaza_private.content_item_live(text,text,text),
  nilaza_private.content_item_json(public.admin_content_item_versions),
  nilaza_private.content_item_upsert_draft(uuid,text,text,text,jsonb,integer,integer,boolean),
  nilaza_private.content_item_sync_persona(jsonb)
  from public, anon, authenticated;
revoke all on function public.list_content_item_drafts(text), public.save_content_item_draft(text,text,jsonb,integer,text),
  public.discard_content_item_draft(text,text,integer,text), public.list_content_item_history(text,text,integer,text),
  public.restore_content_item_version(text,text,integer,integer,text), public.publish_content_items(text[],text,bigint,text)
  from public, anon, authenticated;
grant execute on function public.list_content_item_drafts(text), public.save_content_item_draft(text,text,jsonb,integer,text),
  public.discard_content_item_draft(text,text,integer,text), public.list_content_item_history(text,text,integer,text),
  public.restore_content_item_version(text,text,integer,integer,text), public.publish_content_items(text[],text,bigint,text)
  to authenticated;

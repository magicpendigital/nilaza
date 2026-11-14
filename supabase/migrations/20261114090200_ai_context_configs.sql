-- Owner request 14/11/2026 (docs/proposals/AI_CONTEXT_CONFIG_2026-11-14.vi.md): Admin chooses which data blocks each AI
-- feature sends to the model and narrows their limits, Draft -> Review -> Publish. Configurable now: persona_chat,
-- daily_insight, ai_council. oracle_router, tarot_reading, astrology_insight and astrology_report are shown read-only
-- in Admin and have no rows here.
-- Hard rules (also enforced again in supabase/functions/_shared/context-config.ts, whatever a row says):
-- - Only the blocks in nilaza_private.ai_context_block_spec() exist. It mirrors packages/agent-config/ai-context-blocks.json
--   (scripts/admin-context-config.test.mjs checks they are equal). Unknown blocks or keys are refused, so no field can
--   be added (journal text has no block); the message, language and persona are locked and are not blocks.
-- - Every limit is a whole number in [min, max] and max equals today's code value, so a config can only send less.
-- - Crisis screening, the data-block separation and the provider data-class floor never read this table.
-- Edge Functions read only the active row (service key, one-minute cache). No row, no table or a read error keeps
-- today's behaviour, so this migration changes nothing until a version is published.
-- Release gate (A6, 20261113110000): not extended. Switching blocks off or shortening limits only removes data from
-- the model request and cannot add instructions or raise exposure; the gate stays on prompt and route changes.
create table public.ai_context_configs (
  id uuid primary key default gen_random_uuid(),
  feature text not null check (feature in ('persona_chat','daily_insight','ai_council')),
  version integer not null check (version >= 1),
  status text not null default 'draft' check (status in ('draft','active','archived')),
  -- Normalized: every spec block of the feature as {enabled: boolean, <limit>: integer, ...}.
  blocks jsonb not null check (jsonb_typeof(blocks) = 'object'),
  note text check (note is null or char_length(note) <= 500),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_by uuid references auth.users(id) on delete set null,
  published_at timestamptz,
  constraint ai_context_configs_feature_version_key unique (feature, version),
  constraint ai_context_configs_published check (status = 'draft' or (published_at is not null and published_by is not null))
);
create unique index ai_context_configs_one_active on public.ai_context_configs(feature) where status = 'active';
create unique index ai_context_configs_one_draft on public.ai_context_configs(feature) where status = 'draft';
alter table public.ai_context_configs enable row level security;
-- No policies: clients never read or write the table directly; Admin goes through the RPCs below and
-- Edge Functions read active rows with the service key.
-- service_role is revoked too: Supabase's default privileges grant it ALL on new tables, and Edge Functions only read.
revoke all on table public.ai_context_configs from public, anon, authenticated, service_role;
grant select on table public.ai_context_configs to service_role;
comment on table public.ai_context_configs is 'Versioned data-block switches and limits per AI feature (draft/active/archived, one active per feature). Read by Edge Functions with the service key; written only by save_ai_context_config_draft and publish_ai_context_config (audited). Can only send less than today.';

-- {feature: {block: {limit: [min, max]}}}; must equal packages/agent-config/ai-context-blocks.json (test-checked).
create function nilaza_private.ai_context_block_spec() returns jsonb
language sql immutable set search_path = '' as $$
  select $spec${
    "persona_chat": {
      "nickname": {}, "goals": {"maxItems": [1, 5], "maxChars": [10, 60]}, "tone": {}, "localDateTime": {},
      "history": {"turns": [1, 8], "chars": [100, 800]},
      "handoff": {"questionChars": [50, 300], "summaryChars": [100, 600]}
    },
    "daily_insight": {
      "nickname": {}, "goals": {"maxItems": [1, 5], "maxChars": [10, 60]}, "tone": {}, "recentMood": {}, "localDateTime": {}
    },
    "ai_council": {
      "nickname": {}, "goals": {"maxItems": [1, 5], "maxChars": [10, 60]}, "tone": {}, "localDateTime": {},
      "history": {"turns": [1, 12], "chars": [100, 800]}
    }
  }$spec$::jsonb;
$$;

-- Validates an Admin payload and returns the normalized blocks: every spec block present, enabled defaults to true and
-- each limit to its max (today's value). Refuses unknown blocks, unknown keys, non-boolean enabled and any limit that is
-- not a whole number inside [min, max].
create function nilaza_private.ai_context_config_blocks(feature_input text, value_input jsonb) returns jsonb
language plpgsql immutable set search_path = '' as $$
declare
  spec jsonb := nilaza_private.ai_context_block_spec() -> feature_input;
  block_id text; block_spec jsonb; given jsonb; key text; limit_name text; n numeric; entry jsonb;
  result jsonb := '{}'::jsonb;
begin
  if spec is null or value_input is null or jsonb_typeof(value_input) <> 'object' then
    raise exception 'invalid_context_config' using errcode='22023';
  end if;
  if exists (select 1 from jsonb_object_keys(value_input) k where not spec ? k) then
    raise exception 'invalid_context_config' using errcode='22023';
  end if;
  for block_id, block_spec in select * from jsonb_each(spec) loop
    given := coalesce(value_input -> block_id, '{}'::jsonb);
    if jsonb_typeof(given) <> 'object' then raise exception 'invalid_context_config' using errcode='22023'; end if;
    for key in select jsonb_object_keys(given) loop
      if key <> 'enabled' and not block_spec ? key then raise exception 'invalid_context_config' using errcode='22023'; end if;
    end loop;
    if given ? 'enabled' and jsonb_typeof(given -> 'enabled') <> 'boolean' then
      raise exception 'invalid_context_config' using errcode='22023';
    end if;
    entry := jsonb_build_object('enabled', coalesce((given ->> 'enabled')::boolean, true));
    for limit_name in select jsonb_object_keys(block_spec) loop
      if given ? limit_name then
        if jsonb_typeof(given -> limit_name) <> 'number' then raise exception 'invalid_context_config' using errcode='22023'; end if;
        n := (given ->> limit_name)::numeric;
        if n <> trunc(n) or n < (block_spec -> limit_name ->> 0)::numeric or n > (block_spec -> limit_name ->> 1)::numeric then
          raise exception 'invalid_context_config' using errcode='22023';
        end if;
      else
        n := (block_spec -> limit_name ->> 1)::numeric;
      end if;
      entry := entry || jsonb_build_object(limit_name, n::integer);
    end loop;
    result := result || jsonb_build_object(block_id, entry);
  end loop;
  return result;
end;
$$;

-- Admin JSON shape of one row (camelCase), shared by the three RPCs.
create function nilaza_private.ai_context_config_json(row_input public.ai_context_configs) returns jsonb
language sql stable set search_path = '' as $$
  select jsonb_build_object(
    'id', row_input.id, 'feature', row_input.feature, 'version', row_input.version, 'status', row_input.status,
    'blocks', row_input.blocks, 'note', row_input.note, 'createdBy', row_input.created_by, 'createdAt', row_input.created_at,
    'updatedAt', row_input.updated_at, 'publishedBy', row_input.published_by, 'publishedAt', row_input.published_at);
$$;

-- Every version of every feature, newest first within a feature. Needs ai.read.
create function public.get_ai_context_configs() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  if auth.uid() is null or not nilaza_private.has_capability('ai.read') then raise exception 'Not authorized' using errcode='42501'; end if;
  return coalesce((select jsonb_agg(nilaza_private.ai_context_config_json(c) order by c.feature, c.version desc)
    from public.ai_context_configs c), '[]'::jsonb);
end;
$$;

-- Creates or replaces the single draft of a feature. blocks_input describes the whole draft; a missing block or key
-- means "today's value". note: optional, at most 500 characters. Needs ai.manage, or ai.read plus content.draft
-- (editor), like save_ai_feature_config_draft (20261113090200). Publishing stays ai.manage only.
create function public.save_ai_context_config_draft(feature_input text, blocks_input jsonb, note_input text default null) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  actor uuid := auth.uid();
  clean_blocks jsonb;
  clean_note text := nullif(btrim(coalesce(note_input, '')), '');
  result public.ai_context_configs;
  next_version integer;
begin
  if actor is null or not (nilaza_private.has_capability('ai.manage')
    or (nilaza_private.has_capability('ai.read') and nilaza_private.has_capability('content.draft'))) then
    raise exception 'Not authorized' using errcode='42501';
  end if;
  if feature_input is null or feature_input not in ('persona_chat','daily_insight','ai_council')
    or (clean_note is not null and char_length(clean_note) > 500) then
    raise exception 'invalid_context_config' using errcode='22023';
  end if;
  clean_blocks := nilaza_private.ai_context_config_blocks(feature_input, blocks_input);

  perform pg_advisory_xact_lock(hashtext('ai_context_configs:' || feature_input)::bigint);
  update public.ai_context_configs set blocks=clean_blocks, note=clean_note, created_by=actor, updated_at=now()
    where feature=feature_input and status='draft' returning * into result;
  if not found then
    select coalesce(max(version), 0) + 1 into next_version from public.ai_context_configs where feature=feature_input;
    insert into public.ai_context_configs(feature, version, status, blocks, note, created_by)
      values(feature_input, next_version, 'draft', clean_blocks, clean_note, actor)
      returning * into result;
  end if;
  insert into public.admin_audit_logs(admin_user_id,action,target_table,target_id,metadata)
    values(actor,'ai.context_config.draft','ai_context_configs',result.id,
      jsonb_build_object('feature',result.feature,'version',result.version,'blocks',result.blocks));
  return nilaza_private.ai_context_config_json(result);
end;
$$;

-- Publishes the feature's draft with this version number: the previous active version becomes archived and the draft
-- becomes active, in one transaction. Active and archived rows never change; to restore an older version, save a draft
-- with its values and publish that. note: 10-500 characters, kept on the row and in the audit log. Needs ai.manage.
create function public.publish_ai_context_config(feature_input text, version_input integer, note_input text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  actor uuid := auth.uid();
  clean_note text := btrim(coalesce(note_input, ''));
  draft public.ai_context_configs;
  result public.ai_context_configs;
  previous public.ai_context_configs;
begin
  if actor is null or not nilaza_private.has_capability('ai.manage') then raise exception 'Not authorized' using errcode='42501'; end if;
  if feature_input is null or feature_input not in ('persona_chat','daily_insight','ai_council')
    or version_input is null or char_length(clean_note) not between 10 and 500 then
    raise exception 'invalid_context_config' using errcode='22023';
  end if;
  perform pg_advisory_xact_lock(hashtext('ai_context_configs:' || feature_input)::bigint);
  select * into draft from public.ai_context_configs where feature=feature_input and version=version_input for update;
  if not found or draft.status <> 'draft' then raise exception 'context_config_not_draft' using errcode='22023'; end if;
  update public.ai_context_configs set status='archived', updated_at=now()
    where feature=feature_input and status='active' returning * into previous;
  update public.ai_context_configs set status='active', note=clean_note, published_by=actor, published_at=now(), updated_at=now()
    where id=draft.id returning * into result;
  insert into public.admin_audit_logs(admin_user_id,action,target_table,target_id,metadata)
    values(actor,'ai.context_config.publish','ai_context_configs',result.id,
      jsonb_build_object('feature',result.feature,'version',result.version,'archivedVersion',previous.version,'note',clean_note,
        'blocks',result.blocks,'previousBlocks',previous.blocks));
  return nilaza_private.ai_context_config_json(result) || jsonb_build_object('archivedVersion', previous.version);
end;
$$;

comment on function public.save_ai_context_config_draft(text,jsonb,text) is 'Saves the single draft of an AI context config (data blocks and limits). Allowed for ai.manage or ai.read+content.draft (editors); publishing stays ai.manage only. Audited as ai.context_config.draft.';
comment on function public.publish_ai_context_config(text,integer,text) is 'Publishes an AI context config draft and archives the previous active version. ai.manage only; note 10-500 characters. Audited as ai.context_config.publish.';

revoke all on function nilaza_private.ai_context_block_spec(), nilaza_private.ai_context_config_blocks(text,jsonb),
  nilaza_private.ai_context_config_json(public.ai_context_configs)
  from public, anon, authenticated;
revoke all on function public.get_ai_context_configs(), public.save_ai_context_config_draft(text,jsonb,text),
  public.publish_ai_context_config(text,integer,text) from public, anon, authenticated;
grant execute on function public.get_ai_context_configs(), public.save_ai_context_config_draft(text,jsonb,text),
  public.publish_ai_context_config(text,integer,text) to authenticated;

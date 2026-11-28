-- Owner decision 25/11/2026 (docs/proposals/CHAT_KNOWLEDGE_CHARACTERS_2026-11-24.vi.md section 6): each chat persona
-- runs on one model tier ("standard" = Thường, "deep_knowledge" = Tri thức sâu, optional "premium"). A tier sets its
-- primary/fallback models, reasoning, output ceiling, total wait, per-message cost cap, history size and answer style;
-- a persona map (content id such as book-i-ching -> tier) picks the tier. Admin edits it Draft -> Publish like
-- ai_context_configs (20261114090200).
-- Code defaults and bounds: packages/agent-config/persona-model-tiers.json. nilaza_private.ai_persona_model_tiers_spec()
-- mirrors them and scripts/persona-model-tiers.test.mjs keeps the two equal.
-- Edge Functions read only the active row (service key, one-minute cache, supabase/functions/_shared/persona-model-tiers.ts)
-- and clamp every value again. No row, no table or a read error keeps the code defaults, so this migration changes nothing
-- until a version is published. The quota (claimDailyAttempt) and crisis screening never read this table.
-- platform.wallClockMs: 150000 on the Supabase Free plan, 400000 only after the project moves to a paid plan
-- (https://supabase.com/docs/guides/functions/limits, checked 25/11/2026).
-- Release gate (A6, 20261113110000): not extended here; a tier change is a model change, so publish is ai.manage (Owner
-- only since 20261115090000) and audited with the full previous and new config.
-- Nothing is applied by this file on its own: it needs Owner approval to run.
create table public.ai_persona_model_tiers (
  id uuid primary key default gen_random_uuid(),
  version integer not null unique check (version >= 1),
  status text not null default 'draft' check (status in ('draft','active','archived')),
  config jsonb not null check (jsonb_typeof(config) = 'object'),
  note text check (note is null or char_length(note) <= 500),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_by uuid references auth.users(id) on delete set null,
  published_at timestamptz,
  constraint ai_persona_model_tiers_published check (status = 'draft' or (published_at is not null and published_by is not null))
);
create unique index ai_persona_model_tiers_one_active on public.ai_persona_model_tiers((true)) where status = 'active';
create unique index ai_persona_model_tiers_one_draft on public.ai_persona_model_tiers((true)) where status = 'draft';
alter table public.ai_persona_model_tiers enable row level security;
-- No policies: clients never read or write the table directly; Admin goes through the RPCs below and the Edge Function
-- reads the active row with the service key.
revoke all on table public.ai_persona_model_tiers from public, anon, authenticated, service_role;
grant select on table public.ai_persona_model_tiers to service_role;
comment on table public.ai_persona_model_tiers is 'Versioned persona chat model tiers and persona -> tier map (draft/active/archived, one active). Read by ai-persona-chat with the service key; written only by save_ai_persona_model_tiers_draft and publish_ai_persona_model_tiers (audited).';

-- Must equal packages/agent-config/persona-model-tiers.json (tierKeys, outputStyles, bounds, platform.wallClockMsAllowed)
-- plus the provider and reasoning lists of supabase/functions/_shared/model-provider.ts (test-checked).
create function nilaza_private.ai_persona_model_tiers_spec() returns jsonb
language sql immutable set search_path = '' as $$
  select $spec${
    "tierKeys": ["standard", "deep_knowledge", "premium"],
    "outputStyles": ["concise", "knowledge"],
    "providers": ["openai", "openrouter", "gemini", "anthropic", "deepseek"],
    "reasoningModes": ["off", "minimal", "low", "medium", "high"],
    "wallClockMsAllowed": [150000, 400000],
    "bounds": {
      "maxOutputTokens": {"min": 256, "max": 16000},
      "timeoutMs": {"min": 5000, "max": 300000},
      "primaryShare": {"min": 0.3, "max": 0.9},
      "costCapMicro": {"min": 1000, "max": 200000},
      "temperature": {"min": 0, "max": 1.5},
      "reasoningMaxTokens": {"min": 64, "max": 8000},
      "historyTurns": {"min": 0, "max": 12},
      "historyChars": {"min": 100, "max": 2500},
      "maxSteps": 4
    }
  }$spec$::jsonb;
$$;

-- True when value is a JSON number inside the named bound (and whole when whole_only).
create function nilaza_private.ai_persona_tier_number_ok(value jsonb, bound text, whole_only boolean) returns boolean
language plpgsql immutable set search_path = '' as $$
declare
  b jsonb := nilaza_private.ai_persona_model_tiers_spec() -> 'bounds' -> bound;
  n numeric;
begin
  if value is null or jsonb_typeof(value) <> 'number' or b is null then return false; end if;
  n := (value #>> '{}')::numeric;
  if whole_only and n <> trunc(n) then return false; end if;
  return n >= (b ->> 'min')::numeric and n <= (b ->> 'max')::numeric;
end;
$$;

-- True when value is a JSON object whose keys are all in allowed. Checked in plpgsql order, so jsonb_object_keys never
-- sees a scalar (SQL does not promise short-circuit evaluation of OR).
create function nilaza_private.ai_persona_tier_keys_ok(value jsonb, allowed text[]) returns boolean
language plpgsql immutable set search_path = '' as $$
begin
  if value is null or jsonb_typeof(value) <> 'object' then return false; end if;
  return not exists (select 1 from jsonb_object_keys(value) k where k <> all(allowed));
end;
$$;

-- True when value is a JSON string that matches pattern (case-insensitive).
create function nilaza_private.ai_persona_tier_text_ok(value jsonb, pattern text) returns boolean
language plpgsql immutable set search_path = '' as $$
begin
  if value is null or jsonb_typeof(value) <> 'string' then return false; end if;
  return (value #>> '{}') ~* pattern;
end;
$$;

-- Every problem in an Admin payload, as short codes; empty means the config is valid. Stricter than the Edge Function's
-- reader (which clamps and drops): Admin gets a refusal instead of a silently changed value.
create function nilaza_private.ai_persona_model_tiers_errors(config_input jsonb) returns text[]
language plpgsql immutable set search_path = '' as $$
declare
  spec jsonb := nilaza_private.ai_persona_model_tiers_spec();
  errors text[] := '{}';
  tiers jsonb; tier_key text; tier jsonb; key text; step jsonb; item jsonb; persona text; target jsonb;
  active_route boolean;
begin
  if config_input is null or jsonb_typeof(config_input) <> 'object' then return array['config_not_object']; end if;
  for key in select jsonb_object_keys(config_input) loop
    if key not in ('tiers', 'personaTiers', 'platform') then errors := errors || ('unknown_key:' || left(key, 40)); end if;
  end loop;

  tiers := config_input -> 'tiers';
  if tiers is null or jsonb_typeof(tiers) <> 'object' then
    errors := errors || 'tiers_not_object'::text;
    tiers := '{}'::jsonb;
  elsif not tiers ? 'standard' then
    errors := errors || 'standard_tier_missing'::text;
  end if;
  for tier_key, tier in select * from jsonb_each(tiers) loop
    if not (spec -> 'tierKeys') ? tier_key then errors := errors || ('unknown_tier:' || left(tier_key, 40)); continue; end if;
    if jsonb_typeof(tier) <> 'object' then errors := errors || (tier_key || ':not_object'); continue; end if;
    for key in select jsonb_object_keys(tier) loop
      if key not in ('label','useActiveRoute','steps','temperature','reasoning','maxOutputTokens','timeoutMs','primaryShare',
        'costCapMicro','history','outputStyle') then
        errors := errors || (tier_key || ':unknown_key:' || left(key, 40));
      end if;
    end loop;
    if tier ? 'label' then
      if not nilaza_private.ai_persona_tier_keys_ok(tier -> 'label', array['vi', 'en'])
        or not nilaza_private.ai_persona_tier_text_ok(tier -> 'label' -> 'vi', '^\s*\S.{0,39}$')
        or not nilaza_private.ai_persona_tier_text_ok(tier -> 'label' -> 'en', '^\s*\S.{0,39}$')
        or char_length(tier -> 'label' ->> 'vi') > 40 or char_length(tier -> 'label' ->> 'en') > 40 then
        errors := errors || (tier_key || ':label');
      end if;
    end if;
    if tier ? 'useActiveRoute' and jsonb_typeof(tier -> 'useActiveRoute') <> 'boolean' then errors := errors || (tier_key || ':useActiveRoute'); end if;
    active_route := case when jsonb_typeof(tier -> 'useActiveRoute') = 'boolean' then (tier ->> 'useActiveRoute')::boolean else true end;
    if not active_route then
      if jsonb_typeof(tier -> 'steps') is distinct from 'array' then
        errors := errors || (tier_key || ':steps');
      elsif jsonb_array_length(tier -> 'steps') not between 1 and (spec -> 'bounds' ->> 'maxSteps')::integer then
        errors := errors || (tier_key || ':steps');
      else
        for step in select * from jsonb_array_elements(tier -> 'steps') loop
          if not nilaza_private.ai_persona_tier_keys_ok(step, array['provider', 'model']) then
            errors := errors || (tier_key || ':step');
          elsif not nilaza_private.ai_persona_tier_text_ok(step -> 'provider', '^[a-z]+$')
            or not (spec -> 'providers') ? (step ->> 'provider')
            or not nilaza_private.ai_persona_tier_text_ok(step -> 'model', '^[a-z0-9][a-z0-9._/:-]{1,119}$') then
            errors := errors || (tier_key || ':step');
          end if;
        end loop;
      end if;
    elsif tier ? 'steps' then
      errors := errors || (tier_key || ':steps_need_useActiveRoute_false');
    end if;
    if tier ? 'temperature' and not nilaza_private.ai_persona_tier_number_ok(tier -> 'temperature', 'temperature', false) then errors := errors || (tier_key || ':temperature'); end if;
    if tier ? 'maxOutputTokens' and not nilaza_private.ai_persona_tier_number_ok(tier -> 'maxOutputTokens', 'maxOutputTokens', true) then errors := errors || (tier_key || ':maxOutputTokens'); end if;
    if tier ? 'timeoutMs' and not nilaza_private.ai_persona_tier_number_ok(tier -> 'timeoutMs', 'timeoutMs', true) then errors := errors || (tier_key || ':timeoutMs'); end if;
    if tier ? 'primaryShare' and not nilaza_private.ai_persona_tier_number_ok(tier -> 'primaryShare', 'primaryShare', false) then errors := errors || (tier_key || ':primaryShare'); end if;
    if tier ? 'costCapMicro' and not nilaza_private.ai_persona_tier_number_ok(tier -> 'costCapMicro', 'costCapMicro', true) then errors := errors || (tier_key || ':costCapMicro'); end if;
    if tier ? 'reasoning' then
      item := tier -> 'reasoning';
      if not nilaza_private.ai_persona_tier_keys_ok(item, array['mode', 'maxTokens']) then
        errors := errors || (tier_key || ':reasoning');
      elsif not nilaza_private.ai_persona_tier_text_ok(item -> 'mode', '^[a-z]+$')
        or not (spec -> 'reasoningModes') ? (item ->> 'mode')
        or (item ? 'maxTokens' and not nilaza_private.ai_persona_tier_number_ok(item -> 'maxTokens', 'reasoningMaxTokens', true)) then
        errors := errors || (tier_key || ':reasoning');
      end if;
    end if;
    if tier ? 'history' then
      item := tier -> 'history';
      if not nilaza_private.ai_persona_tier_keys_ok(item, array['turns', 'chars'])
        or not nilaza_private.ai_persona_tier_number_ok(item -> 'turns', 'historyTurns', true)
        or not nilaza_private.ai_persona_tier_number_ok(item -> 'chars', 'historyChars', true) then
        errors := errors || (tier_key || ':history');
      end if;
    end if;
    if tier ? 'outputStyle' and (not nilaza_private.ai_persona_tier_text_ok(tier -> 'outputStyle', '^[a-z_]+$')
      or not (spec -> 'outputStyles') ? (tier ->> 'outputStyle')) then
      errors := errors || (tier_key || ':outputStyle');
    end if;
  end loop;

  if config_input ? 'personaTiers' then
    if jsonb_typeof(config_input -> 'personaTiers') <> 'object' then
      errors := errors || 'personaTiers_not_object'::text;
    else
      for persona, target in select * from jsonb_each(config_input -> 'personaTiers') loop
        if persona !~ '^[a-z0-9][a-z0-9-]{0,79}$' then errors := errors || ('persona_key:' || left(persona, 40)); continue; end if;
        if not nilaza_private.ai_persona_tier_text_ok(target, '^[a-z_]+$') or not tiers ? (target #>> '{}') then
          errors := errors || ('persona_tier:' || persona);
        end if;
      end loop;
    end if;
  end if;

  if config_input ? 'platform' then
    if not nilaza_private.ai_persona_tier_keys_ok(config_input -> 'platform', array['wallClockMs'])
      or not (spec -> 'wallClockMsAllowed') @> jsonb_build_array(config_input -> 'platform' -> 'wallClockMs') then
      errors := errors || 'platform'::text;
    end if;
  end if;
  return errors;
end;
$$;

-- Admin JSON shape of one row (camelCase), shared by the RPCs.
create function nilaza_private.ai_persona_model_tiers_json(row_input public.ai_persona_model_tiers) returns jsonb
language sql stable set search_path = '' as $$
  select jsonb_build_object(
    'id', row_input.id, 'version', row_input.version, 'status', row_input.status, 'config', row_input.config,
    'note', row_input.note, 'createdBy', row_input.created_by, 'createdAt', row_input.created_at,
    'updatedAt', row_input.updated_at, 'publishedBy', row_input.published_by, 'publishedAt', row_input.published_at);
$$;

-- Every version, newest first. Needs ai.read.
create function public.get_ai_persona_model_tiers() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  if auth.uid() is null or not nilaza_private.has_capability('ai.read') then raise exception 'Not authorized' using errcode='42501'; end if;
  return coalesce((select jsonb_agg(nilaza_private.ai_persona_model_tiers_json(t) order by t.version desc)
    from public.ai_persona_model_tiers t), '[]'::jsonb);
end;
$$;

-- Creates or replaces the single draft. config_input is the whole config ({tiers, personaTiers?, platform?}); it is
-- refused with the list of problems when invalid. note: optional, at most 500 characters. Needs ai.manage, or ai.read
-- plus content.draft (editor), like the other AI drafts. Publishing stays ai.manage (Owner) only.
create function public.save_ai_persona_model_tiers_draft(config_input jsonb, note_input text default null) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  actor uuid := auth.uid();
  clean_note text := nullif(btrim(coalesce(note_input, '')), '');
  problems text[];
  result public.ai_persona_model_tiers;
  next_version integer;
begin
  if actor is null or not (nilaza_private.has_capability('ai.manage')
    or (nilaza_private.has_capability('ai.read') and nilaza_private.has_capability('content.draft'))) then
    raise exception 'Not authorized' using errcode='42501';
  end if;
  if clean_note is not null and char_length(clean_note) > 500 then raise exception 'invalid_persona_model_tiers' using errcode='22023'; end if;
  problems := nilaza_private.ai_persona_model_tiers_errors(config_input);
  if cardinality(problems) > 0 then
    raise exception 'invalid_persona_model_tiers' using errcode='22023', detail = left(array_to_string(problems, ', '), 1000);
  end if;

  perform pg_advisory_xact_lock(hashtext('ai_persona_model_tiers')::bigint);
  update public.ai_persona_model_tiers set config=config_input, note=clean_note, created_by=actor, updated_at=now()
    where status='draft' returning * into result;
  if not found then
    select coalesce(max(version), 0) + 1 into next_version from public.ai_persona_model_tiers;
    insert into public.ai_persona_model_tiers(version, status, config, note, created_by)
      values(next_version, 'draft', config_input, clean_note, actor)
      returning * into result;
  end if;
  insert into public.admin_audit_logs(admin_user_id,action,target_table,target_id,metadata)
    values(actor,'ai.persona_model_tiers.draft','ai_persona_model_tiers',result.id,
      jsonb_build_object('version',result.version,'config',result.config));
  return nilaza_private.ai_persona_model_tiers_json(result);
end;
$$;

-- Publishes the draft with this version number: the previous active version becomes archived and the draft becomes
-- active, in one transaction. The draft is validated again. note: 10-500 characters. Needs ai.manage (Owner).
create function public.publish_ai_persona_model_tiers(version_input integer, note_input text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  actor uuid := auth.uid();
  clean_note text := btrim(coalesce(note_input, ''));
  draft public.ai_persona_model_tiers;
  result public.ai_persona_model_tiers;
  previous public.ai_persona_model_tiers;
begin
  if actor is null or not nilaza_private.has_capability('ai.manage') then raise exception 'Not authorized' using errcode='42501'; end if;
  if version_input is null or char_length(clean_note) not between 10 and 500 then
    raise exception 'invalid_persona_model_tiers' using errcode='22023';
  end if;
  perform pg_advisory_xact_lock(hashtext('ai_persona_model_tiers')::bigint);
  select * into draft from public.ai_persona_model_tiers where version=version_input for update;
  if not found or draft.status <> 'draft' then raise exception 'persona_model_tiers_not_draft' using errcode='22023'; end if;
  if cardinality(nilaza_private.ai_persona_model_tiers_errors(draft.config)) > 0 then
    raise exception 'invalid_persona_model_tiers' using errcode='22023';
  end if;
  update public.ai_persona_model_tiers set status='archived', updated_at=now()
    where status='active' returning * into previous;
  update public.ai_persona_model_tiers set status='active', note=clean_note, published_by=actor, published_at=now(), updated_at=now()
    where id=draft.id returning * into result;
  insert into public.admin_audit_logs(admin_user_id,action,target_table,target_id,metadata)
    values(actor,'ai.persona_model_tiers.publish','ai_persona_model_tiers',result.id,
      jsonb_build_object('version',result.version,'archivedVersion',previous.version,'note',clean_note,
        'config',result.config,'previousConfig',previous.config));
  return nilaza_private.ai_persona_model_tiers_json(result) || jsonb_build_object('archivedVersion', previous.version);
end;
$$;

comment on function public.save_ai_persona_model_tiers_draft(jsonb,text) is 'Saves the single draft of the persona chat model tiers. Allowed for ai.manage or ai.read+content.draft (editors); publishing stays ai.manage only. Audited as ai.persona_model_tiers.draft.';
comment on function public.publish_ai_persona_model_tiers(integer,text) is 'Publishes the persona model tiers draft and archives the previous active version. ai.manage only; note 10-500 characters. Audited as ai.persona_model_tiers.publish.';

revoke all on function nilaza_private.ai_persona_model_tiers_spec(), nilaza_private.ai_persona_tier_number_ok(jsonb,text,boolean),
  nilaza_private.ai_persona_tier_keys_ok(jsonb,text[]), nilaza_private.ai_persona_tier_text_ok(jsonb,text),
  nilaza_private.ai_persona_model_tiers_errors(jsonb), nilaza_private.ai_persona_model_tiers_json(public.ai_persona_model_tiers)
  from public, anon, authenticated;
revoke all on function public.get_ai_persona_model_tiers(), public.save_ai_persona_model_tiers_draft(jsonb,text),
  public.publish_ai_persona_model_tiers(integer,text) from public, anon, authenticated;
grant execute on function public.get_ai_persona_model_tiers(), public.save_ai_persona_model_tiers_draft(jsonb,text),
  public.publish_ai_persona_model_tiers(integer,text) to authenticated;

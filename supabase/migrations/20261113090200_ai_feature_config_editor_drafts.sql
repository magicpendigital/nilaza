-- Owner decision 13/11/2026 (spec ADMIN_SCREENS_SPEC_2026-11-04 section 5 row 6): editors save AI feature config
-- drafts; only ai.manage publishes. Editors hold content.read, content.draft and ai.read (has_capability,
-- 20260902131408), so saving a draft is allowed for ai.manage OR (ai.read AND content.draft). Role effect today:
-- owner and admin already had ai.manage; editor gains draft saving; safety_reviewer (ai.read without content.draft)
-- still cannot save. publish_ai_feature_config is not touched and stays ai.manage only, so a draft never reaches
-- users until an ai.manage account reviews and publishes it.
-- Everything except the permission line is identical to 20261113090100: validation, advisory lock, single draft
-- per feature, audit row (admin_user_id is the saving account), security definer, empty search_path, grants.

-- Creates or replaces the single draft of a feature. payload describes the whole draft: a missing or null field
-- means "use the code default". Allowed keys: quotaDaily, quotaGroup, followUps (ai_council only), deadlineMs,
-- costCapMicro, copy, note. Unknown keys are refused so an Admin typo cannot be silently ignored.
-- Needs ai.manage, or ai.read plus content.draft (editor).
create or replace function public.save_ai_feature_config_draft(feature_input text, payload jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  actor uuid := auth.uid();
  result public.ai_feature_configs;
  v_quota integer; v_group text; v_follow integer; v_deadline integer; v_cost bigint; v_copy jsonb; v_note text;
  next_version integer;
begin
  if actor is null or not (nilaza_private.has_capability('ai.manage')
    or (nilaza_private.has_capability('ai.read') and nilaza_private.has_capability('content.draft'))) then
    raise exception 'Not authorized' using errcode='42501';
  end if;
  if feature_input is null or feature_input not in ('persona_chat','oracle_router','tarot_reading','daily_insight','astrology_insight','ai_council')
    or payload is null or jsonb_typeof(payload) <> 'object'
    or exists (select 1 from jsonb_object_keys(payload) k where k not in ('quotaDaily','quotaGroup','followUps','deadlineMs','costCapMicro','copy','note')) then
    raise exception 'invalid_feature_config' using errcode='22023';
  end if;
  v_quota := nilaza_private.ai_feature_config_int(payload -> 'quotaDaily', 1, 100);
  v_follow := nilaza_private.ai_feature_config_int(payload -> 'followUps', 0, 10);
  v_deadline := nilaza_private.ai_feature_config_int(payload -> 'deadlineMs', 5000, 140000);
  v_cost := nilaza_private.ai_feature_config_int(payload -> 'costCapMicro', 1, 1000000);
  v_copy := nilaza_private.ai_feature_config_copy(payload -> 'copy');
  if v_follow is not null and feature_input <> 'ai_council' then raise exception 'invalid_feature_config' using errcode='22023'; end if;
  if payload ? 'quotaGroup' and jsonb_typeof(payload -> 'quotaGroup') <> 'null' then
    if jsonb_typeof(payload -> 'quotaGroup') <> 'string' or (payload ->> 'quotaGroup') !~ '^[a-z][a-z0-9_]{2,39}$' then
      raise exception 'invalid_feature_config' using errcode='22023';
    end if;
    v_group := payload ->> 'quotaGroup';
  end if;
  if payload ? 'note' and jsonb_typeof(payload -> 'note') <> 'null' then
    if jsonb_typeof(payload -> 'note') <> 'string' or char_length(btrim(payload ->> 'note')) > 500 then
      raise exception 'invalid_feature_config' using errcode='22023';
    end if;
    v_note := nullif(btrim(payload ->> 'note'), '');
  end if;

  perform pg_advisory_xact_lock(hashtext('ai_feature_configs:' || feature_input)::bigint);
  update public.ai_feature_configs set quota_daily=v_quota, quota_group=v_group, follow_ups=v_follow, deadline_ms=v_deadline,
      cost_cap_micro=v_cost, copy=v_copy, note=v_note, created_by=actor, updated_at=now()
    where feature=feature_input and status='draft' returning * into result;
  if not found then
    select coalesce(max(version), 0) + 1 into next_version from public.ai_feature_configs where feature=feature_input;
    insert into public.ai_feature_configs(feature, version, status, quota_daily, quota_group, follow_ups, deadline_ms, cost_cap_micro, copy, note, created_by)
      values(feature_input, next_version, 'draft', v_quota, v_group, v_follow, v_deadline, v_cost, v_copy, v_note, actor)
      returning * into result;
  end if;
  insert into public.admin_audit_logs(admin_user_id,action,target_table,target_id,metadata)
    values(actor,'ai.feature_config.draft','ai_feature_configs',result.id,
      jsonb_build_object('feature',result.feature,'version',result.version,'quotaDaily',result.quota_daily,'followUps',result.follow_ups,
        'deadlineMs',result.deadline_ms,'costCapMicro',result.cost_cap_micro));
  return nilaza_private.ai_feature_config_json(result);
end;
$$;

comment on function public.save_ai_feature_config_draft(text,jsonb) is 'Saves the single draft of an AI feature config. Allowed for ai.manage or ai.read+content.draft (editors); publishing stays ai.manage only. Audited as ai.feature_config.draft.';

revoke all on function public.save_ai_feature_config_draft(text,jsonb) from public, anon, authenticated;
grant execute on function public.save_ai_feature_config_draft(text,jsonb) to authenticated;

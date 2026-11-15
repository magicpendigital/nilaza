-- Admin redesign A4 (spec ADMIN_SCREENS_SPEC_2026-11-04, row D1): Oracle AI (ai-oracle-turn, route oracle_router)
-- gets its own emergency on/off switch next to the six from 20261031100000 and 20261111090000.
-- Edge Functions treat a missing row as on, so this only widens the allowed names and adds an enabled row.
-- Oracle keeps honouring the guide chat switch (persona_chat) as well; either one off pauses Oracle.
alter table public.ai_feature_switches drop constraint if exists ai_feature_switches_feature_check;
alter table public.ai_feature_switches add constraint ai_feature_switches_feature_check
  check (feature in ('ai_council','persona_chat','astrology_insight','tarot_reading','daily_insight','astrology_report','oracle_router'));
insert into public.ai_feature_switches(feature) values ('oracle_router')
  on conflict (feature) do nothing;

create or replace function public.set_ai_feature_switch(feature_input text, enabled_input boolean, reason_input text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare actor uuid := auth.uid(); result public.ai_feature_switches; clean_reason text := btrim(coalesce(reason_input,''));
begin
  if actor is null or not nilaza_private.has_capability('ai.manage') then raise exception 'Not authorized' using errcode='42501'; end if;
  if feature_input is null
    or feature_input not in ('ai_council','persona_chat','astrology_insight','tarot_reading','daily_insight','astrology_report','oracle_router')
    or enabled_input is null
    or char_length(clean_reason) not between 3 and 200 then
    raise exception 'invalid_feature_switch' using errcode='22023';
  end if;
  update public.ai_feature_switches set enabled=enabled_input, reason=clean_reason, updated_by=actor, updated_at=now()
    where feature=feature_input returning * into result;
  if not found then raise exception 'invalid_feature_switch' using errcode='22023'; end if;
  insert into public.admin_audit_logs(admin_user_id,action,target_table,target_id,metadata)
    values(actor,'ai.feature_switch','ai_feature_switches',null,jsonb_build_object('feature',feature_input,'enabled',enabled_input,'reason',clean_reason));
  return jsonb_build_object('feature',result.feature,'enabled',result.enabled,'reason',result.reason,'updatedAt',result.updated_at);
end;
$$;

revoke all on function public.set_ai_feature_switch(text,boolean,text) from public, anon, authenticated;
grant execute on function public.set_ai_feature_switch(text,boolean,text) to authenticated;

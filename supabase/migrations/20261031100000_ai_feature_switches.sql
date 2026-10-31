-- Owner decision 2026-10-31 (analysis CO-01, AD-10): emergency on/off switches for AI features.
-- Edge Functions read the row for their feature after sign-in and answer 503 feature_paused when it
-- is off. A missing row or table counts as on, so this migration can ship with the Singapore packet.
-- Changes go only through set_ai_feature_switch, which needs ai.manage, a reason and writes the audit log.
create table public.ai_feature_switches (
  feature text primary key check (feature in ('ai_council','persona_chat','astrology_insight')),
  enabled boolean not null default true,
  reason text check (reason is null or char_length(reason) between 3 and 200),
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);
alter table public.ai_feature_switches enable row level security;
-- Signed-in requests read only the on/off state of a feature; no user data lives here.
create policy ai_feature_switches_read on public.ai_feature_switches for select to authenticated using (true);
revoke all on public.ai_feature_switches from anon, authenticated;
grant select on public.ai_feature_switches to authenticated;
insert into public.ai_feature_switches(feature) values ('ai_council'), ('persona_chat'), ('astrology_insight');

create function public.get_ai_feature_switches() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  if not nilaza_private.has_capability('ai.read') then raise exception 'Not authorized' using errcode='42501'; end if;
  return coalesce((select jsonb_agg(jsonb_build_object('feature',feature,'enabled',enabled,'reason',reason,'updatedAt',updated_at) order by feature)
    from public.ai_feature_switches),'[]'::jsonb);
end;
$$;

create function public.set_ai_feature_switch(feature_input text, enabled_input boolean, reason_input text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare actor uuid := auth.uid(); result public.ai_feature_switches; clean_reason text := btrim(coalesce(reason_input,''));
begin
  if actor is null or not nilaza_private.has_capability('ai.manage') then raise exception 'Not authorized' using errcode='42501'; end if;
  if feature_input is null or feature_input not in ('ai_council','persona_chat','astrology_insight') or enabled_input is null
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

revoke all on function public.get_ai_feature_switches(), public.set_ai_feature_switch(text,boolean,text) from public, anon, authenticated;
grant execute on function public.get_ai_feature_switches(), public.set_ai_feature_switch(text,boolean,text) to authenticated;
comment on table public.ai_feature_switches is 'Emergency on/off per AI feature. Read by Edge Functions; written only by set_ai_feature_switch (ai.manage, audited).';

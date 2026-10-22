-- Unapplied QA contract. Campaign remains disabled until separately reviewed activation.
begin;
create table nilaza_private.ai_budget_campaigns (
 id text primary key, policy_version text not null,
 status text not null default 'disabled' check (status in ('disabled','active','paused')),
 starts_at timestamptz, ends_at timestamptz,
 daily_cap_micro bigint not null check (daily_cap_micro between 0 and 5000000),
 total_cap_micro bigint not null check (total_cap_micro between 0 and 50000000),
 eval_cap_micro bigint not null check (eval_cap_micro between 0 and 10000000),
 chat_daily int not null check (chat_daily between 0 and 5),
 tarot_daily int not null check (tarot_daily between 0 and 1),
 used_micro bigint not null default 0 check (used_micro>=0),
 reserved_micro bigint not null default 0 check (reserved_micro>=0),
 eval_used_micro bigint not null default 0 check (eval_used_micro>=0),
 eval_reserved_micro bigint not null default 0 check (eval_reserved_micro>=0),
 overrun_micro bigint not null default 0 check (overrun_micro>=0),
 check (used_micro+reserved_micro<=total_cap_micro),
 check (eval_used_micro+eval_reserved_micro<=eval_cap_micro),
 check ((starts_at is null and ends_at is null) or
   (starts_at is not null and ends_at is not null and ends_at>starts_at and ends_at<=starts_at+interval '14 days')),
 check (status<>'active' or (starts_at is not null and ends_at is not null))
);
create table nilaza_private.ai_budget_days (
 campaign_id text references nilaza_private.ai_budget_campaigns not null,
 usage_day date not null, used_micro bigint not null default 0 check (used_micro>=0),
 reserved_micro bigint not null default 0 check (reserved_micro>=0),
 overrun_micro bigint not null default 0 check (overrun_micro>=0), primary key(campaign_id,usage_day)
);
create table nilaza_private.ai_quota_days (
 user_id uuid references auth.users on delete cascade not null, usage_day date not null,
 quota_group text not null check (quota_group in ('chat_oracle','tarot_one')),
 used_count int not null default 0 check (used_count>=0),
 reserved_count int not null default 0 check (reserved_count>=0), primary key(user_id,usage_day,quota_group)
);
create table nilaza_private.ai_usage_operations (
 id uuid primary key, campaign_id text references nilaza_private.ai_budget_campaigns not null,
 user_id uuid references auth.users on delete set null,
 feature text not null check(feature in ('persona_chat','oracle_router','tarot_reading')),
 audience text not null check(audience in ('pilot','evaluation')),
 policy_version text not null, request_digest text not null check(request_digest ~ '^[0-9a-f]{64}$'),
 worker_lease uuid not null, usage_day date not null, quota_group text not null,
 attempt_bounds bigint[] not null check(cardinality(attempt_bounds) between 1 and 2),
 max_micro bigint not null check(max_micro between 0 and 100000),
 status text not null default 'reserved' check(status in
   ('reserved','inflight','completed','failed','completed_pending_cost','failed_pending_cost')),
 dispatch_count int not null default 0 check(dispatch_count>=0 and dispatch_count<=cardinality(attempt_bounds)),
 result_id uuid, quota_held boolean not null,
 created_at timestamptz not null default clock_timestamp(), finalized_at timestamptz
);
create table nilaza_private.ai_usage_attempts (
 operation_id uuid references nilaza_private.ai_usage_operations not null,
 attempt int not null check(attempt between 1 and 2), bound_micro bigint not null check(bound_micro>=0),
 status text not null check(status in ('inflight','known','unknown')),
 cost_micro bigint, reported_micro bigint check(reported_micro>=0), succeeded boolean, primary key(operation_id,attempt),
 check(cost_micro is null or cost_micro between 0 and bound_micro),
 check(status<>'known' or cost_micro is not null), check(status<>'unknown' or cost_micro is null)
);
insert into nilaza_private.ai_budget_campaigns
 (id,policy_version,daily_cap_micro,total_cap_micro,eval_cap_micro,chat_daily,tarot_daily)
 values ('qa-g1','g1-2026-10-02',5000000,50000000,10000000,5,1);

create function public.nilaza_ai_usage_reserve(
 p_id uuid,p_user_id uuid,p_feature text,p_audience text,p_digest text,p_lease uuid,
 p_attempt_bounds bigint[],p_campaign text,p_policy text,p_tarot_cards int default null
) returns jsonb language plpgsql security invoker set search_path='' as $$
declare c nilaza_private.ai_budget_campaigns; o nilaza_private.ai_usage_operations;
 d nilaza_private.ai_budget_days; q nilaza_private.ai_quota_days;
 amount bigint; day date; moment timestamptz; grp text; cap int;
begin
 if p_id is null or p_user_id is null or p_lease is null or p_feature is null or p_audience is null
  or p_digest is null or p_policy is null or p_campaign is null or p_attempt_bounds is null
  or p_feature not in ('persona_chat','oracle_router','tarot_reading')
  or p_audience not in ('pilot','evaluation') or p_digest !~ '^[0-9a-f]{64}$'
  or cardinality(p_attempt_bounds) not between 1 and 2 or array_ndims(p_attempt_bounds)<>1
  or array_lower(p_attempt_bounds,1)<>1
  or exists(select 1 from unnest(p_attempt_bounds) b where b is null or b<0 or b>100000)
  or (p_feature='tarot_reading' and p_tarot_cards is distinct from 1) then
  return jsonb_build_object('status','blocked','code','invalid_spec'); end if;
 select sum(b) into amount from unnest(p_attempt_bounds) b;
 if amount>100000 then return jsonb_build_object('status','blocked','code','invalid_spec'); end if;
 select * into c from nilaza_private.ai_budget_campaigns where id=p_campaign for update;
 if not found then return jsonb_build_object('status','blocked','code','usage_unavailable'); end if;
 select * into o from nilaza_private.ai_usage_operations where id=p_id for update;
 if found then
  if o.user_id is distinct from p_user_id or o.campaign_id is distinct from p_campaign
   or o.feature is distinct from p_feature or o.audience is distinct from p_audience
   or o.policy_version is distinct from p_policy or o.request_digest is distinct from p_digest
   or o.attempt_bounds is distinct from p_attempt_bounds then
   return jsonb_build_object('status','blocked','code','request_conflict'); end if;
  if o.status in ('completed','completed_pending_cost') then
   return jsonb_build_object('status','replay','resultId',o.result_id); end if;
  return jsonb_build_object('status',case when o.status in ('failed','failed_pending_cost') then 'failed' else 'busy' end);
 end if;
 moment:=clock_timestamp(); day:=(moment at time zone 'Asia/Ho_Chi_Minh')::date;
 if c.status<>'active' or c.policy_version is distinct from p_policy
  or moment<c.starts_at or moment>=c.ends_at then
  return jsonb_build_object('status','blocked','code','campaign_inactive'); end if;
 if not exists(select 1 from auth.users where id=p_user_id) then
  return jsonb_build_object('status','blocked','code','invalid_user'); end if;
 if p_audience='evaluation' and not exists(select 1 from public.admin_role_assignments
  where user_id=p_user_id and role in ('owner','admin') and status='active') then
  return jsonb_build_object('status','blocked','code','evaluation_forbidden'); end if;
 grp:=case when p_feature='tarot_reading' then 'tarot_one' else 'chat_oracle' end;
 cap:=case when p_feature='tarot_reading' then c.tarot_daily else c.chat_daily end;
 insert into nilaza_private.ai_budget_days(campaign_id,usage_day) values(p_campaign,day) on conflict do nothing;
 select * into d from nilaza_private.ai_budget_days where campaign_id=p_campaign and usage_day=day for update;
 if c.used_micro+c.reserved_micro>=c.total_cap_micro or c.used_micro+c.reserved_micro+amount>c.total_cap_micro
  or d.used_micro+d.reserved_micro>=c.daily_cap_micro or d.used_micro+d.reserved_micro+amount>c.daily_cap_micro
  or (p_audience='evaluation' and (c.eval_used_micro+c.eval_reserved_micro>=c.eval_cap_micro
   or c.eval_used_micro+c.eval_reserved_micro+amount>c.eval_cap_micro)) then
  return jsonb_build_object('status','blocked','code','qa_budget_exhausted'); end if;
 if p_audience='pilot' then
  insert into nilaza_private.ai_quota_days(user_id,usage_day,quota_group) values(p_user_id,day,grp) on conflict do nothing;
  select * into q from nilaza_private.ai_quota_days where user_id=p_user_id and usage_day=day and quota_group=grp for update;
  if q.used_count+q.reserved_count>=cap then
   return jsonb_build_object('status','blocked','code','daily_quota_exhausted'); end if;
  update nilaza_private.ai_quota_days set reserved_count=reserved_count+1
   where user_id=p_user_id and usage_day=day and quota_group=grp;
 end if;
 update nilaza_private.ai_budget_campaigns set reserved_micro=reserved_micro+amount,
  eval_reserved_micro=eval_reserved_micro+case when p_audience='evaluation' then amount else 0 end where id=p_campaign;
 update nilaza_private.ai_budget_days set reserved_micro=reserved_micro+amount where campaign_id=p_campaign and usage_day=day;
 insert into nilaza_private.ai_usage_operations
  (id,campaign_id,user_id,feature,audience,policy_version,request_digest,worker_lease,usage_day,quota_group,attempt_bounds,max_micro,quota_held)
  values(p_id,p_campaign,p_user_id,p_feature,p_audience,p_policy,p_digest,p_lease,day,grp,p_attempt_bounds,amount,p_audience='pilot');
 return jsonb_build_object('status','created');
end $$;

create function public.nilaza_ai_usage_claim(p_id uuid,p_lease uuid,p_attempt int)
 returns jsonb language plpgsql security invoker set search_path='' as $$
declare o nilaza_private.ai_usage_operations; c nilaza_private.ai_budget_campaigns; moment timestamptz;
begin
 select * into o from nilaza_private.ai_usage_operations where id=p_id;
 if not found then return jsonb_build_object('ok',false,'code','claim_denied'); end if;
 select * into c from nilaza_private.ai_budget_campaigns where id=o.campaign_id for update;
 select * into o from nilaza_private.ai_usage_operations where id=p_id for update;
 if o.worker_lease is distinct from p_lease or o.user_id is null or o.status not in ('reserved','inflight')
  or p_attempt is null or p_attempt<>o.dispatch_count+1 or p_attempt>cardinality(o.attempt_bounds)
  or exists(select 1 from nilaza_private.ai_usage_attempts where operation_id=p_id and (status='inflight' or succeeded=true)) then
  return jsonb_build_object('ok',false,'code','claim_denied'); end if;
 moment:=clock_timestamp();
 if c.status<>'active' or moment<c.starts_at or moment>=c.ends_at
  or (moment at time zone 'Asia/Ho_Chi_Minh')::date<>o.usage_day
  or (o.audience='evaluation' and not exists(select 1 from public.admin_role_assignments
   where user_id=o.user_id and role in ('owner','admin') and status='active')) then
  return jsonb_build_object('ok',false,'code','claim_denied'); end if;
 update nilaza_private.ai_usage_operations set status='inflight',dispatch_count=p_attempt where id=p_id;
 insert into nilaza_private.ai_usage_attempts(operation_id,attempt,bound_micro,status)
  values(p_id,p_attempt,o.attempt_bounds[p_attempt],'inflight');
 return jsonb_build_object('ok',true);
end $$;

create function public.nilaza_ai_usage_receipt(p_id uuid,p_lease uuid,p_attempt int,p_cost_micro bigint,p_succeeded boolean)
 returns jsonb language plpgsql security invoker set search_path='' as $$
declare o nilaza_private.ai_usage_operations; a nilaza_private.ai_usage_attempts;
begin
 select * into o from nilaza_private.ai_usage_operations where id=p_id;
 if not found then return jsonb_build_object('ok',false); end if;
 perform 1 from nilaza_private.ai_budget_campaigns where id=o.campaign_id for update;
 select * into o from nilaza_private.ai_usage_operations where id=p_id for update;
 if o.worker_lease is distinct from p_lease or o.status<>'inflight' or p_succeeded is null then
  return jsonb_build_object('ok',false); end if;
 select * into a from nilaza_private.ai_usage_attempts where operation_id=p_id and attempt=p_attempt for update;
 if not found or (p_cost_micro is not null and p_cost_micro<0) then
  return jsonb_build_object('ok',false); end if;
 if a.status<>'inflight' then return jsonb_build_object('ok',
  a.reported_micro is not distinct from p_cost_micro and a.succeeded is not distinct from p_succeeded); end if;
 update nilaza_private.ai_usage_attempts set status=case when p_cost_micro is null then 'unknown' else 'known' end,
  cost_micro=case when p_cost_micro is null then null else least(p_cost_micro,a.bound_micro) end,
  reported_micro=p_cost_micro,succeeded=p_succeeded where operation_id=p_id and attempt=p_attempt;
 -- Preserve the authoritative billed excess and pause immediately, rather than hiding it behind a rejected receipt.
 if p_cost_micro>a.bound_micro then
  update nilaza_private.ai_budget_campaigns set status='paused',overrun_micro=overrun_micro+p_cost_micro-a.bound_micro where id=o.campaign_id;
  update nilaza_private.ai_budget_days set overrun_micro=overrun_micro+p_cost_micro-a.bound_micro
   where campaign_id=o.campaign_id and usage_day=o.usage_day;
 end if;
 return jsonb_build_object('ok',true);
end $$;

create function public.nilaza_ai_usage_finish(p_id uuid,p_lease uuid,p_success_saved boolean,p_result_id uuid default null)
 returns jsonb language plpgsql security invoker set search_path='' as $$
declare o nilaza_private.ai_usage_operations; known bigint; held bigint; reported bigint; final text; owned boolean;
begin
 select * into o from nilaza_private.ai_usage_operations where id=p_id;
 if not found then return jsonb_build_object('ok',false); end if;
 perform 1 from nilaza_private.ai_budget_campaigns where id=o.campaign_id for update;
 select * into o from nilaza_private.ai_usage_operations where id=p_id for update;
 if o.worker_lease is distinct from p_lease or p_success_saved is null then return jsonb_build_object('ok',false); end if;
 if o.status not in ('reserved','inflight') then return jsonb_build_object('ok',
  (o.status in ('completed','completed_pending_cost'))=p_success_saved and o.result_id is not distinct from p_result_id,'status',o.status); end if;
 if p_success_saved then
  owned:=case o.feature
   when 'tarot_reading' then exists(select 1 from public.tarot_readings where id=p_result_id and user_id=o.user_id and status='completed')
   when 'persona_chat' then exists(select 1 from public.chat_messages where id=p_result_id and user_id=o.user_id and role='guide')
   when 'oracle_router' then exists(select 1 from public.usage_events where id=p_result_id and user_id=o.user_id and feature='oracle_router') end;
  if not owned or not exists(select 1 from nilaza_private.ai_usage_attempts where operation_id=p_id and succeeded=true) then
   return jsonb_build_object('ok',false,'code','result_not_saved'); end if;
 elsif p_result_id is not null then return jsonb_build_object('ok',false); end if;
 select coalesce(sum(cost_micro) filter(where status='known'),0),
  coalesce(sum(bound_micro) filter(where status in ('inflight','unknown')),0) into known,held
  from nilaza_private.ai_usage_attempts where operation_id=p_id;
 select coalesce(sum(reported_micro) filter(where status='known'),0) into reported
  from nilaza_private.ai_usage_attempts where operation_id=p_id;
 update nilaza_private.ai_budget_campaigns set reserved_micro=reserved_micro-o.max_micro+held,used_micro=used_micro+known,
  eval_reserved_micro=eval_reserved_micro-case when o.audience='evaluation' then o.max_micro-held else 0 end,
  eval_used_micro=eval_used_micro+case when o.audience='evaluation' then known else 0 end where id=o.campaign_id;
 update nilaza_private.ai_budget_days set reserved_micro=reserved_micro-o.max_micro+held,used_micro=used_micro+known
  where campaign_id=o.campaign_id and usage_day=o.usage_day;
 if o.quota_held and o.user_id is not null then
  update nilaza_private.ai_quota_days set reserved_count=reserved_count-1,used_count=used_count+case when p_success_saved then 1 else 0 end
   where user_id=o.user_id and usage_day=o.usage_day and quota_group=o.quota_group;
 end if;
 final:=case when p_success_saved then 'completed' else 'failed' end;
 if exists(select 1 from nilaza_private.ai_usage_attempts where operation_id=p_id and status in ('unknown','inflight')) then final:=final||'_pending_cost'; end if;
 update nilaza_private.ai_usage_operations set status=final,result_id=p_result_id,quota_held=false,finalized_at=clock_timestamp() where id=p_id;
 return jsonb_build_object('ok',true,'status',final,'knownMicro',known,'reportedKnownMicro',reported,'overrunMicro',reported-known,'heldMicro',held);
end $$;

alter table nilaza_private.ai_budget_campaigns enable row level security;
alter table nilaza_private.ai_budget_campaigns force row level security;
alter table nilaza_private.ai_budget_days enable row level security;
alter table nilaza_private.ai_budget_days force row level security;
alter table nilaza_private.ai_quota_days enable row level security;
alter table nilaza_private.ai_quota_days force row level security;
alter table nilaza_private.ai_usage_operations enable row level security;
alter table nilaza_private.ai_usage_operations force row level security;
alter table nilaza_private.ai_usage_attempts enable row level security;
alter table nilaza_private.ai_usage_attempts force row level security;
revoke all on table nilaza_private.ai_budget_campaigns,nilaza_private.ai_budget_days,nilaza_private.ai_quota_days,
 nilaza_private.ai_usage_operations,nilaza_private.ai_usage_attempts from public,anon,authenticated;
grant usage on schema nilaza_private,auth to service_role;
grant select on auth.users,public.admin_role_assignments,public.tarot_readings,public.chat_messages,public.usage_events to service_role;
grant select,insert,update on table nilaza_private.ai_budget_campaigns,nilaza_private.ai_budget_days,nilaza_private.ai_quota_days,
 nilaza_private.ai_usage_operations,nilaza_private.ai_usage_attempts to service_role;
revoke all on function public.nilaza_ai_usage_reserve(uuid,uuid,text,text,text,uuid,bigint[],text,text,int),
 public.nilaza_ai_usage_claim(uuid,uuid,int),public.nilaza_ai_usage_receipt(uuid,uuid,int,bigint,boolean),
 public.nilaza_ai_usage_finish(uuid,uuid,boolean,uuid) from public,anon,authenticated;
grant execute on function public.nilaza_ai_usage_reserve(uuid,uuid,text,text,text,uuid,bigint[],text,text,int),
 public.nilaza_ai_usage_claim(uuid,uuid,int),public.nilaza_ai_usage_receipt(uuid,uuid,int,bigint,boolean),
 public.nilaza_ai_usage_finish(uuid,uuid,boolean,uuid) to service_role;
commit;

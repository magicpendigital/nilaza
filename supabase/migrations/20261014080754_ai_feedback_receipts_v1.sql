-- Local forward candidate only. No cloud activation or cron installation.
-- Feedback contains fixed categories and bounded IDs only, never excerpts/notes.
create table nilaza_private.ai_answer_receipts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  feature text not null check (feature in ('tarot_reading','astrology_insight')),
  attempt_id text not null,
  metadata jsonb not null,
  section_ids text[] not null default '{}',
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '30 days'),
  unique(user_id, feature, attempt_id)
);
create index ai_answer_receipts_expiry on nilaza_private.ai_answer_receipts(expires_at);
create table nilaza_private.ai_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  client_feedback_id uuid not null,
  answer_receipt_id uuid references nilaza_private.ai_answer_receipts(id) on delete set null,
  submission jsonb not null,
  correlation_status text not null check(correlation_status in ('verified_server','unverified_client')),
  status text not null default 'open' check(status in ('open','investigating','resolved','dismissed')),
  revision integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '30 days'),
  unique(user_id, client_feedback_id)
);
create index ai_feedback_owner_created on nilaza_private.ai_feedback(user_id,created_at);
create index ai_feedback_inbox on nilaza_private.ai_feedback(status,created_at desc);
create index ai_feedback_expiry on nilaza_private.ai_feedback(expires_at);
alter table nilaza_private.ai_answer_receipts enable row level security;
alter table nilaza_private.ai_answer_receipts force row level security;
alter table nilaza_private.ai_feedback enable row level security;
alter table nilaza_private.ai_feedback force row level security;
revoke all on nilaza_private.ai_answer_receipts, nilaza_private.ai_feedback from public, anon, authenticated, service_role;
grant usage on schema nilaza_private to service_role;
grant select, insert, delete on nilaza_private.ai_answer_receipts to service_role;
grant select, delete on nilaza_private.ai_feedback to service_role;

create function nilaza_private.feedback_user() returns uuid
language plpgsql stable security definer set search_path = '' as $$
declare owner_id uuid := auth.uid();
begin
  if owner_id is null or not exists(select 1 from auth.users where id=owner_id and is_anonymous=false) then
    raise exception 'authentication_required' using errcode='42501';
  end if;
  return owner_id;
end;
$$;

create function public.record_ai_answer_receipt(owner_id uuid, metadata_input jsonb, section_ids_input text[] default '{}') returns jsonb
language plpgsql security invoker set search_path = '' as $$
declare row_value nilaza_private.ai_answer_receipts; entry record;
begin
  if owner_id is null or jsonb_typeof(metadata_input) is distinct from 'object'
    or octet_length(metadata_input::text)>8192 or coalesce(cardinality(section_ids_input),0)>64
    or metadata_input->>'feature' not in ('tarot_reading','astrology_insight')
    or metadata_input->>'locale' not in ('vi','en')
    or metadata_input->>'sourceKind' not in ('ai','reference','fallback','blocked','mock')
    or metadata_input->>'validationStatus' not in ('validated','rejected','not_applicable','unknown')
    or metadata_input->>'persistenceStatus' not in ('stored','failed','skipped','unknown')
    or not metadata_input ?& array['feature','locale','sourceKind','validationStatus','persistenceStatus','interactionId','attemptId','clientRequestId']
    or (metadata_input->>'sourceKind'='ai' and metadata_input->>'validationStatus'<>'validated') then
    raise exception 'invalid_answer_receipt' using errcode='22023';
  end if;
  for entry in select key,value from jsonb_each(metadata_input) loop
    if entry.key not in ('feature','locale','sourceKind','validationStatus','persistenceStatus','interactionId','attemptId','clientRequestId','remoteId','traceId','providerRequestId','promptVersionId','promptVersion','routeVersionId','routeVersion','responseSchema','contentVersion','calculationVersion','chartContractVersion','reportRevision','promptAssemblyVersion') then
      raise exception 'invalid_answer_receipt' using errcode='22023';
    end if;
    if entry.key='reportRevision' then
      if jsonb_typeof(entry.value)<>'number' or entry.value::text !~ '^[1-9][0-9]{0,8}$' then raise exception 'invalid_answer_receipt' using errcode='22023'; end if;
    elsif jsonb_typeof(entry.value)<>'string' or length(entry.value#>>'{}')>128
      or not ((entry.value#>>'{}') ~ '^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$'
        or entry.key='promptVersionId' and (entry.value#>>'{}') ~ '^local:[A-Za-z0-9_.:-]+@[A-Za-z0-9_.:-]+$') then
      raise exception 'invalid_answer_receipt' using errcode='22023';
    end if;
  end loop;
  if exists(select 1 from unnest(section_ids_input) s where s is null or s !~ '^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$') then
    raise exception 'invalid_answer_receipt' using errcode='22023';
  end if;
  insert into nilaza_private.ai_answer_receipts(user_id,feature,attempt_id,metadata,section_ids)
    values(owner_id,metadata_input->>'feature',metadata_input->>'attemptId',metadata_input,coalesce(section_ids_input,'{}'))
    on conflict(user_id,feature,attempt_id) do nothing;
  select * into row_value from nilaza_private.ai_answer_receipts
    where user_id=owner_id and feature=metadata_input->>'feature' and attempt_id=metadata_input->>'attemptId';
  if row_value.metadata is distinct from metadata_input or row_value.section_ids is distinct from coalesce(section_ids_input,'{}') then
    raise exception 'answer_receipt_conflict' using errcode='23505';
  end if;
  return jsonb_build_object('receiptId',row_value.id,'createdAt',row_value.created_at);
end;
$$;
revoke all on function public.record_ai_answer_receipt(uuid,jsonb,text[]) from public,anon,authenticated;
grant execute on function public.record_ai_answer_receipt(uuid,jsonb,text[]) to service_role;

create function nilaza_private.submit_ai_feedback(payload jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare owner_id uuid := nilaza_private.feedback_user(); row_value nilaza_private.ai_feedback;
  receipt nilaza_private.ai_answer_receipts; client_id uuid; receipt_id uuid; linked boolean := false; entry record;
begin
  if jsonb_typeof(payload) is distinct from 'object' or octet_length(payload::text)>2048
    or not payload ?& array['schemaVersion','clientFeedbackId','feature','localAnswerId','category','language']
    or payload->>'schemaVersion' is distinct from 'ai-feedback-v1'
    or payload->>'feature' not in ('tarot_reading','astrology_insight')
    or payload->>'category' not in ('too_generic','incorrect_facts','unclear','inappropriate','language','technical')
    or payload->>'language' not in ('vi','en')
    or payload ? 'sourceKind' and payload->>'sourceKind' not in ('ai','reference','fallback','blocked','mock') then
    raise exception 'invalid_feedback' using errcode='22023';
  end if;
  for entry in select key,value from jsonb_each(payload) loop
    if entry.key not in ('schemaVersion','clientFeedbackId','feature','localAnswerId','answerReceiptId','sectionId','category','language','sourceKind')
      or jsonb_typeof(entry.value)<>'string' or (entry.value#>>'{}') !~ '^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$' then
      raise exception 'invalid_feedback' using errcode='22023';
    end if;
  end loop;
  if payload->>'clientFeedbackId' !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
    or payload ? 'answerReceiptId' and payload->>'answerReceiptId' !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then
    raise exception 'invalid_feedback' using errcode='22023';
  end if;
  client_id := (payload->>'clientFeedbackId')::uuid;
  -- Per-owner transaction lock makes limit/idempotency decisions atomic.
  perform pg_advisory_xact_lock(hashtextextended(owner_id::text,711));
  select * into row_value from nilaza_private.ai_feedback where user_id=owner_id and client_feedback_id=client_id;
  if found then
    if row_value.submission is distinct from payload then raise exception 'feedback_conflict' using errcode='23505'; end if;
    return jsonb_build_object('schemaVersion','ai-feedback-v1','clientFeedbackId',client_id,'feedbackId',row_value.id,'receivedAt',row_value.created_at,'correlationStatus',row_value.correlation_status);
  end if;
  if (select count(*) from nilaza_private.ai_feedback where user_id=owner_id and created_at>now()-interval '1 hour')>=20
    or (select count(*) from nilaza_private.ai_feedback where user_id=owner_id and created_at>now()-interval '1 day')>=100 then
    raise exception 'feedback_rate_limited' using errcode='P0001';
  end if;
  if payload ? 'answerReceiptId' then
    receipt_id := (payload->>'answerReceiptId')::uuid;
    select * into receipt from nilaza_private.ai_answer_receipts where id=receipt_id and user_id=owner_id
      and feature=payload->>'feature' and expires_at>now();
    if not found then raise exception 'answer_receipt_unavailable' using errcode='22023'; end if;
    if payload->>'localAnswerId' is distinct from receipt.metadata->>'clientRequestId'
      or payload->>'language' is distinct from receipt.metadata->>'locale' then
      raise exception 'answer_receipt_unavailable' using errcode='22023';
    end if;
    if payload ? 'sectionId' and not (payload->>'sectionId'=any(receipt.section_ids)) then raise exception 'invalid_feedback' using errcode='22023'; end if;
    linked := true;
  end if;
  insert into nilaza_private.ai_feedback(user_id,client_feedback_id,answer_receipt_id,submission,correlation_status)
    values(owner_id,client_id,receipt_id,payload,case when linked then 'verified_server' else 'unverified_client' end) returning * into row_value;
  return jsonb_build_object('schemaVersion','ai-feedback-v1','clientFeedbackId',client_id,'feedbackId',row_value.id,'receivedAt',row_value.created_at,'correlationStatus',row_value.correlation_status);
end;
$$;
create function public.submit_ai_feedback(payload jsonb) returns jsonb
language sql security invoker set search_path = '' as $$ select nilaza_private.submit_ai_feedback(payload); $$;

create function nilaza_private.get_ai_feedback_inbox(limit_count integer default 50, status_filter text default null, feature_filter text default null) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  perform nilaza_private.feedback_user();
  if not nilaza_private.has_capability('safety.review') then raise exception 'Not authorized' using errcode='42501'; end if;
  if status_filter is not null and status_filter not in ('open','investigating','resolved','dismissed')
    or feature_filter is not null and feature_filter not in ('tarot_reading','astrology_insight') then raise exception 'invalid_feedback' using errcode='22023'; end if;
  return coalesce((select jsonb_agg(q.value order by q.created_at desc) from (
    select f.created_at,jsonb_build_object('feedbackId',f.id,'receivedAt',f.created_at,'status',f.status,'revision',f.revision,
      'expiresAt',f.expires_at,'submitted',f.submission,'correlationStatus',f.correlation_status,
      'serverReceipt',case when r.id is not null and r.expires_at>now() then jsonb_build_object('receiptId',r.id,'createdAt',r.created_at,'metadata',r.metadata,'sectionIds',r.section_ids) else null end,
      'traceOrigin','unverified') as value
    from nilaza_private.ai_feedback f left join nilaza_private.ai_answer_receipts r on r.id=f.answer_receipt_id
    where f.expires_at>now() and (status_filter is null or f.status=status_filter)
      and (feature_filter is null or f.submission->>'feature'=feature_filter)
    order by f.created_at desc limit greatest(1,least(coalesce(limit_count,50),100))
  ) q),'[]'::jsonb);
end;
$$;
create function public.get_ai_feedback_inbox(limit_count integer default 50,status_filter text default null,feature_filter text default null) returns jsonb
language sql stable security invoker set search_path = '' as $$ select nilaza_private.get_ai_feedback_inbox(limit_count,status_filter,feature_filter); $$;

create function nilaza_private.review_ai_feedback(feedback_id_input uuid,expected_revision integer,next_status text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare reviewer uuid := nilaza_private.feedback_user(); result nilaza_private.ai_feedback;
begin
  if not nilaza_private.has_capability('safety.review') then raise exception 'Not authorized' using errcode='42501'; end if;
  if next_status is null or next_status not in ('open','investigating','resolved','dismissed') or expected_revision is null or expected_revision<1 then raise exception 'invalid_feedback' using errcode='22023'; end if;
  update nilaza_private.ai_feedback set status=next_status,revision=revision+1,updated_at=now()
    where id=feedback_id_input and revision=expected_revision and expires_at>now() returning * into result;
  if not found then raise exception 'feedback_review_conflict' using errcode='40001'; end if;
  insert into public.admin_audit_logs(admin_user_id,action,target_table,target_id,metadata)
    values(reviewer,'feedback.review','ai_feedback',feedback_id_input,jsonb_build_object('status',next_status,'revision',result.revision));
  return jsonb_build_object('feedbackId',result.id,'status',result.status,'revision',result.revision);
end;
$$;
create function public.review_ai_feedback(feedback_id_input uuid,expected_revision integer,next_status text) returns jsonb
language sql security invoker set search_path = '' as $$ select nilaza_private.review_ai_feedback(feedback_id_input,expected_revision,next_status); $$;

create function nilaza_private.export_own_ai_feedback() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare owner_id uuid := nilaza_private.feedback_user();
begin
  return coalesce((select jsonb_agg(submission || jsonb_build_object('feedbackId',id,'receivedAt',created_at,'correlationStatus',correlation_status,'status',status,'revision',revision) order by created_at)
    from nilaza_private.ai_feedback where user_id=owner_id and expires_at>now()),'[]'::jsonb);
end;
$$;
create function public.export_own_ai_feedback() returns jsonb
language sql stable security invoker set search_path = '' as $$ select nilaza_private.export_own_ai_feedback(); $$;
create function nilaza_private.delete_own_ai_feedback(feedback_id_input uuid default null) returns integer
language plpgsql security definer set search_path = '' as $$
declare owner_id uuid := nilaza_private.feedback_user(); deleted_count integer;
begin
  perform pg_advisory_xact_lock(hashtextextended(owner_id::text,711));
  delete from nilaza_private.ai_feedback where user_id=owner_id and (feedback_id_input is null or id=feedback_id_input);
  get diagnostics deleted_count = row_count;
  -- A full privacy deletion includes diagnostic receipts, even without feedback.
  -- Keep the return contract as the number of feedback items deleted.
  if feedback_id_input is null then
    delete from nilaza_private.ai_answer_receipts where user_id=owner_id;
  end if;
  return deleted_count;
end;
$$;
create function public.delete_own_ai_feedback(feedback_id_input uuid default null) returns integer
language sql security invoker set search_path = '' as $$ select nilaza_private.delete_own_ai_feedback(feedback_id_input); $$;

create function public.prune_ai_feedback_data() returns jsonb
language plpgsql security invoker set search_path = '' as $$
declare feedback_count integer; receipt_count integer;
begin
  delete from nilaza_private.ai_feedback where expires_at<=now(); get diagnostics feedback_count=row_count;
  delete from nilaza_private.ai_answer_receipts where expires_at<=now(); get diagnostics receipt_count=row_count;
  return jsonb_build_object('feedbackDeleted',feedback_count,'receiptsDeleted',receipt_count);
end;
$$;
revoke all on function public.prune_ai_feedback_data() from public,anon,authenticated;
grant execute on function public.prune_ai_feedback_data() to service_role;

revoke all on function nilaza_private.feedback_user(),nilaza_private.submit_ai_feedback(jsonb),public.submit_ai_feedback(jsonb),
 nilaza_private.get_ai_feedback_inbox(integer,text,text),public.get_ai_feedback_inbox(integer,text,text),
 nilaza_private.review_ai_feedback(uuid,integer,text),public.review_ai_feedback(uuid,integer,text),
 nilaza_private.export_own_ai_feedback(),public.export_own_ai_feedback(),
 nilaza_private.delete_own_ai_feedback(uuid),public.delete_own_ai_feedback(uuid) from public,anon,authenticated;
grant execute on function nilaza_private.feedback_user(),nilaza_private.submit_ai_feedback(jsonb),public.submit_ai_feedback(jsonb),
 nilaza_private.get_ai_feedback_inbox(integer,text,text),public.get_ai_feedback_inbox(integer,text,text),
 nilaza_private.review_ai_feedback(uuid,integer,text),public.review_ai_feedback(uuid,integer,text),
 nilaza_private.export_own_ai_feedback(),public.export_own_ai_feedback(),
 nilaza_private.delete_own_ai_feedback(uuid),public.delete_own_ai_feedback(uuid) to authenticated;
comment on table nilaza_private.ai_answer_receipts is 'Immutable server-only answer metadata. Does not attest to client-writable legacy trace payloads.';
comment on table nilaza_private.ai_feedback is 'User-submitted bounded enums and IDs only. No notes, excerpts, birth facts or raw generated text.';

-- Owner decision 2026-10-31 (analysis CH-02): the Báo cáo button in guide chat and AI Council
-- sends the same metadata-only feedback as Tarot and Astrology. Those answers have no server
-- receipt, so their feedback stays unverified_client. Only the allowed feature lists change;
-- answer receipts stay limited to tarot_reading and astrology_insight. Grants are kept by replace.

create or replace function nilaza_private.submit_ai_feedback(payload jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare owner_id uuid := nilaza_private.feedback_user(); row_value nilaza_private.ai_feedback;
  receipt nilaza_private.ai_answer_receipts; client_id uuid; receipt_id uuid; linked boolean := false; entry record;
begin
  if jsonb_typeof(payload) is distinct from 'object' or octet_length(payload::text)>2048
    or not payload ?& array['schemaVersion','clientFeedbackId','feature','localAnswerId','category','language']
    or payload->>'schemaVersion' is distinct from 'ai-feedback-v1'
    or payload->>'feature' not in ('tarot_reading','astrology_insight','persona_chat','ai_council')
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

create or replace function nilaza_private.get_ai_feedback_inbox(limit_count integer default 50, status_filter text default null, feature_filter text default null) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  perform nilaza_private.feedback_user();
  if not nilaza_private.has_capability('safety.review') then raise exception 'Not authorized' using errcode='42501'; end if;
  if status_filter is not null and status_filter not in ('open','investigating','resolved','dismissed')
    or feature_filter is not null and feature_filter not in ('tarot_reading','astrology_insight','persona_chat','ai_council') then raise exception 'invalid_feedback' using errcode='22023'; end if;
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

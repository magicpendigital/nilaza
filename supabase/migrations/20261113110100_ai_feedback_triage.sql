-- Admin redesign A6 (spec ADMIN_SCREENS_SPEC_2026-11-04 row D9 and §3.13): triage fields for user feedback on AI answers.
--   * nilaza_private.ai_feedback gains assignee_id (a staff account with safety.review), severity (safety / quality /
--     technical) and internal_note (staff text, 1000 characters, refused when it looks like an email or phone number).
--     Feedback stays metadata-only from the app and still expires after 30 days.
--   * The app may also report Daily insight answers (daily_insight); the inbox filter accepts it. Chat and Council were
--     added on 20261031090000. Everything else in submit_ai_feedback / get_ai_feedback_inbox is unchanged.
--   * review_ai_feedback_v2 sets status, severity, assignee and note together (safety.review, optimistic revision);
--     review_ai_feedback (v1) keeps working. list_ai_feedback_assignees lists safety.review staff without emails.
-- Needs 20261113110000 (nilaza_private.ai_eval_text_has_personal_data).

alter table nilaza_private.ai_feedback
  add column if not exists assignee_id uuid references auth.users(id) on delete set null,
  add column if not exists severity text check (severity is null or severity in ('safety','quality','technical')),
  add column if not exists internal_note text check (internal_note is null or char_length(internal_note) <= 1000);
comment on column nilaza_private.ai_feedback.internal_note is 'Staff-only triage note (no user text, no personal data); expires with the row after 30 days.';

create or replace function nilaza_private.submit_ai_feedback(payload jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare owner_id uuid := nilaza_private.feedback_user(); row_value nilaza_private.ai_feedback;
  receipt nilaza_private.ai_answer_receipts; client_id uuid; receipt_id uuid; linked boolean := false; entry record;
begin
  if jsonb_typeof(payload) is distinct from 'object' or octet_length(payload::text)>2048
    or not payload ?& array['schemaVersion','clientFeedbackId','feature','localAnswerId','category','language']
    or payload->>'schemaVersion' is distinct from 'ai-feedback-v1'
    or payload->>'feature' not in ('tarot_reading','astrology_insight','persona_chat','ai_council','daily_insight')
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

-- Same inbox as 20261031090000 plus the triage fields; daily_insight is a valid filter.
create or replace function nilaza_private.get_ai_feedback_inbox(limit_count integer default 50, status_filter text default null, feature_filter text default null) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare me uuid := nilaza_private.feedback_user();
begin
  if not nilaza_private.has_capability('safety.review') then raise exception 'Not authorized' using errcode='42501'; end if;
  if status_filter is not null and status_filter not in ('open','investigating','resolved','dismissed')
    or feature_filter is not null and feature_filter not in ('tarot_reading','astrology_insight','persona_chat','ai_council','daily_insight') then raise exception 'invalid_feedback' using errcode='22023'; end if;
  return coalesce((select jsonb_agg(q.value order by q.created_at desc) from (
    select f.created_at,jsonb_build_object('feedbackId',f.id,'receivedAt',f.created_at,'status',f.status,'revision',f.revision,
      'expiresAt',f.expires_at,'submitted',f.submission,'correlationStatus',f.correlation_status,
      'serverReceipt',case when r.id is not null and r.expires_at>now() then jsonb_build_object('receiptId',r.id,'createdAt',r.created_at,'metadata',r.metadata,'sectionIds',r.section_ids) else null end,
      'traceOrigin','unverified',
      'triage',jsonb_build_object('assigneeId',f.assignee_id,'assigneeIsMe',f.assignee_id is not null and f.assignee_id=me,
        'severity',f.severity,'internalNote',f.internal_note)) as value
    from nilaza_private.ai_feedback f left join nilaza_private.ai_answer_receipts r on r.id=f.answer_receipt_id
    where f.expires_at>now() and (status_filter is null or f.status=status_filter)
      and (feature_filter is null or f.submission->>'feature'=feature_filter)
    order by f.created_at desc limit greatest(1,least(coalesce(limit_count,50),100))
  ) q),'[]'::jsonb);
end;
$$;

-- Staff who may own a feedback item (safety.review holders: owner, admin, safety_reviewer). No email is returned.
create or replace function nilaza_private.list_ai_feedback_assignees() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare me uuid := nilaza_private.feedback_user();
begin
  if not nilaza_private.has_capability('safety.review') then raise exception 'Not authorized' using errcode='42501'; end if;
  return coalesce((select jsonb_agg(jsonb_build_object('userId',a.user_id,'roles',a.roles,'isMe',a.user_id=me) order by a.user_id<>me, a.user_id)
    from (select user_id, array_agg(role order by role) as roles from public.admin_role_assignments
      where status='active' and role in ('owner','admin','safety_reviewer') group by user_id) a),'[]'::jsonb);
end;
$$;
create or replace function public.list_ai_feedback_assignees() returns jsonb
language sql stable security invoker set search_path = '' as $$ select nilaza_private.list_ai_feedback_assignees(); $$;

-- Status, severity, assignee and internal note in one audited change. Every field is the new full value (null clears).
create or replace function nilaza_private.review_ai_feedback_v2(feedback_id_input uuid, expected_revision integer, next_status text,
  severity_input text, assignee_id_input uuid, internal_note_input text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare reviewer uuid := nilaza_private.feedback_user(); result nilaza_private.ai_feedback;
  clean_note text := nullif(btrim(coalesce(internal_note_input, '')), '');
begin
  if not nilaza_private.has_capability('safety.review') then raise exception 'Not authorized' using errcode='42501'; end if;
  if next_status is null or next_status not in ('open','investigating','resolved','dismissed') or expected_revision is null or expected_revision<1
    or (severity_input is not null and severity_input not in ('safety','quality','technical'))
    or char_length(coalesce(clean_note, '')) > 1000 or clean_note ~ '[\x01-\x08\x0b\x0c\x0e-\x1f]' then
    raise exception 'invalid_feedback' using errcode='22023';
  end if;
  if nilaza_private.ai_eval_text_has_personal_data(clean_note) then raise exception 'feedback_note_personal_data' using errcode='NZE05'; end if;
  if assignee_id_input is not null and not exists (select 1 from public.admin_role_assignments a where a.user_id=assignee_id_input
    and a.status='active' and a.role in ('owner','admin','safety_reviewer')) then
    raise exception 'invalid_feedback' using errcode='22023';
  end if;
  update nilaza_private.ai_feedback set status=next_status, severity=severity_input, assignee_id=assignee_id_input,
      internal_note=clean_note, revision=revision+1, updated_at=now()
    where id=feedback_id_input and revision=expected_revision and expires_at>now() returning * into result;
  if not found then raise exception 'feedback_review_conflict' using errcode='40001'; end if;
  insert into public.admin_audit_logs(admin_user_id,action,target_table,target_id,metadata)
    values(reviewer,'feedback.review','ai_feedback',feedback_id_input,jsonb_build_object('status',next_status,'revision',result.revision,
      'severity',result.severity,'assigned',result.assignee_id is not null,'noteCharacters',char_length(coalesce(result.internal_note,''))));
  return jsonb_build_object('feedbackId',result.id,'status',result.status,'revision',result.revision,
    'triage',jsonb_build_object('assigneeId',result.assignee_id,'assigneeIsMe',result.assignee_id is not null and result.assignee_id=reviewer,
      'severity',result.severity,'internalNote',result.internal_note));
end;
$$;
create or replace function public.review_ai_feedback_v2(feedback_id_input uuid, expected_revision integer, next_status text,
  severity_input text default null, assignee_id_input uuid default null, internal_note_input text default null) returns jsonb
language sql security invoker set search_path = '' as $$
  select nilaza_private.review_ai_feedback_v2(feedback_id_input, expected_revision, next_status, severity_input, assignee_id_input, internal_note_input);
$$;

revoke all on function nilaza_private.list_ai_feedback_assignees(), public.list_ai_feedback_assignees(),
  nilaza_private.review_ai_feedback_v2(uuid, integer, text, text, uuid, text), public.review_ai_feedback_v2(uuid, integer, text, text, uuid, text)
  from public, anon, authenticated;
grant execute on function nilaza_private.list_ai_feedback_assignees(), public.list_ai_feedback_assignees(),
  nilaza_private.review_ai_feedback_v2(uuid, integer, text, text, uuid, text), public.review_ai_feedback_v2(uuid, integer, text, text, uuid, text)
  to authenticated;
-- nilaza_private.ai_eval_text_has_personal_data is called from the security definer function above (owner privileges).

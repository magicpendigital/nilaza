-- Read-only: why the latest Tarot AI answers on Singapore fell back.
-- Returns codes and counts only (no reading text, no user data).
select
  r.created_at,
  r.status                                              as run_status,
  r.root_output ->> 'stage'                             as stage,
  r.root_output ->> 'validationStatus'                  as validation_status,
  r.root_output -> 'rejection' ->> 'code'               as rejection_code,
  g.status                                              as model_span_status,
  g.attributes ->> 'finishReason'                       as finish_reason,
  g.attributes ->> 'resolved_model'                     as resolved_model,
  g.attributes ->> 'outputTokens'                       as output_tokens,
  g.attributes ->> 'reasoning_tokens'                   as reasoning_tokens,
  left(g.output ->> 'text', 1)                          as answer_first_char
from public.ai_trace_runs r
left join lateral (
  select s.status, s.output, s.attributes
  from public.ai_trace_spans s
  where s.run_id = r.id and s.span_type = 'generation'
  order by s.started_at desc
  limit 1
) g on true
where r.feature = 'tarot_reading'
order by r.created_at desc
limit 5;

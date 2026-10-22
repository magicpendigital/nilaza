-- AI Council v2: retain the order and conversational relationship of each guide turn.
-- Existing v1 rows remain valid and are read as independent perspectives.

alter table public.chat_messages
  add column if not exists council_sequence integer,
  add column if not exists council_turn_kind text,
  add column if not exists council_reply_to_persona_id uuid references public.personas(id);

alter table public.chat_messages drop constraint if exists chat_messages_council_turn_kind_check;
alter table public.chat_messages add constraint chat_messages_council_turn_kind_check
  check (council_turn_kind is null or council_turn_kind in ('opening', 'perspective', 'response', 'synthesis'));

create index if not exists chat_messages_council_round_sequence_idx
  on public.chat_messages(council_round_id, council_sequence)
  where council_round_id is not null;

-- Keep the persisted Admin route/config metadata aligned with the response
-- contract used by the deployed Edge Function. This is metadata-only; v1
-- chat rows remain valid and readable.
update public.model_route_versions
set version = '2026-09-20-council-rounds-v2',
    response_schema = 'ai_council_rounds_v2',
    updated_at = now()
where feature = 'ai_council'
  and status in ('active', 'experimental');

update public.ai_council_config_versions
set runtime_config = jsonb_set(
      coalesce(runtime_config, '{}'::jsonb),
      '{routing,schema}',
      to_jsonb('ai_council_rounds_v2'::text),
      true
    ),
    updated_at = now()
where status in ('active', 'experimental')
  and coalesce(runtime_config->>'id', 'ai_council') = 'ai_council';

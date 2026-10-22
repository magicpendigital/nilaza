-- Plain SQL smoke test for the AI Council rounds v2 contract.
-- Run against staging with a transaction-capable SQL client.
begin;

do $$
declare
  missing_count integer;
begin
  select count(*)
  into missing_count
  from (values
    ('council_sequence'),
    ('council_turn_kind'),
    ('council_reply_to_persona_id')
  ) as expected(column_name)
  where not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'chat_messages'
      and information_schema.columns.column_name = expected.column_name
  );

  if missing_count <> 0 then
    raise exception 'Missing AI Council v2 chat_messages columns: %', missing_count;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.chat_messages'::regclass
      and conname = 'chat_messages_council_turn_kind_check'
  ) then
    raise exception 'Missing AI Council v2 turn-kind constraint';
  end if;

  if not exists (
    select 1
    from pg_indexes
    where schemaname = 'public'
      and tablename = 'chat_messages'
      and indexname = 'chat_messages_council_round_sequence_idx'
  ) then
    raise exception 'Missing AI Council v2 round sequence index';
  end if;

  raise notice 'PASS: AI Council rounds v2 columns, constraint, and ordering index';
end;
$$;

rollback;

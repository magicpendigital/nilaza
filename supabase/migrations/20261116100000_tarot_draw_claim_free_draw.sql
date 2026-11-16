-- Tarot v2 pack 0 (Owner 2026-11-16, Q1): a draw costs no model call, so only the draw cap limits it.
-- Forward-only and safe to re-run (create or replace). It changes ONE function body: public.tarot_draw_claim from
-- 20261115100000_tarot_reading_lock.sql, which is already applied on production (SHA-256 e193323e...). That file is not edited.
--
-- What changes:
-- * tarot_draw_claim keeps its signature, security invoker, empty search_path, advisory lock, lock-key replay and the
--   p_draw_cap check, but no longer returns the 'delivered' or 'attempts' limit reasons. Those limits stay in
--   tarot_interpret_claim, which is not touched. p_delivered_limit and p_attempt_limit stay in the signature (still
--   validated) so the Edge Function call and the grants do not change; this function simply no longer applies them.
--
-- Rollout order (each step needs the Owner): apply this file first, then deploy ai-tarot-reading. The reverse order would
-- make the new function pass a draw cap of 3 to a claim that still applies the delivered limit, so a Free draw would keep
-- being refused until this file is applied. With this file applied and the previous function still deployed, nothing breaks:
-- the old function sends min(3, delivered) as the draw cap and the claim applies only that.
--
-- Rollback (Owner-approved): re-run the create or replace of tarot_draw_claim from 20261115100000_tarot_reading_lock.sql
-- (the body with the delivered and attempts checks), then redeploy the previous ai-tarot-reading.
begin;

create or replace function public.tarot_draw_claim(
  p_user_id uuid, p_lock_key text, p_lock_date date, p_day_start timestamptz, p_topic text, p_spread text,
  p_question text, p_language text, p_deck_id uuid, p_deck_ref jsonb, p_cards jsonb, p_draw_cap integer,
  p_delivered_limit integer, p_attempt_limit integer
) returns jsonb
language plpgsql security invoker set search_path = '' as $$
declare
  existing public.tarot_readings;
  created public.tarot_readings;
  draws integer;
begin
  if p_user_id is null or p_lock_key is null or p_lock_key !~ '^[0-9a-f]{64}$' or p_lock_date is null or p_day_start is null
     or p_topic is null or p_spread is null or (p_deck_ref is not null and jsonb_typeof(p_deck_ref) <> 'object') or p_cards is null or jsonb_typeof(p_cards) <> 'array'
     or jsonb_array_length(p_cards) < 1 or coalesce(p_draw_cap, -1) < 0 or coalesce(p_delivered_limit, -1) < 0
     or coalesce(p_attempt_limit, -1) < 0 then
    raise exception 'invalid_tarot_draw_claim' using errcode = '22023';
  end if;
  perform pg_advisory_xact_lock(hashtextextended('nilaza.tarot:' || p_user_id::text, 0));
  select * into existing from public.tarot_readings where lock_key = p_lock_key;
  if found then
    if existing.user_id <> p_user_id then
      raise exception 'tarot_lock_key_conflict' using errcode = '42501';
    end if;
    return jsonb_build_object('status', 'existing', 'reading', to_jsonb(existing) - 'claim_token');
  end if;
  select count(*) into draws from public.tarot_readings where user_id = p_user_id and lock_date = p_lock_date;
  if draws >= p_draw_cap then
    return jsonb_build_object('status', 'limit', 'reason', 'draw_cap');
  end if;
  insert into public.tarot_readings(user_id, deck_id, deck_ref, topic, spread, question, selected_cards, interpretation,
    language, status, lock_key, lock_date, draw_source)
  values (p_user_id, p_deck_id, p_deck_ref, p_topic, p_spread, p_question, p_cards, '{}'::jsonb, coalesce(p_language, 'vi'),
    'queued', p_lock_key, p_lock_date, 'server_csprng')
  returning * into created;
  return jsonb_build_object('status', 'created', 'reading', to_jsonb(created) - 'claim_token');
end $$;

-- create or replace keeps the existing grants; they are restated so this file stands on its own.
revoke all on function public.tarot_draw_claim(uuid, text, date, timestamptz, text, text, text, text, uuid, jsonb, jsonb, integer, integer, integer) from public, anon, authenticated;
grant execute on function public.tarot_draw_claim(uuid, text, date, timestamptz, text, text, text, text, uuid, jsonb, jsonb, integer, integer, integer) to service_role;

commit;

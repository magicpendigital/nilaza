-- Tarot: allow the Love (3 cards) and Crossroads (4 cards) spreads next to the existing three.
-- Forward-only and idempotent. It only replaces the check constraint on tarot_readings.spread;
-- no row, grant or policy changes.
-- Not applied anywhere yet: the Owner runs it before ai-tarot-reading is deployed with the new spread ids.

do $$
declare
  existing record;
begin
  -- The constraint was created inline, so its generated name is normally tarot_readings_spread_check.
  -- Look it up by what it checks so a differently named copy cannot keep rejecting the new ids.
  for existing in
    select c.conname
    from pg_constraint c
    where c.conrelid = 'public.tarot_readings'::regclass
      and c.contype = 'c'
      and pg_get_constraintdef(c.oid) ilike '%spread%'
  loop
    execute format('alter table public.tarot_readings drop constraint %I', existing.conname);
  end loop;
end
$$;

alter table public.tarot_readings
  add constraint tarot_readings_spread_check
  check (spread in ('daily-one', 'past-present-future', 'situation-challenge-advice', 'love-three', 'crossroads-four'));

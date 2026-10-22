-- Migration: reserved weekly reflection cron contract.
--
-- Weekly reflection is intentionally disabled for the MVP bootstrap because
-- the weekly-reflection Edge Function and production URL/key wiring are not in
-- the active contract yet. Keep this migration as a safe no-op so local
-- Supabase resets can apply the full migration directory without scheduling a
-- placeholder HTTP call.
do $$
begin
  if coalesce(current_setting('app.enable_weekly_reflection_cron', true), 'off') <> 'on' then
    raise notice 'Skipping weekly reflection cron; app.enable_weekly_reflection_cron is not on.';
    return;
  end if;

  execute 'create extension if not exists pg_cron';
  execute 'create extension if not exists pg_net';

  execute $cron$
    select cron.schedule(
      'weekly-ai-reflection',
      '0 2 * * 0',
      $job$
        select net.http_post(
          url := current_setting('app.weekly_reflection_url', true),
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || current_setting('app.weekly_reflection_bearer', true)
          ),
          body := '{}'::jsonb
        ) as request_id;
      $job$
    )
  $cron$;
end $$;

BEGIN;
CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SET LOCAL search_path = extensions, public;
SELECT plan(19);

SELECT has_table('public', 'marketing_consent_events', 'consent events table exists');
SELECT has_table('public', 'marketing_suppressions', 'suppression table exists');
SELECT has_table('public', 'marketing_email_tokens', 'token hash table exists');
SELECT has_table('public', 'marketing_deliveries', 'delivery ledger exists');
SELECT has_table('public', 'beta_invites', 'beta invite table exists');
SELECT has_function(
  'public',
  'register_marketing_waitlist_request',
  ARRAY['text', 'text', 'text', 'text', 'jsonb', 'text', 'text'],
  'atomic registration RPC exists'
);

SELECT ok(
  NOT has_table_privilege('anon', 'public.marketing_waitlist', 'select'),
  'anon cannot read waitlist PII'
);
SELECT ok(
  NOT has_table_privilege('authenticated', 'public.marketing_consent_events', 'select'),
  'authenticated users cannot read consent history'
);
SELECT ok(
  NOT has_table_privilege('anon', 'public.marketing_suppressions', 'select'),
  'anon cannot read suppressions'
);
SELECT ok(
  NOT has_table_privilege('authenticated', 'public.marketing_email_tokens', 'select'),
  'authenticated users cannot read token hashes'
);
SELECT ok(
  NOT has_table_privilege('anon', 'public.marketing_deliveries', 'select'),
  'anon cannot read delivery records'
);
SELECT ok(
  NOT has_function_privilege(
    'anon',
    'public.register_marketing_waitlist_request(text,text,text,text,jsonb,text,text)',
    'execute'
  ),
  'anon cannot call the service-only registration RPC directly'
);

SET LOCAL ROLE service_role;
SELECT lives_ok(
  $$SELECT public.register_marketing_waitlist_request(
    'owner-test@invalid.example',
    repeat('a', 64),
    'vi',
    'guides',
    '{}'::jsonb,
    'waitlist-test-v1',
    'pgtap'
  )$$,
  'service role can register a new pending request'
);
RESET ROLE;

SELECT is(
  (SELECT status FROM public.marketing_waitlist WHERE email_hash = repeat('a', 64)),
  'pending_confirmation',
  'new registrations begin pending confirmation'
);
SELECT is(
  (SELECT count(*)::integer FROM public.marketing_consent_events WHERE waitlist_id = (
    SELECT id FROM public.marketing_waitlist WHERE email_hash = repeat('a', 64)
  )),
  1,
  'registration appends one consent event'
);

INSERT INTO public.marketing_suppressions (waitlist_id, reason)
SELECT id, 'unsubscribe' FROM public.marketing_waitlist WHERE email_hash = repeat('a', 64);
UPDATE public.marketing_waitlist
SET status = 'unsubscribed', unsubscribed_at = now()
WHERE email_hash = repeat('a', 64);

SET LOCAL ROLE service_role;
SELECT lives_ok(
  $$SELECT public.register_marketing_waitlist_request(
    'owner-test@invalid.example',
    repeat('a', 64),
    'en',
    'tarot',
    '{}'::jsonb,
    'waitlist-test-v2',
    'pgtap'
  )$$,
  'repeat request is accepted without lifting suppression'
);
RESET ROLE;

SELECT is(
  (SELECT status FROM public.marketing_waitlist WHERE email_hash = repeat('a', 64)),
  'unsubscribed',
  'repeat request preserves unsubscribed state'
);
SELECT ok(
  (SELECT active FROM public.marketing_suppressions WHERE waitlist_id = (
    SELECT id FROM public.marketing_waitlist WHERE email_hash = repeat('a', 64)
  )),
  'repeat request preserves active suppression'
);
SELECT is(
  (SELECT event_type FROM public.marketing_consent_events WHERE waitlist_id = (
    SELECT id FROM public.marketing_waitlist WHERE email_hash = repeat('a', 64)
  ) ORDER BY occurred_at DESC, id DESC LIMIT 1),
  'resubscribe_requested',
  'suppressed repeat is recorded for a future re-confirmation flow'
);

SELECT * FROM finish();
ROLLBACK;

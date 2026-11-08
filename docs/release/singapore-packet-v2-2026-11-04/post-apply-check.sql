-- Step 2c post-apply check for Singapore (read-only; returns one row).
-- Expected values are in the column names.
select
  (select count(*) from supabase_migrations.schema_migrations)                                   as migrations_expect_33,
  (select count(*) from public.tarot_cards)                                                       as tarot_cards_expect_78,
  (select string_agg(distinct status, ',') from nilaza_private.ai_budget_campaigns)               as ai_budget_expect_disabled,
  (select coalesce(string_agg(c.relname, ', ' order by c.relname), 'none')
     from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity)                       as public_tables_without_rls_expect_none,
  has_table_privilege('authenticated', 'public.journal_entries', 'TRUNCATE')                       as client_truncate_expect_false,
  has_function_privilege('authenticated', 'public.nilaza_account_delete_begin(uuid,text)', 'EXECUTE') as client_delete_fn_expect_false,
  has_schema_privilege('anon', 'nilaza_private', 'USAGE')                                          as anon_private_schema_expect_false,
  has_schema_privilege('service_role', 'auth', 'USAGE')                                            as service_auth_usage_expect_true,
  has_table_privilege('service_role', 'auth.users', 'SELECT')                                      as service_auth_users_select_expect_true,
  (select count(*) from auth.users)                                                                as auth_users_expect_0;

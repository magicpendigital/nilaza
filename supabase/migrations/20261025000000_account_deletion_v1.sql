-- Account deletion v1: service-role-only helpers for the account-delete Edge Function.
-- The function calls begin -> purge -> auth.admin.deleteUser -> finish. Rows that reference
-- auth.users with ON DELETE CASCADE disappear with the user; purge removes the rows that would
-- otherwise survive with a nulled user reference or that are keyed by email hash.
-- Nothing here grants client roles access; clients reach it only through the Edge Function.
begin;

create schema if not exists nilaza_private;

create table nilaza_private.account_deletion_requests (
  id uuid primary key default gen_random_uuid(),
  -- Domain-separated SHA-256 of the user id computed by the Edge Function; never an email or a name.
  subject_hash text not null unique check (subject_hash ~ '^[a-f0-9]{64}$'),
  status text not null default 'requested' check (status in ('requested', 'data_removed', 'completed', 'failed')),
  attempts integer not null default 1 check (attempts >= 1),
  requested_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz,
  last_error_code text check (last_error_code is null or last_error_code ~ '^[a-z0-9_]{1,64}$')
);
alter table nilaza_private.account_deletion_requests enable row level security;
alter table nilaza_private.account_deletion_requests force row level security;
revoke all on table nilaza_private.account_deletion_requests from public, anon, authenticated;
grant select, insert, update, delete on table nilaza_private.account_deletion_requests to service_role;

-- Step 1: refuse staff accounts and record or resume the request. Returns only a status.
create or replace function public.nilaza_account_delete_begin(p_user uuid, p_subject_hash text)
returns jsonb
language plpgsql
security invoker
set search_path = public, nilaza_private, pg_temp
as $$
declare
  existing nilaza_private.account_deletion_requests%rowtype;
begin
  if p_user is null or p_subject_hash is null or p_subject_hash !~ '^[a-f0-9]{64}$' then
    raise exception 'invalid_request' using errcode = '22023';
  end if;
  select * into existing from nilaza_private.account_deletion_requests where subject_hash = p_subject_hash;
  if found and existing.status = 'completed' then
    return jsonb_build_object('status', 'completed');
  end if;
  if not exists (select 1 from auth.users where id = p_user) then
    -- The user is already gone: finish any pending request so a retry is harmless.
    if found then
      update nilaza_private.account_deletion_requests
        set status = 'completed', completed_at = now(), updated_at = now(), last_error_code = null
        where subject_hash = p_subject_hash;
      return jsonb_build_object('status', 'completed');
    end if;
    return jsonb_build_object('status', 'not_found');
  end if;
  if exists (select 1 from public.admin_role_assignments where user_id = p_user and status = 'active') then
    return jsonb_build_object('status', 'staff_blocked');
  end if;
  insert into nilaza_private.account_deletion_requests (subject_hash)
    values (p_subject_hash)
    on conflict (subject_hash) do update
      set status = 'requested', attempts = nilaza_private.account_deletion_requests.attempts + 1,
          updated_at = now(), last_error_code = null
      where nilaza_private.account_deletion_requests.status in ('requested', 'failed', 'data_removed');
  return jsonb_build_object('status', 'requested');
end;
$$;

-- Step 2: remove data that would survive the cascade. One transaction; returns counts only.
create or replace function public.nilaza_account_delete_purge(p_user uuid, p_subject_hash text, p_email_hash text default null)
returns jsonb
language plpgsql
security invoker
set search_path = public, nilaza_private, pg_temp
as $$
declare
  jobs integer; events integer; safety integer; waitlist integer := 0;
begin
  if p_user is null or p_subject_hash is null or p_subject_hash !~ '^[a-f0-9]{64}$'
     or (p_email_hash is not null and p_email_hash !~ '^[a-f0-9]{64}$') then
    raise exception 'invalid_request' using errcode = '22023';
  end if;
  if exists (select 1 from public.admin_role_assignments where user_id = p_user and status = 'active') then
    raise exception 'staff_blocked' using errcode = '42501';
  end if;
  delete from public.generation_jobs where user_id = p_user;
  get diagnostics jobs = row_count;
  delete from public.usage_events where user_id = p_user;
  get diagnostics events = row_count;
  -- Keep the safety outcome for abuse statistics but remove free text that may quote the user.
  update public.safety_events set summary = '[removed on account deletion]', user_id = null where user_id = p_user;
  get diagnostics safety = row_count;
  if p_email_hash is not null then
    -- Waitlist consent, token and delivery rows cascade from the waitlist row.
    delete from public.marketing_waitlist where email_hash = p_email_hash;
    get diagnostics waitlist = row_count;
  end if;
  update nilaza_private.account_deletion_requests
    set status = 'data_removed', updated_at = now(), last_error_code = null
    where subject_hash = p_subject_hash and status in ('requested', 'failed', 'data_removed');
  return jsonb_build_object('generation_jobs', jobs, 'usage_events', events, 'safety_events', safety, 'marketing_waitlist', waitlist);
end;
$$;

-- Step 3: record the outcome after auth.admin.deleteUser. Also trims old completed requests.
create or replace function public.nilaza_account_delete_finish(p_subject_hash text, p_ok boolean, p_error_code text default null)
returns text
language plpgsql
security invoker
set search_path = public, nilaza_private, pg_temp
as $$
declare
  result text;
begin
  if p_subject_hash is null or p_subject_hash !~ '^[a-f0-9]{64}$' then
    raise exception 'invalid_request' using errcode = '22023';
  end if;
  if p_ok then
    update nilaza_private.account_deletion_requests
      set status = 'completed', completed_at = now(), updated_at = now(), last_error_code = null
      where subject_hash = p_subject_hash returning status into result;
  else
    update nilaza_private.account_deletion_requests
      set status = 'failed', updated_at = now(),
          last_error_code = case when p_error_code ~ '^[a-z0-9_]{1,64}$' then p_error_code else 'deletion_failed' end
      where subject_hash = p_subject_hash and status <> 'completed' returning status into result;
  end if;
  delete from nilaza_private.account_deletion_requests
    where status = 'completed' and completed_at < now() - interval '90 days';
  return coalesce(result, 'unknown');
end;
$$;

revoke all on function public.nilaza_account_delete_begin(uuid, text),
  public.nilaza_account_delete_purge(uuid, text, text),
  public.nilaza_account_delete_finish(text, boolean, text) from public, anon, authenticated;
grant execute on function public.nilaza_account_delete_begin(uuid, text),
  public.nilaza_account_delete_purge(uuid, text, text),
  public.nilaza_account_delete_finish(text, boolean, text) to service_role;
grant usage on schema nilaza_private to service_role;
-- service_role already reads auth.users on the managed platform; the 20261002 migration grants it in fixtures.
grant select on public.admin_role_assignments to service_role;
grant select, delete on public.generation_jobs, public.usage_events to service_role;
grant select, update on public.safety_events to service_role;
grant select, delete on public.marketing_waitlist to service_role;

commit;

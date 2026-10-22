-- Public acquisition data is written only through the marketing-waitlist
-- Edge Function. The Data API roles receive no direct table privileges.
create table public.marketing_waitlist (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  email_hash text not null unique,
  locale text not null check (locale in ('vi', 'en')),
  interest text not null check (interest in ('reflection', 'tarot', 'guides', 'astrology')),
  utm jsonb not null default '{}'::jsonb,
  consent_version text not null,
  consented_at timestamptz not null default now(),
  source text not null default 'nilaza-web',
  status text not null default 'subscribed' check (status in ('subscribed', 'unsubscribed', 'invited')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.marketing_waitlist is
  'Private waitlist PII. Never expose through the Data API; write via the public Edge Function only.';
alter table public.marketing_waitlist enable row level security;
revoke all on table public.marketing_waitlist from public, anon, authenticated;
grant select, insert, update on table public.marketing_waitlist to service_role;

-- Owner-document reads are auditable without exposing the bundled document.
create table public.admin_document_access_log (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  document_id text not null,
  accessed_at timestamptz not null default now()
);

alter table public.admin_document_access_log enable row level security;
revoke all on table public.admin_document_access_log from public, anon, authenticated;
grant insert, select on table public.admin_document_access_log to service_role;

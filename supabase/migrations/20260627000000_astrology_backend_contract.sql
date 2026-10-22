alter table public.birth_profiles
  add column if not exists latitude double precision,
  add column if not exists longitude double precision,
  add column if not exists utc_offset_minutes integer,
  add column if not exists geocode_provider text,
  add column if not exists geocode_place_id text;

create table if not exists public.astrology_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  birth_profile_id uuid references public.birth_profiles(id) on delete set null,
  focus text not null default 'personality' check (focus in ('personality', 'love', 'career', 'inner_lesson')),
  language text not null default 'vi' check (language in ('vi', 'en')),
  provider text not null,
  provider_version text,
  calculation_version text not null,
  input_hash text not null,
  input_summary jsonb not null default '{}'::jsonb,
  chart_data jsonb not null,
  interpretation jsonb not null,
  caveats jsonb not null default '[]'::jsonb,
  status text not null default 'completed' check (status in ('queued', 'completed', 'failed', 'deleted')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists astrology_reports_user_id_created_at_idx
  on public.astrology_reports(user_id, created_at desc);

create index if not exists astrology_reports_input_hash_idx
  on public.astrology_reports(input_hash);

alter table public.astrology_reports enable row level security;

grant select, insert, update, delete on table public.astrology_reports to authenticated;

drop policy if exists "users manage own astrology reports" on public.astrology_reports;
create policy "users manage own astrology reports"
  on public.astrology_reports for all
  to authenticated
  using ((select auth.uid()) = user_id or public.is_admin())
  with check ((select auth.uid()) = user_id or public.is_admin());

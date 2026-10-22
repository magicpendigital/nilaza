create table if not exists public.model_route_versions (
  id uuid primary key default gen_random_uuid(),
  feature text not null check (feature in ('persona_chat', 'ai_council', 'tarot_reading', 'daily_insight', 'astrology_report', 'face_reading')),
  version text not null,
  status text not null default 'draft' check (status in ('draft', 'active', 'experimental', 'archived')),
  primary_provider text not null check (primary_provider in ('openai', 'openrouter', 'gemini', 'anthropic')),
  primary_model text not null,
  fallback_provider text check (fallback_provider in ('openai', 'openrouter', 'gemini', 'anthropic')),
  fallback_model text,
  temperature numeric not null default 0.7,
  max_output_tokens integer not null default 600,
  response_schema text not null,
  fallback_when text[] not null default '{}',
  safety_policy jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id),
  published_by uuid references auth.users(id),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (feature, version)
);

create index if not exists model_route_versions_feature_status_idx
  on public.model_route_versions(feature, status, created_at desc);

alter table public.model_route_versions enable row level security;

grant select, insert, update, delete on table public.model_route_versions to authenticated;

drop policy if exists "active model routes are readable" on public.model_route_versions;
create policy "active model routes are readable"
  on public.model_route_versions for select
  using (status in ('active', 'experimental') or public.is_admin());

drop policy if exists "admins manage model routes" on public.model_route_versions;
create policy "admins manage model routes"
  on public.model_route_versions for all
  using (public.is_admin())
  with check (public.is_admin());

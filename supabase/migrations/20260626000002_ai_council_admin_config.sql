-- Migration: AI Council admin configuration contract
-- Persists publishable Council Builder configuration separately from user chat data.

create table if not exists public.ai_council_config_versions (
  id uuid primary key default gen_random_uuid(),
  feature text not null default 'ai_council' check (feature = 'ai_council'),
  version text not null unique,
  status text not null default 'draft' check (status in ('draft', 'review', 'active', 'archived')),
  default_template_key text not null,
  max_guides_per_turn integer not null check (max_guides_per_turn between 2 and 4),
  max_transcript_turns integer not null check (max_transcript_turns between 8 and 64),
  context_policy jsonb not null default '{}'::jsonb,
  turn_policy jsonb not null default '{}'::jsonb,
  safety_boundaries jsonb not null default '{}'::jsonb,
  runtime_config jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id),
  published_by uuid references auth.users(id),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ai_council_template_versions (
  id uuid primary key default gen_random_uuid(),
  config_version_id uuid not null references public.ai_council_config_versions(id) on delete cascade,
  template_key text not null,
  status text not null default 'draft_review' check (status in ('draft_review', 'ready_for_beta', 'active', 'disabled', 'archived')),
  name jsonb not null,
  use_case jsonb not null,
  situation_tags text[] not null default '{}'::text[],
  meeting_mode text not null check (meeting_mode in ('supportive_roundtable', 'advisory_board', 'calm_intervention', 'structured_debate')),
  max_guides integer not null check (max_guides between 2 and 4),
  synthesis_mode text not null check (synthesis_mode in ('gentle_consensus', 'decision_next_step', 'calming_reframe', 'balanced_tradeoff')),
  roster jsonb not null default '[]'::jsonb check (jsonb_typeof(roster) = 'array'),
  flow jsonb not null default '{}'::jsonb check (jsonb_typeof(flow) = 'object'),
  output_contract text[] not null default '{}'::text[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (config_version_id, template_key)
);

alter table public.chat_sessions
  add column if not exists council_config_version_id uuid references public.ai_council_config_versions(id),
  add column if not exists council_template_key text;

create index if not exists ai_council_config_versions_status_created_at_idx
  on public.ai_council_config_versions(status, created_at desc);

create index if not exists ai_council_template_versions_config_template_idx
  on public.ai_council_template_versions(config_version_id, template_key);

alter table public.ai_council_config_versions enable row level security;
alter table public.ai_council_template_versions enable row level security;

grant select, insert, update, delete on table public.ai_council_config_versions to authenticated;
grant select, insert, update, delete on table public.ai_council_template_versions to authenticated;

drop policy if exists "active ai council config versions are readable" on public.ai_council_config_versions;
create policy "active ai council config versions are readable"
  on public.ai_council_config_versions for select
  to authenticated
  using (status = 'active' or public.is_admin());

drop policy if exists "admins manage ai council config versions" on public.ai_council_config_versions;
create policy "admins manage ai council config versions"
  on public.ai_council_config_versions for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "active ai council template versions are readable" on public.ai_council_template_versions;
create policy "active ai council template versions are readable"
  on public.ai_council_template_versions for select
  to authenticated
  using (
    exists (
      select 1
      from public.ai_council_config_versions acv
      where acv.id = config_version_id
        and (acv.status = 'active' or public.is_admin())
    )
  );

drop policy if exists "admins manage ai council template versions" on public.ai_council_template_versions;
create policy "admins manage ai council template versions"
  on public.ai_council_template_versions for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

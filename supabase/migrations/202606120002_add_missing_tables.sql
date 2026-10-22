-- Enable pgvector
create extension if not exists vector with schema public;

-- Table: daily_insights
create table if not exists public.daily_insights (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade not null,
  date_key text not null,
  profile_snapshot jsonb not null default '{}'::jsonb,
  content jsonb not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index if not exists daily_insights_user_date_idx on public.daily_insights(user_id, date_key);

alter table public.daily_insights enable row level security;
drop policy if exists "users read own daily insights" on public.daily_insights;
create policy "users read own daily insights" on public.daily_insights for select using (user_id = auth.uid() or public.is_admin());
drop policy if exists "users create own daily insights" on public.daily_insights;
create policy "users create own daily insights" on public.daily_insights for insert with check (user_id = auth.uid() or public.is_admin());

-- Table: daily_zodiac_pulse
create table if not exists public.daily_zodiac_pulse (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade not null,
  date_key text not null,
  calculation_version text not null,
  data jsonb not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index if not exists daily_zodiac_pulse_user_date_idx on public.daily_zodiac_pulse(user_id, date_key);

alter table public.daily_zodiac_pulse enable row level security;
drop policy if exists "users read own zodiac pulse" on public.daily_zodiac_pulse;
create policy "users read own zodiac pulse" on public.daily_zodiac_pulse for select using (user_id = auth.uid() or public.is_admin());
drop policy if exists "users create own zodiac pulse" on public.daily_zodiac_pulse;
create policy "users create own zodiac pulse" on public.daily_zodiac_pulse for insert with check (user_id = auth.uid() or public.is_admin());

-- Table: source_chunks
create table if not exists public.source_chunks (
  id uuid primary key default gen_random_uuid(),
  source_id uuid references public.persona_sources on delete cascade not null,
  content text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.source_chunks enable row level security;
drop policy if exists "anyone reads source chunks" on public.source_chunks;
create policy "anyone reads source chunks" on public.source_chunks for select using (true);
drop policy if exists "admins manage source chunks" on public.source_chunks;
create policy "admins manage source chunks" on public.source_chunks for all using (public.is_admin()) with check (public.is_admin());

-- Table: source_embeddings
create table if not exists public.source_embeddings (
  id uuid primary key default gen_random_uuid(),
  chunk_id uuid references public.source_chunks on delete cascade not null,
  embedding vector(1536) not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index if not exists source_embeddings_vector_idx on public.source_embeddings using ivfflat (embedding vector_cosine_ops);

alter table public.source_embeddings enable row level security;
drop policy if exists "anyone reads source embeddings" on public.source_embeddings;
create policy "anyone reads source embeddings" on public.source_embeddings for select using (true);
drop policy if exists "admins manage source embeddings" on public.source_embeddings;
create policy "admins manage source embeddings" on public.source_embeddings for all using (public.is_admin()) with check (public.is_admin());

-- Table: credit_ledger
create table if not exists public.credit_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade not null,
  transaction_type text not null, -- 'daily_grant', 'tarot_reading', 'purchase'
  amount integer not null,
  metadata jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index if not exists credit_ledger_user_idx on public.credit_ledger(user_id);

alter table public.credit_ledger enable row level security;
drop policy if exists "users read own credit ledger" on public.credit_ledger;
create policy "users read own credit ledger" on public.credit_ledger for select using (user_id = auth.uid() or public.is_admin());

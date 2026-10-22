-- Production missed 202606120002, but already has the original credit_ledger
-- contract and policy. Do not replay that migration or replace billing data.
-- Apply this reconciliation BEFORE owner_capability_boundary on that project.
-- Existing staging/fresh schemas keep their tables and capability policies.
create extension if not exists vector with schema public;

do $$
begin
  if to_regclass('public.daily_insights') is null then
    create table public.daily_insights (
      id uuid primary key default gen_random_uuid(),
      user_id uuid not null references auth.users(id) on delete cascade,
      date_key text not null,
      profile_snapshot jsonb not null default '{}'::jsonb,
      content jsonb not null,
      created_at timestamptz not null default now()
    );
    create index daily_insights_user_date_idx on public.daily_insights(user_id,date_key);
    alter table public.daily_insights enable row level security;
    create policy "users read own daily insights" on public.daily_insights for select to authenticated using (user_id = (select auth.uid()));
    create policy "users create own daily insights" on public.daily_insights for insert to authenticated with check (user_id = (select auth.uid()));
  end if;
  if to_regclass('public.daily_zodiac_pulse') is null then
    create table public.daily_zodiac_pulse (
      id uuid primary key default gen_random_uuid(),
      user_id uuid not null references auth.users(id) on delete cascade,
      date_key text not null,
      calculation_version text not null,
      data jsonb not null,
      created_at timestamptz not null default now()
    );
    create index daily_zodiac_pulse_user_date_idx on public.daily_zodiac_pulse(user_id,date_key);
    alter table public.daily_zodiac_pulse enable row level security;
    create policy "users read own zodiac pulse" on public.daily_zodiac_pulse for select to authenticated using (user_id = (select auth.uid()));
    create policy "users create own zodiac pulse" on public.daily_zodiac_pulse for insert to authenticated with check (user_id = (select auth.uid()));
  end if;
  if to_regclass('public.source_chunks') is null then
    create table public.source_chunks (
      id uuid primary key default gen_random_uuid(),
      source_id uuid not null references public.persona_sources(id) on delete cascade,
      content text not null,
      metadata jsonb not null default '{}'::jsonb,
      created_at timestamptz not null default now()
    );
    create index source_chunks_source_id_idx on public.source_chunks(source_id);
    alter table public.source_chunks enable row level security;
    create policy "approved source chunks readable" on public.source_chunks for select to authenticated
      using (exists(select 1 from public.persona_sources s where s.id = source_id and s.status = 'approved'));
    create policy "admins manage source chunks" on public.source_chunks for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
  end if;
  if to_regclass('public.source_embeddings') is null then
    create table public.source_embeddings (
      id uuid primary key default gen_random_uuid(),
      chunk_id uuid not null references public.source_chunks(id) on delete cascade,
      embedding public.vector(1536) not null,
      created_at timestamptz not null default now()
    );
    create index source_embeddings_chunk_id_idx on public.source_embeddings(chunk_id);
    alter table public.source_embeddings enable row level security;
    create policy "admins manage source embeddings" on public.source_embeddings for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
  end if;
end $$;

grant select, insert on public.daily_insights, public.daily_zodiac_pulse to authenticated;
grant select, insert, update, delete on public.source_chunks, public.source_embeddings to authenticated;

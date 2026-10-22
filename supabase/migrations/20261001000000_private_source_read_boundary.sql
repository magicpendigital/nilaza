-- Nilaza forward preparation: raw retrieval material is private to authorized
-- content staff/backend. Never apply while the target's migration gate is blocked.
begin;
do $$
begin
  if to_regclass('public.source_chunks') is null
    or to_regclass('public.source_embeddings') is null
    or to_regprocedure('nilaza_private.has_capability(text)') is null then
    raise exception 'Nilaza source/capability prerequisites are missing';
  end if;
  if exists (
    select 1 from pg_catalog.pg_class
    where oid in ('public.source_chunks'::regclass, 'public.source_embeddings'::regclass)
      and not relrowsecurity
  ) then
    raise exception 'Nilaza raw source tables require enabled RLS';
  end if;
end $$;

revoke all privileges on table public.source_chunks, public.source_embeddings from public, anon;
revoke truncate, references, trigger on table public.source_chunks, public.source_embeddings from authenticated;
-- Keep existing capability-gated row writes/deletion boundaries. Normal
-- customers receive interpreted guidance through approved backend retrieval,
-- never the raw licensed text or embeddings via the Data API.
drop policy if exists "anyone reads source chunks" on public.source_chunks;
drop policy if exists "anyone reads source embeddings" on public.source_embeddings;
create policy "staff reads raw source chunks" on public.source_chunks
  for select to authenticated using ((select nilaza_private.has_capability('content.read')));
create policy "staff reads raw source embeddings" on public.source_embeddings
  for select to authenticated using ((select nilaza_private.has_capability('content.read')));
commit;

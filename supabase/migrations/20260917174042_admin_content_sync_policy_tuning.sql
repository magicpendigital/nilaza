-- Keep the Admin bundle contract to one permissive UPDATE policy and cover
-- its foreign keys so the Data API and release history remain inexpensive.

drop policy if exists "content editors update drafts" on public.admin_content_bundles;
drop policy if exists "content publishers release bundles" on public.admin_content_bundles;
drop policy if exists "content staff update bundles" on public.admin_content_bundles;
create policy "content staff update bundles"
  on public.admin_content_bundles for update to authenticated
  using (
    (
      (select nilaza_private.has_capability('content.publish'))
      and status in ('draft', 'review', 'published', 'archived')
    )
    or (
      (select nilaza_private.has_capability('content.draft'))
      and status in ('draft', 'review')
    )
  )
  with check (
    (
      (select nilaza_private.has_capability('content.publish'))
      and status in ('draft', 'review', 'published', 'archived')
    )
    or (
      (select nilaza_private.has_capability('content.draft'))
      and status in ('draft', 'review')
      and updated_by = (select auth.uid())
    )
  );

create index if not exists admin_content_bundles_created_by_idx
  on public.admin_content_bundles(created_by);
create index if not exists admin_content_bundles_updated_by_idx
  on public.admin_content_bundles(updated_by);
create index if not exists admin_content_bundles_published_by_idx
  on public.admin_content_bundles(published_by);
create index if not exists admin_content_bundles_supersedes_id_idx
  on public.admin_content_bundles(supersedes_id);
create index if not exists admin_content_bundle_events_bundle_id_idx
  on public.admin_content_bundle_events(bundle_id);
create index if not exists admin_content_bundle_events_actor_id_idx
  on public.admin_content_bundle_events(actor_id);



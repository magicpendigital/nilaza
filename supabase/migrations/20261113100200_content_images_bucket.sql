-- Admin redesign A3 (spec ADMIN_SCREENS_SPEC_2026-11-04 row D8, sections 3.3-3.4; review AD-08): Storage bucket
-- for images uploaded from Admin Content (card art, asset library). Public read (the app shows these images),
-- PNG/JPEG/WebP only (no SVG), at most 1 MB per file; the bucket enforces type and size server-side.
-- Upload: content.draft (owner, admin, editor). Delete: content.delete (owner). No update policy: a new image gets a
-- new object name, so a published path never changes under the app. Listing: content.read.
-- Object names must start with one of the Admin folders (personas/, decks/, cards/, frontend/, assets/).
-- Separate from the content-item migration so the Owner can approve the bucket on its own.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('content-images', 'content-images', true, 1048576, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "content staff list content images" on storage.objects;
create policy "content staff list content images" on storage.objects for select to authenticated
  using (bucket_id = 'content-images' and (select nilaza_private.has_capability('content.read')));

drop policy if exists "content editors upload content images" on storage.objects;
create policy "content editors upload content images" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'content-images'
    and (select nilaza_private.has_capability('content.draft'))
    and (storage.foldername(name))[1] in ('personas', 'decks', 'cards', 'frontend', 'assets')
    and lower(storage.extension(name)) in ('png', 'jpg', 'jpeg', 'webp')
  );

drop policy if exists "content owner deletes content images" on storage.objects;
create policy "content owner deletes content images" on storage.objects for delete to authenticated
  using (bucket_id = 'content-images' and (select nilaza_private.has_capability('content.delete')));

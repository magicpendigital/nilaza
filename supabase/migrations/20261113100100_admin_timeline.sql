-- Admin redesign A3 (spec ADMIN_SCREENS_SPEC_2026-11-04 row D10, section 3.15 "Lịch sử thao tác"): one read-only
-- timeline of staff actions from admin_audit_logs (AI settings, content item drafts/publishes, safety reviews, roles)
-- and admin_content_bundle_events (whole-bundle drafts, publishes and rollbacks).
-- Needs hub.read (owner, admin, editor, safety_reviewer). Rows are newest first; p_before pages backwards.
-- Only allowlisted metadata fields leave the database (note/reason, feature, version, kind, key, items, status);
-- raw metadata is never returned. Role changes (role.*) are listed only for roles.manage. Bundle events written by
-- publish_content_items (metadata.items) are skipped because the matching content.items.publish audit row already
-- describes them. Independent of 20261113100000: works before or after the per-item content migration.
create function public.get_admin_timeline(p_limit integer default 50, p_before timestamptz default null) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  can_roles boolean;
  row_limit integer := greatest(1, least(coalesce(p_limit, 50), 200));
begin
  if auth.uid() is null or not nilaza_private.has_capability('hub.read') then raise exception 'Not authorized' using errcode = '42501'; end if;
  can_roles := nilaza_private.has_capability('roles.manage');
  return coalesce((select jsonb_agg(jsonb_build_object(
      'source', t.source, 'id', t.id, 'createdAt', t.created_at, 'actorId', t.actor_id,
      'actorEmail', (select u.email from auth.users u where u.id = t.actor_id),
      'action', t.action, 'targetTable', t.target_table, 'targetId', t.target_id,
      'note', coalesce(t.metadata ->> 'note', t.metadata ->> 'reason'),
      'details', jsonb_strip_nulls(jsonb_build_object(
        'feature', t.metadata -> 'feature', 'version', t.metadata -> 'version', 'kind', t.metadata -> 'kind',
        'key', t.metadata -> 'key', 'items', t.metadata -> 'items', 'status', t.metadata -> 'status',
        'enabled', t.metadata -> 'enabled', 'role', case when t.action like 'role.%' then t.metadata -> 'role' end,
        'bundleVersion', t.metadata -> 'bundleVersion', 'previousVersion', t.metadata -> 'previousVersion',
        'restoredFromVersion', t.metadata -> 'restoredFromVersion', 'archivedVersion', t.metadata -> 'archivedVersion'))
    ) order by t.created_at desc, t.id desc)
    from (
      select * from (
        select 'audit'::text as source, a.id::text as id, a.created_at, a.admin_user_id as actor_id, a.action,
          a.target_table, a.target_id::text as target_id, a.metadata
        from public.admin_audit_logs a
        where (p_before is null or a.created_at < p_before) and (can_roles or a.action not like 'role.%')
        union all
        select 'content_bundle', e.id::text, e.created_at, e.actor_id, 'content.bundle.' || e.action,
          'admin_content_bundles', e.bundle_id::text, e.metadata
        from public.admin_content_bundle_events e
        where (p_before is null or e.created_at < p_before) and not (e.metadata ? 'items')
      ) u order by u.created_at desc, u.id desc limit row_limit
    ) t), '[]'::jsonb);
end;
$$;

comment on function public.get_admin_timeline(integer, timestamptz) is 'Staff action timeline (A3, D10): admin_audit_logs + admin_content_bundle_events, allowlisted fields only, hub.read; role.* rows only for roles.manage.';

create index if not exists admin_audit_logs_created_at_idx on public.admin_audit_logs(created_at desc);

revoke all on function public.get_admin_timeline(integer, timestamptz) from public, anon, authenticated;
grant execute on function public.get_admin_timeline(integer, timestamptz) to authenticated;

-- Owner decision 15/11 "Chỉ Owner được phát hành cấu hình AI và nội dung": content.publish and ai.manage move from
-- owner+admin to owner only. Only the single role -> capability map (nilaza_private.roles_have_capability,
-- 20261114090000) changes; has_capability, has_admin_capability, is_admin (= ai.manage), get_admin_access,
-- get_admin_role_matrix and every policy, RPC and Edge Function that asks them read it live, so no other object and no
-- deploy is needed. Every other capability answers exactly as before.
-- Effect for the admin role: it keeps hub.read, content.read, content.draft, ai.read, overview.read,
-- notifications.dispatch and safety.review, so every draft path stays open (ai.read + content.draft for AI feature
-- configs, prompts, context configs, eval sets, runs and scoring, Owner decision 13/11; content.draft for content
-- items). It can no longer publish content or AI settings, use the AI feature switches, change providers, run the
-- provider key check or save model routes; those paths had no editor draft rule and stay ai.manage (owner) only.
-- No row is touched; re-running is safe. Rollback: re-run the 20261114090000 body of this function.
-- Nothing is applied by this file on its own.
begin;

create or replace function nilaza_private.roles_have_capability(roles text[], capability text) returns boolean
language sql immutable set search_path = '' as $$
  select coalesce(case capability
    when 'hub.read' then roles && array['owner','admin','editor','safety_reviewer']
    when 'content.read' then roles && array['owner','admin','editor','safety_reviewer']
    when 'content.draft' then roles && array['owner','admin','editor']
    when 'content.publish' then roles && array['owner']
    when 'content.delete' then roles && array['owner']
    when 'ai.read' then roles && array['owner','admin','editor','safety_reviewer']
    when 'ai.manage' then roles && array['owner']
    when 'roles.manage' then roles && array['owner']
    when 'overview.read' then roles && array['owner','admin']
    when 'notifications.dispatch' then roles && array['owner','admin']
    when 'safety.review' then roles && array['owner','admin','safety_reviewer']
    else false end, false);
$$;
revoke all on function nilaza_private.roles_have_capability(text[], text) from public, anon;
grant execute on function nilaza_private.roles_have_capability(text[], text) to authenticated, service_role;

comment on function nilaza_private.roles_have_capability(text[], text) is 'The single role -> capability map (20261114090000). Owner decision 15/11 (20261115090000): content.publish and ai.manage are owner only; admin keeps read and draft rights.';

commit;

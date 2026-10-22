-- Support owner-document audit lookups by user and most-recent access.
create index if not exists admin_document_access_log_user_accessed_at_idx
  on public.admin_document_access_log (user_id, accessed_at desc);

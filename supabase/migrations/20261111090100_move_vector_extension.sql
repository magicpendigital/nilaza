-- Security Advisor 2026-11-08 (extension_in_public): move pgvector out of the public schema.
-- Column types and indexes follow the extension by object id, so existing embedding columns keep working.
-- No function in this project names the vector type or operators in its body (checked 2026-11-11).
create schema if not exists extensions;
alter extension vector set schema extensions;

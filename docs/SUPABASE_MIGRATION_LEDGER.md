# Supabase Migration Ledger

> Investigation update 2026-10-01 below supersedes historical recommendations to restore MCY into executable migration history. Original snapshots remain evidence; ledger stays blocked.

## Investigation refresh — 2026-10-01 (read-only)

Linked project remains **Nilaza Staging QA** `akgrokwnkfqnfjqrildi`; distinct MCY project is `mhumbczqrzutdnraafhs`. Foreign `20260925160325_initial_mcy_schema` really appears in Nilaza QA history, with yoga/editorial DDL including teachers, courses, practice_runs, profiles, user_consents and editorial_* (non-exhaustive sample). Actor and reason are unknown.

Root read-only metadata: one statement, author field exists without identity access, SQL MD5 `5ec18dcb5750592357022e31e4f1b9b9`. Fingerprint supports evidence comparison, not desired-schema approval.

**Do not import MCY SQL into Nilaza's executable baseline merely to match timestamps.** Recover original source separately as forensic evidence with project/version/provenance. Source recovery, matching history and historical AI Studio approval do not authorize foreign objects or clearing this ledger.

Status remains `blocked_pending_reconciliation`, projectRef unchanged. Preferred proposal: preserve existing QA and prepare clean owner-approved Nilaza QA from reviewed Nilaza sources. Alternative: inventory-led isolation/cleanup after full objects/dependencies/grants/policies/triggers/functions/storage/realtime review, exact forward SQL, backup/rollback and owner approval. No automatic retarget, DROP CASCADE, history rewriting, db push or repair. See [R02 proposal](mvp-remediation/2026-10-01/R02-migration-forward-path.vi.md).

This is not a new full remote/local history comparison; original table remains the 26 September snapshot. Before cloud mutation, confirm intended target/desired schema and require account-isolation/app/Admin acceptance. Local ledger checker exit0 validates metadata structure, not cloud reconciliation. Raw QA capture remains off until purge scheduling and environment approval are verified.

Last remote comparison: 2026-09-26. Ledger updated locally: 2026-09-26. Project: `akgrokwnkfqnfjqrildi` (Nilaza Staging QA).

The reviewed AI Studio migration was approved by the database owner and applied to Staging as `20260926152118_ai_studio_operations`. Its source is [the matching migration file](../supabase/migrations/20260926152118_ai_studio_operations.sql). Post-apply RPC, table, RLS, grants, and retention prerequisites were checked.

| State | Migration IDs |
| --- | --- |
| Present locally, missing remotely | None |
| Present remotely, missing locally | `20260925160325_initial_mcy_schema` |
| Present in both | 25 versions; latest is `20260926152118_ai_studio_operations` |

The remote-only `initial_mcy_schema` migration contains a separate yoga/editorial schema and does not touch the AI Studio route, prompt, trace, or audit objects. Its source is not present in this repository, so it remains recorded as remote-only. The ledger is therefore blocked from generic migration push/repair until that source is restored and reviewed. Do not run `supabase db push` or migration repair.

`pg_cron` is not installed on Staging. Raw QA capture remains disabled, and must stay disabled until a purge schedule is configured and verified.

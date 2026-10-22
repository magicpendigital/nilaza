# Nilaza release control

Use docs/release/RELEASE_RUNBOOK.md and OWNER_PACKET.vi.md in the active Nilaza repository; keep PLAN_QC_PROTOCOL and existing skill routing. Bind full commit, migration hashes, artifact hashes, config expectations, sanitized evidence and owner packet to one immutable manifest. Any change invalidates approval.

The current migration ledger is blocked_pending_reconciliation due to foreign MCY history. Never import foreign SQL or repair history merely to align versions; desired schema, target and forward path need owner review and actual acceptance. The cloud target allowlist is intentionally empty. A new Pro organization does not imply that projects moved.

Rehearse clean schema replay and production-schema upgrade with synthetic fixtures; never clone live user data. Disable outbound jobs in rehearsal. Use expand-contract and bounded backfill checkpoints, including older installed clients. Test grants and RLS owner/tenant predicates together with Storage/signed URLs, RPC EXECUTE, invoker views and privileged function ownership/search_path. Test ordinary A/B users, revoked members and old tokens; service-role success is not RLS proof.

Preserve draft/review/published revision identity and approved-content-only AI retrieval. Code deployment, content publication and route publication need distinct decisions. Recovery covers database, separate Storage bytes, Auth/config and paused/reconciled jobs; RPO/RTO stay proposed until measured.

Production secrets stay in a trusted protected release job, never agent sessions or untrusted PR builds. Exact target allowlist, drift checks, one release lock, smoke and measured observation are required; remote enforcement remains unverified until independently checked. The dependency-free local checker reports PASS/FAIL/BLOCKED/NOT_APPLICABLE, performs no release and cannot authenticate an owner or prove evidence truth.

## Target and provider preparation

For a different Nilaza database target, use `scripts/database-target-gate.mjs` and the active production target-gate guide. Explicit database-write plans bind both `databaseTarget` and a hashed `databaseTargetManifest`; do not relabel the legacy ledger. The checker requires the independent release allowlist, a matching reconciled ledger, exact ordered SQL, compatible synthetic replay/restore/RLS evidence and owner decision. A draft or fixture PASS cannot clear release blockers or authorize SQL. Bootstrap excludes applied history; repair is unsupported. The legacy no-target preflight remains blocked by its original ledger.

OpenRouter billing receipts are separate from quota settlement and observed release behavior. Read `providers/openrouter-billing.ts` and the current receipt handoff when wiring cost: account charge differs from upstream inference cost; generation ID differs from HTTP request ID; failed, malformed and safety-blocked attempts can still be charged. Missing cost/identity stays unresolved, not zero. The lookup helper is explicit and bounded, not a scheduled worker. Local tests, best-effort trace metadata and optional response fields do not establish durable server-owned accounting or an actual Admin billing dashboard. Verify deployed routes, every attempt, deduplication and protected-endpoint acceptance before claiming billing works online.

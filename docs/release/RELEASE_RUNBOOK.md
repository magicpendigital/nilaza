# Nilaza: owner and agent release workflow

Owner decision 2026-10-09: Singapore etfajmrwyywokgafzxsb in Nilaza Free drxbmvimiekeoeesgssp is selected as the canonical backend candidate: closed synthetic prelaunch QA, then separately approved production promotion. Fresh project/org reads verify Singapore ap-southeast-1 and ACTIVE_HEALTHY. Current CLI/Admin/mobile bindings still identify legacy QA akgrokwnkfqnfjqrildi. Steps 1-2 authorize local policy and packet preparation; runtime retarget, cloud SQL, credentials and target allowlist activation remain separate. Historical Pro packets are superseded; existing security/recovery/release gates remain. See [Free preparation](SINGAPORE_FREE_PREPARATION_2026-10-09.vi.md). Targets remain empty until actual enforcement is verified.

Updated 2026-10-04. This is project-local preparation; no deployment, cloud mutation, installation, publishing or paid service is authorized by these files. AGENTS/skills are guidance; a local PASS cannot enforce GitHub permissions or authenticate an owner.

## Owner path

1. Describe the idea and desired visible outcome. The agent records scope, existing dirty files, impacted data/content, tests and stop conditions before edits. Preserve other work; do not reset or broadly stage the checkout.
2. Review an isolated candidate using fictional data. The agent gives one plain-language packet: what changes, who is affected, tested/untested behavior, expected costs/limits, recovery path and remaining risk. Evidence has exactly PASS, FAIL, BLOCKED or NOT_APPLICABLE; an unrun check is BLOCKED.
3. Approve only an exact candidate, target and manifest hash. Suggested decision: “Tôi duyệt bản [releaseId], mã kiểm tra [manifestSha256], cho [targetId], với phạm vi và chi phí trong phiếu này.” A draft approval is not a decision. Any source, migration, artifact, config, evidence or packet change invalidates approval. The owner need not run code or handle secrets.
4. The authorized release operator separately verifies permissions and executes the approved action. A checker PASS means local evidence matched; it always returns releaseAuthorized=false and performs no release. High-impact security changes and live transmission require explicit approval.

## Current project boundary

Preserve independent draft, review and published revisions. Approval binds the exact content/prompt version; editing a draft invalidates its approval. Clients and AI retrieval consume only approved published material; exclude private prompts, owner docs and withdrawn/unlicensed sources. Code deployment and content publication are different owner decisions. Test ordinary A/B, owner and revoked membership, cross-account cache reset, journal/chat isolation and generic notifications. Keep raw QA capture off until retention/purge is approved and measured. Preserve deterministic Tarot selection, calculated astrology and consent-first symbolic face-reading limits.

Current source blockers: Nilaza QA ledger remains blocked_pending_reconciliation due to foreign MCY history. Do not import foreign SQL, push or repair history to turn a check green. These are dated source findings, not new live verification. Preserve them until a separately reviewed reconciliation and acceptance record clears them. The cloud target allowlist starts empty deliberately.

## Market readiness before provisioning

Do not provision paid production resources for every project. Require target-user validation, stable critical journeys, access-security evidence, migration/restore rehearsal, support and incident ownership, and owner approval of exact recurring cost before proposing production provisioning. A hard blocker cannot be hidden by an average readiness score. MCY and Nilaza currently remain technically blocked; documentation updated is a different status from market-ready. Offline projects can market-test without Supabase.

Current Nilaza allocation for staging and proposed production is Nilaza Free organization drxbmvimiekeoeesgssp. Existing Singapore and QA candidates are both verified there on 2026-10-07; a project named Nilaza is not production by name alone. Canonical Singapore selection is approved; production readiness and recovery acceptance remain pending. No project transfer/create/retarget is authorized by these files. The release target contract binds BOTH organizationId and projectRef as well as environment kind; verify actual metadata, not an app URL or label alone.

The 2026-10-07 visible Nilaza inventory contains two ACTIVE_HEALTHY projects (QA and Singapore) plus the inactive old project. This does not prove account-wide capacity or MCY's current organization. Additional projects use local/synthetic rehearsal or a separately approved resource plan. Account for Free pause, lower capacity and differing features while preserving schema/security/API contract parity. Production-scale load, paid-only settings and restore proof require separate evidence; a small Free staging pass cannot prove those properties.

Dated parent-supplied capacity scenario (2026-10-04): the existing Pro base around USD25/month already recurs; two production Micro projects were estimated around USD35/month total, not USD55. This is a planning estimate, not a deployment commitment or verified bill. Before approval verify current pricing/credits, project count, instance size, storage/egress/provider spend and exact recurring cost. Do not freeze this estimate into skills or make billing changes.

## Schema and access rehearsal

Rehearse both (a) ordered clean migration replay and (b) upgrade from the reviewed production schema using synthetic fixtures. Use reviewed schema-only definitions, not a clone/export of live user rows. Disable copied cron/webhooks/email/provider/job dispatch before rehearsal; schema replay can still execute outbound jobs. Missing schema provenance or external-side-effect isolation blocks the rehearsal.

Use expand-contract: add compatible schema/API first, deploy compatible server and older/new mobile clients, backfill with bounded resumable checkpoints and reconcile counts/invariants, then remove old contracts only after measured client adoption and explicit approval. Do not rewrite migration history or import another product's SQL to obtain a green check. Record schema fingerprint and migration file hashes; rehearse forward recovery, not only destructive rollback.

Treat explicit table/sequence/default grants, PUBLIC inheritance, TRUNCATE, RLS owner/tenant predicates, Storage objects/signed URLs, RPC EXECUTE, security-invoker views and SECURITY DEFINER owners/search_path/helpers as one access boundary. Run allowed and denied paths with ordinary A/B accounts, owner/staff where applicable, revoked member and a previously issued token. Recheck active membership server-side after revocation. Service-role bypass is never evidence of RLS isolation. Storage NOT_APPLICABLE needs reviewed no-storage scope evidence, not an omitted test.

## Production execution: proposed until enforced

Verify the exact allowlisted organization/project/environment and schema/config drift immediately before execution. Production secrets are accessible only to the trusted protected release job/operator; never to an agent session, fork PR or untrusted build. Proposed GitHub controls: required independent checks/review, protected release environment, restricted release identity, immutable artifacts and a single target-scoped release lock. Verify remote enforcement before claiming it works; these docs do not enable it. Do not run migration/deploy commands from ordinary PR CI.

Record pre-change backup identity and measured recovery test. Database backups exclude Storage object bytes; maintain separate restoration coverage for files, Auth/identity, nonsecret config plus owner-held secrets, and queues/cron/webhooks/jobs. Restore jobs paused, reconcile external receipts before replay, and rotate/rebind credentials only in authorized channels. Document what is not recoverable. RPO/RTO are proposed targets until measured; owner chooses acceptable loss/downtime and cost.

During release hold one lock, stop on target/drift/check mismatch, execute only approved steps, run sanitized smoke tests and measure the stated observation window (errors, latency, rejected access, job backlog and spend). Set thresholds and stop/disable conditions in the packet before approval. A deployment return code is not observation evidence. On failure disable the feature or restore code when schema-compatible, otherwise use the rehearsed forward fix. Do not blindly restore a database over newer user writes.

## Read-only local evidence check

Run from this project root with existing Node (no install):

```powershell
node --test scripts/release-evidence.test.mjs
node scripts/release-evidence.mjs <manifest.json> <approval.json>
```

Result type is EvidenceBundleValidation, never production approval. Exit 0 = PASS (evidence only), 1 = FAIL (invalid/mismatched evidence), 2 = BLOCKED (missing evidence/target/approval or known blocker). Neither a hash nor a PASS proves test truth, independent review, permission enforcement or complete dynamic dependency discovery. Profile changes are control changes and need separate review. Mandatory policy.profileSha256, policy.runbookSha256 and policy.checkerSha256 bind exact release-profile.json, this runbook and the executing checker independently of inputRoots. Omitting policy files from inputRoots does not bypass their hashes. Known-input roots are a starting execution inventory: review platform assets/build scripts and add any additional release inputs before recording a candidate.

Existing focused checks to select by actual change:

- npm run validate:governance
- npm run skills:validate
- npm run supabase:migration-ledger:check

The checker never runs those commands or opens an environment file. Required profile check IDs must all pass with hashed, sanitized local evidence. NOT_APPLICABLE is accepted only when the profile permits it, a specific reason is supplied and scope evidence is hashed. Do not paste tokens, provider output, raw journals, real financial data or private account information into evidence.

## Manifest and approval contract

Store candidate JSON and evidence outside docs/release/input roots to avoid circular hashes; keep it private and sanitized. Format version 1:

- schemaVersion: 1; projectId: nilaza; mode: cloud; releaseId: unique reviewed candidate ID; target: {id, kind, organizationId, projectRef} exactly matching the profile allowlist. config.expectations.target must equal the same complete target object; staging and production organization boundaries are mandatory.
- source: {kind: git, repoRoot: actual Git top-level, commit: full 40-character SHA, inputs: [{path, sha256}]}. Git candidates require clean tracked state. For an offline folder without Git use kind: snapshot, commit: null, snapshotId: unique identifier and all known input hashes. Never use snapshot to bypass a dirty existing Git checkout.
- artifacts: nonempty [{path, sha256}] for the built files. All file paths use safe project-relative forward slashes; no symlinks, traversal, credential files or node_modules.
- migrations: all local supabase/migrations/*.sql as {path, sha256}, including pending files; listing them does not approve applying them.
- config: {expectations: nonsecret reviewed target/schema/runtime/feature expectations, expectationsSha256: SHA-256 of UTF-8 JSON.stringify(expectations)}. Never include credential values.
- policy: {profileSha256, runbookSha256, checkerSha256}; hash the exact profile, RELEASE_RUNBOOK.md and the executing release-evidence.mjs bytes even if inputRoots excludes them.
- checks: [{id, status, evidence: {path, sha256}, reason?}], matching requiredChecks. Evidence must be a structured JSON receipt: {schemaVersion: 1, checkId, status, sourceIdentity: exact commit or snapshotId, testedBundleSha256: tested scope digest, target: complete manifest target object, command, exitCode, environment, executedAt: ISO timestamp, reason?}. PASS requires receipt status PASS and exitCode 0; allowed NOT_APPLICABLE requires matching reason and exitCode null. Contradictory receipts, text-only claims and mismatched source/target fail. These are still self-reported receipts; the checker cannot prove the command ran or the author is trusted. Attach independent CI/device/test provenance to the owner packet.

Compute testedBundleSha256(manifest) with the exported helper in scripts/release-evidence.mjs after source/input, artifact, migration, configuration and policy hashes are finalized. Its canonical scope includes schema/project/mode/release identity, full target, source identity and sorted input/artifact/migration path+hash sets, config and policy. It deliberately excludes checks/receipt hashes, owner packet and approval, avoiding a cycle. Object keys and file-list ordering are normalized; receipt body changes cannot change the tested digest. Every receipt must contain this digest. Changed tested artifact bytes, input hashes, config, policy or release identity require new actual test evidence and a new receipt; a fresh owner approval or recalculated evidence-file hash alone cannot reuse an old receipt. The checker checks this binding, not whether tests actually ran.
- ownerPacket: {path, sha256} for the completed packet below. Hash the final manifest's exact file bytes.
- Separate approval JSON: {decision: APPROVE, owner: decision author, releaseId, targetId, manifestSha256, approvedAt: ISO UTC timestamp, expiresAt: later ISO UTC timestamp, revoked: false}. The approval timestamp must be parseable and not future; expiry is mandatory and must not have elapsed. Missing revocation state or revoked=true blocks. The release operator verifies the actual owner's decision and current revocation independently; self-authored JSON cannot prove human identity or a live revocation registry.

Use docs/release/OWNER_PACKET.vi.md as a template. A release manifest is not prepared by this documentation update; current builds and live environments have not been certified.

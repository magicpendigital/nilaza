---
name: release-approval
description: Prepare any action on a real environment for Owner approval and carry it out safely - database migrations, backend deploys, secrets, service settings, account changes, app store or production releases. Use when work leaves the local machine or CI and touches staging, production, a store, or an account.
---

# Release and approval

## Prepare
1. Name the exact target (environment, project id, store track) and the exact package (commit, migration-set hash, artifact checksum). Compute hashes on a stable basis (e.g. LF-normalized text = git blob) and write down the basis.
2. Produce fresh evidence with an expiry: migrations replayed on a local or containerized database of the same major version, including permission/row-level-security checks and a backup/restore check; build artifacts with checksum, signature and permissions inspected; CI result for the exact commit.
3. Read the target's current state shortly before acting (status, region, plan, existing schema/ledger, side effects such as open sign-ups or scheduled jobs). If the agent cannot read it, list precisely what the Owner should read on the dashboard.
4. Write one approval request from `docs/APPROVALS.md`: the decision sentence, evidence and its expiry, risk, undo, what the Owner must do themselves, stop conditions.

## Execute (only after the Owner approves that exact target and hash)
- Re-check the hash immediately before running. If it differs, stop and ask again.
- The Owner types passwords, logs in, and holds keys; the agent prepares the commands in order: link, dry run (must list exactly the expected items), apply, seed, post-checks, security advisor/lint.
- Stop at the first unexpected output; never improvise a repair on a real environment. Fix forward with a new reviewed change.

## Record
Append the result to the approval log (date, target, hash, outcome), update `PLAN.md`, and keep evidence files in the repo. An offline PASS never grants cloud authority, and one approval never extends to the next action.

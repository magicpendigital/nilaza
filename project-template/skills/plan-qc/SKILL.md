---
name: plan-qc
description: Plan and quality-control any non-trivial change in this project before editing - session start with PLAN.md, a feature-plan record with impact map and success criteria, scoped implementation, standard checks, the Owner approval boundary, and a handoff that separates verified from unverified. Use whenever a task plans, implements, reviews, refactors, or touches more than one file, data shape, API, security, UI, AI configuration, release or workflow.
---

# Plan & QC

## Start
1. `git fetch`; work from the latest `origin/main` (or the branch the Owner named). Check `git status` is clean or understood.
2. Read `PLAN.md`. Open `docs/HANDOFF.md` and `docs/PLAN_QC.md` only for what the task needs.

## Before editing
1. Name the lane (UI, backend/API, data/migration, AI/LLM, admin, security/privacy, content, release, workflow).
2. Copy `docs/feature-plans/_TEMPLATE.json` to `docs/feature-plans/<task>-<date>.json`; fill goal, measurable success criteria, write scope, untouched surfaces, impact map, security review, validation commands, manager test path, residual risk, and actions needing Owner approval.
3. Run `node scripts/check-plan.mjs --record <record>`. Any unresolved high risk stops the work until the Owner decides.

Writing the record after editing is a process failure; if it happens, say so in the handoff.

## While editing
- Stay inside `writeScope`; new surfaces mean updating the record first.
- Small vertical slices; tests travel with the change; never edit a test or a hash to hide a failure.
- Every admin/config field must have a real consumer, or be hidden.

## Owner approval boundary
Ask the Owner, one decision at a time, using `docs/APPROVALS.md`: SQL or migrations on a real environment, backend deploys, reading or setting secrets, service settings, creating or deleting accounts, releases, deleting data. Never type passwords or keys for the Owner; never read `.env` values. An approval binds the exact target and hash; a changed package needs a new approval. Do not merge without the Owner.

## Delegation
Delegate only with a full brief (goal, files, measurable acceptance, verify command, allowed data, stop condition). Never pass secrets, user data, outward actions (posting, paying, messaging) or SQL/deploys. Review the diff and run the checks before accepting a delegate's branch. Use a different engine as an independent reviewer when a second opinion is required.

## Finish
1. Run the checks in `docs/PLAN_QC.md` section 4 for the lanes touched.
2. Update `PLAN.md` (status, PR, date) and any closed `docs/backlog/` item in the same PR.
3. Report: task, changed, how the Owner can test, verified (commands + results), **not verified**, residual risk, next step or decision needed.

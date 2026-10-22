---
name: nilaza-plan-qc
description: Plan and quality-control Nilaza project tasks before implementation. Use when working in the Nilaza repo, when a user asks to plan, implement, review, update, refactor, add a feature, change visuals/backgrounds, modify mobile/admin/backend/content/safety, website, documents, communications or project-skill behavior, or when a task could affect multiple app surfaces and needs an impact map, validation plan, and manager-readable handoff.
---

# Nilaza Plan & QC

## Workflow

Use this skill before non-trivial Nilaza edits. Keep the plan concise but decision-complete enough that another agent can implement safely. For a new feature, run the Feature Preflight below before implementation.

1. Read `AGENTS.md`, `docs/AGENT_TASK_ROUTER.md`, and `docs/PLAN_QC_PROTOCOL.md`.
2. Identify the task lane: mobile, content, admin, backend, safety/privacy, design, website, documents/communications, skills, or cross-cutting.
3. Produce a Whole-App Impact Brief before edits: entry point, data write, backend contract, admin visibility, privacy/safety, analytics/observability, rollback/fallback, manager test path, and surfaces intentionally left untouched.
4. Build an impact map across navigation, UI, storage, seed data, backend contracts, admin surfaces, localization, safety/privacy, monetization, visual assets, operations, and tests.
5. Write the implementation plan with success criteria, affected files, validation commands, rollout/rollback notes, and manager test path.
6. For a new feature or material expansion, pass the Feature Preflight below before implementation commands or edits.
7. During implementation, keep changes scoped to the plan. If exploration reveals new affected surfaces, update the plan and rerun the preflight before expanding scope.
8. Finish with the Nilaza handoff format: task, plan followed, changed, manager test path, checks run, known risks, recommended next task.

## Feature Preflight

After scoped read-only discovery, prepare `docs/feature-plans/<task>.json` and run `npm run feature:preflight -- --record docs/feature-plans/<task>.json` from the repository root before a new feature's implementation, generation, dependency-install, or development commands. The validator checks the record and current file hashes; it does not create the plan or certify the finished feature. Resolve a failed gate before continuing. An unresolved high-risk issue stops implementation until mitigated and the preflight passes again.

For supported local dev and generation commands, use `npm run feature:run -- --record docs/feature-plans/<task>.json --script mobile:dev`, replacing `mobile:dev` with an allowlisted script from `docs/PLAN_QC_PROTOCOL.md`. The runner repeats preflight before execution, requires the plan to cover the owning app or generated outputs, inventories dirty known execution inputs, and requires current `sourceReview` hashes for generator/Admin server entry scripts and their static local imports. Dirty shared packages may block launch until their state is reviewed. It does not accept arbitrary scripts or passthrough arguments. Direct shell and workspace commands can bypass the runner; dynamic imports and ignored files may escape its input inventory, and CI checks committed feature changes, so continue to follow the documented gate before every new feature.

Review the routed PRD, current implementation and configuration, and actual dependency versions. For volatile API, library, and security claims, consult current official primary sources and record the version or access date. Record each affected repository skill as `updated` or `verified-current` with evidence. A matching skill hash or `skills:check` result proves source/install identity, not semantic freshness. When implementation reveals durable guidance, update affected skill sources and their reviewed hashes, then validate and sync them.

The record covers the plan, Whole-App Impact Brief, manager acceptance path, validation and rollback, plus authentication/authorization and Supabase RLS where applicable, trust boundaries, secrets, sensitive data, untrusted input, logging, dependency provenance, and failure/abuse paths. Declare residual risk and a stop condition. Read [the expanded reference](references/nilaza-plan-qc.md) for cross-cutting or high-risk work.

## Whole-App Impact Brief

Every non-trivial task must cover the full lifecycle, even if the requested change appears to touch one file:

- Entry point: user/admin entry, navigation, deep links, back behavior, and empty states.
- Data write: local state, AsyncStorage, JSON seed data, Supabase tables, migrations, export/delete effects.
- Backend contract: API path, Edge Function, provider boundary, queue/cron behavior, and local fallback.
- Admin visibility: metrics, audit logs, sanitized status, publish/readiness checks, and raw data redaction.
- Privacy/safety: consent, opt-in/out, sensitive data, store-review risk, no provider keys in mobile.
- Analytics/observability: usage events, delivery/error counters, provider health, and blind spots.
- Rollback/fallback: disabled state, backend-down behavior, migration compatibility, and manager-testable fallback.
- Surfaces intentionally untouched: related screens/data/contracts that were reviewed and left unchanged.

Cross-cutting work must read `references/nilaza-plan-qc.md` before implementation. Cross-cutting examples include notification channels, async jobs, auth, payments, admin operations, analytics, privacy controls, shared data shapes, and any feature that changes backend or storage contracts.

## Required Checks

- Mobile UI/content: `npm --workspace apps/mobile run check`, mobile tests, `npm run validate:data`, and the Mobile quality CI result. For build/runtime changes, verify both Metro web export and Android embedded-bundle output before accepting a device build.
- Feature imagery/backgrounds: also run `npm run validate:visual-assets`.
- Admin: `npm run admin:check` and `npm run admin:test`.
- Backend/Supabase: `npm run validate:backend`, `npm run supabase:check`, and `npm run supabase:migration-ledger:check`. Read `docs/SUPABASE_MIGRATION_LEDGER.md`; never run `supabase db push` or migration repair while the ledger is blocked pending reconciliation.
- Shared AI/prompt/API contracts: name one canonical source, version it, validate generated consumers with its contract check, and run authenticated staging E2E whenever protected endpoint behavior changes.
- Agent/workflow changes: run `npm run validate:governance`. A delegation handoff must declare owner, write scope, allowed data classes, validation and a stop condition; it never grants deployment or publishing authority.
- Safety/privacy: run a no-secrets/sensitive-data review and list residual risk.
- Notification/async jobs: include backend contract validation, permission/opt-in review, sanitized admin visibility review, and device QA when native push is involved.

## Nilaza-Specific Rules

- Do not expose AI provider keys in mobile code.
- Keep tarot, astrology, persona, journal, and face-reading boundaries distinct.
- Tarot card selection must be deterministic app/backend logic; AI only interprets selected cards.
- Astrology interpretation must use calculated placements only.
- Face reading must remain consent-first and must not infer protected traits, attractiveness, health, intelligence, criminality, trustworthiness, or identity.
- Notifications must be opt-in for push, generic outside the app, and must never include raw chat, journal notes, tarot questions, birth data, or sensitive AI output.
- User-facing seed content needs `vi` and `en` fields.
- Feature-level imagery must come from `assets/features` and be declared in `packages/content/data/feature-visuals.json`.

## References

Read `references/nilaza-plan-qc.md` when the task is cross-cutting, high-risk, changes shared data/backend contracts, or likely to affect more than one feature.

For Admin configuration, shared prompt consumers, or local/online synchronization, also read [Admin runtime and release parity](references/admin-runtime-parity.md). It covers configuration provenance, asynchronous publish/reveal boundaries, and separate evidence for each synchronization layer.

## Brand and public deliverables

For UI, brand, website, guides or communications, route through `docs/BRAND_GUIDELINES.md` and the brand row in `docs/AGENT_TASK_ROUTER.md`. Use versioned manifest sources and run `npm run validate:brand`. For web/help run web check/build and public-content/corpus checks. For skill updates use repository sources under `skills/`, preserve unrelated installed metadata, validate with Skill Creator quick_validate.py, then sync/check drift.

Separate design-approved, integrated, verified and released; attach build/device evidence to screenshots. Public material uses Help/legal only, never owner/Agent/prompt docs. Backend-only work stays on the backend route; it does not require a brand redesign. Preparing files does not authorize official publishing.

## Release evidence

For an Android or iOS tester build, run `npm run mobile:release:config:check` and record the app version/build number, source state, artifact checksum, CI result and device test path. A green automated check is necessary but does not replace the manager's device review. Keep Expo OTA updates disabled unless its EAS channel/runtime configuration has been separately tested; use a new internal build for each reviewable release candidate.


## Release evidence workflow - 2026-10-04

For staging/production or packaged candidate handoff, read [release-control.md](references/release-control.md) and the repository docs/release/RELEASE_RUNBOOK.md. Preserve the blocked migration ledger. Exact manifest approval and an offline evidence PASS do not grant cloud authority or prove remote enforcement.

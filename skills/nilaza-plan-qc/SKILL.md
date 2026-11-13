---
name: nilaza-plan-qc
description: Plan and quality-control Nilaza project tasks before implementation. Use when working in the Nilaza repo, when a user asks to plan, implement, review, update, refactor, add a feature, change visuals/backgrounds, modify mobile/admin/backend/content/safety, website, documents, communications or project-skill behavior, or when a task could affect multiple app surfaces and needs an impact map, validation plan, and manager-readable handoff.
---

# Nilaza Plan & QC

## Session start and finish

1. `git fetch` and work from the latest `origin/main`; a stale checkout once sat 84 commits behind GitHub.
2. Read `PLAN.md` first: goal, Owner decisions, open work with review IDs, approvals waiting. Open `docs/HANDOFF_CURRENT_STATE.vi.md`, `AGENTS.md`, `docs/AGENT_TASK_ROUTER.md` or `docs/PLAN_QC_PROTOCOL.md` only for what the task needs.
3. Finish every PR or session by updating `PLAN.md` in the same PR: status, PR number, "last updated". When a review item closes, update its `status`, `pr` and `note` in `docs/backlog/review-2026-10-30.json`.

## Workflow

Use this skill before non-trivial Nilaza edits. Keep the plan concise but decision-complete enough that another agent can implement safely.

1. Identify the task lane: mobile, content, admin, backend/AI, safety/privacy, design, website, documents/communications, skills, or cross-cutting. For AI features (prompts, model routes, providers, fallback, context sent to models, live QA traces) also use `$nilaza-ai-runtime`.
2. Produce a Whole-App Impact Brief (below) before edits.
3. Write the implementation plan with success criteria, affected files, validation commands, rollout/rollback notes, and manager test path.
4. Prepare `docs/feature-plans/<task>.json` and pass the Feature Preflight **before** the first edit. Writing the record after editing is a process failure; say so in the handoff if it happens.
5. Keep changes scoped. If exploration reveals new surfaces, update the record and rerun the preflight.
6. Finish with the Nilaza handoff: task, plan followed, changed, manager test path, checks run (verified vs not verified), known risks, next task, and the `PLAN.md` update.

## Feature Preflight

Run `npm run feature:preflight -- --record docs/feature-plans/<task>.json` from the repository root before a new feature's implementation, generation, dependency-install, or development commands, and `node scripts/feature-preflight.mjs --ci --base origin/main` before pushing. The record needs `writeScope` covering every changed feature path, `sourceReview` SHA-256 values (CRLF normalized to LF for text), `workingTreeReview.paths` and a `note` for already-edited files, and `securityReview.unresolvedHighRisks` as a list. Template: the latest record in `docs/feature-plans/`.

For allowlisted local dev and generation commands use `npm run feature:run -- --record <record> --script <name>` (names in `docs/PLAN_QC_PROTOCOL.md`). Direct commands can bypass the runner; CI checks committed changes. Record each affected repository skill as `updated` or `verified-current` with evidence. For volatile API, library, and security claims, cite current official sources with the access date. An unresolved high-risk issue stops implementation.

## Whole-App Impact Brief

- Entry point: user/admin entry, navigation, deep links, back behavior, empty states.
- Data write: local state, AsyncStorage, seed data, Supabase tables, migrations, export/delete effects.
- Backend contract: API path, Edge Function, provider boundary, queue/cron, local fallback.
- Admin visibility: metrics, audit logs, sanitized status, publish/readiness checks, raw data redaction. A field Admin edits must have a real consumer, or be hidden.
- Privacy/safety: consent, sensitive data (journals, birth data), store-review risk, no provider keys in mobile.
- Analytics/observability: usage events, error counters, provider health, blind spots.
- Rollback/fallback: disabled state, backend-down behavior, migration compatibility.
- Surfaces intentionally untouched.

Cross-cutting work (auth, notifications, async jobs, payments, admin operations, shared data shapes, backend or storage contracts) must read [the expanded reference](references/nilaza-plan-qc.md). For Admin configuration or local/online synchronization read [Admin runtime parity](references/admin-runtime-parity.md).

## Owner approval boundary

Ask the Owner for each one, one decision at a time (object, hash or target, risk, undo): running SQL or migrations, deploying Edge Functions, setting or reading secrets, changing Supabase/Vercel/GitHub/EAS/Play settings, creating or deleting accounts, store release, deleting Owner data. Never type passwords or keys for the Owner and never read `.env` values. An approval binds the exact hash it named: when a SQL packet, seed or artifact changes, the approval lapses and must be asked again. Every push to `main` deploys Admin staging; open PRs from `codex/android-release-unblock-2026-10-19` and do not merge without the Owner.

## Required checks

- Mobile: `npx --prefix apps/mobile tsc --noEmit -p apps/mobile`, `npm --prefix apps/mobile test -- --silent`, `npm run validate:data`; for build/runtime changes also the web export and Android embedded bundle (Mobile quality CI). Device behavior (Back, TalkBack, keyboard, large text, reminders) stays "not verified" until tested on a phone.
- Feature imagery: `npm run validate:visual-assets`.
- Admin: `npm run admin:check` and `npm run admin:test`.
- Backend/Supabase: `npm run validate:backend`, `npm run supabase:check`, `npm run supabase:migration-ledger:check`; Deno tests with `npx --yes deno@2 test <path>`. The legacy QA ledger stays blocked: no `db push` or repair there.
- Shared AI/prompt/API contracts: one canonical source, its contract check (`council:contract:check`, `prompt:consumers:check`, `astrology:ai-contract:check`), authenticated staging E2E when protected endpoints change.
- Skills/workflow: `npm run skills:validate`, `npm run validate:governance`, then `npm run skills:sync` and `npm run skills:check`.
- Safety/privacy: no-secrets review and residual risk.

## Delegation (subagents and mca)

Delegate only work with a clear brief, write scope, allowed data, acceptance and stop condition; review every result before accepting it. Never pass secrets, `.env` values, user data or outward actions (posting, paying, messaging) to a delegate. Useful mca capabilities: `second_opinion` or the `quality.evaluator` role for an independent review on another engine (AI answer quality, security, Tarot art QC where an independent reviewer is required); `write_tests` for bulk tests; `refactor_mechanical` for repetitive renames; `image` / `generate-asset` for artwork and icons (still subject to Tarot art QC); `design_mockup` for quick layout drafts; `write_content` and marketing roles for store listing and social drafts (publishing stays an Owner action). Results arrive on `mca/ext/<id>` branches: diff and test them before merging into a PR branch.

## Nilaza-specific rules

- No AI provider keys in mobile code; all model calls go through Edge Functions.
- Tarot card selection is deterministic app/backend logic; AI only interprets selected cards. Astrology interpretation uses calculated placements only.
- Face reading stays consent-first and never infers protected traits, attractiveness, health, intelligence, criminality, trustworthiness, or identity.
- Push notifications are opt-in and generic; never include raw chat, journal notes, tarot questions, birth data, or sensitive AI output.
- User-facing seed content needs accented `vi` and `en` fields. Crisis support uses 115 only.
- Feature imagery comes from `assets/features` and `packages/content/data/feature-visuals.json`.

## Brand, public deliverables and release

UI, brand, website, guides or communications: `$nilaza-brand-experience`, `docs/BRAND_GUIDELINES.md`, `npm run validate:brand`. Keep design-approved, integrated, verified and released separate; public material uses Help/legal only. For a tester build run `npm run mobile:release:config:check` and record version, source commit, artifact checksum, CI result and device path. For staging/production or SQL packets read [release-control.md](references/release-control.md) and `docs/release/RELEASE_RUNBOOK.md`; an offline evidence PASS never grants cloud authority.

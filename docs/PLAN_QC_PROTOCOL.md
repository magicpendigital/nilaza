# Nilaza Plan & QC Protocol

Last updated: 2026-09-27

Use this protocol before implementing any Nilaza task. Its purpose is to make every change plan-led, impact-aware, and reviewable across the whole app.

## Required Gate

Before code or content edits, produce or confirm a plan that includes:

- Goal and manager-testable success criteria.
- Task lane: mobile, content, admin, backend, safety/privacy, design, web, documents/communications, skills, or cross-cutting.
- Impact map across navigation, UI surfaces, storage, seed data, backend contracts, admin tools, localization, safety/privacy, visual assets, and tests.
- Files expected to change and files intentionally left untouched.
- Validation commands and manual QA path.
- Rollback or fallback behavior when the app runs without backend services.

## Whole-App Impact Gate

Every non-trivial task must include a Whole-App Impact Brief before edits begin. This is required even when the requested change appears to touch a single file.

The brief must cover the full lifecycle:

- Entry point: where the user/admin enters the flow, including navigation, deep links, and empty states.
- Data write: local state, AsyncStorage, JSON seed data, Supabase tables, migrations, and deletion/export effects.
- Backend contract: API path, Edge Function, provider boundary, queue/cron behavior, and local fallback.
- Canonical contract: identify the single config/schema source for every shared prompt, model route or API response, plus generated consumers and version compatibility.
- Admin visibility: what operators can see, what is redacted, audit logs, metrics, and publish/readiness checks.
- Privacy and safety: consent, opt-in/out, sensitive data, store-review risks, and no provider keys in mobile.
- Analytics and observability: usage events, delivery/error counters, and residual blind spots.
- Rollback: disabled state, backend-down behavior, migration compatibility, and manager-testable fallback.
- Surfaces intentionally untouched: related screens/data/contracts that were reviewed and left unchanged.
- Agent handoff: owner, declared write scope, allowed data classes, validation, stop condition and whether a production action would need a manager decision.

Cross-cutting tasks must read the expanded Plan-QC reference and task-specific docs before implementation. Examples include notification channels, async jobs, auth, payments, storage, admin operations, analytics, privacy controls, and anything that changes shared data shapes.

Small typo-only fixes may use a short inline plan locally, but they still need scoped validation. Any pull request touching feature documentation or design must include a JSON Feature Preflight record under the conservative CI gate, even when the local edit was typo-only.

## Feature Preflight Before Implementation

For each new feature or material expansion, finish scoped read-only discovery and prepare `docs/feature-plans/<task>.json`. Run the gate from the repository root **before implementation edits, generators, dependency installs, or development commands**:

```powershell
npm run feature:preflight -- --record docs/feature-plans/<task>.json
```

The record identifies `taskId`, `ownerAgent`, lane, goal, success criteria, write scope, surfaces left untouched, the Whole-App `impact` fields, canonical contracts, validation commands, manager test path, residual risk, and external actions. `sourceReview` binds core documents and routed implementation/config files to their current SHA-256 and review reason; `workingTreeReview` accounts for existing changes. `skillReview` names each affected repository skill, including `nilaza-plan-qc`, and records an `updated` or `verified-current` decision with evidence. Review actual dependency/config versions and cite current official primary sources for volatile API, library, or security claims. Skill hashes and `skills:check` establish byte identity and installed drift status, not semantic freshness.

In `securityReview`, assess authentication/authorization and Supabase RLS where applicable, trust boundaries, sensitive data, secrets and logging, untrusted inputs and prompt injection, dependency provenance, migration/release effects, abuse and failure paths. Record mitigation, validation, residual risk and a stop condition. **Stop before implementation when any high-risk issue remains unresolved**; mitigate it and rerun the preflight. A passing record checks this gate, not the finished feature, and does not authorize deployment, publishing, credential use, migration repair, or other production actions.

For supported local development and generation commands, use the gated runner after preparing the record:

```powershell
npm run feature:run -- --record docs/feature-plans/<task>.json --script mobile:dev
```

The runner repeats preflight immediately before an allowlisted command, checks that `writeScope` includes the owning app or every generated output, and rejects arbitrary npm scripts and passthrough arguments. It inventories staged, unstaged, and untracked files in the command's known execution inputs, including shared packages for development servers; each dirty input must be covered by `writeScope` or a current `sourceReview` hash. Generator and Admin server entry scripts, plus their statically resolved local imports, must always have current `sourceReview` hashes. Supported scripts are `web:dev`, `admin:dev`, `mobile:dev`, `mobile:web`, `admin:seed`, `admin:growth:seed`, `public-help-corpus:build`, `assets:generate`, `council:contract:generate`, `astrology:contract:generate`, and `astrology:ai-contract:generate`. Use the same syntax with the required script name. Dirty shared packages or build inputs can intentionally block launch until a clean checkout or reviewed evidence is available. The input inventory cannot prove the complete runtime dependency graph, especially dynamic imports and ignored files. Ordinary direct shell, workspace, and root npm commands remain possible and can bypass this local runner; agents must still follow the preflight instruction, and CI checks committed feature changes against reviewed records. This gate reduces risk but does not prove that every local command ran after review.

`prompt:consumers:generate` is also allowlisted. It produces the six fixed Admin and Edge prompt consumer files from the canonical bundle. Run `npm run prompt:consumers:check` before packaging either app; generated copies are not independently editable prompt sources.

After implementation and validation, update affected skill sources and reviewed manifest entries when durable guidance changed; otherwise retain the verified-current rationale. Validate, sync, and check changed skills. Rerun preflight when scope, dependency versions, data flow, or security assumptions materially change.

## Impact Map Checklist

Every non-trivial task must consider:

- **Navigation:** tabs, subflows, deep links, back behavior, empty states.
- **Data:** local state, AsyncStorage, JSON seed data, Supabase/backend contracts, migrations.
- **UI:** A2UI reuse, mobile layout around 390 x 884, loading/error/empty states, image ownership.
- **Content:** bilingual `vi` and `en`, safety disclaimers, persona transparency, tarot/astrology boundaries.
- **Safety/privacy:** no provider keys in mobile, no raw private content in admin surfaces, consent/deletion controls for sensitive flows.
- **Admin:** content operations, AI Studio prompt/config surfaces, metrics, publish/readiness checks.
- **Tests:** type check, data validation, backend/admin checks, visual/manual happy path.
- **Operations:** queues, cron, notifications, delivery logs, provider health, admin audit, and rollback.
- **Release provenance:** app/build version, commit or reviewed source state, artifact checksum, CI result and device evidence.
- **Migration ledger:** live/local migration status, safe forward path, and explicit owner approval before database repair or push.
- **Store readiness:** iOS/Android permission prompts, opt-in language, subscription/payment rules, and sensitive-content disclosures.

## QC Output

Each implementation handoff should include:

```text
Task:
Plan followed:
Changed:
Manager test path:
Checks run:
Known risks:
Recommended next task:
```

## Visual Asset Rule

Feature-level imagery must come from `assets/features` and be declared in `packages/content/data/feature-visuals.json`. Tarot deck/card assets may only appear on Tarot surfaces; persona portraits may only appear on Persona/Guide surfaces unless an explicit Plan-QC exception is documented.

Run:

```powershell
npm run validate:visual-assets
```

## Default Validation Matrix

- Mobile UI/content task: `npm --workspace apps/mobile run check`, mobile tests, `npm run validate:data`, CI web-export/embedded-bundle checks, and relevant mobile happy path.
- Visual/background task: add `npm run validate:visual-assets`.
- Admin task: `npm run admin:check`, `npm run admin:test`, and both protected admin workspace happy paths.
- Backend/Supabase task: `npm run validate:backend`, `npm run supabase:check`, `npm run supabase:migration-ledger:check`, canonical contract check when applicable, and authenticated staging E2E for changed protected endpoints.
- Agent/workflow task: `npm run validate:governance`, declared handoff/stop conditions, `npm run skills:validate` for repository skill changes, and `npm run skills:check` after sync. Also run Skill Creator validation when a Python runtime with PyYAML is available; report when it is unavailable.
- Safety/privacy task: safety checklist, no-secrets scan, and explicit residual risk notes.

## Brand, Public Content And Skill Gate

For UI, identity or public-content work, read `docs/BRAND_GUIDELINES.md`. Identify brand version, manifest roles, font sources, asset generation and the exact public surfaces affected. Keep design-approved, integrated, verified and released separate; record app/build reference and evidence for screenshots. Use repository skill sources, preserve unrelated invocation metadata, and run skill drift checks after syncing. Backend-only tasks do not acquire design work.

- Brand: `npm run validate:brand` and `npm run assets:generate -- --check`.
- Skills: `npm run skills:validate`, then sync and run `npm run skills:check`; run system Skill Creator `quick_validate.py` on each changed repo skill when a Python runtime with PyYAML is available, and report when unavailable. Review realistic routing for each changed capability.
- Web/public docs: `npm run web:check`, `npm run web:build`, `npm run validate:public-content`; allow only Help/legal in corpus and public guides, never internal owner/Agent/prompt data.
- DOCX/PDF/PPTX: render every page, check Vietnamese glyphs, overflow, imagery, links and source/export parity. For the launch package follow `design/launch/open-reflection-v1/README.md` and run `npm run validate:launch`; a changed PDF must be rendered and reviewed again before updating its checksum.
- Native icon/splash: check release builds on supported iOS/Android devices; a browser or Expo Go pass is not native evidence.

Keep generated artwork separate from screenshots. Before official release, require the manager to review app RC, website preview and launch artifacts with the same version; do not infer publishing authorization from file preparation.


## Release evidence workflow - 2026-10-04

Route release/environment preparation to docs/release/RELEASE_RUNBOOK.md and the exact-version owner packet. Use scripts/release-evidence.mjs for read-only evidence verification after appropriate existing checks. Preserve the migration-ledger stop condition, dirty input review and feature preflight. Production credentials, target mapping, remote protection and release execution are separate owner-approved gates. Missing or unrun evidence is BLOCKED, not PASS.

# Nilaza Plan & QC Reference

Use this reference to expand the plan when a task can affect more than one surface. Keep feature preflight evidence task-specific.

## Feature Preflight Record

For each new feature or material expansion, prepare `docs/feature-plans/<task>.json` after scoped read-only discovery. Run `npm run feature:preflight -- --record docs/feature-plans/<task>.json` before implementation commands or edits. Follow the repository validator's record schema: task identity and owner, lane and write scope; goal and `successCriteria`; `untouchedSurfaces`; the seven `impact` fields; `canonicalContracts`; `sourceReview`, `skillReview`, `dependencyReview`, and `externalSourceReview`; `securityReview`; `workingTreeReview`; validation commands, manager test path, residual risk, and external actions. The core docs and `nilaza-plan-qc` skill belong in the review. Each local source entry records its path, SHA-256 and reason. A skill decision is `updated` or `verified-current` with evidence; it is not inferred from the hash.

For supported local development and generation commands, use `npm run feature:run -- --record docs/feature-plans/<task>.json --script <allowlisted-name>`. This repeats preflight immediately before the command, verifies write scope against the command's app or outputs, and checks dirty known execution inputs against planned scope or current source hashes. Generator/Admin server entry scripts and statically resolved local imports always need current `sourceReview` hashes. The allowlist is in `docs/PLAN_QC_PROTOCOL.md`; arbitrary scripts and passthrough arguments are rejected. Dirty shared inputs can block launch. Direct shell/workspace commands still bypass this runner, its static scan cannot identify every runtime dependency, and CI can only verify committed changes, so the owner must enforce the pre-edit review discipline.

Check installed dependency/config versions and current official primary sources for volatile API or security behavior. In `securityReview`, consider trust boundaries, authentication and authorization, Supabase RLS where relevant, private data, secrets and logging, untrusted inputs and prompt injection, dependency provenance, migration/release effects, and failure or abuse cases. Give material risks a mitigation and validation path. Set a concrete stop condition; unresolved high-risk findings block implementation, and the preflight must pass again after mitigation. Record database-write intent accurately. A passing record is not permission for production actions or a guarantee of zero risk.

After implementation, compare findings with the skill decisions. Update affected repository skill sources and reviewed hashes when durable guidance changed; otherwise retain the verified-current rationale. Run skill validation and sync after changes, then report residual risk in the handoff.

## Whole-App Impact Map

- Navigation: tabs, subflows, back behavior, deep links, entry points, deferred features.
- UI: A2UI reuse, mobile viewport around 390 x 884, empty/loading/error states, image ownership.
- Data: local state, AsyncStorage, JSON seed data, Supabase contracts, migrations, generated artifacts, export/delete effects.
- Backend: API routes, Edge Functions, provider abstractions, queue/cron jobs, sync vs async behavior, local fallback.
- Async operations: job status, background state, polling/realtime, notifications, retries, receipt tracking, invalid-token cleanup.
- Content: bilingual copy, prompt versions, persona transparency, tarot/astrology caveats, store-review wording.
- Safety/privacy: provider keys, private chat/journal visibility, birth data, photo consent/deletion, notification opt-in/out, admin redaction.
- Monetization: premium gates, credits, entitlements, payment provider contracts, restore/error states when touched.
- Admin: Content Operations, AI Studio, notification/job status, metrics, audit logs, publish readiness.
- Observability: usage events, provider health, delivery logs, failure counts, residual blind spots.
- Rollback: disabled states, backend-down behavior, migration compatibility, local-only fallback.
- Tests: type check, data validation, visual asset validation, backend/admin checks, manual happy path.
- Store readiness: iOS/Android permissions, notification prompt timing, sensitive-content disclosures, subscription/payment rules.

## Whole-App Impact Brief Template

```text
Goal:
Task lane:
Entry points:
Data writes:
Backend contracts:
Admin visibility:
Privacy/safety:
Analytics/observability:
Rollback/fallback:
Surfaces intentionally untouched:
Validation:
Manager test path:
```

## Notification/Communication Checklist

- Push is opt-in and never requested on the first onboarding screen.
- In-app inbox remains available when push is denied, unavailable, or backend sync fails.
- Push payloads are generic and never include raw chat, journal notes, tarot questions, birth data, relationship details, or sensitive AI output.
- User can disable all push or specific notification types.
- Admin sees sanitized counts/status, not private message or journal content.
- Delivery attempts, receipts, invalid tokens, and fallback behavior are visible enough to debug staging.

## Handoff Template

```text
Task:
Plan followed:
Changed:
Manager test path:
Checks run:
Known risks:
Recommended next task:
```

## Agent and Contract Checklist

For Admin configuration or synchronization work, use [Admin runtime and release parity](admin-runtime-parity.md) to trace actual consumers and distinguish frontend, runtime, data, device and installed-skill evidence.

- State the owner agent, task ID, declared write scope, allowed data classes, validation and stop condition before delegation.
- Default to sanitized project context. Never provide raw chat, journal text, birth data, face uploads, service-role keys or provider secrets to a sub-agent.
- A configured role is not permission to deploy, publish, repair migrations or take irreversible action. Stop and return control when that authority is needed.
- For a shared API/model/prompt configuration, identify exactly one canonical source and generate or validate downstream artifacts from it. Reject semantic version fields that are reused for different concepts.
- Protected endpoint changes require a sanitized, authenticated staging test. Keep its credentials and test input in CI secrets; do not echo either into logs.

## Mobile CI and Release Checklist

- Mobile CI must type-check, test, validate data and verify both the Metro web export and the Android embedded bundle.
- Treat a red CI check as a delivery blocker. A green check proves only the automated contract, not visual/device acceptance.
- Record release version/build number, artifact SHA-256, source revision or reviewed source state, CI result and device evidence with the test APK/IPA.
- Keep EAS OTA updates disabled until update-channel and runtime-version behavior is separately configured and tested. Use a new internal build for each review candidate meanwhile.

## Supabase Migration Ledger Checklist

- Run `npm run supabase:migration-ledger:check` and read `docs/SUPABASE_MIGRATION_LEDGER.md` before any database write.
- If the ledger status is blocked pending reconciliation, do not run `supabase db push` or `migration repair`.
- Review the intended target and forward path with the database owner. Preserve recovered SQL as evidence; do not import a foreign product schema into Nilaza's executable baseline just to match migration timestamps. A clean QA target and retention of the divergent environment may be the approved path; confirm that decision in the current ledger rather than repeating historical repair recommendations.

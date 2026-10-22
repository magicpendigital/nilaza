# Nilaza Agent Task Router

Last updated: 2026-09-27

Use this file after `AGENTS.md`. It tells a new agent what to read first, where to edit, and how to verify work without scanning the whole repository.

## Fast Start

For most tasks, read in this order:

1. `AGENTS.md` for product context, scope, guardrails, and definition of done.
2. This file for task routing.
3. `docs/PLAN_QC_PROTOCOL.md` for the required plan, impact map, and QC gate.
4. Only the task-specific docs and implementation paths listed below.

For a new feature or material expansion, prepare its Feature Preflight record and run `npm run feature:preflight -- --record docs/feature-plans/<task>.json` after scoped discovery and before implementation commands or edits. Use the allowlisted `feature:run` runner for supported development and generation commands; see `docs/PLAN_QC_PROTOCOL.md`. Review actual versions and affected skill guidance; matching hashes alone do not prove that knowledge is current.

Do not read the entire codebase unless the task is cross-cutting, the router points to multiple ownership areas, or the first scoped read shows the feature is wired somewhere unexpected.

## Task Routing

| Task type | Read first | Usual edit paths | Verify with |
| --- | --- | --- | --- |
| Brand identity, website/header, public documents, social/store assets, Agent skills | `docs/BRAND_GUIDELINES.md`, `docs/BRAND_ROLLOUT_2026-09-11.md`, `docs/NILAZA_PUBLIC_HELP_CORPUS.md`; `DESIGN.md` for UI; document/slide/PDF skill for that artifact | `assets/brand/open-reflection/v1`, `packages/content/data/brand-identity.json`, `skills`, `scripts/generate-brand-assets.mjs`, web/Admin/mobile brand components, `design/launch/open-reflection-v1` | `npm run validate:brand`, `npm run skills:check`; `npm run validate:launch` for launch documents/graphics; web/public-content checks or mobile/admin checks for touched surfaces; rendered artifact review |
| Product scope, PRD, acceptance criteria, MVP task status, End-User guides | `AGENTS.md`, `docs/NILAZA_END_USER_GUIDE.md`, `docs/FEATURE_PRD.md`, `docs/MVP_IMPLEMENTATION_PLAN.md`, `docs/MVP_TASK_CHECKLIST.md` | `docs/FEATURE_PRD.md`, `docs/MVP_IMPLEMENTATION_PLAN.md`, `docs/MVP_TASK_CHECKLIST.md`, `AGENTS.md` only if high-level direction changes | Manager-readable checklist |
| Mobile UI or flow implementation | `AGENTS.md`, `docs/BRAND_GUIDELINES.md`, `DESIGN.md`, `docs/STITCH_DESIGN_STATUS.md`, `apps/mobile/src/a2ui/README.md`, relevant section in `docs/FEATURE_PRD.md` | `apps/mobile/App.tsx`, `apps/mobile/src/a2ui`, `apps/mobile/src/theme.ts`, `apps/mobile/src/types.ts`, `apps/mobile/src/storage.ts` | `npm --workspace apps/mobile run check`, tests, Metro web export, Android embedded-bundle check, device happy path |
| Mobile component library or reusable UI architecture | `AGENTS.md`, `DESIGN.md`, `apps/mobile/src/a2ui/README.md`, `docs/STITCH_DESIGN_STATUS.md` | `apps/mobile/src/a2ui`, `apps/mobile/src/theme.ts`, `docs/AGENT_TASK_ROUTER.md`; feature adapters under `apps/mobile/src/features/<feature>` when needed | `npm --workspace apps/mobile run check`, targeted component tests, mobile viewport review |
| Design QA or structural Stitch reference | `docs/BRAND_GUIDELINES.md`, `DESIGN.md`, `docs/STITCH_DESIGN_STATUS.md`, `design/stitch/2026-06-08/stitch_nilaza_mobile_app_design` | Usually `apps/mobile/App.tsx` and `apps/mobile/src/theme.ts` | Mobile viewport review around 390 x 884 |
| Tarot content, artwork or deck production | `docs/TAROT_CONTENT_SYSTEM.md`, `packages/content/data/tarot-decks.json`, `packages/content/data/tarot-cards.json`, `packages/agent-config/tarot-card-skills.json`, `skills/nilaza-tarot-deck-production/SKILL.md`; also `skills/nilaza-tarot-content-qc/SKILL.md` for copy and `skills/nilaza-tarot-art-qc/SKILL.md` for art | `packages/content/data`, `assets/tarot`, Tarot mobile asset maps, Tarot skills and QC scripts | `npm run validate:data`, `node scripts/tarot-deck-quality-gate.mjs verify --deck <id>` (add `--require-deck-intros` for a new deck), `python scripts/validate_tarot_assets.py --deck <source-folder>` (`stellar-academy` for `stellar-mosaic`); add `npm run validate:visual-assets` and mobile check when integrated |
| Persona or guide content | `docs/FEATURE_PRD.md`, `docs/AGENT_ARCHITECTURE.md`, `packages/content/data/personas-figures.json`, `packages/content/data/personas-books.json` | `packages/content/data/personas-*.json`, `packages/agent-config/prompt-library.json` | `npm run validate:data`, IP/safety wording review |
| Prompt or product-agent config | `docs/AGENT_ARCHITECTURE.md`, `packages/agent-config/product-agents.json`, `packages/agent-config/prompt-library.json`, `packages/agent-config/safety-rules.json` | `packages/agent-config` | `npm run validate:data`, prompt safety review |
| Safety, privacy, or policy review | `AGENTS.md`, `docs/WORKFLOWS_SECURITY_RESEARCH.md`, `packages/agent-config/safety-rules.json`, `apps/mobile/src/storage.ts` | `docs`, `packages/agent-config`, storage or logging code when needed | Safety checklist, no-secrets check, explain residual risk |
| Backend/Supabase/API planning | `docs/BACKEND_PROXY_ARCHITECTURE.md`, `docs/SUPABASE_MIGRATION_LEDGER.md`, `docs/AGENT_ARCHITECTURE.md`, `docs/AGENT_RUNBOOK.md`, `AGENTS.md` | `supabase`, `scripts`, `packages/agent-config`, backend docs | `npm run validate:backend`, `npm run supabase:check`, `npm run council:contract:check` when applicable, reviewed migration ledger, authenticated staging E2E for endpoint changes |
| Notifications, async jobs, reminders, or communication channels | `docs/BACKEND_PROXY_ARCHITECTURE.md`, `docs/FEATURE_PRD.md` sections 6.1, 6.2, 6.5, 6.7, 6.10, `docs/PLAN_QC_PROTOCOL.md`, `apps/mobile/src/a2ui/README.md`, `apps/admin/AGENTS.md` | `apps/mobile/App.tsx`, `apps/mobile/src/notifications.ts`, `apps/mobile/src/backendClient.ts`, `apps/mobile/src/types.ts`, `supabase/migrations`, `supabase/functions`, `apps/admin`, `docs` | `npm --workspace apps/mobile run check`, `npm run validate:backend`, `npm run supabase:check`, `npm run admin:check`, device push test |
| Admin operations UI | `apps/admin/AGENTS.md`, `docs/NILAZA_ADMIN_AI_STUDIO_OWNER_GUIDE.md`, `docs/NILAZA_OWNER_QUICK_REFERENCE.md`, `docs/ADMIN_DATA_CONSOLE_ARCHITECTURE.md`, `docs/ADMIN_WEBAPP_DATA_PLAN.md`, `packages/agent-config/admin-metrics.json`, `packages/agent-config/prompt-library.json` | `apps/admin`, `packages/agent-config`; mobile Admin Operations only when explicitly requested | `npm run admin:check`, `npm run admin:test`, both Content and AI Studio browser happy paths |
| Growth Operations / marketing readiness | `apps/admin/AGENTS.md`, `docs/GROWTH_OPERATIONS_HANDOFF_2026-09-30.vi.md`, `docs/NILAZA_WAITLIST_MARKETING_AUTOMATION_PLAN.md`, `docs/MARKETING_AI_TEMPLATE_HANDOFF_2026-09-22.vi.md`, latest product review/native evidence referenced by `packages/growth-nilaza/product-truth.json` | `packages/growth-nilaza`, `apps/admin/growth*`, `apps/admin/admin-capabilities.json`, `scripts/build-admin-growth.mjs`; generated snapshot only through `feature:run --script admin:growth:seed` | `npm run admin:check`, `npm run admin:test`, `npm run growth:validate`, `npm run growth:test`; browser inspect VI/EN drafts and evidence, independent waitlist failure/explicit fixture/retry; retain both existing workspaces |
| QA handoff or release readiness | `docs/MVP_IMPLEMENTATION_PLAN.md`, `docs/MOBILE_EAS_TESTING.md`, `docs/MOBILE_CI_OWNER_GUIDE.md`, `packages/agent-config/feature-workflows.json`, `apps/mobile/package.json`, `scripts/validate-data.mjs` | Usually no edits unless fixing blockers | Mobile quality CI, `npm run mobile:release:config:check`, manager device test and release manifest |
| Agent/workflow/skill governance | `docs/AGENT_RUNBOOK.md`, `packages/agent-config/agent-execution-policy.json`, `packages/agent-config/feature-workflows.json`, `skills/nilaza-plan-qc/SKILL.md` | `packages/agent-config`, `skills`, `docs`, `.github/workflows` | `npm run validate:governance`, Skill Creator validation, `npm run skills:check` after sync |
| Plan & QC gate for any non-trivial task | `AGENTS.md`, `docs/AGENT_TASK_ROUTER.md`, `docs/PLAN_QC_PROTOCOL.md`, task-specific row above | `docs/feature-plans/<task>.json` for new features; protocol or task board only when its guidance changes | `npm run feature:preflight -- --record docs/feature-plans/<task>.json` before new-feature implementation; manager-readable impact map and validation matrix |

## Current App Implementation Map

The MVP is a hybrid Expo app: local cache/fallback keeps review flows usable, while signed-in accounts use the configured Supabase backend for supported sync and AI endpoints.

Primary app file:

- `apps/mobile/App.tsx`: onboarding, tab shell, Home, Explore, Chat, Tarot, Journal, Profile, Admin Operations, local response helpers.

Supporting mobile files:

- `apps/mobile/src/theme.ts`: shared palette and spacing.
- `apps/mobile/src/a2ui`: reusable mobile component library and cross-feature UI patterns.
- `apps/mobile/src/features/council`: AI Council room presentation and state/orchestration hook built on A2UI chat patterns.
- `apps/mobile/src/features/persona`: Persona chat room presentation built on A2UI chat patterns.
- `apps/mobile/src/storage.ts`: AsyncStorage wrappers.
- `apps/mobile/src/types.ts`: shared local TypeScript shapes.
- `apps/mobile/package.json`: Expo scripts and mobile dependencies.

Seed/config sources:

- `packages/content/data/tarot-decks.json`
- `packages/content/data/tarot-cards.json`
- `packages/content/data/personas-figures.json`
- `packages/content/data/personas-books.json`
- `packages/agent-config/product-agents.json`
- `packages/agent-config/coding-agents.json`
- `packages/agent-config/feature-workflows.json`
- `packages/agent-config/prompt-library.json`
- `packages/agent-config/safety-rules.json`
- `packages/agent-config/admin-metrics.json`

## Implemented Screen Inventory

| Area | Current status | Main source of truth |
| --- | --- | --- |
| Onboarding | Open Reflection target: auth-first welcome, optional single goals step; integration/verification tracked in rollout record | `DESIGN.md`, `docs/FEATURE_PRD.md`, `apps/mobile/App.tsx` |
| Home | Implemented daily insight, tarot/chat/journal quick actions, featured guide, recent readings | `docs/BRAND_GUIDELINES.md`, `apps/mobile/App.tsx`; rollout record for verification |
| Explore | Implemented search, category chips, tarot hero, astrology/face previews, wisdom library, decks, guides | Stitch `explore_3`, `apps/mobile/App.tsx` |
| Chat | Implemented guide list, persona detail, persona chat room, suggested prompts, AI Council room, local replies, save to Journal | Stitch choose guide/persona detail/chat room, `apps/mobile/App.tsx`, `apps/mobile/src/features/persona`, `apps/mobile/src/features/council` |
| Tarot | Implemented topic, deck discovery/list, deck detail guide, 78-card library, draw, result, save to Journal, follow-up entry | Stitch tarot topic/deck/draw/result, local tarot data |
| Journal | Implemented saved insights list, filters, empty state actions | Stitch journal direction, local AsyncStorage |
| Profile | Implemented profile, birth fields, preferences, premium preview, privacy copy, reset, admin entry | Stitch profile/premium direction |
| Admin Operations | Implemented dashboard, prompts, content, jobs, safety audit using local config data | Stitch admin screens, `packages/agent-config` |
| Desktop Admin Console | Implemented protected shell with Content Operations CRUD and AI Configuration Studio | `apps/admin/admin-capabilities.json`, `apps/admin` |
| Astrology | Owner-approved A3/A4: local personal chart + 12-chapter mythology library; device review candidate, cloud/release gated | `docs/A3_A4_REVIEW_HANDOFF_2026-09-22.vi.md`, `packages/astrology-core/README.md`, `apps/mobile/src/features/astrology`; core/schema/accuracy/grid tests + mobile checks |
| Face Reading | Preview only in Explore; full consent/upload flow deferred | Phase 3 |

## Decision Rules For Agents

- Keep the MVP navigation as bottom tabs: Home, Explore, Chat, Journal, Profile.
- Keep Tarot as a subflow, not a permanent bottom tab.
- Keep deck discovery distinct from the draw ritual: Explore/hero "Explore decks" opens the deck list, choosing a deck leads to deck detail/learning, and only the deck detail sticky CTA should enter draw.
- Keep tarot deck detail story-first: use one deck-theme hero background, surface the deck story in the first viewport, provide a browsable 78-card library, and keep draw/change-deck actions in a sticky bottom row.
- Keep tarot draw ritual one-card-at-a-time by default for multi-card spreads. A separate quick-draw action may draw the full spread, and share previews must show every selected card.
- Keep tarot card detail as a visual study screen: large card artwork, labeled header actions, upright/reversed meanings, reflection prompt, previous/next card navigation, and no repeated icon-only button rows.
- In tarot draw, reveal each drawn card's artwork and meaning immediately, then synthesize the full reading only after the full spread is drawn.
- Astrology scope was explicitly expanded by the owner for A3/A4; follow its latest handoff and release gates. Face Reading remains deferred.
- Use `docs/BRAND_GUIDELINES.md` for identity and `DESIGN.md` for product layouts. Backend-only work does not require the brand route.
- Before adding new local UI, check `apps/mobile/src/a2ui/README.md` and reuse or extend A2UI when the pattern is cross-feature.
- Use Stitch exports only as structural references for unchanged screens. Welcome/onboarding/Home and old brand marks are superseded by Open Reflection v1.
- Keep all spiritual content framed as entertainment and self-reflection.
- Do not implement non-trivial work until the Plan & QC gate identifies affected surfaces, validation commands, and manager-testable acceptance criteria.
- Before new-feature implementation, verify current sources and relevant skills, review security risks and pass Feature Preflight. Stop for unresolved high-risk findings and rerun the gate after material scope changes.
- For notification, reminder, async job, auth, payment, admin, or shared data-shape changes, complete the Whole-App Impact Gate before edits and list surfaces intentionally left untouched.
- Do not expose AI provider API keys in mobile code.
- Keep user-facing seed content bilingual with `vi` and `en` fields.
- Prefer small vertical slices that a non-technical reviewer can test.
- Treat `packages/agent-config/council-contract.json` as the canonical AI Council API contract. Generated backend artifacts must pass `npm run council:contract:check`.
- Treat a non-empty migration ledger as a release blocker for any database write, not a reason to run automatic repair.
- Do not report a mobile change release-ready until CI has passed its web export and Android embedded-bundle checks, then a tester has completed the stated device path.

## Validation Commands

Use these commands from the repository root when relevant:

```powershell
npm run feature:preflight -- --record docs/feature-plans/<task>.json
npm --workspace apps/mobile run check
npm --workspace apps/mobile test -- --runInBand
npm run council:contract:check
npm run validate:governance
npm run supabase:migration-ledger:check
npm run validate:data
npm run admin:check
npm run admin:test
npm --workspace apps/mobile run web
```

Expo web preview should use `localhost` for this checkout. If the preview is already running, open:

```text
http://localhost:8081/
```

## When A Full Codebase Read Is Justified

Read broadly only when:

- The request changes app architecture, routing, storage, backend contracts, or shared data shapes.
- A task touches more than one lane in `packages/agent-config/feature-workflows.json`.
- The targeted files contradict the docs.
- The agent cannot find the feature in the routed paths.
- Security/privacy risk depends on hidden call sites or data flow.

Otherwise, follow the router and keep the context small.


## Release evidence workflow - 2026-10-04

Route release/environment preparation to docs/release/RELEASE_RUNBOOK.md and the exact-version owner packet. Use scripts/release-evidence.mjs for read-only evidence verification after appropriate existing checks. Preserve the migration-ledger stop condition, dirty input review and feature preflight. Production credentials, target mapping, remote protection and release execution are separate owner-approved gates. Missing or unrun evidence is BLOCKED, not PASS.

# Nilaza MVP Task Checklist

**Current identity (2026-09-11): Open Reflection v1.** Read [Brand Guidelines](BRAND_GUIDELINES.md) before brand/UI/public-content changes. Implementation and verification status: [rollout record](BRAND_ROLLOUT_2026-09-11.md). Historical Stitch references do not authorize old logos or the superseded onboarding/Home layout.

Open Reflection acceptance: auth-first; goals 1–3 or Skip; name/tone retained; save failure/retry; no repeat onboarding; Home Today Pulse primary with Chat/Journal secondary. Prior Done rows describe earlier feature work and do not certify this rollout.

Last updated: 2026-09-27

Use this checklist as the live coordination board for MVP development. It does not replace `AGENTS.md`, `docs/AGENT_TASK_ROUTER.md`, `docs/FEATURE_PRD.md`, or `DESIGN.md`.

Before starting a task:

1. Read `AGENTS.md`.
2. Read `docs/AGENT_TASK_ROUTER.md`.
3. Read only the task-specific docs and files listed in the row you are taking.
4. Keep the change small enough for a non-technical manager to test.

Status values:

- `Done`: implemented and locally verified.
- `In progress`: actively being implemented.
- `Next`: ready for the next agent to pick up.
- `Blocked`: cannot continue without a decision, credential, dependency, or missing asset.
- `Deferred`: intentionally outside the current MVP.

Priority values:

- `P0`: required before backend integration or closed beta.
- `P1`: important for MVP quality.
- `P2`: useful polish or later expansion.

## Current MVP Snapshot

| Area | Status | Notes |
| --- | --- | --- |
| Local-first mobile app | Done | Expo scaffold exists with onboarding, Home daily insight plus Today Pulse ritual, situation-based Chat entry points, AI Council local-first mode, Chat, Tarot V2, Journal memory/mood layer, Profile/Premium preview, share-card preview, safety/reporting, and Admin Operations. |
| Seed tarot/persona content | Done | Tarot decks, 78 tarot cards, guide personas, prompt library, and safety config exist locally. |
| Staging content bundle/device parity | In progress | Staging `nilaza_default` is published at v4 with source hash `f5645e9c…`, matching the current generated Admin seed (7 decks, 546 deck cards, including Classic Arcana and 78 card introductions). The local Android 0.1.2/build 3 APK contains Classic Arcana and its card copy. ADB currently sees no device, so the installed APK and the signed-in app's Owner Hub status (`v4 online` vs. `seed trên máy`) still need verification before closing the reported Tarot update issue. |
| AI/backend integration | In progress | Mobile uses typed backend contracts with local fallback and provider-backed routes are deployed. Staging has an active Astrology AI route/prompt and three successful redacted OpenRouter/Qwen generation spans; active DeepSeek route still needs an authenticated app-level test proving the response renders. Other provider routes still need per-feature signed-in E2E and cost/fallback acceptance. |
| Supabase auth/data/storage | In progress | Staging schema, JWT-protected functions, mobile sync wrappers, generated seed, and readiness checks are present; the AI Studio migration and four related Edge Functions are applied/deployed. `supabase:check` now passes with environment warnings. Generic `db push`/repair remains blocked by remote-only `20260925160325_initial_mcy_schema`; auth account-switch, export/delete, and full mobile sync acceptance remain open. |
| Payments/credits | In progress | Mobile now has local daily tarot credits, premium deck entitlement gates, and restore/upgrade preview states; real RevenueCat receipt validation is still pending. |
| Astrology | In progress | The local deterministic chart and 12 bilingual mythology chapters are implemented; the authenticated Astrology AI endpoint, Admin prompt/route, and staging entitlement are present. Three prior provider calls completed with Qwen, but active DeepSeek has not been proven on the phone UI. Cloud chart sync, independent semantic/accuracy review, broader device/accessibility QA, and release acceptance remain open. |
| Face reading | Deferred | Phase 3 because of photo privacy and safety risk. |

## P0 Development Tasks

| ID | Status | Task | Read first | Usual edit paths | Acceptance check | Verify with |
| --- | --- | --- | --- | --- | --- | --- |
| P0-01 | Done | Run baseline project verification before new feature work. | `docs/AGENT_TASK_ROUTER.md`, `docs/MVP_IMPLEMENTATION_PLAN.md` | Usually no edits | Existing app and seed data checks pass before changing behavior. | `npm --workspace apps/mobile run check`; `npm run validate:data` |
| P0-02 | Done | Mobile design QA on common phone size and record obvious UI blockers. | `DESIGN.md`, `docs/STITCH_DESIGN_STATUS.md`, `docs/MVP_IMPLEMENTATION_PLAN.md` | `apps/mobile/App.tsx`, `apps/mobile/src/theme.ts` if fixes are needed | Core happy path looks premium, readable, and non-overlapping around 390 x 884. | `npm --workspace apps/mobile run web`; preview at `http://localhost:8081/` |
| P0-03 | Done | Define Supabase MVP schema for user profile, birth profile, chat, tarot readings, journal, subscriptions, prompt versions, and safety events. | `docs/BACKEND_PROXY_ARCHITECTURE.md`, `docs/FEATURE_PRD.md`, `AGENTS.md` | Future schema/migration files; docs if backend package is not created yet | Schema maps to core data model and keeps AI provider keys out of mobile. | Schema review; no-secrets check |
| P0-04 | In progress | Add auth and profile persistence path. | `docs/FEATURE_PRD.md` section 6.1, `docs/BACKEND_PROXY_ARCHITECTURE.md` | Future backend package; `apps/mobile/src/storage.ts`; profile flow in `apps/mobile/App.tsx` | User can create or resume profile, edit preferences, and keep local fallback behavior graceful. | Mobile happy path; TypeScript check |
| P0-05 | In progress | Replace local chat helper with backend AI contract while preserving persona safety boundaries. | `docs/FEATURE_PRD.md` section 6.3, `docs/AGENT_ARCHITECTURE.md`, `packages/agent-config/prompt-library.json`, `packages/agent-config/safety-rules.json` | Future backend routes/functions; `apps/mobile/App.tsx`; `packages/agent-config` | Persona chat uses versioned prompts, transparent "inspired by" framing, loading/error states, and save-to-Journal. | TypeScript check; prompt safety review |
| P0-06 | In progress | Replace local tarot interpretation helper with backend AI contract while keeping card draw deterministic in app/backend logic. | `docs/FEATURE_PRD.md` section 6.4, `docs/TAROT_CONTENT_SYSTEM.md`, `packages/content/data/tarot-cards.json` | Future backend routes/functions; `apps/mobile/App.tsx`; tarot data/config files | AI interprets selected cards only, avoids deterministic predictions, and has retry/fallback copy. | `npm run validate:data`; tarot happy path |
| P0-07 | In progress | Implement Journal persistence against backend or planned data layer. | `docs/FEATURE_PRD.md` section 6.7, `docs/BACKEND_PROXY_ARCHITECTURE.md` | Future backend routes/functions; `apps/mobile/src/storage.ts`; `apps/mobile/App.tsx` | Saved chat/tarot insights survive reload, can be deleted, and remain private by default. | Journal happy path; TypeScript check |
| P0-08 | Done | Add safety/reporting flow for generated responses. | `AGENTS.md`, `docs/WORKFLOWS_SECURITY_RESEARCH.md`, `packages/agent-config/safety-rules.json` | `apps/mobile/App.tsx`; future `safety_events` backend path; `packages/agent-config` | User can report unsafe/bad AI output; high-risk topics receive safe fallback messaging. | Safety checklist; no raw sensitive log review |

## P1 Development Tasks

| ID | Status | Task | Read first | Usual edit paths | Acceptance check | Verify with |
| --- | --- | --- | --- | --- | --- | --- |
| P1-01 | Done | Tighten onboarding empty, skipped, and loading states. | `docs/FEATURE_PRD.md` section 6.1, `DESIGN.md` | `apps/mobile/App.tsx`, `apps/mobile/src/types.ts`, `apps/mobile/src/storage.ts` | User can complete onboarding under 90 seconds, skip birth time, and understand why birth data is optional. | Mobile onboarding happy path |
| P1-02 | Done | Refine Home daily insight behavior for backend-ready daily refresh rules. | `docs/FEATURE_PRD.md` section 6.2 | `apps/mobile/App.tsx`; future backend job/endpoint | Daily insight is cached, reflective, refresh logic is explicit, and Home includes a Today Pulse ritual with tarot card, wisdom line, mood check, micro-action, and situation-based Chat entry points. | Home happy path; TypeScript check |
| P1-03 | Done | Improve persona browsing and detail quality after manager review. | `docs/FEATURE_PRD.md` section 6.3, persona seed files | `packages/content/data/personas-*.json`, `packages/agent-config/prompt-library.json`, `apps/mobile/App.tsx` | Chat list supports issue search, goal-matched guide recommendations, trait chips, prompt previews, detail tabs, transparency copy, save/report/new-chat actions, and premium guide soft gates. | `npm run validate:data`; content review |
| P1-04 | Done | Improve tarot deck/card presentation after manager review. | `docs/TAROT_CONTENT_SYSTEM.md`, `DESIGN.md` | `packages/content/data/tarot-decks.json`, `packages/content/data/tarot-cards.json`, `apps/mobile/App.tsx` | Tarot V2 supports set intention, choose deck, deck overview, draw ritual, reading result, card meaning, save/share/follow-up, premium deck soft gate, and local share-card artifact snapshots. | `npm run validate:data`; tarot happy path |
| P1-05 | In progress | Build real premium/credits foundation. | `docs/FEATURE_PRD.md` section 6.8, `docs/BACKEND_PROXY_ARCHITECTURE.md` | Future backend package; Profile/Premium UI in `apps/mobile/App.tsx` | Local daily tarot credits, premium deck gating, upgrade preview, and restore preview are implemented; RevenueCat customer ID and receipt validation remain backend/payment work. | Entitlement flow review |
| P1-06 | Done | Create basic admin console path or confirm mobile Admin Operations remains temporary. | `docs/FEATURE_PRD.md` section 6.9, `docs/BACKEND_PROXY_ARCHITECTURE.md`, `packages/agent-config/admin-metrics.json` | Future admin app; current `apps/mobile/App.tsx`; `packages/agent-config` | Mobile Admin Operations shows local content health, prompt drafts, jobs/artifacts, safety events, usage counters, and backend-not-connected state. | Admin happy path; access-control review |
| P1-07 | Done | Add privacy controls for chats, journal, birth profile, and account deletion planning. | `docs/WORKFLOWS_SECURITY_RESEARCH.md`, `docs/FEATURE_PRD.md` section 6.10 | `apps/mobile/App.tsx`; future backend data deletion paths | User can understand local data use, export preview, clear birth/chat/journal, delete local account data, and review local Journal memory without exposing raw private content in admin surfaces; backend deletion remains part of auth/data work. | Privacy checklist |

## P2 And Deferred Tasks

| ID | Status | Task | Read first | Usual edit paths | Acceptance check | Verify with |
| --- | --- | --- | --- | --- | --- | --- |
| P2-01 | In progress | Full astrology report implementation. | `docs/FEATURE_PRD.md` section 6.5, `packages/content/data/astrology-strategy.json` | `apps/mobile/App.tsx`, `apps/mobile/src/backendClient.ts`, `supabase/functions/ai-astrology-report`, `supabase/migrations` | Mobile calls backend astrology report with local fallback; chart placements come from deterministic `astronomy-engine` calculation, not AI invention; unknown birth time is handled with caveats. Geocoding and deployed runtime verification remain pending. | `npm --workspace apps/mobile run check`; `npm run validate:backend`; `npm run supabase:check` |
| P2-02 | Deferred | Face reading consent/upload/report flow. | `docs/FEATURE_PRD.md` section 6.6, `docs/WORKFLOWS_SECURITY_RESEARCH.md` | Future secure storage and image moderation paths | User consent, deletion controls, and protected-trait safety rules are complete before launch. | Privacy/safety review |
| P2-03 | In progress | Push notifications and in-app notification inbox. | `docs/BACKEND_PROXY_ARCHITECTURE.md`, `docs/PLAN_QC_PROTOCOL.md` | `apps/mobile/src/notifications.ts`, `apps/mobile/src/backendClient.ts`, `apps/mobile/App.tsx`, `supabase/migrations`, `supabase/functions`, admin notification operations | Notifications are opt-in, not requested during first onboarding screen, use generic push copy, sync preferences/token/inbox, and expose sanitized delivery status to admin. | `npm --workspace apps/mobile run check`; `npm run validate:backend`; `npm run supabase:check`; device test |
| P2-04 | Done | Shareable reading cards. | `docs/FEATURE_PRD.md` section 6.4, `DESIGN.md` | Mobile share/export UI; generated image/card code | Local share-card preview creates a private artifact snapshot, can be saved to Journal, and does not expose private notes by default; real image export/storage remains backend work. | Share flow review |
| P2-05 | Done | Add local-first AI Council mode for multi-guide discussion. | `docs/FEATURE_PRD.md` section 6.3, persona seed files | `apps/mobile/App.tsx`, `apps/mobile/src/backendClient.ts`, `apps/admin/app.js`, `packages/agent-config/ai-council.json`, `packages/agent-config/prompt-library.json`, `supabase/functions/ai-council`, `supabase/migrations` | User can open AI Council from Chat, hold a multi-turn group discussion where several guides respond to each user turn, continue with a single guide when needed, save the council transcript to Journal, configure situation templates, guide roles, meeting flow, roster/context/prompt/schema from admin-facing AI config, and hand off Supabase-ready endpoint/schema/config seed/runtime contracts before provider integration. | TypeScript check; data validation; backend client test; backend contract validation; admin check/test; Chat happy path |
| P2-06 | Deferred | Community and human reader marketplace. | `docs/FEATURE_PRD.md` phase 3 scope | Future product docs and app surfaces | Scope, moderation, trust, and payments are defined before implementation. | Product review |

## Per-Task Done Checklist

Every task should close with:

- The relevant PRD/design/router docs were read.
- Only the scoped files were changed unless the task became cross-cutting.
- The happy path works.
- Loading, empty, and error states were considered.
- Data is saved or the persistence gap is called out.
- Safety/privacy implications are reviewed.
- Validation commands or preview checks are recorded in the final handoff.
- Remaining risks or product decisions are written plainly for a non-technical manager.

## Agent Handoff Template

Use this format when finishing a task:

```text
Task ID:
Status:
Changed:
Manager test path:
Checks run:
Remaining risks:
Recommended next task:
```

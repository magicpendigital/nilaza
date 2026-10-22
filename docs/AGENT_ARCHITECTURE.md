# Nilaza Agent Architecture

Last updated: 2026-09-20

## Purpose

This document explains how Nilaza separates runtime product AI, delivery agents, seed/config data and safety rules. The app is hybrid: deterministic local fallback keeps review flows usable, while signed-in users use the configured Supabase backend for supported sync and AI endpoints. Local fallback is not evidence that a protected backend flow works.

## Product Agents

Source: `packages/agent-config/product-agents.json`

MVP agents:

- `nilaza_oracle_agent`: listens to the user, classifies intent, and routes to Tarot, Persona, AI Council, Astrology, or Journal without replacing those specialized flows.
- `tarot_reader_agent`: creates symbolic tarot readings from app-selected cards.
- `wisdom_persona_agent`: powers historical-figure-inspired and book-inspired chat guides.
- `daily_insight_agent`: creates short daily ritual reflections.
- `journal_reflection_agent`: converts tarot/chat outputs into saved journal entries.
- `safety_moderation_agent`: classifies or redirects risky content.
- `astrology_interpreter_agent`: interprets calculated placements and preserves caveats.
- `content_research_agent`: qualifies new personas, books, tarot decks, and market-led content.
- `admin_ops_agent`: summarizes local logs, prompt drafts, content gaps, and publish blockers.

Each product agent includes:

- `purpose`
- `inputs`
- `outputs`
- `subAgents`
- `safetyBoundaries`

Local helpers still support an offline/review fallback where permitted. The mobile client already uses typed backend wrappers for signed-in AI and sync paths; Edge Functions are the provider boundary. Keep the interface contract stable across both paths.

Recommended backend orchestration:

1. Moderate input.
2. Select agent and prompt version.
3. Retrieve approved context only.
4. Generate response.
5. Moderate output.
6. Save privacy-minimized event log.
7. Save user-facing result only when required or user-approved.

## Runtime AI Council contract

AI Council has one canonical contract source: `packages/agent-config/council-contract.json`.

- `ai-council.json` contains Council Builder configuration and references the contract; its `configVersion` is not the API contract version.
- `model-routing.json` references the same response schema rather than copying it.
- `supabase/functions/_shared/council-contract.ts` is generated from the canonical source and is checked with `npm run council:contract:check`.
- The app sends the configuration and contract versions separately. The Edge Function rejects an incompatible contract version and returns the one it used.

This avoids the previous failure mode where one ambiguous version field meant different things to the app, prompt configuration and function response.

## Delivery Agents

Source: `packages/agent-config/coding-agents.json`

MVP coding agents:

- `product_manager_agent`: PRD, scope, acceptance criteria, release notes.
- `content_data_agent`: bilingual content, tarot data, personas, validation.
- `mobile_app_agent`: Expo app screens, local state, reviewable UI.
- `design_sync_agent`: alignment with `docs/BRAND_GUIDELINES.md` across app, web, Admin and documents; `DESIGN.md` layouts and Stitch references only for unchanged screens.
- `qa_review_agent`: data checks, type checks, handoff notes.
- `security_privacy_agent`: secrets, storage, dependency, and publish-risk review.
- `workflow_orchestration_agent`: parallel branch lanes and quality gates.
- `release_readiness_agent`: App Store, Google Play, privacy, and beta readiness.

These agents are not runtime app features. They are operating roles for AI-assisted implementation. Their policy is `packages/agent-config/agent-execution-policy.json`; practical handoff instructions are in `docs/AGENT_RUNBOOK.md`.

Configured roles do not give an agent production access. Each handoff needs an owner, declared write scope, allowed data classes, checks and a stop condition. Raw chat/journal data, birth data, face uploads and all secret material are excluded by default. A manager explicitly approves deployment, publishing, migration repair and irreversible actions.

## Seed Content

Source: `packages/content/data`

Included in MVP:

- 3 tarot decks:
  - Moon Garden / Khu Vuon Trang
  - Rose Mirror / Guong Hong
  - Golden Thread / Soi Chi Vang
- 78 tarot cards:
  - 22 Major Arcana.
  - 56 Minor Arcana.
  - Each card includes VI/EN intro, personality portrait, upright/reversed meanings, and reflection question.
- 3 x 78 tarot card visual prompts in `packages/content/data/tarot-card-designs.json`.
- Tarot card content skills in `packages/agent-config/tarot-card-skills.json`.
- 5 historical guides:
  - Aristotle
  - Confucius / Khong Tu
  - Laozi / Lao Tu
  - Marcus Aurelius
  - Sun Tzu / Ton Tu
- 5 book-inspired guides:
  - Communication Mentor
  - Calm Living Mentor
  - Art of War Strategist
  - Tao Te Ching Guide
  - Stoic Journal Guide

All user-facing content must keep `vi` and `en` fields.

Tarot content details live in `docs/TAROT_CONTENT_SYSTEM.md`.

## Safety Rules

Source: `packages/agent-config/safety-rules.json`

Baseline:

- Tarot is for entertainment and self-reflection.
- Personas are inspired simulations, not the real person, author, publisher, estate, or official representative.
- Do not provide medical, legal, financial, or mental-health diagnosis/advice.
- Do not make deterministic fate claims.
- Do not quote copyrighted book text unless licensed or public domain.

## Backend runtime and release path

Current backend wrappers and Edge Functions use these API shapes:

- `generatePersonaReply(input)`
- `generateOracleTurn(input)`
- `generateAiCouncilTurn(input)`
- `generateTarotReading(input)`
- `generateDailyInsight(input)`
- `generateAstrologyReport(input)`
- `generateFaceReading(input)`
- `saveJournalEntry(input)`

The mobile app should call backend endpoints through a client wrapper. Do not expose AI provider keys in the mobile app.

Current mobile bridge:

- `apps/mobile/src/backendClient.ts` defines typed wrappers for persona chat, AI Council, tarot reading, daily insight, profile sync, and journal sync.
- The same wrapper defines profile upsert and journal-entry sync contracts.
- `apps/mobile/src/runtimeConfig.ts` reads `EXPO_PUBLIC_NILAZA_API_URL`.
- Offline/review fallback is intentionally separate from release configuration. Production-like builds fail closed when required online variables are absent.
- Protected endpoint behavior needs a sanitized authenticated staging E2E run. The manual GitHub workflow `Staging AI Council E2E` uses a dedicated staging account and repository secrets; it must never log test input or credentials.

## Quality, migration and release controls

- `.github/workflows/mobile-quality.yml` runs mobile type checks, tests, data/config checks, Metro web export and Android embedded-bundle validation. Enable it as a required GitHub check after the branch is pushed.
- `docs/SUPABASE_MIGRATION_LEDGER.md` records unresolved local/remote history. While its status is blocked, no `db push` or migration repair is permitted.
- Every test APK/IPA should carry a release manifest with version, source state, SHA-256 and validation evidence. OTA update configuration remains disabled until an EAS channel/runtime test is explicitly completed.

Backend architecture details live in `docs/BACKEND_PROXY_ARCHITECTURE.md`.

## Brand and public-content ownership

Existing role IDs remain stable. Design/content/QA roles cover web/help, public documents and communications as well as mobile. Read `docs/BRAND_GUIDELINES.md`, use manifest-approved masters, retain VI/EN and distinguish approved/integrated/verified/released. Role ownership describes responsibilities, not permission to publish or a requirement to spawn subagents. Public Help/legal are allowlisted; owner/Agent/prompt materials stay protected. Repository skill sources and sync checks are documented in `skills/README.md`.

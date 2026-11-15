# Nilaza AI Agent Context

## Supabase allocation — current Owner decision

Owner decision 2026-10-09: Singapore etfajmrwyywokgafzxsb in Nilaza Free drxbmvimiekeoeesgssp is selected as the canonical backend candidate: closed synthetic prelaunch QA, then separately approved production promotion. Fresh project/org reads verify Singapore ap-southeast-1 and ACTIVE_HEALTHY. Current CLI/Admin/mobile bindings still identify legacy QA akgrokwnkfqnfjqrildi. Steps 1-2 authorize local policy and packet preparation; runtime retarget, cloud SQL, credentials and target allowlist activation remain separate. Historical Pro packets are superseded; existing security/recovery/release gates remain. [Current allocation/workflow](docs/release/SUPABASE_ALLOCATION_2026-10-05.md); [Free preparation](docs/release/SINGAPORE_FREE_PREPARATION_2026-10-09.vi.md).

## Delivery scope — Owner decision 2026-10-16

Nilaza is developed by the Owner with AI assistance; do not assume a separate human engineering or release team. The Owner retains account access, secret custody and release approval; the agent prepares and verifies technical work. Prioritize Android acceptance and Google Play; iOS native acceptance/release is deferred until Google Play success, not marked PASS and not a blocker for the Android-only candidate. Keep shared-code checks and all Android/cloud/security/recovery gates. All project key categories (recovery, Android upload key, backend/API) use private Google Drive folders for encrypted backups; runtime secrets stay in backend/EAS secret storage, with the decryption passphrase held separately by the Owner. See [solo delivery and key guide](docs/release/SOLO_ANDROID_AND_KEYS_2026-10-16.vi.md). This does not authorize SQL, retargeting, credential rotation or store publication.

Last updated: 2026-10-16

This file is the fast context entry point for AI agents working on Nilaza. Read this first before creating designs, code, schemas, prompts, or product docs.

After reading this file, read `docs/AGENT_TASK_ROUTER.md` to identify the minimum task-specific docs, data files, implementation paths, and validation commands. Do not scan the whole repository unless the router says the task is cross-cutting or the routed files do not contain the feature.

Before implementing any non-trivial task, also apply `docs/PLAN_QC_PROTOCOL.md`. Each task must have a plan, impact map, validation path, and manager-testable acceptance criteria before edits begin.

## Product

Nilaza is a mobile AI companion for Gen Z users and women interested in tarot, astrology, self-discovery, emotional reflection, and wisdom conversations.

Core positioning:

> A mystical AI companion that helps users explore themselves, ask better questions, and receive reflective guidance through tarot, astrology, AI personas, and journaling.

Nilaza should feel premium, intimate, emotionally intelligent, and mystical. It must not feel like a cheap fortune-telling app or a generic AI chatbot.

## Current Repo State

The project contains product/design documentation plus a hybrid Expo mobile MVP: local fallback supports review/offline-safe paths, while configured signed-in flows use the linked Supabase backend.

Important docs:

- `docs/FEATURE_PRD.md`: product requirements by feature.
- `DESIGN.md`: Stitch-ready UI/design brief.
- `docs/STITCH_DESIGN_STATUS.md`: current Stitch project/design system status.
- `AGENTS.md`: this summary context.
- `docs/AGENT_TASK_ROUTER.md`: task router for new agents, screen inventory, edit paths, and validation commands.
- `docs/PLAN_QC_PROTOCOL.md`: required Plan & QC gate for impact mapping, validation, and handoff quality.
- `docs/AGENT_ARCHITECTURE.md`: product agents, coding agents, sub-agents, and safety boundaries.
- `docs/AGENT_RUNBOOK.md`: declared agent scope, safe delegation and manager approval boundaries.
- `docs/SUPABASE_MIGRATION_LEDGER.md`: reviewed migration divergence; database push/repair gate.
- `docs/MVP_IMPLEMENTATION_PLAN.md`: current MVP implementation state and review checklist.
- `docs/WORKFLOWS_SECURITY_RESEARCH.md`: workflows, policy notes, privacy/security checklist, astrology/tarot/persona research decisions.
- `docs/BACKEND_PROXY_ARCHITECTURE.md`: recommended Supabase proxy/backend, async jobs, provider abstraction, push notifications, and admin backend notes.
- `docs/AI_TRACE_OBSERVABILITY.md`: implemented privacy-first LLM trace contract, Langfuse OTLP rollout, redaction policy, and admin Trace Explorer runbook.
- `docs/TAROT_CONTENT_SYSTEM.md`: 78-card tarot dataset, tarot card skills, and 3-deck visual prompt system.

Important implementation paths:

- `apps/mobile`: Expo React Native local-first MVP.
- `apps/admin`: protected desktop review console with Content Operations and AI Studio workspaces.
- `packages/content/data`: bilingual tarot, book guide, and historical guide seed data.
- `packages/agent-config`: product agent, coding agent, and safety config JSON.
- `packages/agent-config/feature-workflows.json`: parallel feature lanes and quality gates.
- `packages/agent-config/prompt-library.json`: editable local prompt versions for admin review.
- `packages/agent-config/council-contract.json`: canonical versioned AI Council request/response contract.
- `packages/agent-config/agent-execution-policy.json`: approved delivery-agent/sub-agent governance policy.
- `packages/agent-config/tarot-card-skills.json`: content skills for tarot card intro, personality, meanings, reflection, and visual prompts.
- `packages/content/data/tarot-card-designs.json`: visual prompts for each of the seven 78-card decks.
- `scripts/validate-data.mjs`: seed data validation script.

## Target Users

- Gen Z users who enjoy tarot, astrology, personality tests, journaling, and self-growth.
- Women interested in spiritual content, relationship reflection, emotional clarity, and daily guidance.
- Users who want AI to feel like a designed persona/mentor experience, not a generic chatbot.

## MVP Scope

Build first:

- Onboarding and personal profile.
- Home with daily insight.
- AI persona chat.
- Tarot reading flow.
- Journal and saved insights.
- Account/profile/privacy settings.
- Premium/credits foundation.
- Basic admin content management.

Defer:

- Owner-approved A3/A4 (2026-09-22): local deterministic birth charts and the mythology library are integrated for device review. Read `docs/A3_A4_REVIEW_HANDOFF_2026-09-22.vi.md` and `packages/astrology-core/README.md`; cloud report sync, native acceptance and production release remain separate gates.
- Face reading should be phase 3 because it uses personal images and has higher privacy/safety risk.
- Community features and human reader marketplace should come later.

## Product Guardrails

- All spiritual content is for entertainment and self-reflection.
- Avoid deterministic predictions such as "this will definitely happen."
- Do not provide medical, legal, financial, or mental health diagnosis/advice.
- If users express self-harm intent, respond supportively and direct them to immediate local emergency/crisis help.
- Historical/book personas must be framed as "inspired by", not the real person, author, estate, publisher, or official representative.
- Do not ingest copyrighted book text unless licensed or public domain.
- Face reading must not infer protected traits, attractiveness, health, intelligence, criminality, trustworthiness, or identity.

## Official Domains

Owner-selected on 2026-10-04: organization domain `magicpendigital.com` for all projects; Nilaza official website `https://nilaza.magicpendigital.com`. Use this host for current branding/media and VI/EN Help paths. Email sender/support addresses and DNS/TLS/deployment status require their own configuration evidence.

## Design Direction

Use `docs/BRAND_GUIDELINES.md` as the identity source of truth for mobile, website, Admin, documents and communications; use `DESIGN.md` for product layouts. Open Reflection v1 replaces all Stitch/infinity/N brand marks. Stitch remains a structural reference for unchanged screens.

Approved wordmark: NILAZA, EB Garamond Regular 400; body/buttons: Hanken Grotesk. Tagline: “Một khoảng mở để lắng nghe mình.” / “A space to listen to yourself.”

Official sources: `assets/brand/open-reflection/v1`, indexed by `packages/content/data/brand-identity.json`. Generate exports using `npm run assets:generate`; validate with `npm run validate:brand`. Never source brand assets from concept boards, Stitch screenshots or user-machine folders.

First wave: auth-first welcome → optional single goals step → Home with one Today Pulse reflection CTA and Chat/Journal secondary actions. Preserve profile data, completed onboarding and existing auth/credits contracts. See `docs/BRAND_ROLLOUT_2026-09-11.md` for integrated/verified/released status; approved design alone is not shipped behavior.

Repository skill sources live in `skills/nilaza-plan-qc`, `skills/nilaza-brand-experience`, `skills/nilaza-tarot-deck-production`, `skills/nilaza-tarot-content-qc`, and `skills/nilaza-tarot-art-qc`. Run `npm run skills:check` to detect installed drift and `npm run skills:sync` to install the reviewed sources. Brand work includes web/help and public documents; backend-only tasks keep their own route.

For each new feature or material expansion, prepare `docs/feature-plans/<task>.json` and run `npm run feature:preflight -- --record docs/feature-plans/<task>.json` before implementation commands or edits. Use the allowlisted `feature:run` command for supported development and generation scripts so preflight runs again immediately before them. Review current sources and versions, affected skills, Whole-App impact, security risks, validation and rollback; stop for unresolved high-risk findings. After validation, update affected skills with durable discoveries or record why they remain current. See `docs/PLAN_QC_PROTOCOL.md` for the gate and local bypass limits.

Design qualities:

- Mystical but mature.
- Feminine but not overly pink.
- Premium but warm.
- Calm and highly readable.
- Visual, not text-heavy.

Primary palette:

- Charcoal black: #151416
- Soft ivory: #F7F1E6
- Champagne gold: #C9A45C
- Deep teal: #0E5A5A
- Muted rose: #C9828D
- Moon gray: #A8A3A0

Navigation:

- Mobile app with bottom tabs: Home, Explore, Chat, Journal, Profile.

## Recommended Tech Direction

Suggested stack for implementation:

- Mobile: Expo + React Native.
- Backend/database: Supabase.
- Auth: Supabase Auth.
- Storage: Supabase Storage.
- Vector search: Supabase Postgres + pgvector.
- AI: OpenAI API or equivalent LLM provider behind backend endpoints.
- Payments: RevenueCat for iOS/Android subscriptions and entitlements.
- Admin console: Next.js web app connected to Supabase.

Do not expose AI provider API keys in the mobile client. All AI calls should go through backend functions/routes.

## Core Data Model

Expected entities:

- `users`
- `user_profiles`
- `birth_profiles`
- `personas`
- `persona_sources`
- `source_chunks`
- `source_embeddings`
- `chat_sessions`
- `chat_messages`
- `tarot_decks`
- `tarot_cards`
- `tarot_readings`
- `astrology_reports`
- `face_readings`
- `journal_entries`
- `subscriptions`
- `credit_ledger`
- `prompt_versions`
- `safety_events`

## AI Behavior

General:

- AI should be warm, reflective, concise, and personalized.
- It should ask good follow-up questions.
- It should separate symbolic reflection from factual claims.

Persona chat:

- Use persona-specific system prompts.
- Keep transparency available: the persona is an AI guide inspired by a figure, not the actual figure.
- Use retrieval only from approved/licensed/public-domain sources.

Tarot:

- Card selection must be handled by app/backend logic.
- AI only interprets selected cards and user context.
- Reading should include card meanings, overall message, and reflection prompt.

Astrology:

- Chart placements should be calculated by a deterministic library/service.
- AI interprets calculated placements; it must not invent placements.

Face reading:

- Treat as symbolic archetype reading only.
- Require explicit consent and deletion controls.

## Manager-Friendly Agent Workflow

The product owner is non-technical and will coordinate implementation with AI agents. When working on this project:

- Read `docs/AGENT_TASK_ROUTER.md` after this file and follow its task routing before opening implementation files.
- Apply `docs/PLAN_QC_PROTOCOL.md` before implementation so related app surfaces, data contracts, content, safety, and validation are updated together.
- For non-trivial work, include a Whole-App Impact Brief before edits: entry point, data write, backend contract, admin visibility, privacy/safety, analytics, rollback, manager test path, and surfaces intentionally left untouched.
- Keep changes small and reviewable.
- Treat `packages/agent-config/council-contract.json` as the only API contract source for AI Council; run `npm run council:contract:check` after changes.
- Do not run Supabase migration repair or `db push` while `docs/SUPABASE_MIGRATION_LEDGER.md` is blocked; this needs a reviewed forward path and database-owner approval.
- Agent roles do not grant deployment, publishing, credential or irreversible-action authority. Use `docs/AGENT_RUNBOOK.md` and run `npm run validate:governance` for workflow/config changes.
- Implement one vertical feature slice at a time.
- Include visible UI, data saving, empty states, loading states, and error states.
- Explain completed work in simple product language.
- Before coding a feature, read its section in `docs/FEATURE_PRD.md`.
- Before designing UI or changing brand/public content, read `docs/BRAND_GUIDELINES.md`, then `DESIGN.md` for app layouts. Keep public Help/legal separate from owner/Agent/prompt documents.
- Before editing `apps/admin`, read `apps/admin/AGENTS.md` and preserve both protected admin workspaces.
- Keep user-facing seed content bilingual with `vi` and `en` fields, using standard accented UTF-8 Vietnamese in the JSON files. Do not use unaccented ASCII or rely on dynamic restoration scripts (such as `restoreVietnameseDiacritics`), which are legacy and error-prone.
- After meaningful changes, update this file only if the high-level direction changes.

## Delivery rule — Owner decision 2026-11-15

`main` on `github.com/magicpendigital/nilaza` is the single source of truth. Work must land there, not in long-lived side branches, parallel local copies or leftover worktrees, so there is one version to control.

- When one feature is finished (checks run, handoff written, `PLAN.md` updated), report to the Owner in Vietnamese with what is verified and what is not, then **ask once for approval to commit, merge and push to `main`**.
- With that approval, do all three steps together: short-lived branch cut from the latest `origin/main`, pull request into `main`, merge only when CI is green, then delete the short-lived branch and any temporary worktree and confirm local `main` equals `origin/main`. Fixing CI failures on that same pull request needs no new approval.
- Without the Owner's approval, do not merge or push. An approval covers that feature only. Do not push unfinished work.
- Every push to `main` deploys Admin staging; say so in the report. This approval does not cover anything that needs its own approval: SQL or migrations, Edge Function deploys, secrets, Supabase/Vercel/GitHub/EAS/Play settings, accounts, store release.

## Definition Of Done

A feature is ready when:

- It matches the approved design direction.
- It works on common iOS and Android mobile sizes.
- It has loading, empty, and error states.
- It saves/loads expected data.
- AI prompts are versioned or easy to update.
- Sensitive flows include privacy and safety controls.
- A non-technical manager can test the happy path.
- It is reported to the Owner and, once approved, committed, merged and pushed to `main` under the Delivery rule above, so no finished work lives only on a side branch.


## Release evidence workflow - 2026-10-04

Read [the project release runbook](docs/release/RELEASE_RUNBOOK.md) for staging, packaging, production planning or a release handoff; use [the Vietnamese owner packet](docs/release/OWNER_PACKET.vi.md). Review docs/release/release-profile.json and run node --test scripts/release-evidence.test.mjs for changed gate code. The read-only checker uses immutable source/artifact/config/evidence hashes and exact target approval; it performs no deployment and does not enforce remote permissions. Preserve dirty work and current migration blockers. Cloud target allowlist remains empty until owner-reviewed environment mapping and actual enforcement are verified; never copy live user data into staging.

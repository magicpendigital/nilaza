# Nilaza MVP Implementation Plan

**Current identity (2026-09-11): Open Reflection v1.** Read [Brand Guidelines](BRAND_GUIDELINES.md) before brand/UI/public-content changes. Implementation and verification status: [rollout record](BRAND_ROLLOUT_2026-09-11.md). Historical Stitch references do not authorize old logos or the superseded onboarding/Home layout.

Open Reflection acceptance: auth-first; goals 1–3 or Skip; name/tone retained; save failure/retry; no repeat onboarding; Home Today Pulse primary with Chat/Journal secondary. Prior Done rows describe earlier feature work and do not certify this rollout.

Last updated: 2026-06-07

## Current MVP State

The repo now contains a local-first Expo mobile app scaffold plus seed data and agent configuration.

Main paths:

- `apps/mobile`: mobile app prototype.
- `packages/content/data`: tarot decks, tarot cards, historical guides, book-inspired guides.
- `packages/agent-config`: product agents, coding agents, safety rules.
- `scripts/validate-data.mjs`: local validation for required MVP seed content.

## What The MVP Lets A Reviewer Test

- Complete onboarding with language, nickname, goals, and tone.
- Use Home as a daily ritual entry point.
- Explore the first tarot decks and guide library.
- Chat with 5 historical guides and 5 book-inspired guides.
- Draw a 3-card tarot reading from the full 78-card dataset.
- Save tarot or chat insights to Journal.
- Review local safety disclaimers, active product agents, and admin operations screens.

## Local-First Decisions

- No backend is required for first review.
- AsyncStorage stores profile, chat messages, and journal entries locally.
- The app uses deterministic local response helpers instead of a real LLM.
- Premium is represented as `premium-preview` metadata, not payment logic.
- Update 2026-09-22: owner-approved A3/A4 integrates local deterministic Astrology and mythology reading for device review. See [current handoff](A3_A4_REVIEW_HANDOFF_2026-09-22.vi.md). Cloud sync and production acceptance remain gated; face reading is deferred.

## Next Build Milestones

1. Install dependencies and verify the Expo app runs.
2. Review MVP UI on mobile-sized viewport.
3. Replace local helper responses with backend AI endpoints.
4. Add Supabase schema, auth, and storage.
5. Add admin console for managing personas, tarot decks, prompt versions, and safety events.

## Review Checklist

- Does the app feel premium, calm, and mystical enough?
- Are the first 3 tarot decks directionally right?
- Are the 78 tarot cards and 3 x 78 visual prompts enough for testing?
- Are the first 10 guide profiles useful and distinct?
- Is the tarot reading output safe and reflective enough?
- Is the chat tone close to the intended product feeling?
- Which screens need Stitch refinement before backend work?

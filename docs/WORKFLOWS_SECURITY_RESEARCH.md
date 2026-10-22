# Nilaza Workflows, Security, And Research Notes

Last updated: 2026-06-07

## Workflow System

Nilaza uses local JSON contracts before backend connection:

- Coding workflows: `packages/agent-config/feature-workflows.json`
- Coding agents: `packages/agent-config/coding-agents.json`
- In-app AI agents: `packages/agent-config/product-agents.json`
- Prompt versions: `packages/agent-config/prompt-library.json`
- Admin metrics/events: `packages/agent-config/admin-metrics.json`

Recommended feature branch lanes:

- Mobile experience: `codex/mobile-{feature}`
- AI content: `codex/content-{feature}`
- Trust and safety: `codex/safety-{feature}`
- Admin ops: `codex/admin-{feature}`

Every feature branch should include:

- Short product summary.
- Files changed.
- Checks run.
- Safety/privacy impact.
- Remaining backend requirements.

## In-App AI Runtime Contract

Target backend flow:

1. Moderate user input.
2. Select product agent and prompt version.
3. Retrieve approved/licensed context only.
4. Generate response.
5. Moderate generated output.
6. Save minimal audit event.
7. Save user-facing content only when the user chooses to save or the feature requires history.

The local MVP simulates this flow with deterministic helpers, but the contracts should stay stable.

## Security And Privacy Checklist

Before publish:

- No AI/API keys in the mobile app.
- Backend routes proxy all LLM and astrology API calls.
- Supabase RLS enabled for all user-owned tables.
- Storage policies prevent cross-user access.
- Chat, journal, birth data, and logs have deletion paths.
- App has privacy policy, terms, support contact, data deletion, and data export plan.
- Logs are privacy-minimized and avoid storing full sensitive conversations by default.
- Prompt changes are versioned and reviewable.
- Dependency audit is reviewed before store release.
- Face reading stays disabled until image consent, retention, and deletion controls are complete.

## App Store And Google Play Notes

Apple App Store:

- UGC or creator-style content requires objectionable-content filtering, reporting, blocking, and contact mechanisms.
- Avoid impersonation of people, brands, apps, publishers, or services.
- Fortune-telling apps face quality/saturation scrutiny, so Nilaza should emphasize reflective utility, journaling, and AI companion value.
- Digital content/subscription should use the appropriate in-app purchase path.

Google Play:

- Generative AI apps are responsible for preventing offensive, harmful, deceptive, self-harm, harassment, sexual, malicious-code, and dishonest-behavior outputs.
- App titles/icons/descriptions must not falsely imply affiliation with another entity.

## Persona And Book Research Rules

- Use "inspired by" framing.
- Do not claim to be the real person, author, publisher, estate, or official representative.
- Do not ingest copyrighted book text without license.
- Prefer public-domain ideas, archetypes, or original summaries.
- Every candidate should pass IP, impersonation, cultural sensitivity, and safety review.

## Astrology Strategy

For the local MVP:

- Use transparent mock calculation only.
- Clearly state that local results are not precise astronomical calculations.

Recommended beta path:

- Use a backend proxy to call a free-tier astrology API, such as FreeAstroAPI, so API keys and birth data are not exposed in the mobile app.

License caution:

- Swiss Ephemeris is powerful and widely used, but its programmer interface is under AGPL or a professional/commercial license. Do not put it into a closed-source commercial app without license review.

## Tarot Strategy

- Use the full 78-card tarot structure for testing: 22 Major Arcana and 56 Minor Arcana.
- Start with original Nilaza deck positioning and card interpretation.
- Keep card content bilingual and structured: intro, personality portrait, upright/reversed meaning, reflection question.
- Use `packages/agent-config/tarot-card-skills.json` as the skill checklist for expanding card content.
- Use `packages/content/data/tarot-card-designs.json` as the per-deck visual prompt source.
- Do not copy protected deck artwork.
- Keep all readings reflective and non-deterministic.
- Store selected cards, deck version, spread, orientation, question, and generated interpretation for replay/audit once backend exists.

## Backend Proxy And Async Jobs

See `docs/BACKEND_PROXY_ARCHITECTURE.md` for the recommended Supabase backend, AI/API proxy boundary, async job flow, push notification flow, and provider abstraction.

## Sources Checked

- Apple App Store Review Guidelines: https://developer.apple.com/app-store/review/guidelines/
- Google Play AI-Generated Content policy: https://support.google.com/googleplay/android-developer/answer/14094294
- Google Play Developer Program Policy, impersonation section: https://support.google.com/googleplay/android-developer/answer/17105854
- FreeAstroAPI: https://www.freeastroapi.com/
- AstroAPI docs: https://docs.astroapi.cloud/api/
- Swiss Ephemeris programmer interface PDF: https://www.astro.com/swisseph/swephprg.pdf

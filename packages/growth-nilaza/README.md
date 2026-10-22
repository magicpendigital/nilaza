# Nilaza Growth Tenant Configuration

This package is Nilaza-specific and is intentionally excluded by `packages/growth-core/export-manifest.json`. It contains no PII, raw chats, journals, birth/chart data, face uploads, credentials, campaign receipts, real audience lists or outbound execution settings.

Reviewed against Nilaza sources dated **2026-09-30**. Sprint 01 contains **6 briefs and 12 VI/EN concept/copy packages**, not rendered creative or running marketing agents. W0/W1/W2/W6 are internal foundations; W3 distribution, W4 controlled publishing and W5 paid remain deferred.

`product-truth.json` records integrated internal Tarot, AI/Journal and chart/mythology slices together with current cloud, AI-quality, native/iOS and release gates. Historical feature/claim/asset IDs are retained for reference compatibility. Astrology drafts A11/A12 are version 1.1.0; changed claim context requires fresh editorial review. Seed scores are historical self-reported metadata, not independent QA or a publishing approval. Every asset remains `draft_internal`, `not_submitted` and externally blocked.

`measurement/event-ownership-map.json` distinguishes existing web hooks and bounded local mobile events from canonical events and unverified Growth aggregates. No activation, retention or campaign success is inferred from source code or synthetic counts. `operations/roadmap.json` records eight priorities, dependencies, owners and manager acceptance paths; it grants no execution authority.

Admin reads a selected static projection in `apps/admin/generated/growth-operations.json`; capability-gated waitlist counts use a separate RPC. Static asset URLs are not private storage, so only sanitized reviewed configuration belongs in that projection. Regenerate through the reviewed `feature:run --script admin:growth:seed` allowlist and check parity with `npm run admin:growth:check`; do not edit the generated file directly.

Current handoff and manager test path: [Growth Operations](../../docs/GROWTH_OPERATIONS_HANDOFF_2026-09-30.vi.md). Run `npm run growth:validate`, `npm run growth:test`, `npm run admin:check` and `npm run admin:test` after relevant changes. Public beta, delivery providers, external publishing and paid spend require their own independently completed product and execution gates.

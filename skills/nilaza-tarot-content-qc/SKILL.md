---
name: nilaza-tarot-content-qc
description: Review Nilaza Tarot deck and card copy in Vietnamese and English for card meaning, translation, originality, scene alignment, and reflective safety. Use for isolated Tarot copy reviews or the content gate of a new or updated deck.
---

# Nilaza Tarot Content QC

Read `AGENTS.md`, the Tarot row in `docs/AGENT_TASK_ROUTER.md`, `docs/TAROT_CONTENT_SYSTEM.md`, the Tarot section of `docs/FEATURE_PRD.md`, `packages/agent-config/tarot-card-skills.json`, and [the bilingual review protocol](references/bilingual-review.md). Use `$nilaza-plan-qc` for non-trivial edits. The 78 IDs and core meanings in `packages/content/data/tarot-cards.json` are canonical.

For a new deck, review its deck story, reading style, cover/back visual direction, 78 VI/EN card introductions, 78 VI/EN visual prompts, and the full-deck scene manifest. For an update, review affected cards and any deck-level change; changed deck style can require all 78 cards to be reconsidered. Compare each language against the card's meaning and scene. Check clarity, natural accented Vietnamese, translation parity, distinctiveness, physical symbol plan, and Nilaza's reflective safety boundary. Assign a bilingual reviewer independent of copy generation for a full deck; keep uncertain copy pending.

Run `npm run validate:data`. When the artwork and rendered cards exist, run `node scripts/tarot-deck-quality-gate.mjs prepare --deck <id>` (add `--require-deck-intros` for a new deck). Record specific evidence in each card's `bilingualCopy` and `reflectionSafety` checks in the generated review ledger. A content reviewer may also flag `sceneAndMeaning` conflicts for the artwork reviewer. A copy revision changes its content hash and resets that card's acceptance; refresh the ledger and review the revised version. `verify` is the final deck gate after visual QC has filled its checks.

Report reviewed IDs, copy or prompt changes, unresolved issues, data validation, and ledger status. Structural checks and recorded evidence reduce mistakes but cannot prove language quality or factual perfection. Manager acceptance and app release remain separate.

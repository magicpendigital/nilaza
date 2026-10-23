---
name: nilaza-tarot-deck-production
description: Create or update a themed Nilaza Tarot deck end to end, including bilingual copy, 78 original card images, deck cover and back, per-card QC, and app integration. Use for deck production requests; use the art QC skill alone for an isolated artwork review.
---

# Nilaza Tarot Deck Production

Use this skill as the owner workflow for a new deck or a substantive update to an existing one. Work through the requested scope without an arbitrary style-approval pause. If the user explicitly asks to review a style proof first, stop at that checkpoint.

## Start

1. Read `AGENTS.md`, `docs/AGENT_TASK_ROUTER.md`, `docs/PLAN_QC_PROTOCOL.md`, the Tarot section of `docs/FEATURE_PRD.md`, `docs/TAROT_CONTENT_SYSTEM.md`, and `docs/BRAND_GUIDELINES.md`. Apply `$nilaza-plan-qc` and record its impact brief before edits.
2. Identify whether this is a [new deck](references/new-deck.md) or an [existing deck update](references/update-deck.md). Read only that mode's reference. Read [app integration](references/integration.md) when the deck must appear in Nilaza.
3. Declare the deck ID, style bible, source manifest, owned paths, validation commands, and stop condition. Separate source artwork from rendered cards and mobile JPEG exports.

## Production contract

- Use the 78 IDs in `packages/content/data/tarot-cards.json` as the only card roster: 22 Major, 56 Minor, four suits of 14. New themed decks need a deck story and 78 distinct `cardIntroductions`, all with accented UTF-8 `vi` and natural `en`. Use `packages/agent-config/tarot-card-skills.json` for meanings, reflection, and visual prompt decisions. Apply `$nilaza-tarot-content-qc` to new or changed copy and scene plans.
- Generate original inner artwork with a per-card scene and object-count plan. Do not copy a published deck composition. Keep Tarot symbolic and reflective; avoid certain predictions and medical, legal, financial, or mental-health advice.
- Use an available image-generation tool for art and image edits. Normalize and render through the repository's fixed card template. Preserve the raw artwork before `normalize_tarot_artwork.py`, which overwrites its input. Never render placeholders for a production deck.
- Use `$nilaza-tarot-art-qc` for every new or changed illustration and assign an independent visual reviewer for a full deck. Its review ledger must bind decisions to card content, artwork, rendered-card, cover, and back SHA-256 values. Changed content or imagery returns affected decisions to pending review.
- Do not run `scripts/generate-tarot-data.mjs`; it rebuilds older seed data and can overwrite curated bilingual decks. For an unconfigured theme, do not accept the Moon Garden fallback in `prepare_tarot_artwork_batch.py`; provide a deck-specific visual manifest or add the new theme deliberately.

## Completion gate

Run `node scripts/tarot-deck-quality-gate.mjs prepare --deck <id> --require-deck-intros` for a new deck, then review all 78 cards, cover, and back before running `verify` with the same flag. Run `python scripts/validate_tarot_assets.py --deck <id>`, `npm run validate:data`, `npm run validate:visual-assets`, and `npm --workspace apps/mobile run check` for app integration. Use the configured bundled Python path if `python` is absent. The legacy Stellar Mosaic Python source tools use `--deck stellar-academy`; its QC deck ID is `stellar-mosaic`. Re-run affected gates after any revision.

Report created content and images, 78-card coverage, issues fixed, checks run, current review state, and the manager's in-app test path. A green script verifies structure and recorded review evidence; it cannot prove that a picture has no visual error. Label unresolved or uncertain cards as pending and do not declare the deck art locked. Manager acceptance and release remain separate decisions.

# New themed deck

Use this when the requested deck ID does not yet exist. Read `docs/AGENT_RUNBOOK.md` for governance fields, then keep a short per-run record with owner, allowed write scope, validation, and stop condition beside the deck source manifest or in the final handoff. The user may authorize full production in one request; a style checkpoint is needed only when requested.

## Define the deck

1. Choose a stable lowercase hyphenated ID and write a brief style bible: target emotion, palette, linework, materials, recurring motifs, typography/frame rules, exclusions, and how the deck differs from existing decks. Use `docs/BRAND_GUIDELINES.md`; Tarot art remains on Tarot surfaces.
2. Create `packages/content/data/tarot-decks.json` entry with bilingual name, description, vibe, visual direction, reading style, and 78 distinct `cardIntroductions`. Write a deck story, best uses, audience, and example reflection questions for the mobile detail surface. Choose `accessTier` from product direction rather than assuming premium.
3. Create one `packages/content/data/tarot-card-designs.json` set with exactly the canonical 78 IDs and VI/EN prompts. Each prompt describes an original scene, camera/composition, people and props, suit-symbol count and location, and known physical constraints. Keep the 78 scene/prompt records and deck style in `assets/tarot/<id>/<id>-full-deck-manifest.json` so revisions do not rely on memory; the strict QC gate requires this file. Create a matching `tarot-deck-backs.json` entry.
4. Create `assets/tarot/<id>/card-spec.json` using the approved 1024 × 1768 card geometry and artwork safe area. Change style fields intentionally; do not copy another deck's artwork. Produce deck cover and back at `assets/tarot/deck-covers/<id>.png` and `assets/tarot/deck-backs/<id>.png`.

The full-deck manifest needs `deckId`, localized `style`, a `visualPromptTemplate`, and `cards` containing exactly 78 unique `cardId` records. Each record needs a concrete `scene` and final `prompt`; for numbered Minor cards, write the expected symbol count and location into the scene or a dedicated `symbolPlan`. Include grip, support, and seating constraints when applicable. The QC ledger hashes this source plan, so revise it together with the artwork.

## Produce the art

1. Make a small style proof spanning a Major card, a human interaction, and a numbered Minor card with countable symbols. Inspect at full size and mobile scale. Resolve style drift before scaling to 78.
2. Generate **inner artwork only** into `assets/tarot/<id>/artwork/<cardId>.png`. Ask for exact symbol counts in numbered Minor cards and specify where objects sit. For scenes with a held item, describe which hand grips which part and where the item's weight rests. Avoid lettering, border, title, and watermark in the inner artwork.
3. Snapshot raw artwork or revisions before running `scripts/normalize_tarot_artwork.py --deck <id>`; the normalizer overwrites the input. Run `scripts/render_tarot_cards.py --deck <id> --all-existing --paged-sheets` without `--placeholder`. Check 78 final card PNGs in `assets/tarot/<id>/cards`.
4. Use `$nilaza-tarot-content-qc` for all 78 introductions, prompts, and scenes, then `$nilaza-tarot-art-qc` on all 78 images and rendered cards. Keep failures open until both content and artwork pass; the review ledger is refreshed after each revision. A contact sheet is a consistency pass, never the only review.

## Validate and integrate

- Run `node scripts/tarot-deck-quality-gate.mjs prepare --deck <id> --require-deck-intros` before visual review, then `verify` after completing the ledger. It checks exact card IDs, bilingual copy, file hashes, size, and recorded visual decisions; it does not visually judge the pictures.
- Run `python scripts/validate_tarot_assets.py --deck <id>` and `npm run validate:data`. Fix every failure. Do not run the legacy `scripts/generate-tarot-data.mjs`, which can overwrite curated seed data.
- For in-app availability, follow [integration.md](integration.md). Complete the manager's Tarot deck detail, library, draw, and result path before calling the deck integrated. Record whether the outcome is a review candidate, manager accepted, or released.

# Update an existing deck

Start from the deck's current source manifest, card spec, app mappings, and review ledger. State the affected card IDs and whether the change is copy, artwork, rendered frame, cover/back, or integration. Keep unrelated decks and cards untouched.

For the legacy `stellar-mosaic` deck, Python source-art commands use `--deck stellar-academy`, while the quality gate and mobile runtime export use the public ID `stellar-mosaic`.

## Copy or meaning change

- Update the appropriate VI/EN fields in `tarot-decks.json`, `tarot-cards.json`, or `tarot-card-designs.json`. The 78 canonical IDs stay stable. Make new descriptions agree with the actual visual scene and avoid fixed predictions or professional advice.
- Apply `$nilaza-tarot-content-qc`, run `npm run validate:data`, and refresh the review ledger. Changed card introductions, canonical meanings, or visual prompts reset the affected card review; inspect the image and copy together before accepting it.
- Do not use `scripts/generate-tarot-data.mjs` to patch one card; it is a legacy full-data generator. Do not run `prepare_tarot_artwork_batch.py` on an unconfigured theme, because it silently uses Moon Garden styling.

## Artwork or card change

1. Preserve the prior inner artwork, rendered card, scene prompt, and issue note under the deck's revision history. Use the available image-generation tool to edit or regenerate the affected artwork.
2. Inspect the edited inner artwork for the reported defect and the entire scene. Normalize only the affected card after preserving its raw source. Render only affected card IDs using `scripts/render_tarot_cards.py --deck <id> --cards <ids>`; never use `--placeholder` for release work.
3. Run `node scripts/tarot-deck-quality-gate.mjs prepare --deck <id>`. Changed hashes reset those card reviews to pending. Reinspect each changed card at native and mobile sizes, update its evidence, and run `verify` when the whole deck has a completed ledger. Run `python scripts/validate_tarot_assets.py --deck <id>`.
4. If the deck is in the app, export its current source art to runtime with `scripts/build-mobile-runtime-assets.ps1 -OnlyTarotDeck <id>`, then run `npm run validate:visual-assets` and the mobile type check. Check the exact repaired card in deck detail and draw.

Cover or back edits reset their own ledger entries and need visual inspection plus runtime export. A passing source-art ledger does not certify a released mobile build. Report the repaired IDs and remaining risks precisely.

# Mobile integration

Read the routed mobile files before changing them. Current local seed sources are `packages/content/data/tarot-decks.json`, `tarot-cards.json`, `tarot-card-designs.json`, and `tarot-deck-backs.json`. The deck list and card library live in `apps/mobile/App.tsx`; deck cover/back declarations live in `apps/mobile/src/visualAssets.ts`.

1. Add the active deck to the Tarot deck data and give it a deck story, example questions, reading preview, and localized theme labels when applicable. Card detail should use this deck's 78 introductions with a canonical intro fallback for older decks.
2. Add the deck's 78 card JPEGs to the static `deckCardImages` map in `apps/mobile/App.tsx`. Add matching cover/back `require` entries in `deckVisuals` in `apps/mobile/src/visualAssets.ts`. Keep the IDs and filenames exactly aligned with the seed. `stellar-mosaic` has a legacy `stellar-academy` card/cover folder exception; new decks should use their own ID.
3. Export runtime assets after source art passes QC: `scripts/build-mobile-runtime-assets.ps1 -OnlyTarotDeck <id>`. The builder writes `apps/mobile/assets/runtime/tarot/<id>/cards/*.jpg`, `deck-covers/<id>.jpg`, and `deck-backs/<id>.jpg`. Each image must remain below 700 KB and the full runtime below 90 MB.
4. Run `npm run validate:data`, `npm run validate:visual-assets`, and `npm --workspace apps/mobile run check`. For a release candidate, follow the mobile CI/device gates in `docs/PLAN_QC_PROTOCOL.md`; a local type check is not device acceptance.

Manager path: Explore → Tarot → choose the deck → read deck guide → browse Major and all four suits → open high-risk cards → draw and reveal cards → inspect result and card back. Confirm VI and EN, cover crop, small-screen symbol legibility, and that no card falls back to another deck's art. Save the source revision, image hashes, checks, and manager findings in the handoff. Publishing or deployment is a separate decision.

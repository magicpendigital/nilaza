# Mobile runtime asset validation

Run from the repository root:

```powershell
node --test scripts/validate-mobile-runtime-assets.test.mjs
npm run validate:visual-assets
npm --workspace apps/mobile run check
```

The runtime validator reads the Metro asset maps in `apps/mobile/App.tsx`
and `apps/mobile/src/visualAssets.ts` as the runtime manifest. Every deck in
`packages/content/data/tarot-decks.json` must be present in both maps. Every
runtime card directory and imported card map must match the 78 unique IDs in
`packages/content/data/tarot-cards.json`, without missing or extra cards.
Static card keys must point to the matching card file, and context filters must
include all 78 cards. Each deck needs an existing cover and back with the correct
mapping; App's image helpers must pass the corresponding role to `getDeckVisual`.

Stellar Mosaic uses public deck ID `stellar-mosaic`, runtime cards under
`tarot/stellar-academy/cards`, cover `tarot/deck-covers/stellar-academy.jpg`,
and back `tarot/deck-backs/stellar-mosaic.jpg`. This historical alias is intentional
and is explicitly checked even if an incorrect alternative path exists.

Existing size limits (90 MB total, 700 KB per file), missing runtime imports,
empty contexts, and master-artwork reference checks remain in place. Failures
exit with code 1 and list the affected mapping or file. These are static checks;
they do not replace an Expo/device rendering review.

Tests inject missing or mismatched manifest entries in memory. Validation and
tests never rebuild or modify runtime images or original artwork. If generated
runtime files are missing, review and run `scripts/build-mobile-runtime-assets.ps1`
separately. Revert the validator/test/documentation changes to roll back this gate;
there are no storage, backend, or mobile behavior changes.

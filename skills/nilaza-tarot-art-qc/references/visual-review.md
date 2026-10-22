# Card-by-card visual review

## Inspect the right artifacts

Use the card's scene manifest, its canonical ID/meaning, source artwork, rendered card, and a contact sheet. Inspect source and rendered card at full resolution; then reduce the rendered card to a phone-sized view. Record specific evidence, not a generic “looks good.” Count every visible copy of a required suit symbol, including objects held, on a shelf, or in a background ornament. Do not mistake fruit or decorative circles for Pentacles.

## Review criteria

| Check | Required observation |
| --- | --- |
| `symbolCount` | Numbered Minor ranks Ace–Ten show exactly 1–10 relevant suit objects. Record `observedCount` and `countEvidence`, such as “five coins on each side of the arch.” Court cards follow their scene plan. |
| `anatomyAndPose` | Body, hands, fingers, limbs, joints, seating, gaze, and weight distribution are coherent. Check any pose at both full size and the cropped card. |
| `propContactAndSupport` | A hand actually grasps its staff, sword, cup, rein, book, or coin; the object does not merge into skin or furniture; gravity and support are plausible. The Emperor's staff, for example, needs a visible grip and a plausible lower endpoint. |
| `sceneAndMeaning` | People, objects, number, emotional tone, and action match the approved card scene and the VI/EN copy. Intentional Tarot surrealism is acceptable when clearly designed. |
| `textFrameAndArtifacts` | No generated lettering or watermark in inner art. Rendered title/number/keywords are spelled correctly, legible, uncut, and inside the safe area. No duplicated or malformed fragments. |
| `mobileLegibility` | The main silhouette and counted objects remain distinguishable in the app at a small card size. Important details are not lost in a crop or low contrast. |
| `originality` | The staging is an original Nilaza interpretation and does not trace or reproduce a specific commercial card image. |

Review cover and back as separate assets in the same ledger: deck identity, crop, contrast, title-free artwork where intended, symmetry of a reversible back, no accidental duplicate objects, and readable central motif. Their hashes and pass evidence must match the current files.

## Issue and repair loop

Run `node scripts/tarot-deck-quality-gate.mjs prepare --deck <id>` to create or refresh the ledger. An accepted card must have all required visual and content checks marked `pass` with concrete evidence, a named reviewer and date, no open issues, and a count plus location evidence for numbered Minor cards. `$nilaza-tarot-content-qc` owns the `bilingualCopy` and `reflectionSafety` evidence. Cover/back checks have the same evidence rule. `prepare` binds entries to current content, artwork, card, cover, and back SHA-256 values. Changed content or imagery resets affected decisions to pending; reopen the review even when the repair seems small.

For a defect, record the card ID, precise object/location, expected state, and actual state. Edit only that card where feasible, preserve the previous version, normalize/render it, refresh the ledger, then inspect again. Recheck nearby anatomy and props introduced by the edit. Run `verify` after all 78 cards are accepted. If any detail remains ambiguous, keep that check pending and report it. A fully passing ledger records a completed review process; it is not a mathematical guarantee that no visual error exists.

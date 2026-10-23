---
name: nilaza-tarot-art-qc
description: Review and correct Nilaza Tarot artwork or rendered cards for symbol counts, anatomy, physical object use, composition, style, and mobile legibility. Use for isolated card-art reviews or the visual gate of a deck production run.
---

# Nilaza Tarot Artwork QC

Read `AGENTS.md`, the Tarot row in `docs/AGENT_TASK_ROUTER.md`, the relevant deck spec and scene manifest, and [the visual review protocol](references/visual-review.md). Use `$nilaza-plan-qc` for non-trivial edits. The canonical 78-card roster is `packages/content/data/tarot-cards.json`.

Review each changed inner artwork at native resolution, its rendered card at native resolution and mobile scale, and the deck contact sheets. For a full-deck request, inspect all 78 individually; a contact sheet alone is insufficient. Compare each image with its scene manifest, card meaning, and the expected number of visible suit symbols. Check hands, grip, support, joints, seated posture, occlusion, repeated objects, spurious text, and frame/title integrity. Verify cover and back separately; the back should read consistently after a 180-degree turn when that is part of the deck specification.

Use `node scripts/tarot-deck-quality-gate.mjs prepare --deck <id>` to create or refresh the deck's `quality-review.json` beside its source card spec. The legacy `stellar-mosaic` source folder is `stellar-academy`. For each card, record observed suit count and where each counted object appears, specific evidence for every visual check, findings and repairs, reviewer, and review date. `$nilaza-tarot-content-qc` supplies the bilingual copy and safety checks in the same ledger. Review cover and back separately. For full-deck production, assign a visual reviewer independent of image generation; if none is available, keep acceptance pending. Mark uncertain findings pending. After a content or image repair, refresh the ledger and inspect the changed version again; hash changes invalidate prior acceptance. Run `verify` only after every card and deck asset is reviewed, then run `python scripts/validate_tarot_assets.py --deck <source-folder>` (`stellar-academy` for `stellar-mosaic`).

The script checks files, hashes, dimensions, content coverage, and the completeness of review evidence. It cannot itself see anatomical or symbolic mistakes. Do not claim zero possible errors; report the actual review scope, unresolved findings, and remaining uncertainty. App release needs the separate manager acceptance gate.

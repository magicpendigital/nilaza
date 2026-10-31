# Nilaza Tarot Content System

Last updated: 2026-10-19

## Current Status

Nilaza now has a testing-ready tarot content layer:

- 8 deck concepts for MVP exploration:
  - 4 free decks: Moon Garden, Rose Mirror, Classic Arcana, Tinh Quang.
  - 4 premium-preview decks: Golden Thread, Star Seeker, Stellar Mosaic, Astral Pop Atelier.
- 78 tarot cards:
  - 22 Major Arcana.
  - 56 Minor Arcana.
  - 4 suits: Wands, Cups, Swords, Pentacles.
- Every card has:
  - VI/EN name.
  - VI/EN keywords.
  - VI/EN short intro.
  - VI/EN personality portrait.
  - VI/EN upright meaning.
  - VI/EN reversed meaning.
  - VI/EN reflection question.
- Every deck has 78 card visual prompts for design prototyping.
- The mobile deck discovery flow is list -> deck detail guide -> optional card meaning -> draw. Do not route an "Explore decks" CTA directly into draw.
- The draw ritual defaults to one card per tap; quick draw is an explicit secondary shortcut for multi-card spreads.

## Files

- `packages/content/data/tarot-decks.json`
  - Deck positioning, visual direction, reading style, access tier, and user-facing VI/EN deck copy.
- `packages/content/data/tarot-cards.json`
  - Canonical card data used by the local tarot draw flow. `name.vi` holds the Owner-approved Vietnamese name (2026-10-30); `name.en` stays the original.
- `packages/content/data/tarot-card-guide.json`
  - App-only card guide for the card meaning screen: upright love, career and self meanings, a common misreading, optional other readings and support notes, and Golden Dawn element and astrology correspondences with shared notes. Reviewed source and Owner decisions: `docs/content-review/tarot-learning-content-draft.md`. Not sent to the AI and not in the Admin seed.
- `packages/content/data/tarot-card-designs.json`
  - Per-deck, per-card visual prompts for all eight 78-card decks.
- `packages/content/data/tarot-deck-backs.json`
  - Per-deck card back assets and visual directions for the draw/waiting state.
- `packages/agent-config/tarot-card-skills.json`
  - Skills for expanding and validating card intro, personality, meaning, reflection, and visual prompts.
- `scripts/generate-tarot-data.mjs`
  - Legacy generator for the original 3-deck prototype. Do not run it against the current curated eight-deck data.

## Tinh Quang local free candidate

Tinh Quang (EN: Celestial Reverie, ID/slug `celestial-reverie`) is the eighth canonical deck, with `accessTier: free` per Owner decision on 2026-10-18. Its ID and standard folders were renamed from `tinh-quang` on 2026-10-19. It is a local integration candidate, not a cloud-published or released deck.

- Canonical metadata lives in the same three `packages/content/data/tarot-*.json` arrays as the other decks; it is not read from the relocated historical `tarot-staging/celestial-reverie` bundle.
- Standard sources: `assets/tarot/celestial-reverie/{artwork,cards}`, `card-spec.json` and `celestial-reverie-full-deck-manifest.json`; shared cover/back PNGs named `celestial-reverie.png` under `assets/tarot/deck-covers` and `deck-backs`. Original packages and all image bytes are preserved.
- Runtime JPEGs use `apps/mobile/assets/runtime/tarot/celestial-reverie/cards` plus standard cover/back folders. The runtime builder and validators retain their standard folder=id contract. App mappings, story and sample are deck-specific; saved legacy IDs remain readable without alternate asset paths.
- The schema2 `assets/tarot/celestial-reverie/quality-review.json` is the current complete-deck gate. Run `node scripts/tarot-deck-quality-gate.mjs verify --deck celestial-reverie --require-deck-intros` and normal asset/data/mobile checks after changes. Source-intake prepare/verify is historical and rejects an already active deck under either identity before reading former paths; do not change it to bypass promotion.
- Historical render/source ledgers and staging contents retain their recorded IDs/paths and hashes. The rename report maps those paths to current locations; current full QC bindings use the renamed identity after exact-byte and identity-only metadata comparisons. No image/copy regeneration is implied by relocation.
- A configured remote published bundle replaces local deck metadata. Tinh Quang requires separately authorized Admin/backend publication to appear through that remote bundle. No cloud write or runtime retarget was performed for this local integration.

See [the current path rename report](CELESTIAL_REVERIE_PATH_RENAME_2026-10-19.vi.md), [original integration report](TINH_QUANG_FREE_INTEGRATION_2026-10-18.vi.md), [source review](TINH_QUANG_ARTWORK_QC_2026-10-18.vi.md) and [face review](TINH_QUANG_RENDER_QC_2026-10-18.vi.md). Android device acceptance remains separate; iOS native acceptance is deferred under the Owner's Android-first decision.

## Product Direction

Tarot in Nilaza should feel like an emotionally safe self-reflection ritual, not a deterministic prediction engine.

Recommended tarot positioning:

- Use tarot to help users name feelings, patterns, needs, and choices.
- Avoid fear-based interpretations.
- Avoid fixed-fate claims.
- Avoid medical, legal, financial, and mental-health advice.
- Keep every reading grounded in the selected card IDs, deck ID, spread, user question, and language.
- Store prompt version and card data version once backend exists.

## Mobile Deck Discovery Contract

Deck discovery is part of the user education flow, not a shortcut to the ritual draw screen.

Required behavior:

- Explore top Tarot hero "Explore decks" opens the Tarot deck list stage.
- Explore section deck cards "Learn before drawing" opens that specific deck detail guide.
- Deck list selection changes the selected deck, then the primary continue action opens deck detail.
- Deck detail must explain the deck story, best-fit use cases, reading style, example questions, and a browsable 78-card library grouped by Major Arcana and the four suits.
- Deck detail hero should use one deck-theme cover/background image and surface the deck story in the first viewport. Do not use an unexplained three-card preview as the hero.
- Deck detail draw/change-deck actions should stay available in a sticky bottom row, with "Draw with this deck" and "See other decks" side by side.
- Card meaning pages can be opened from deck detail and should return to deck detail when no reading result is active.
- Card meaning pages should feel like a card study surface, not a plain text article: large artwork, deck context, keywords, upright/reversed meanings, archetype story, reflection prompt, and previous/next card navigation.
- Header actions on tarot detail screens should use clear labels and avoid stacking multiple icon-only rows with similar symbols.
- The draw ritual should be entered only from explicit "Draw with this deck" or quick draw actions.
- Multi-card draw should feel like a real ritual: default to drawing one card per tap, show guide-like prompts between cards, and offer a separate quick-draw action for users who want to draw all cards at once.
- When a card is drawn in a multi-card ritual, reveal that card's artwork and local meaning immediately so the user can reflect before drawing the next card; generate the final synthesis only after the full spread is drawn.
- Share-card previews for multi-card readings must render all selected cards in the spread, not a single representative card.

## Tarot Skills

The first tarot card skills are defined in `packages/agent-config/tarot-card-skills.json`:

- `tarot_card_intro_writer`
- `tarot_card_personality_builder`
- `tarot_card_meaning_interpreter`
- `tarot_reflection_question_writer`
- `tarot_card_visual_prompt_designer`
- `tarot_spread_synthesis_writer`

These are content skills for Nilaza agents, not Codex runtime skills. They describe how product/content agents should write and audit tarot card content.

## Reusable production and QC skills

The repository provides three Codex skills for future deck work:

- `skills/nilaza-tarot-deck-production/SKILL.md`: create or update a themed deck through bilingual content, 78 original artworks, fixed card render, QC, and mobile integration.
- `skills/nilaza-tarot-content-qc/SKILL.md`: review VI/EN meanings, scene and prompt alignment, distinctiveness, and reflective safety.
- `skills/nilaza-tarot-art-qc/SKILL.md`: inspect each artwork and rendered card for symbol counts, anatomy, physical object logic, frame/title defects, originality, and mobile legibility.

The machine gate is `scripts/tarot-deck-quality-gate.mjs`. `prepare --deck <id>` creates or refreshes `quality-review.json` beside the deck's source card spec with content/artwork/card/cover/back hashes and pending visual checks. The legacy `stellar-mosaic` deck uses the `stellar-academy` source folder. `verify --deck <id>` blocks completion unless all 78 IDs, localized content, current hashes, review evidence, and numbered Minor symbol counts are complete. New themed decks also use `--require-deck-intros`, which requires 78 distinct VI/EN introductions and `assets/tarot/<id>/<id>-full-deck-manifest.json` with 78 scene/prompt records. Changed content, scene plans, deck style, or imagery resets affected reviews. `scripts/validate_tarot_assets.py` separately checks image presence, ratio, and card size; `npm run validate:visual-assets` checks runtime assets and app mappings.

An image review remains necessary at native and mobile size. The scripts verify the evidence and reject incomplete work, while a reviewer judges whether a hand actually grips its staff or ten coins are visible. Manager acceptance and app release are separate gates. `scripts/generate-tarot-data.mjs` is a legacy generator and must not be used for current deck updates because it can overwrite curated bilingual data.

## Visual Design Direction

Examples of distinct visual systems:

- Moon Garden:
  - Inward, night-botanical, moonlit.
  - Good for self, healing, and daily reflection.
- Rose Mirror:
  - Love, antique mirrors, muted rose.
  - Good for relationship, emotion, self-worth, and boundaries.
- Golden Thread:
  - Strategy, gold thread, classic geometry.
  - Good for decisions, career, and turning points.

The visual prompts intentionally say not to copy Rider-Waite artwork. Use the standard 78-card structure as a content skeleton, but keep Nilaza artwork original.

## Moon Garden Card Asset Pipeline

Stitch is useful for style discovery, but production tarot cards should use a fixed template pipeline so every card has the same size, frame, border, typography, texture, and safe area.

Current Moon Garden sample pipeline:

- Card spec: `assets/tarot/moon-garden/card-spec.json`
- Inner artwork source: `assets/tarot/moon-garden/artwork`
- Rendered card PNG output: `assets/tarot/moon-garden/cards`
- Contact sheets: `assets/tarot/moon-garden/contact-sheets`
- Sample manifest: `assets/tarot/moon-garden/sample-manifest.json`
- Renderer: `scripts/render_tarot_cards.py`
- Artwork normalizer: `scripts/normalize_tarot_artwork.py`
- Asset validator: `scripts/validate_tarot_assets.py`

Current fixed card size:

- `1024 x 1768px`

## Tarot Deck Backs

Each tarot deck has one matching card back for the mobile draw/waiting state. These assets use the same production card size as rendered card faces:

- `1024 x 1768px`
- Same portrait tarot ratio as Moon Garden card renders.
- No text, numbers, or Rider-Waite-specific symbols.
- Keep the central symbol readable when the card is scaled down in the mobile draw screen.

Current deck back assets:

- Moon Garden: `assets/tarot/deck-backs/moon-garden.png`
- Rose Mirror: `assets/tarot/deck-backs/rose-mirror.png`
- Golden Thread: `assets/tarot/deck-backs/golden-thread.png`
- Star Seeker: `assets/tarot/deck-backs/star-seeker.png`
- Stellar Mosaic: `assets/tarot/deck-backs/stellar-mosaic.png`
- Astral Pop Atelier: `assets/tarot/deck-backs/astral-pop-atelier.png`
- Classic Arcana: `assets/tarot/deck-backs/classic-arcana.png`

Manifest:

- `packages/content/data/tarot-deck-backs.json`

Renderer:

- `scripts/render_tarot_deck_backs.py`

Current Moon Garden inner artwork slot:

- `656 x 1130px`
- Target ratio: about `0.581`.
- Artwork should be generated as inner artwork only, with no card frame, no border, no title, no numbers, and no text.
- Keep key symbols inside the central safe area so the renderer can use contain-fit without losing detail.

Current approved-for-review samples:

- `minor-wands-eight`
- `minor-swords-seven`
- `minor-pentacles-ten`
- `minor-pentacles-six`
- `minor-pentacles-eight`

## Rose Mirror Card Asset Pipeline

Rose Mirror follows the same fixed production card geometry as Moon Garden while using its own emotional mirror/rose visual system:

- Deck bible: `docs/ROSE_MIRROR_DECK_BIBLE.md`
- Card spec: `assets/tarot/rose-mirror/card-spec.json`
- Inner artwork source: `assets/tarot/rose-mirror/artwork`
- Rendered card PNG output: `assets/tarot/rose-mirror/cards`
- Contact sheets: `assets/tarot/rose-mirror/contact-sheets`
- Full image-generation manifest: `assets/tarot/rose-mirror/rose-mirror-full-batch-manifest.json`
- Style proof manifest: `assets/tarot/rose-mirror/rose-mirror-style-proof-manifest.json`
- Curated prompt builder: `scripts/build_rose_mirror_designs.mjs`
- Full draft/proof artwork generator: `scripts/generate_rose_mirror_proof_artwork.py`

Current Rose Mirror proof cards:

- `major-00-fool`
- `major-02-high-priestess`
- `major-06-lovers`
- `major-08-strength`
- `major-15-devil`
- `major-16-tower`
- `major-18-moon`
- `minor-cups-two`
- `minor-swords-three`
- `minor-pentacles-six`

Rose Mirror full-deck scale status:

- Current gate: `approved_for_full_deck_app_release`.
- All 78 Rose Mirror card artworks and rendered card faces exist for deck-level review.
- A targeted polish pass has been applied to Wands 3-10, Swords 5-10, and Pentacles 7 to reduce template repetition in the Minor Arcana.
- A second targeted polish pass has been applied to all 16 court cards plus Cups Ace/3-10 and Pentacles Ace/2-5/8-10 to improve hierarchy, emotional specificity, and motif diversity.
- A final polish pass has been applied to the must-polish art-lock list: Magician, Empress, Emperor, Hierophant, Chariot, Hermit, Wands Ace/Two, and Swords Ace/Two.
- The final app-release art-lock audit is in `docs/ROSE_MIRROR_FINAL_ART_LOCK_AUDIT.md`.
- Approval criteria: emotional specificity, premium texture, mobile readability, motif diversity, no cheap romance, and no deterministic fortune-telling.

Run Rose Mirror polish batch 3:

```bash
python scripts/generate_rose_mirror_proof_artwork.py --cards major-01-magician major-03-empress major-04-emperor major-05-hierophant major-07-chariot major-09-hermit minor-wands-ace minor-wands-two minor-swords-ace minor-swords-two
python scripts/normalize_tarot_artwork.py --deck rose-mirror
python scripts/render_tarot_cards.py --deck rose-mirror --all-existing --paged-sheets
python scripts/validate_tarot_assets.py --deck rose-mirror
```

Run Rose Mirror polish batch 2:

```bash
python scripts/generate_rose_mirror_proof_artwork.py --cards minor-wands-page minor-wands-knight minor-wands-queen minor-wands-king minor-cups-ace minor-cups-three minor-cups-four minor-cups-five minor-cups-six minor-cups-seven minor-cups-eight minor-cups-nine minor-cups-ten minor-cups-page minor-cups-knight minor-cups-queen minor-cups-king minor-swords-page minor-swords-knight minor-swords-queen minor-swords-king minor-pentacles-ace minor-pentacles-two minor-pentacles-three minor-pentacles-four minor-pentacles-five minor-pentacles-eight minor-pentacles-nine minor-pentacles-ten minor-pentacles-page minor-pentacles-knight minor-pentacles-queen minor-pentacles-king
python scripts/normalize_tarot_artwork.py --deck rose-mirror
python scripts/render_tarot_cards.py --deck rose-mirror --all-existing --paged-sheets
python scripts/validate_tarot_assets.py --deck rose-mirror
```

Run Rose Mirror polish batch 1:

```bash
python scripts/generate_rose_mirror_proof_artwork.py --cards minor-wands-three minor-wands-four minor-wands-five minor-wands-six minor-wands-seven minor-wands-eight minor-wands-nine minor-wands-ten minor-swords-five minor-swords-six minor-swords-seven minor-swords-eight minor-swords-nine minor-swords-ten minor-pentacles-seven
python scripts/normalize_tarot_artwork.py --deck rose-mirror
python scripts/render_tarot_cards.py --deck rose-mirror --all-existing --paged-sheets
python scripts/validate_tarot_assets.py --deck rose-mirror
```

Run Rose Mirror full draft render and validation:

```bash
python scripts/generate_rose_mirror_proof_artwork.py
python scripts/normalize_tarot_artwork.py --deck rose-mirror
python scripts/render_tarot_cards.py --deck rose-mirror --all-existing --paged-sheets
python scripts/validate_tarot_assets.py --deck rose-mirror
```

Run Rose Mirror proof-only render when iterating the 10-card quality gate:

```bash
python scripts/generate_rose_mirror_proof_artwork.py --proof-only
python scripts/normalize_tarot_artwork.py --deck rose-mirror --cards major-00-fool major-02-high-priestess major-06-lovers major-08-strength major-15-devil major-16-tower major-18-moon minor-cups-two minor-swords-three minor-pentacles-six
python scripts/render_tarot_cards.py --deck rose-mirror --cards major-00-fool major-02-high-priestess major-06-lovers major-08-strength major-15-devil major-16-tower major-18-moon minor-cups-two minor-swords-three minor-pentacles-six --contact-sheet --contact-sheet-name rose-mirror-style-proof.png
python scripts/validate_tarot_assets.py --deck rose-mirror --cards major-00-fool major-02-high-priestess major-06-lovers major-08-strength major-15-devil major-16-tower major-18-moon minor-cups-two minor-swords-three minor-pentacles-six
```

Run sample render:

```bash
python scripts/render_tarot_cards.py --cards minor-wands-eight minor-swords-seven minor-pentacles-ten minor-pentacles-six minor-pentacles-eight --contact-sheet --contact-sheet-name moon-garden-flagged-ratio-fix.png
```

Run sample validation:

```bash
python scripts/validate_tarot_assets.py --sample-only
```

The intended production process is:

1. Generate inner artwork only.
2. Do not generate full cards directly.
3. Copy inner artwork into `assets/tarot/moon-garden/artwork/{cardId}.png`.
4. Normalize artwork to the approved inner slot with `python scripts/normalize_tarot_artwork.py`.
5. Render final PNG cards through `scripts/render_tarot_cards.py`.
6. Validate size, artwork ratio, and coverage through `scripts/validate_tarot_assets.py`.
7. Create contact sheets for product review.

Run full-deck normalization, render, and validation:

```bash
python scripts/normalize_tarot_artwork.py
python scripts/render_tarot_cards.py --all-existing --paged-sheets
python scripts/validate_tarot_assets.py
```

## Research Basis

Research summary used for this implementation:

- A standard tarot deck has 78 cards.
- The structure is 22 Major Arcana plus 56 Minor Arcana.
- Minor Arcana usually has 4 suits with 14 cards each.
- Contemporary court cards are commonly Page, Knight, Queen, and King.
- The Rider-Waite-Smith system is a useful reference tradition, but Nilaza should not copy protected modern deck editions or commercial artwork.

Reference URLs:

- `https://en.wikipedia.org/wiki/Rider%E2%80%93Waite_Tarot`
- `https://en.wikipedia.org/wiki/Minor_Arcana`
- `https://deckaura.com/pages/tarot-card-database`

## Testing Notes

The local mobile app now draws from all 78 cards. Each selected card can show:

- Orientation.
- Intro.
- Personality portrait.
- Upright/reversed meaning.
- Reflection question.

Before production, connect this to backend storage so readings can save:

- `deckId`
- `cardIds`
- `orientation`
- `spread`
- `question`
- `language`
- `cardDataVersion`
- `promptVersion`
- generated interpretation

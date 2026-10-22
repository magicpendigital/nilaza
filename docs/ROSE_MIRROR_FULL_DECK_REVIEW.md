# Rose Mirror Full Deck Review

Last updated: 2026-07-10

## Status

Current decision: `approved_for_full_deck_app_release`

Rose Mirror now has reviewable artwork for all 78 tarot cards by manager request, plus three targeted polish passes on the weakest template-feeling cards. This is a complete deck approved for Nilaza app-release use after the final art-lock audit. A future human illustration pass could still improve painterly detail for a printed or collectible edition, but that is no longer blocking app release.

The deck direction remains: intimate mirror ritual, muted rose, champagne candlelight, charcoal paper, antique glass, silk, pearls, emotional boundaries, and reflective self-agency. The art must feel like a premium emotional reflection deck for Nilaza, not cheap romance, horror occult, or deterministic fortune-telling.

## Source Files

- Story bible: `docs/ROSE_MIRROR_DECK_BIBLE.md`
- Artwork source folder: `assets/tarot/rose-mirror/artwork`
- Rendered card folder: `assets/tarot/rose-mirror/cards`
- Review sheets: `assets/tarot/rose-mirror/contact-sheets/rose-mirror-review-01.png` through `rose-mirror-review-07.png`
- Proof sheet: `assets/tarot/rose-mirror/contact-sheets/rose-mirror-style-proof.png`
- Final art-lock audit: `docs/ROSE_MIRROR_FINAL_ART_LOCK_AUDIT.md`
- Full draft generator: `scripts/generate_rose_mirror_proof_artwork.py`
- Card template spec: `assets/tarot/rose-mirror/card-spec.json`

## Deck-Level Review Notes

| Area | Current read | Decision |
| --- | --- | --- |
| Emotional specificity | The 10 proof cards carry the strongest emotional specificity. Polish pass 1 added more distinct emotional scenes to Wands 3-10, Swords 5-10, and Pentacles 7. Polish pass 2 added stronger court hierarchy plus more specific Cups/Pentacles emotional scenes. Polish pass 3 strengthened early Major Arcana, Wands Ace/Two, and Swords Ace/Two. | Pass. |
| Premium texture | The generator now uses paper grain, candle glow, glass rings, rose accents, silk panels, pinned cloth, glass shards, vanity trays, reflection pools, keys, cups, bottles, coins, pearls, and hand gestures. | Pass for app release. |
| Mobile readability | Numbered minors and court cards remain legible at contact-sheet scale because symbols are centered and uncluttered. | Pass for draft review. |
| Motif diversity | Major Arcana uses different core objects; suits split into candles, cups, pins, coins, silk, trays, keys, curtains, reflection pools, vanity boxes, bottles, and gesture cues. The mirror/rose language is more varied after polish pass 3. | Pass. |
| Cheap romance risk | The deck avoids Valentine color, wedding tropes, melodramatic couples, and sexualized attachment imagery. | Pass. |
| Deterministic fortune-telling risk | The visuals stay symbolic and choice-oriented. Difficult cards avoid fatalistic horror cues. | Pass. |

## Review Order

1. Review `rose-mirror-review-01.png` and `rose-mirror-review-02.png` for the full Major Arcana emotional arc.
2. Review `rose-mirror-review-03.png` and `rose-mirror-review-04.png` for Wands and Cups suit identity.
3. Review `rose-mirror-review-05.png` and `rose-mirror-review-06.png` for Swords and early Pentacles readability.
4. Review `rose-mirror-review-07.png` for final Pentacles and deck consistency.
5. Compare the 10 proof cards against the rest of the deck and mark any card that feels too generic, too flat, too romance-coded, or too close to deterministic fortune-telling.

## Polish Pass 1

Polished on 2026-07-10:

- `minor-wands-three`: threshold/window composition with three candles, curtain depth, and outward-looking ribbon.
- `minor-wands-four`: candle arch/threshold composition for stable celebration.
- `minor-wands-five`: crossed ribbons, candle tension, and glass shards for friction without aggression.
- `minor-wands-six`: candle procession and recognition arc.
- `minor-wands-seven`: protective silk panel, candle boundary, and hand gesture.
- `minor-wands-eight`: diagonal candle movement and motion lines.
- `minor-wands-nine`: candle guard behind silk for resilience and boundaries.
- `minor-wands-ten`: burdened candle bundle with two supporting hands.
- `minor-swords-five`: pinned silk conflict with shards, not weapon violence.
- `minor-swords-six`: pinned passage cloth for moving through difficulty.
- `minor-swords-seven`: strategic pinned silk with key cue.
- `minor-swords-eight`: vertical pins and blindfold-like ribbon for self-limitation.
- `minor-swords-nine`: anxious pinned cloth field with mirror crack, kept non-horror.
- `minor-swords-ten`: release scene with pinned cloth and supportive hand.
- `minor-pentacles-seven`: tray of coin-seeds and waiting hand for patience.

## Polish Pass 2

Polished on 2026-07-10:

- All court cards: `minor-wands-page`, `minor-wands-knight`, `minor-wands-queen`, `minor-wands-king`, `minor-cups-page`, `minor-cups-knight`, `minor-cups-queen`, `minor-cups-king`, `minor-swords-page`, `minor-swords-knight`, `minor-swords-queen`, `minor-swords-king`, `minor-pentacles-page`, `minor-pentacles-knight`, `minor-pentacles-queen`, `minor-pentacles-king`.
- Court hierarchy: Page now reads as learning/first awareness, Knight as movement, Queen as guarded care, King as stewardship.
- Cups polish: `minor-cups-ace`, `minor-cups-three`, `minor-cups-four`, `minor-cups-five`, `minor-cups-six`, `minor-cups-seven`, `minor-cups-eight`, `minor-cups-nine`, `minor-cups-ten`.
- Cups direction: reflection pools, cups, curtains, bottles, pearls, and restrained ribbons make the suit tender without becoming cheap romance.
- Pentacles polish: `minor-pentacles-ace`, `minor-pentacles-two`, `minor-pentacles-three`, `minor-pentacles-four`, `minor-pentacles-five`, `minor-pentacles-eight`, `minor-pentacles-nine`, `minor-pentacles-ten`.
- Pentacles direction: vanity boxes, keys, coin-seeds, trays, silk panels, and hand gestures make the suit more tactile and self-worth oriented.

## Polish Pass 3

Polished on 2026-07-10:

- `major-01-magician`, `major-03-empress`, `major-04-emperor`, `major-05-hierophant`, `major-07-chariot`, `major-09-hermit`.
- `minor-wands-ace`, `minor-wands-two`, `minor-swords-ace`, `minor-swords-two`.
- Direction: improve the opening deck experience and early Minor readability by replacing sparse object-list compositions with ritual scenes, stronger gesture cues, and clearer emotional hierarchy.

## Future Premium Illustration Notes

- Future work should be targeted card replacement only, not broad redesign.
- For a printed or collectible deck, commission or generate higher-painterly versions using this deck as the locked story/composition reference.
- Preserve the safety posture: the cards reveal emotional patterns and choices, not fixed outcomes.

## Acceptance Gate For Final Art Lock

Approve the deck only when all 78 cards pass:

- Emotional specificity: each card communicates a distinct inner moment.
- Premium texture: the deck feels tactile, editorial, and collectible.
- Mobile readability: primary symbol remains clear in app card size.
- Motif diversity: repeated mirrors/roses feel intentional, not copy-pasted.
- No cheap romance: no melodrama, wedding cliches, or generic pink love imagery.
- No deterministic fortune-telling: no visual claim that the future is fixed.

# Astral Pop Atelier Deck Bible

Last updated: 2026-06-14

Astral Pop Atelier is a premium mystical anime tarot deck for Gen Z users who use visual style as a form of self-expression. The deck should feel emotional, cinematic, collectible, and shareable while staying mature enough for Nilaza. It is not a cute novelty deck, not a copy of any existing anime, and not a recolor of Moon Garden.

Use the English deck name for both Vietnamese and English UI title fields:

- `vi`: Astral Pop Atelier
- `en`: Astral Pop Atelier

Vietnamese descriptions, card stories, reading copy, and review notes should remain in natural Vietnamese.

## Audience Insight

This deck is designed for users who:

- Enjoy anime, manga, character-driven worlds, avatars, collectibles, and expressive visual identities.
- Use tarot for emotional naming, self-reflection, relationship clarity, career uncertainty, belonging, and self-worth.
- Prefer visual systems that feel current, personal, and aesthetically coherent rather than generic mystical decoration.
- Respond to sincere emotional storytelling and reject cheap fortune-telling, fear-based mysticism, or obvious trend-chasing.

Design implication: every card should feel like a character moment inside one coherent world. The card should invite the user to ask "Which part of me is this?" rather than "What will happen to me?"

## Core Theme

Astral Pop Atelier is a midnight creative studio where feelings become constellations. Each card is a portrait of a young inner archetype learning to turn emotion, memory, desire, truth, and self-worth into a personal star map.

The full deck story:

- Major Arcana: the protagonist enters the Atelier, discovers creative agency, listens to intuition, learns care and structure, faces shadow and disruption, then returns to the world with a clearer identity.
- Minor Arcana: four rooms of the Atelier translate everyday life into symbolic practice.

## Visual System

- Format: inner tarot artwork only, generated for the fixed Nilaza card template.
- Final card size after rendering: `1024 x 1768px`.
- Inner artwork slot: `656 x 1130px`.
- Artwork ratio target: about `0.581`.
- Composition: portrait illustration, centered symbolic character or object scene, generous negative space, readable silhouette when scaled down.
- Must not include card frame, border, title, numbers, labels, UI, captions, watermark, or readable text.
- Must not copy Rider-Waite, commercial tarot decks, famous anime characters, celebrities, or specific studio styles.

## Palette

- Charcoal black: `#151416`
- Soft ivory: `#F7F1E6`
- Champagne gold: `#C9A45C`
- Ink indigo: `#23203A`
- Astral cyan: `#7FD8D2`
- Coral rose: `#FF7A8A`
- Star lemon: `#F7D36B`
- Moon gray: `#A8A3A0`

Color behavior:

- Keep charcoal and ink indigo as grounding colors so the deck remains Nilaza-premium.
- Use astral cyan, coral rose, and star lemon as luminous accents, not flat neon backgrounds.
- Avoid one-note purple/blue gradients.
- Use holographic light sparingly, as reflection and edge glow rather than a full background effect.

## Character Direction

Characters should feel like stylized young adults or ageless archetypes, not children. Use expressive anime-inspired faces, clean linework, emotional eyes, fashionable but non-branded outfits, and symbolic accessories. Keep body language thoughtful and reflective rather than pin-up, cosplay parody, or action-fantasy combat.

Avoid:

- School uniforms, childlike proportions, infantilized poses, sexualized styling, celebrity likeness, franchise resemblance.
- Overly busy chibi/kawaii styling.
- Horror occult, gore, cheap magic effects, or deterministic prophecy visuals.

## Suit Grammar

- Wands / Spark Studio: desire, initiative, creative courage. Motifs: comet sparks, glow batons, stage light, flame charms, kinetic ribbons.
- Cups / Tide Room: emotion, attachment, tenderness. Motifs: moon tea, reflective water, crystal headphones, floating petals, glass cups, soft waves.
- Swords / Signal Hall: thought, truth, conflict, boundaries. Motifs: glass screens, silver ink, paper planes, transparent ribbons, light cuts, clean air.
- Pentacles / Earth Lab: self-worth, resources, work, body, stability. Motifs: charm coins, terrariums, craft tools, vending tokens, small plants, desk objects.

## Prompt Template

Use case: stylized-concept

Asset type: inner tarot card illustration only, to be composited into a fixed Nilaza card template

Primary request: Create the inner artwork for the Astral Pop Atelier tarot deck card `{cardName}`.

Style: premium mystical anime editorial, midnight creative studio where feelings become constellations, expressive character portrait, refined Gen Z spiritual aesthetic.

Card meaning cues: `{keywords}`.

Deck visual direction: `{curatedVisualPrompt}`.

Composition: portrait illustration, centered symbolic character or object scene, generous negative space, readable silhouette, no card frame, no border, no title, no numbers, no text, no watermark.

Color palette: charcoal black, ink indigo, soft ivory highlights, champagne gold, astral cyan, coral rose, star lemon, subtle holographic reflections.

Avoid: Rider-Waite copy, commercial deck imitation, famous anime/studio imitation, celebrity likeness, childlike or sexualized styling, horror occult imagery, cheap neon background, text, numbers, watermark.

## Full Deck Design Manifest

Full 78-card design review manifest:

- `assets/tarot/astral-pop-atelier/astral-pop-atelier-full-deck-manifest.json`

Supporting files:

- `assets/tarot/astral-pop-atelier/card-spec.json`
- `docs/ASTRAL_POP_ATELIER_REVIEW_CHECKLIST.md`
- `scripts/build_astral_pop_atelier_designs.mjs`
- `scripts/validate_astral_pop_atelier_designs.mjs`

The full manifest includes all 22 Major Arcana and all 56 Minor Arcana cards. Use the validator before review or image production:

```powershell
node scripts\build_astral_pop_atelier_designs.mjs
node scripts\validate_astral_pop_atelier_designs.mjs
```

## Proof Cards

The first review batch contains the first five Major Arcana cards:

- `major-00-fool` / The Fool
- `major-01-magician` / The Magician
- `major-02-high-priestess` / The High Priestess
- `major-03-empress` / The Empress
- `major-04-emperor` / The Emperor

Approval criteria:

- The five cards clearly belong to one world.
- Each card has a distinct archetype and pose.
- The style feels anime-inspired but original.
- The emotional tone is Gen Z-friendly without becoming childish.
- Symbols remain readable in the `656 x 1130px` inner artwork slot.
- The artwork can later be rendered into the same fixed tarot template as Moon Garden.

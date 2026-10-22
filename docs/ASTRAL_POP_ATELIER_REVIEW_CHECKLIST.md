# Astral Pop Atelier Review Checklist

Last updated: 2026-06-14

This checklist is generated from the full Astral Pop Atelier design manifest. It is for product/design review before image production.

## Review Package

- Deck bible: `docs/ASTRAL_POP_ATELIER_DECK_BIBLE.md`
- Full 78-card manifest: `assets/tarot/astral-pop-atelier/astral-pop-atelier-full-deck-manifest.json`
- Card production spec: `assets/tarot/astral-pop-atelier/card-spec.json`
- Builder: `scripts/build_astral_pop_atelier_designs.mjs`
- Validator: `scripts/validate_astral_pop_atelier_designs.mjs`

## Validation Status

- `node scripts/build_astral_pop_atelier_designs.mjs`: passed, wrote 78 cards.
- `node scripts/validate_astral_pop_atelier_designs.mjs`: passed.
- `npm.cmd run validate:data`: passed.

## Deck-Level Checks

- English deck name is used for both `vi` and `en`: Astral Pop Atelier.
- Vietnamese descriptions and card stories remain Vietnamese.
- Card size remains `1024 x 1768px`.
- Inner artwork slot remains `656 x 1130px`.
- Each card prompt says inner artwork only, with no frame, border, title, number, text, or watermark.
- Each card prompt blocks Rider-Waite copy, famous anime/studio imitation, celebrity likeness, childlike styling, sexualized styling, and horror occult imagery.
- Full coverage: 22 Major Arcana, 56 Minor Arcana, 14 cards per suit.

## Major Arcana

| Status | Card ID | Title | Review focus |
| --- | --- | --- | --- |
| Ready | `major-00-fool` | The Fool | Distinct archetype, emotional clarity, original anime-premium composition |
| Ready | `major-01-magician` | The Magician | Distinct archetype, emotional clarity, original anime-premium composition |
| Ready | `major-02-high-priestess` | The High Priestess | Distinct archetype, emotional clarity, original anime-premium composition |
| Ready | `major-03-empress` | The Empress | Distinct archetype, emotional clarity, original anime-premium composition |
| Ready | `major-04-emperor` | The Emperor | Distinct archetype, emotional clarity, original anime-premium composition |
| Ready | `major-05-hierophant` | The Hierophant | Distinct archetype, emotional clarity, original anime-premium composition |
| Ready | `major-06-lovers` | The Lovers | Distinct archetype, emotional clarity, original anime-premium composition |
| Ready | `major-07-chariot` | The Chariot | Distinct archetype, emotional clarity, original anime-premium composition |
| Ready | `major-08-strength` | Strength | Distinct archetype, emotional clarity, original anime-premium composition |
| Ready | `major-09-hermit` | The Hermit | Distinct archetype, emotional clarity, original anime-premium composition |
| Ready | `major-10-wheel` | Wheel of Fortune | Distinct archetype, emotional clarity, original anime-premium composition |
| Ready | `major-11-justice` | Justice | Distinct archetype, emotional clarity, original anime-premium composition |
| Ready | `major-12-hanged-man` | The Hanged Man | Distinct archetype, emotional clarity, original anime-premium composition |
| Ready | `major-13-death` | Death | Distinct archetype, emotional clarity, original anime-premium composition |
| Ready | `major-14-temperance` | Temperance | Distinct archetype, emotional clarity, original anime-premium composition |
| Ready | `major-15-devil` | The Devil | Distinct archetype, emotional clarity, original anime-premium composition |
| Ready | `major-16-tower` | The Tower | Distinct archetype, emotional clarity, original anime-premium composition |
| Ready | `major-17-star` | The Star | Distinct archetype, emotional clarity, original anime-premium composition |
| Ready | `major-18-moon` | The Moon | Distinct archetype, emotional clarity, original anime-premium composition |
| Ready | `major-19-sun` | The Sun | Distinct archetype, emotional clarity, original anime-premium composition |
| Ready | `major-20-judgement` | Judgement | Distinct archetype, emotional clarity, original anime-premium composition |
| Ready | `major-21-world` | The World | Distinct archetype, emotional clarity, original anime-premium composition |

## Wands / Spark Studio

| Status | Card ID | Title | Review focus |
| --- | --- | --- | --- |
| Ready | `minor-wands-ace` | Ace of Wands | Suit grammar matched, rank moment clear, no text/frame in artwork prompt |
| Ready | `minor-wands-two` | Two of Wands | Suit grammar matched, rank moment clear, no text/frame in artwork prompt |
| Ready | `minor-wands-three` | Three of Wands | Suit grammar matched, rank moment clear, no text/frame in artwork prompt |
| Ready | `minor-wands-four` | Four of Wands | Suit grammar matched, rank moment clear, no text/frame in artwork prompt |
| Ready | `minor-wands-five` | Five of Wands | Suit grammar matched, rank moment clear, no text/frame in artwork prompt |
| Ready | `minor-wands-six` | Six of Wands | Suit grammar matched, rank moment clear, no text/frame in artwork prompt |
| Ready | `minor-wands-seven` | Seven of Wands | Suit grammar matched, rank moment clear, no text/frame in artwork prompt |
| Ready | `minor-wands-eight` | Eight of Wands | Suit grammar matched, rank moment clear, no text/frame in artwork prompt |
| Ready | `minor-wands-nine` | Nine of Wands | Suit grammar matched, rank moment clear, no text/frame in artwork prompt |
| Ready | `minor-wands-ten` | Ten of Wands | Suit grammar matched, rank moment clear, no text/frame in artwork prompt |
| Ready | `minor-wands-page` | Page of Wands | Suit grammar matched, rank moment clear, no text/frame in artwork prompt |
| Ready | `minor-wands-knight` | Knight of Wands | Suit grammar matched, rank moment clear, no text/frame in artwork prompt |
| Ready | `minor-wands-queen` | Queen of Wands | Suit grammar matched, rank moment clear, no text/frame in artwork prompt |
| Ready | `minor-wands-king` | King of Wands | Suit grammar matched, rank moment clear, no text/frame in artwork prompt |

## Cups / Tide Room

| Status | Card ID | Title | Review focus |
| --- | --- | --- | --- |
| Ready | `minor-cups-ace` | Ace of Cups | Suit grammar matched, rank moment clear, no text/frame in artwork prompt |
| Ready | `minor-cups-two` | Two of Cups | Suit grammar matched, rank moment clear, no text/frame in artwork prompt |
| Ready | `minor-cups-three` | Three of Cups | Suit grammar matched, rank moment clear, no text/frame in artwork prompt |
| Ready | `minor-cups-four` | Four of Cups | Suit grammar matched, rank moment clear, no text/frame in artwork prompt |
| Ready | `minor-cups-five` | Five of Cups | Suit grammar matched, rank moment clear, no text/frame in artwork prompt |
| Ready | `minor-cups-six` | Six of Cups | Suit grammar matched, rank moment clear, no text/frame in artwork prompt |
| Ready | `minor-cups-seven` | Seven of Cups | Suit grammar matched, rank moment clear, no text/frame in artwork prompt |
| Ready | `minor-cups-eight` | Eight of Cups | Suit grammar matched, rank moment clear, no text/frame in artwork prompt |
| Ready | `minor-cups-nine` | Nine of Cups | Suit grammar matched, rank moment clear, no text/frame in artwork prompt |
| Ready | `minor-cups-ten` | Ten of Cups | Suit grammar matched, rank moment clear, no text/frame in artwork prompt |
| Ready | `minor-cups-page` | Page of Cups | Suit grammar matched, rank moment clear, no text/frame in artwork prompt |
| Ready | `minor-cups-knight` | Knight of Cups | Suit grammar matched, rank moment clear, no text/frame in artwork prompt |
| Ready | `minor-cups-queen` | Queen of Cups | Suit grammar matched, rank moment clear, no text/frame in artwork prompt |
| Ready | `minor-cups-king` | King of Cups | Suit grammar matched, rank moment clear, no text/frame in artwork prompt |

## Swords / Signal Hall

| Status | Card ID | Title | Review focus |
| --- | --- | --- | --- |
| Ready | `minor-swords-ace` | Ace of Swords | Suit grammar matched, rank moment clear, no text/frame in artwork prompt |
| Ready | `minor-swords-two` | Two of Swords | Suit grammar matched, rank moment clear, no text/frame in artwork prompt |
| Ready | `minor-swords-three` | Three of Swords | Suit grammar matched, rank moment clear, no text/frame in artwork prompt |
| Ready | `minor-swords-four` | Four of Swords | Suit grammar matched, rank moment clear, no text/frame in artwork prompt |
| Ready | `minor-swords-five` | Five of Swords | Suit grammar matched, rank moment clear, no text/frame in artwork prompt |
| Ready | `minor-swords-six` | Six of Swords | Suit grammar matched, rank moment clear, no text/frame in artwork prompt |
| Ready | `minor-swords-seven` | Seven of Swords | Suit grammar matched, rank moment clear, no text/frame in artwork prompt |
| Ready | `minor-swords-eight` | Eight of Swords | Suit grammar matched, rank moment clear, no text/frame in artwork prompt |
| Ready | `minor-swords-nine` | Nine of Swords | Suit grammar matched, rank moment clear, no text/frame in artwork prompt |
| Ready | `minor-swords-ten` | Ten of Swords | Suit grammar matched, rank moment clear, no text/frame in artwork prompt |
| Ready | `minor-swords-page` | Page of Swords | Suit grammar matched, rank moment clear, no text/frame in artwork prompt |
| Ready | `minor-swords-knight` | Knight of Swords | Suit grammar matched, rank moment clear, no text/frame in artwork prompt |
| Ready | `minor-swords-queen` | Queen of Swords | Suit grammar matched, rank moment clear, no text/frame in artwork prompt |
| Ready | `minor-swords-king` | King of Swords | Suit grammar matched, rank moment clear, no text/frame in artwork prompt |

## Pentacles / Earth Lab

| Status | Card ID | Title | Review focus |
| --- | --- | --- | --- |
| Ready | `minor-pentacles-ace` | Ace of Pentacles | Suit grammar matched, rank moment clear, no text/frame in artwork prompt |
| Ready | `minor-pentacles-two` | Two of Pentacles | Suit grammar matched, rank moment clear, no text/frame in artwork prompt |
| Ready | `minor-pentacles-three` | Three of Pentacles | Suit grammar matched, rank moment clear, no text/frame in artwork prompt |
| Ready | `minor-pentacles-four` | Four of Pentacles | Suit grammar matched, rank moment clear, no text/frame in artwork prompt |
| Ready | `minor-pentacles-five` | Five of Pentacles | Suit grammar matched, rank moment clear, no text/frame in artwork prompt |
| Ready | `minor-pentacles-six` | Six of Pentacles | Suit grammar matched, rank moment clear, no text/frame in artwork prompt |
| Ready | `minor-pentacles-seven` | Seven of Pentacles | Suit grammar matched, rank moment clear, no text/frame in artwork prompt |
| Ready | `minor-pentacles-eight` | Eight of Pentacles | Suit grammar matched, rank moment clear, no text/frame in artwork prompt |
| Ready | `minor-pentacles-nine` | Nine of Pentacles | Suit grammar matched, rank moment clear, no text/frame in artwork prompt |
| Ready | `minor-pentacles-ten` | Ten of Pentacles | Suit grammar matched, rank moment clear, no text/frame in artwork prompt |
| Ready | `minor-pentacles-page` | Page of Pentacles | Suit grammar matched, rank moment clear, no text/frame in artwork prompt |
| Ready | `minor-pentacles-knight` | Knight of Pentacles | Suit grammar matched, rank moment clear, no text/frame in artwork prompt |
| Ready | `minor-pentacles-queen` | Queen of Pentacles | Suit grammar matched, rank moment clear, no text/frame in artwork prompt |
| Ready | `minor-pentacles-king` | King of Pentacles | Suit grammar matched, rank moment clear, no text/frame in artwork prompt |


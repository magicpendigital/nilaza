from __future__ import annotations

import argparse
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


STYLE_BY_DECK = {
    "moon-garden": (
        "premium mystical editorial, charcoal black paper texture, champagne gold foil line art, "
        "soft moonlit botanical details, elegant and serene, refined Gen Z spireflective practice aesthetic"
    ),
    "rose-mirror": (
        "premium mystical editorial, intimate antique mirror reflective practice, charcoal paper texture, "
        "muted rose and rose-gold accents, warm candlelight, soft glass reflections, silk, pearls, "
        "dried petals, refined Gen Z spireflective practice aesthetic"
    ),
    "golden-thread": (
        "premium mystical editorial, deep teal archival paper, precise gold-thread geometry, "
        "classic symbolic composition, refined strategic spireflective practice aesthetic"
    ),
}


PALETTE_BY_DECK = {
    "moon-garden": "charcoal black, warm ink, muted champagne gold, moon gray, very subtle deep teal shadows",
    "rose-mirror": "charcoal black, deep rose ink, muted rose, ivory highlights, rose-gold and champagne candle accents, moon gray reflections",
    "golden-thread": "deep teal, archival paper cream, refined gold thread, muted shadow, warm ivory highlights",
}


AVOID_BY_DECK = {
    "moon-garden": "Rider-Waite copy, bright neon colors, horror occult style, text, commercial deck imitation",
    "rose-mirror": "Rider-Waite copy, celebrity likeness, bright neon colors, horror occult style, cheap romance imagery, text, commercial deck imitation",
    "golden-thread": "Rider-Waite copy, bright neon colors, horror occult style, text, commercial deck imitation",
}


def read_json(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def deck_label(deck_id: str) -> str:
    return " ".join(part.capitalize() for part in deck_id.split("-"))


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--deck", default="moon-garden")
    parser.add_argument("--cards", nargs="*")
    parser.add_argument("--include-existing", action="store_true")
    parser.add_argument("--out")
    args = parser.parse_args()

    cards = read_json(ROOT / "packages" / "content" / "data" / "tarot-cards.json")
    designs = read_json(ROOT / "packages" / "content" / "data" / "tarot-card-designs.json")
    spec = read_json(ROOT / "assets" / "tarot" / args.deck / "card-spec.json")
    deck_design = next(item for item in designs if item["deckId"] == args.deck)
    visual_by_id = {item["cardId"]: item for item in deck_design["cards"]}
    artwork_dir = ROOT / spec["output"]["artworkDir"]
    artwork_dir.mkdir(parents=True, exist_ok=True)

    selected_ids = set(args.cards) if args.cards else None
    batch = []
    for card in cards:
        card_id = card["id"]
        if selected_ids and card_id not in selected_ids:
            continue
        if not args.include_existing and (artwork_dir / f"{card_id}.png").exists():
            continue

        visual = visual_by_id[card_id]["visualPrompt"]["en"]
        batch.append(
            {
                "cardId": card_id,
                "name": card["name"],
                "arcana": card["arcana"],
                "suit": card.get("suit"),
                "keywords": card["keywords"],
                "artworkPath": f"{spec['output']['artworkDir']}/{card_id}.png",
                "cardPath": f"{spec['output']['cardDir']}/{card_id}.png",
                "prompt": (
                    "Use case: stylized-concept\n"
                    "Asset type: inner tarot card illustration only, to be composited into a fixed card template\n"
                    f"Primary request: Create the inner artwork for the {deck_label(args.deck)} tarot deck card {card['name']['en']}.\n"
                    f"Style: {STYLE_BY_DECK.get(args.deck, STYLE_BY_DECK['moon-garden'])}.\n"
                    f"Card meaning cues: {', '.join(card['keywords']['en'])}.\n"
                    f"Deck visual direction: {visual}\n"
                    "Composition: portrait illustration, centered symbolic subject or portrait, generous negative space, "
                    "no card frame, no border, no title, no numbers, no text, no watermark.\n"
                    f"Color palette: {PALETTE_BY_DECK.get(args.deck, PALETTE_BY_DECK['moon-garden'])}.\n"
                    f"Avoid: {AVOID_BY_DECK.get(args.deck, AVOID_BY_DECK['moon-garden'])}."
                ),
            }
        )

    out_path = ROOT / (args.out or f"assets/tarot/{args.deck}/{args.deck}-batch-manifest.json")
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(
        json.dumps(
            {
                "deckId": args.deck,
                "includeExisting": args.include_existing,
                "remaining": len(batch),
                "items": batch,
            },
            indent=2,
            ensure_ascii=False,
        )
        + "\n",
        encoding="utf-8",
    )
    print(out_path.relative_to(ROOT))
    print(f"items={len(batch)}")
    for item in batch[:12]:
        print(f"- {item['cardId']}: {item['name']['en']}")


if __name__ == "__main__":
    main()

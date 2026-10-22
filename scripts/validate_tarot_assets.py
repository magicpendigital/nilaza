from __future__ import annotations

import argparse
import json
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]


def read_json(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--deck", default="moon-garden")
    parser.add_argument("--sample-only", action="store_true")
    parser.add_argument("--cards", nargs="*")
    args = parser.parse_args()

    spec = read_json(ROOT / "assets" / "tarot" / args.deck / "card-spec.json")
    cards = read_json(ROOT / "packages" / "content" / "data" / "tarot-cards.json")
    expected_size = (spec["cardSize"]["width"], spec["cardSize"]["height"])
    artwork_area = spec["artworkArea"]
    expected_artwork_ratio = artwork_area["width"] / artwork_area["height"]
    artwork_ratio_tolerance = spec["style"].get("artworkRatioTolerance", 0.08)
    card_dir = ROOT / spec["output"]["cardDir"]
    artwork_dir = ROOT / spec["output"]["artworkDir"]
    sample_ids = [
        "minor-wands-eight",
        "minor-swords-seven",
        "minor-pentacles-ten",
        "minor-pentacles-six",
        "minor-pentacles-eight",
    ]
    if args.cards:
        required_ids = args.cards
    elif args.sample_only:
        required_ids = sample_ids
    else:
        required_ids = [card["id"] for card in cards]

    errors = []
    for card_id in required_ids:
        card_path = card_dir / f"{card_id}.png"
        art_path = artwork_dir / f"{card_id}.png"
        if not art_path.exists():
            errors.append(f"Missing artwork: {art_path.relative_to(ROOT)}")
        else:
            with Image.open(art_path) as artwork:
                artwork_ratio = artwork.width / artwork.height
                ratio_delta = abs(artwork_ratio - expected_artwork_ratio) / expected_artwork_ratio
                if ratio_delta > artwork_ratio_tolerance:
                    errors.append(
                        "Artwork ratio mismatch for "
                        f"{art_path.relative_to(ROOT)}: {artwork.width} x {artwork.height} "
                        f"ratio {artwork_ratio:.3f}, expected near {expected_artwork_ratio:.3f} "
                        f"(tolerance {artwork_ratio_tolerance:.0%})"
                    )
        if not card_path.exists():
            errors.append(f"Missing card: {card_path.relative_to(ROOT)}")
            continue
        with Image.open(card_path) as image:
            if image.size != expected_size:
                errors.append(f"Wrong size for {card_path.relative_to(ROOT)}: {image.size}, expected {expected_size}")

    if errors:
        print("Tarot asset validation failed:")
        for error in errors:
            print(f"- {error}")
        raise SystemExit(1)

    print("Tarot asset validation passed.")
    print(f"Deck: {args.deck}")
    print(f"Cards checked: {len(required_ids)}")
    print(f"Expected size: {expected_size[0]} x {expected_size[1]}")
    print(f"Expected artwork ratio: {expected_artwork_ratio:.3f} +/- {artwork_ratio_tolerance:.0%}")


if __name__ == "__main__":
    main()

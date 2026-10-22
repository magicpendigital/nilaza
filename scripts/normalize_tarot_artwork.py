from __future__ import annotations

import argparse
import json
from pathlib import Path

from PIL import Image, ImageEnhance, ImageFilter


ROOT = Path(__file__).resolve().parents[1]


def read_json(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def cover_background(image: Image.Image, size: tuple[int, int]) -> Image.Image:
    ratio = max(size[0] / image.width, size[1] / image.height)
    resized_size = (round(image.width * ratio), round(image.height * ratio))
    resized = image.resize(resized_size, Image.Resampling.LANCZOS)
    left = (resized.width - size[0]) // 2
    top = (resized.height - size[1]) // 2
    background = resized.crop((left, top, left + size[0], top + size[1]))
    background = background.filter(ImageFilter.GaussianBlur(18))
    background = ImageEnhance.Brightness(background).enhance(0.34)
    background = ImageEnhance.Contrast(background).enhance(0.82)
    return background


def trim_flat_padding(image: Image.Image, fill: str) -> Image.Image:
    fill_rgb = tuple(int(fill.lstrip("#")[i : i + 2], 16) for i in (0, 2, 4))
    pixels = image.load()
    width, height = image.size

    def near_fill_line_horizontal(y: int) -> bool:
        sampled = [pixels[x, y] for x in range(0, width, max(1, width // 64))]
        distances = [sum(abs(sampled_pixel[i] - fill_rgb[i]) for i in range(3)) for sampled_pixel in sampled]
        return sum(distance < 18 for distance in distances) / len(distances) > 0.88

    def near_fill_line_vertical(x: int) -> bool:
        sampled = [pixels[x, y] for y in range(0, height, max(1, height // 64))]
        distances = [sum(abs(sampled_pixel[i] - fill_rgb[i]) for i in range(3)) for sampled_pixel in sampled]
        return sum(distance < 18 for distance in distances) / len(distances) > 0.88

    left = 0
    while left < width // 3 and near_fill_line_vertical(left):
        left += 1
    right = width - 1
    while right > width * 2 // 3 and near_fill_line_vertical(right):
        right -= 1
    top = 0
    while top < height // 3 and near_fill_line_horizontal(top):
        top += 1
    bottom = height - 1
    while bottom > height * 2 // 3 and near_fill_line_horizontal(bottom):
        bottom -= 1

    if left == 0 and right == width - 1 and top == 0 and bottom == height - 1:
        return image
    if right <= left or bottom <= top:
        return image
    return image.crop((left, top, right + 1, bottom + 1))


def normalized_artwork(image: Image.Image, size: tuple[int, int], fill: str) -> Image.Image:
    image = image.convert("RGB")
    image = trim_flat_padding(image, fill)
    ratio = min(size[0] / image.width, size[1] / image.height)
    resized_size = (round(image.width * ratio), round(image.height * ratio))
    resized = image.resize(resized_size, Image.Resampling.LANCZOS)
    canvas = cover_background(image, size)
    canvas.paste(resized, ((size[0] - resized.width) // 2, (size[1] - resized.height) // 2))
    return canvas


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--deck", default="moon-garden")
    parser.add_argument("--cards", nargs="*")
    args = parser.parse_args()

    spec = read_json(ROOT / "assets" / "tarot" / args.deck / "card-spec.json")
    cards = read_json(ROOT / "packages" / "content" / "data" / "tarot-cards.json")
    artwork_dir = ROOT / spec["output"]["artworkDir"]
    area = spec["artworkArea"]
    target_size = (area["width"], area["height"])
    target_ids = set(args.cards) if args.cards else {card["id"] for card in cards}

    written = 0
    for card in cards:
        card_id = card["id"]
        if card_id not in target_ids:
            continue

        source_path = artwork_dir / f"{card_id}.png"
        if not source_path.exists():
            raise FileNotFoundError(f"Missing artwork: {source_path.relative_to(ROOT)}")

        with Image.open(source_path) as source:
            output = normalized_artwork(source, target_size, spec["colors"]["ink"])
        output.save(source_path)
        written += 1
        print(f"{source_path.relative_to(ROOT)} -> {target_size[0]} x {target_size[1]}")

    print(f"Normalized artwork files: {written}")


if __name__ == "__main__":
    main()

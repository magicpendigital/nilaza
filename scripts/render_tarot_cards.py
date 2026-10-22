from __future__ import annotations

import argparse
import json
import math
import random
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont


ROOT = Path(__file__).resolve().parents[1]


def read_json(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def load_deck_design(deck_id: str):
    designs = read_json(ROOT / "packages" / "content" / "data" / "tarot-card-designs.json")
    for item in designs:
        if item["deckId"] == deck_id:
            return item

    review_manifest = ROOT / "assets" / "tarot" / deck_id / f"{deck_id}-full-deck-manifest.json"
    if review_manifest.exists():
        manifest = read_json(review_manifest)
        return {
            "deckId": deck_id,
            "style": manifest.get("vibe", {"vi": deck_id, "en": deck_id}),
            "cards": manifest.get("cards", []),
        }

    return {"deckId": deck_id, "style": {"vi": deck_id, "en": deck_id}, "cards": []}


def hex_to_rgb(value: str) -> tuple[int, int, int]:
    value = value.lstrip("#")
    return tuple(int(value[i : i + 2], 16) for i in (0, 2, 4))


_FONT_CANDIDATE_CACHE = {}


def _get_font_path(bold: bool) -> str | None:
    if bold in _FONT_CANDIDATE_CACHE:
        return _FONT_CANDIDATE_CACHE[bold]

    candidates = (
        ["C:/Windows/Fonts/georgiab.ttf", "C:/Windows/Fonts/arialbd.ttf", "C:/Windows/Fonts/georgia.ttf"]
        if bold
        else ["C:/Windows/Fonts/georgia.ttf", "C:/Windows/Fonts/arial.ttf"]
    )
    for candidate in candidates:
        if Path(candidate).exists():
            _FONT_CANDIDATE_CACHE[bold] = candidate
            return candidate

    _FONT_CANDIDATE_CACHE[bold] = None
    return None


def font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    path = _get_font_path(bold)
    if path:
        return ImageFont.truetype(path, size=size)
    return ImageFont.load_default()


def rounded_mask(size: tuple[int, int], radius: int) -> Image.Image:
    mask = Image.new("L", size, 0)
    draw = ImageDraw.Draw(mask)
    draw.rounded_rectangle((0, 0, size[0] - 1, size[1] - 1), radius=radius, fill=255)
    return mask


def cover_resize(image: Image.Image, size: tuple[int, int]) -> Image.Image:
    image = image.convert("RGB")
    ratio = max(size[0] / image.width, size[1] / image.height)
    resized = image.resize((math.ceil(image.width * ratio), math.ceil(image.height * ratio)), Image.Resampling.LANCZOS)
    left = (resized.width - size[0]) // 2
    top = (resized.height - size[1]) // 2
    return resized.crop((left, top, left + size[0], top + size[1]))


def contain_resize(image: Image.Image, size: tuple[int, int], fill: str) -> Image.Image:
    image = image.convert("RGB")
    ratio = min(size[0] / image.width, size[1] / image.height)
    resized = image.resize((math.floor(image.width * ratio), math.floor(image.height * ratio)), Image.Resampling.LANCZOS)
    canvas = Image.new("RGB", size, fill)
    left = (size[0] - resized.width) // 2
    top = (size[1] - resized.height) // 2
    canvas.paste(resized, (left, top))
    return canvas


def fit_artwork(image: Image.Image, spec) -> Image.Image:
    area = spec["artworkArea"]
    size = (area["width"], area["height"])
    fit = spec.get("style", {}).get("artworkFit", "contain")
    if fit == "cover":
        return cover_resize(image, size)
    return contain_resize(image, size, spec["colors"]["ink"])


def draw_centered_text(draw: ImageDraw.ImageDraw, box: tuple[int, int, int, int], text: str, fill, max_size: int, min_size: int, bold: bool = False):
    x1, y1, x2, y2 = box
    for size in range(max_size, min_size - 1, -2):
        chosen = font(size, bold=bold)
        bbox = draw.multiline_textbbox((0, 0), text, font=chosen, spacing=8, align="center")
        if bbox[2] - bbox[0] <= x2 - x1 and bbox[3] - bbox[1] <= y2 - y1:
            x = x1 + ((x2 - x1) - (bbox[2] - bbox[0])) / 2
            y = y1 + ((y2 - y1) - (bbox[3] - bbox[1])) / 2
            draw.multiline_text((x, y), text, font=chosen, fill=fill, spacing=8, align="center")
            return
    draw.text((x1, y1), text, font=font(min_size, bold=bold), fill=fill)


def make_placeholder_art(card, spec) -> Image.Image:
    area = spec["artworkArea"]
    colors = spec["colors"]
    size = (area["width"], area["height"])
    img = Image.new("RGB", size, colors["ink"])
    draw = ImageDraw.Draw(img)
    random.seed(card["id"])

    bg = Image.new("RGB", size, colors["ink"])
    bg_draw = ImageDraw.Draw(bg)
    for y in range(size[1]):
        t = y / max(1, size[1] - 1)
        base = hex_to_rgb(colors["ink"])
        teal = hex_to_rgb(colors["teal"])
        mixed = tuple(int(base[i] * (1 - t * 0.45) + teal[i] * t * 0.45) for i in range(3))
        bg_draw.line((0, y, size[0], y), fill=mixed)
    img = bg
    draw = ImageDraw.Draw(img)

    gold = hex_to_rgb(colors["gold"])
    moon = hex_to_rgb(colors["moon"])
    cx, cy = size[0] // 2, int(size[1] * 0.43)
    radius = min(size) // 4
    draw.ellipse((cx - radius, cy - radius, cx + radius, cy + radius), outline=gold, width=4)
    draw.arc((cx - radius // 2, cy - radius // 2, cx + radius // 2, cy + radius // 2), 70, 290, fill=moon, width=5)
    for i in range(18):
        angle = random.random() * math.tau
        length = random.randint(90, 260)
        sx = cx + math.cos(angle) * random.randint(40, 120)
        sy = cy + math.sin(angle) * random.randint(40, 120)
        ex = sx + math.cos(angle) * length
        ey = sy + math.sin(angle) * length
        draw.line((sx, sy, ex, ey), fill=gold, width=random.randint(1, 3))
        draw.ellipse((ex - 4, ey - 4, ex + 4, ey + 4), fill=gold)
    draw_centered_text(draw, (70, int(size[1] * 0.68), size[0] - 70, int(size[1] * 0.83)), card["name"]["en"], gold, 48, 28, bold=True)
    return img.filter(ImageFilter.SMOOTH)


def load_artwork(card_id: str, spec) -> Image.Image | None:
    art_dir = ROOT / spec["output"]["artworkDir"]
    for suffix in [".png", ".jpg", ".jpeg", ".webp"]:
        path = art_dir / f"{card_id}{suffix}"
        if path.exists():
            return Image.open(path)
    return None


def render_card(card, deck_design, spec, use_placeholder: bool) -> Image.Image:
    width = spec["cardSize"]["width"]
    height = spec["cardSize"]["height"]
    colors = spec["colors"]
    bg = Image.new("RGB", (width, height), colors["background"])
    draw = ImageDraw.Draw(bg)

    rng = random.Random(card["id"])
    for _ in range(9000):
        x = rng.randrange(width)
        y = rng.randrange(height)
        v = rng.randrange(8, 30)
        draw.point((x, y), fill=(v + 18, v + 16, v + 14))

    card_mask = rounded_mask((width, height), spec["style"]["cornerRadius"])
    bg.putalpha(card_mask)
    draw = ImageDraw.Draw(bg)
    gold = hex_to_rgb(colors["gold"])
    gold_dim = hex_to_rgb(colors["goldDim"])
    ivory = hex_to_rgb(colors["ivory"])
    moon = hex_to_rgb(colors["moon"])

    margin = 54
    draw.rounded_rectangle((margin, margin, width - margin, height - margin), radius=42, outline=gold, width=spec["style"]["borderWidth"])
    draw.rounded_rectangle((88, 96, width - 88, height - 96), radius=30, outline=gold_dim, width=2)
    draw.line((140, 190, width - 140, 190), fill=gold_dim, width=2)
    draw.line((140, height - 220, width - 140, height - 220), fill=gold_dim, width=2)

    for x in [140, width - 140]:
        for y in [188, height - 220]:
            draw.ellipse((x - 9, y - 9, x + 9, y + 9), outline=gold, width=2)

    art_box = spec["artworkArea"]
    art = load_artwork(card["id"], spec)
    if art is None and use_placeholder:
        art = make_placeholder_art(card, spec)
    elif art is None:
        raise FileNotFoundError(f"Missing artwork for {card['id']}")
    art = fit_artwork(art, spec)
    art_mask = rounded_mask((art_box["width"], art_box["height"]), spec["style"]["artworkCornerRadius"])
    bg.paste(art.convert("RGBA"), (art_box["x"], art_box["y"]), art_mask)
    draw = ImageDraw.Draw(bg)
    draw.rounded_rectangle(
        (art_box["x"], art_box["y"], art_box["x"] + art_box["width"], art_box["y"] + art_box["height"]),
        radius=spec["style"]["artworkCornerRadius"],
        outline=gold,
        width=3,
    )

    title = card["name"]["en"].upper()
    title_area = spec["titleArea"]
    draw_centered_text(
        draw,
        (title_area["x"], title_area["y"], title_area["x"] + title_area["width"], title_area["y"] + title_area["height"]),
        title,
        ivory,
        56,
        30,
        bold=True,
    )

    keywords = " / ".join(card["keywords"]["en"][:3]).upper()
    key_area = spec["keywordArea"]
    draw_centered_text(
        draw,
        (key_area["x"], key_area["y"], key_area["x"] + key_area["width"], key_area["y"] + key_area["height"]),
        keywords,
        moon,
        28,
        18,
    )

    rank = "MAJOR ARCANA" if card["arcana"] == "major" else f"{card['suit']} / {card['rank']}".upper()
    draw_centered_text(draw, (168, 92, width - 168, 152), rank, gold, 24, 14)
    return bg


def make_contact_sheet(card_paths: list[Path], out_path: Path):
    thumbs = []
    for path in card_paths:
        img = Image.open(path).convert("RGBA")
        img.thumbnail((220, 380), Image.Resampling.LANCZOS)
        thumbs.append((path, img.copy()))
    cols = min(3, max(1, len(thumbs)))
    rows = math.ceil(len(thumbs) / cols)
    sheet = Image.new("RGB", (cols * 260 + 40, rows * 430 + 40), "#151416")
    draw = ImageDraw.Draw(sheet)
    for index, (path, img) in enumerate(thumbs):
        col = index % cols
        row = index // cols
        x = 30 + col * 260
        y = 30 + row * 430
        sheet.paste(img, (x, y), img)
        draw.text((x, y + img.height + 10), path.stem[:24], fill="#F7F1E6", font=font(18))
    out_path.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(out_path)


def make_paged_contact_sheets(card_paths: list[Path], out_dir: Path, prefix: str, page_size: int = 12):
    out_dir.mkdir(parents=True, exist_ok=True)
    sheets = []
    for page_index in range(0, len(card_paths), page_size):
        page_paths = card_paths[page_index : page_index + page_size]
        out_path = out_dir / f"{prefix}-{page_index // page_size + 1:02d}.png"
        make_contact_sheet(page_paths, out_path)
        sheets.append(out_path)
    return sheets


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--deck", default="moon-garden")
    parser.add_argument("--cards", nargs="*", default=["major-00-fool", "major-02-high-priestess", "minor-cups-ace"])
    parser.add_argument("--all-existing", action="store_true")
    parser.add_argument("--placeholder", action="store_true")
    parser.add_argument("--contact-sheet", action="store_true")
    parser.add_argument("--contact-sheet-name", default="moon-garden-sample-sheet.png")
    parser.add_argument("--paged-sheets", action="store_true")
    args = parser.parse_args()

    spec = read_json(ROOT / "assets" / "tarot" / args.deck / "card-spec.json")
    cards = read_json(ROOT / "packages" / "content" / "data" / "tarot-cards.json")
    deck_design = load_deck_design(args.deck)
    by_id = {card["id"]: card for card in cards}
    out_dir = ROOT / spec["output"]["cardDir"]
    out_dir.mkdir(parents=True, exist_ok=True)

    target_ids = args.cards
    if args.all_existing:
        artwork_dir = ROOT / spec["output"]["artworkDir"]
        target_ids = [card["id"] for card in cards if (artwork_dir / f"{card['id']}.png").exists()]

    written = []
    for card_id in target_ids:
        card = by_id[card_id]
        rendered = render_card(card, deck_design, spec, args.placeholder)
        out_path = out_dir / f"{card_id}.png"
        rendered.save(out_path)
        written.append(out_path)
        print(out_path.relative_to(ROOT))

    if args.contact_sheet:
        sheet_path = ROOT / spec["output"]["contactSheetDir"] / args.contact_sheet_name
        make_contact_sheet(written, sheet_path)
        print(sheet_path.relative_to(ROOT))

    if args.paged_sheets:
        sheet_dir = ROOT / spec["output"]["contactSheetDir"]
        sheets = make_paged_contact_sheets(written, sheet_dir, f"{args.deck}-review")
        for sheet in sheets:
            print(sheet.relative_to(ROOT))


if __name__ == "__main__":
    main()

from __future__ import annotations

import json
import math
import random
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parents[1]


def read_json(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def hex_to_rgb(value: str) -> tuple[int, int, int]:
    value = value.lstrip("#")
    return tuple(int(value[i : i + 2], 16) for i in (0, 2, 4))


def blend(a: tuple[int, int, int], b: tuple[int, int, int], t: float) -> tuple[int, int, int]:
    return tuple(int(a[i] * (1 - t) + b[i] * t) for i in range(3))


def draw_starfield(draw: ImageDraw.ImageDraw, width: int, height: int, rng: random.Random, pink: tuple, cyan: tuple, gold: tuple, ivory: tuple):
    # Stars background
    for _ in range(90):
        x = rng.randrange(width)
        y = rng.randrange(height)
        r = rng.choice([1, 2])
        color = rng.choice([pink, cyan, gold, ivory])
        draw.ellipse((x - r, y - r, x + r, y + r), fill=color)
    for _ in range(10):
        x = rng.randrange(50, width - 50)
        y = rng.randrange(50, height - 50)
        size = rng.randint(6, 12)
        color = rng.choice([pink, cyan, gold])
        draw.line((x - size, y, x + size, y), fill=color, width=1)
        draw.line((x, y - size, x, y + size), fill=color, width=1)


def draw_character_silhouette(draw: ImageDraw.ImageDraw, cx: int, cy: int, rng: random.Random, hair_color: tuple, eye_color: tuple, peach: tuple, gold: tuple, ivory: tuple, pink: tuple, cyan: tuple, card: dict):
    # 1. Shoulders & Uniform
    draw.polygon([(cx - 130, cy + 180), (cx - 70, cy + 80), (cx + 70, cy + 80), (cx + 130, cy + 180)], fill=hair_color)
    # Sailor Collar overlay
    draw.polygon([(cx - 70, cy + 80), (cx - 20, cy + 120), (cx, cy + 90), (cx + 20, cy + 120), (cx + 70, cy + 80)], fill=cyan, outline=gold, width=2)
    # Bow Tie
    draw.polygon([(cx, cy + 100), (cx - 30, cy + 120), (cx - 20, cy + 130), (cx, cy + 115), (cx + 20, cy + 130), (cx + 30, cy + 120)], fill=pink)

    # 2. Neck
    draw.polygon([(cx - 25, cy + 80), (cx + 25, cy + 80), (cx + 20, cy + 10), (cx - 20, cy + 10)], fill=peach)

    # 3. Hair Back
    draw.ellipse((cx - 100, cy - 80, cx + 100, cy + 80), fill=hair_color)

    # 4. Face (Skin Oval)
    draw.ellipse((cx - 75, cy - 70, cx + 75, cy + 50), fill=peach)

    # 5. Starry Anime Eyes
    for offset in [-30, 30]:
        ex = cx + offset
        ey = cy - 10
        # White eye base
        draw.ellipse((ex - 18, ey - 10, ex + 18, ey + 10), fill=ivory)
        # Eye Iris
        draw.ellipse((ex - 12, ey - 8, ex + 12, ey + 8), fill=eye_color)
        # Pupil / Sparkle
        draw.ellipse((ex - 4, ey - 4, ex + 4, ey + 4), fill=ivory)
        # Eyelash line
        draw.arc((ex - 20, ey - 12, ex + 20, ey + 8), -160, -20, fill=hair_color, width=3)

    # 6. Mouth (Cute Smile)
    draw.arc((cx - 15, cy + 12, cx + 15, cy + 28), 0, 180, fill=pink, width=2)

    # 7. Hair Bangs (Magical Anime Haircuts using Polygons)
    # Left hair lock
    draw.polygon([(cx - 75, cy - 30), (cx - 85, cy + 60), (cx - 65, cy + 20)], fill=hair_color)
    # Right hair lock
    draw.polygon([(cx + 75, cy - 30), (cx + 85, cy + 60), (cx + 65, cy + 20)], fill=hair_color)
    # Bangs top-down points
    draw.polygon([(cx - 75, cy - 70), (cx - 40, cy - 25), (cx - 50, cy - 65)], fill=hair_color)
    draw.polygon([(cx - 50, cy - 70), (cx, cy - 20), (cx - 10, cy - 68)], fill=hair_color)
    draw.polygon([(cx + 50, cy - 70), (cx, cy - 20), (cx + 10, cy - 68)], fill=hair_color)
    draw.polygon([(cx + 75, cy - 70), (cx + 40, cy - 25), (cx + 50, cy - 65)], fill=hair_color)

    # 8. Character Accessories based on Card type
    # Major Arcana Crown/Wand or Minor Arcana Suit elements
    num = card.get("number")
    is_major = card["arcana"] == "major"
    
    if is_major:
        if num in [3, 4]: # Crown
            draw.polygon([(cx - 40, cy - 80), (cx - 50, cy - 110), (cx - 20, cy - 100), (cx, cy - 125), (cx + 20, cy - 100), (cx + 50, cy - 110), (cx + 40, cy - 80)], fill=gold)
            draw.ellipse((cx - 5, cy - 125, cx + 5, cy - 115), fill=ivory)
        elif num == 2: # High Priestess: Cat ears
            draw.polygon([(cx - 60, cy - 60), (cx - 85, cy - 105), (cx - 40, cy - 75)], fill=hair_color)
            draw.polygon([(cx + 60, cy - 60), (cx + 85, cy - 105), (cx + 40, cy - 75)], fill=hair_color)
            draw.polygon([(cx - 55, cy - 65), (cx - 75, cy - 95), (cx - 45, cy - 73)], fill=pink)
            draw.polygon([(cx + 55, cy - 65), (cx + 75, cy - 95), (cx + 45, cy - 73)], fill=pink)
        else: # Halo / Star headband
            draw.arc((cx - 85, cy - 85, cx + 85, cy + 85), -160, -20, fill=gold, width=4)
            # Central tiny star on headband
            draw.polygon([(cx, cy - 98), (cx + 6, cy - 88), (cx, cy - 78), (cx - 6, cy - 88)], fill=gold)
    else:
        # Minor Arcana: show suit element overlay
        suit = card["suit"]
        if suit == "wands": # Magic Wand
            draw.line((cx - 70, cy + 140, cx - 110, cy + 40), fill=gold, width=5)
            draw.ellipse((cx - 120, cy + 30, cx - 100, cy + 50), fill=pink)
        elif suit == "cups": # Magical goblet
            draw.polygon([(cx + 70, cy + 120), (cx + 110, cy + 120), (cx + 90, cy + 70)], fill=gold)
            draw.ellipse((cx + 85, cy + 60, cx + 95, cy + 70), fill=pink)
        elif suit == "swords": # Glowing dagger
            draw.line((cx - 80, cy + 120, cx - 120, cy + 60), fill=cyan, width=4)
            draw.line((cx - 70, cy + 130, cx - 90, cy + 110), fill=gold, width=4)
        elif suit == "pentacles": # Star coin
            draw.ellipse((cx + 80, cy + 100, cx + 110, cy + 130), outline=cyan, width=2)
            draw.ellipse((cx + 90, cy + 110, cx + 100, cy + 120), fill=gold)


def generate_card_artwork(card: dict, spec: dict) -> Image.Image:
    area = spec["artworkArea"]
    width, height = area["width"], area["height"]
    colors = spec["colors"]
    
    bg_rgb = hex_to_rgb(colors["background"])
    ink_rgb = hex_to_rgb(colors["ink"])
    img = Image.new("RGB", (width, height), bg_rgb)
    draw = ImageDraw.Draw(img)
    
    # 1. Radial glow
    cx, cy = width // 2, height // 2
    for r in range(height // 2 + 100, 0, -5):
        t = 1.0 - (r / (height // 2 + 100))
        t_curve = math.pow(t, 2.0)
        c = blend(bg_rgb, ink_rgb, t_curve * 0.95)
        draw.ellipse((cx - r, cy - r, cx + r, cy + r), fill=c)
        
    rng = random.Random(card["id"])
    pink = hex_to_rgb(colors["pink"])
    cyan = hex_to_rgb(colors["cyan"])
    gold = hex_to_rgb(colors["gold"])
    ivory = hex_to_rgb(colors["ivory"])
    violet = hex_to_rgb(colors["violet"])
    peach = hex_to_rgb(colors["peach"])
    
    # 2. Starfield
    draw_starfield(draw, width, height, rng, pink, cyan, gold, ivory)
    
    # 3. Symmetrical background aura
    draw.ellipse((cx - 190, cy - 190, cx + 190, cy + 190), outline=violet, width=1)
    draw.ellipse((cx - 180, cy - 180, cx + 180, cy + 180), outline=pink, width=2)
    
    # Choose character hair/eye colors dynamically based on suit or card number
    if card["arcana"] == "major":
        hair_color = rng.choice([pink, violet, gold])
        eye_color = cyan
    else:
        suit_colors = {
            "wands": pink,
            "cups": cyan,
            "swords": violet,
            "pentacles": gold
        }
        hair_color = suit_colors.get(card["suit"], violet)
        eye_color = pink if card["suit"] in ["cups", "pentacles"] else cyan
        
    # 4. Draw character avatar
    draw_character_silhouette(draw, cx, cy, rng, hair_color, eye_color, peach, gold, ivory, pink, cyan, card)
    
    return img.filter(ImageFilter.SMOOTH)


def main():
    spec = read_json(ROOT / "assets" / "tarot" / "stellar-academy" / "card-spec.json")
    cards = read_json(ROOT / "packages" / "content" / "data" / "tarot-cards.json")
    
    artwork_dir = ROOT / spec["output"]["artworkDir"]
    artwork_dir.mkdir(parents=True, exist_ok=True)
    
    print(f"Generating 78 inner character artwork files for Stellar Academy in: {artwork_dir.relative_to(ROOT)}")
    for card in cards:
        img = generate_card_artwork(card, spec)
        out_path = artwork_dir / f"{card['id']}.png"
        img.save(out_path)
        print(f"- Generated: {out_path.name}")
        
    print("All 78 character artwork files generated successfully.")


if __name__ == "__main__":
    main()

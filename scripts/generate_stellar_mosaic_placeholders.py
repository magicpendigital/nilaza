from __future__ import annotations

import json
import math
import random
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parents[1]

# 12 manually generated cards to skip
HANDCRAFTED_CARDS = {
    "major-00-fool",
    "major-01-magician",
    "major-02-high-priestess",
    "major-03-empress",
    "major-04-emperor",
    "major-05-hierophant",
    "major-06-lovers",
    "major-07-chariot",
    "major-09-hermit",
    "major-11-justice",
    "major-17-star",
    "major-21-world",
}


def read_json(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def hex_to_rgb(value: str) -> tuple[int, int, int]:
    value = value.lstrip("#")
    return tuple(int(value[i : i + 2], 16) for i in (0, 2, 4))


def blend(a: tuple[int, int, int], b: tuple[int, int, int], t: float) -> tuple[int, int, int]:
    return tuple(int(a[i] * (1 - t) + b[i] * t) for i in range(3))


def draw_mosaic_background(draw: ImageDraw.ImageDraw, width: int, height: int, rng: random.Random, glass_colors: list[tuple[int, int, int]], lead_ink: tuple[int, int, int]):
    # Subdivide canvas into a grid of stained glass tiles
    cols = 6
    rows = 10
    cw = width / cols
    ch = height / rows
    
    # Generate jittered grid points
    grid = []
    for r in range(rows + 1):
        row_points = []
        for c in range(cols + 1):
            # No jitter on outer borders
            jx = 0 if (c == 0 or c == cols) else rng.uniform(-cw * 0.28, cw * 0.28)
            jy = 0 if (r == 0 or r == rows) else rng.uniform(-ch * 0.28, ch * 0.28)
            row_points.append((c * cw + jx, r * ch + jy))
        grid.append(row_points)
        
    # Draw each glass tile polygon
    for r in range(rows):
        for c in range(cols):
            p1 = grid[r][c]
            p2 = grid[r][c+1]
            p3 = grid[r+1][c+1]
            p4 = grid[r+1][c]
            
            color = rng.choice(glass_colors)
            draw.polygon([p1, p2, p3, p4], fill=color, outline=lead_ink, width=4)


def draw_geometric_major_details(draw: ImageDraw.ImageDraw, num: int, cx: int, cy: int, gold: tuple, dim: tuple, ivory: tuple):
    rng = random.Random(f"stellar-major-geom-{num}")
    # Draw complex gold tracery for Major Arcana placeholders
    draw.ellipse((cx - 160, cy - 160, cx + 160, cy + 160), outline=gold, width=3)
    draw.ellipse((cx - 140, cy - 140, cx + 140, cy + 140), outline=dim, width=1)
    
    # 8-point gold star outline
    points = []
    for i in range(16):
        angle = -math.pi / 2 + i * math.tau / 16
        r = 100 if i % 2 == 0 else 40
        points.append((cx + math.cos(angle) * r, cy + math.sin(angle) * r))
    draw.polygon(points, outline=gold, width=3)
    
    # Concentric triangles
    for i in range(3):
        angle = -math.pi / 2 + i * math.tau / 3
        x1 = cx + math.cos(angle) * 140
        y1 = cy + math.sin(angle) * 140
        x2 = cx + math.cos(angle + math.tau/3) * 140
        y2 = cy + math.sin(angle + math.tau/3) * 140
        draw.line((x1, y1, x2, y2), fill=dim, width=2)


def draw_stellar_suit(draw: ImageDraw.ImageDraw, suit: str, rank: str, cx: int, cy: int, gold: tuple, dim: tuple, ivory: tuple):
    rank_map = {
        "ace": 1, "two": 2, "three": 3, "four": 4, "five": 5,
        "six": 6, "seven": 7, "eight": 8, "nine": 9, "ten": 10,
        "page": 1, "knight": 2, "queen": 3, "king": 4
    }
    count = rank_map[rank]
    is_court = rank in ["page", "knight", "queen", "king"]

    # Gold background frame overlay
    draw.ellipse((cx - 220, cy - 320, cx + 220, cy + 320), outline=gold, width=3)
    draw.ellipse((cx - 200, cy - 300, cx + 200, cy + 300), outline=dim, width=1)
    
    def get_positions(n: int) -> list[tuple[int, int]]:
        if n == 1:
            return [(cx, cy)]
        elif n == 2:
            return [(cx, cy - 140), (cx, cy + 140)]
        elif n == 3:
            return [(cx, cy - 150), (cx - 110, cy + 90), (cx + 110, cy + 90)]
        elif n == 4:
            return [(cx - 100, cy - 140), (cx + 100, cy - 140), (cx - 100, cy + 140), (cx + 100, cy + 140)]
        elif n == 5:
            return [(cx - 100, cy - 150), (cx + 100, cy - 150), (cx, cy), (cx - 100, cy + 150), (cx + 100, cy + 150)]
        elif n == 6:
            return [(cx - 100, cy - 170), (cx + 100, cy - 170), (cx - 100, cy), (cx + 100, cy), (cx - 100, cy + 170), (cx + 100, cy + 170)]
        elif n == 7:
            return [(cx - 100, cy - 170), (cx + 100, cy - 170), (cx - 100, cy), (cx + 100, cy), (cx - 100, cy + 170), (cx + 100, cy + 170), (cx, cy - 80)]
        elif n == 8:
            return [
                (cx - 100, cy - 200), (cx, cy - 200), (cx + 100, cy - 200),
                (cx - 100, cy), (cx + 100, cy),
                (cx - 100, cy + 200), (cx, cy + 200), (cx + 100, cy + 200)
            ]
        elif n == 9:
            return [
                (cx - 110, cy - 200), (cx + 110, cy - 200),
                (cx - 110, cy - 70), (cx, cy - 70), (cx + 110, cy - 70),
                (cx - 110, cy + 70), (cx + 110, cy + 70),
                (cx - 110, cy + 200), (cx + 110, cy + 200)
            ]
        else: # 10
            return [
                (cx - 110, cy - 220), (cx + 110, cy - 220),
                (cx - 110, cy - 100), (cx, cy - 100), (cx + 110, cy - 100),
                (cx - 110, cy + 20), (cx, cy + 20), (cx + 110, cy + 20),
                (cx - 110, cy + 140), (cx + 110, cy + 140),
                (cx, cy + 240)
            ][:10]

    positions = get_positions(count)

    def draw_wand(x: int, y: int, length: int = 120):
        draw.line((x, y - length//2, x, y + length//2), fill=gold, width=3)
        draw.ellipse((x - 6, y - length//2 - 6, x + 6, y - length//2 + 6), fill=ivory, outline=gold, width=1)
        draw.ellipse((x - 4, y + length//2 - 4, x + 4, y + length//2 + 4), fill=gold)
        draw.arc((x - 14, y - length//2 - 14, x + 14, y - length//2 + 14), 220, 320, fill=gold, width=2)

    def draw_cup(x: int, y: int, size: int = 70):
        bowl_y = y - size//4
        stem_y2 = y + size//3
        draw.arc((x - size//2, bowl_y - size//3, x + size//2, bowl_y + size//3), 0, 180, fill=gold, width=3)
        draw.line((x - size//2, bowl_y, x + size//2, bowl_y), fill=gold, width=2)
        draw.line((x, bowl_y + size//3, x, stem_y2), fill=gold, width=3)
        draw.line((x - size//3, stem_y2, x + size//3, stem_y2), fill=gold, width=3)
        draw.arc((x - size//3, bowl_y - 12, x + size//3, bowl_y + 4), 18, 162, fill=ivory, width=2)

    def draw_sword(x: int, y: int, length: int = 150):
        draw.line((x, y - length//2, x, y + length//2), fill=gold, width=3)
        draw.line((x - 24, y + length//3, x + 24, y + length//3), fill=gold, width=3)
        draw.ellipse((x - 5, y + length//2 - 5, x + 5, y + length//2 + 5), fill=ivory, outline=gold, width=1)
        draw.polygon([(x - 8, y - length//2 + 12), (x, y - length//2), (x + 8, y - length//2 + 12)], fill=gold)

    def draw_pentacle(x: int, y: int, radius: int = 40):
        draw.ellipse((x - radius, y - radius, x + radius, y + radius), outline=gold, width=3)
        pts = []
        for i in range(5):
            angle = i * math.tau / 5 - math.pi / 2
            pts.append((x + math.cos(angle) * (radius - 2), y + math.sin(angle) * (radius - 2)))
        for i in range(5):
            draw.line((pts[i], pts[(i+2)%5]), fill=gold, width=2)
        draw.ellipse((x - 3, y - 3, x + 3, y + 3), fill=ivory)

    if is_court:
        draw.ellipse((cx - 240, cy - 350, cx + 240, cy + 350), outline=dim, width=1)
        if rank == "page":
            draw.ellipse((cx - 180, cy - 280, cx + 180, cy + 280), outline=gold, width=2)
        elif rank == "knight":
            draw.line((cx - 200, cy - 300, cx + 200, cy + 300), fill=dim, width=1)
            draw.line((cx + 200, cy - 300, cx - 200, cy + 300), fill=dim, width=1)
        elif rank == "queen":
            draw.polygon([(cx, cy - 320), (cx + 170, cy - 100), (cx + 110, cy + 260), (cx - 110, cy + 260), (cx - 170, cy - 100)], outline=gold, width=2)
        elif rank == "king":
            draw.polygon([(cx, cy - 320), (cx + 190, cy), (cx, cy + 320), (cx - 190, cy)], outline=gold, width=3)

    for pos in positions:
        px, py = pos
        if suit == "wands":
            draw_wand(px, py, length=240 if rank=="page" else 150)
        elif suit == "cups":
            draw_cup(px, py, size=110 if rank=="page" else 70)
        elif suit == "swords":
            draw_sword(px, py, length=260 if rank=="page" else 170)
        elif suit == "pentacles":
            draw_pentacle(px, py, radius=65 if rank=="page" else 40)


def generate_stellar_mosaic_artwork(card: dict, spec: dict) -> Image.Image:
    area = spec["artworkArea"]
    width, height = area["width"], area["height"]
    colors = spec["colors"]
    
    bg_rgb = hex_to_rgb(colors["background"])
    ink_rgb = hex_to_rgb(colors["ink"])
    img = Image.new("RGB", (width, height), bg_rgb)
    draw = ImageDraw.Draw(img)
    
    # Deterministic RNG based on card ID
    rng = random.Random(card["id"])
    
    # Stained Glass Palette
    glass_colors = [
        hex_to_rgb("#152238"),  # Indigo
        hex_to_rgb("#800020"),  # Burgundy
        hex_to_rgb("#4B0082"),  # Violet
        hex_to_rgb("#3B5323"),  # Olive Green
        hex_to_rgb("#004B49"),  # Teal
        hex_to_rgb("#B03060")   # Muted Rose
    ]
    
    # 1. Draw Stained-Glass Mosaic grid
    draw_mosaic_background(draw, width, height, rng, glass_colors, ink_rgb)
    
    # 2. Setup gold foil line colors
    gold = hex_to_rgb(colors["gold"])
    dim = hex_to_rgb(colors["goldDim"])
    ivory = hex_to_rgb(colors["ivory"])
    
    cx, cy = width // 2, height // 2
    
    # 3. Draw Suit/Arcana specific artwork
    if card["arcana"] == "major":
        draw_geometric_major_details(draw, card["number"], cx, cy, gold, dim, ivory)
    else:
        draw_stellar_suit(draw, card["suit"], card["rank"], cx, cy, gold, dim, ivory)
        
    return img.filter(ImageFilter.SMOOTH)


def main():
    spec = read_json(ROOT / "assets" / "tarot" / "stellar-academy" / "card-spec.json")
    cards = read_json(ROOT / "packages" / "content" / "data" / "tarot-cards.json")
    
    artwork_dir = ROOT / spec["output"]["artworkDir"]
    artwork_dir.mkdir(parents=True, exist_ok=True)
    
    print(f"Generating remaining procedural stained-glass artwork files for Stellar Academy in: {artwork_dir.relative_to(ROOT)}")
    generated_count = 0
    for card in cards:
        if card["id"] in HANDCRAFTED_CARDS:
            print(f"- Skipping handcrafted card: {card['id']}")
            continue
            
        img = generate_stellar_mosaic_artwork(card, spec)
        out_path = artwork_dir / f"{card['id']}.png"
        img.save(out_path)
        generated_count += 1
        
    print(f"Successfully generated {generated_count} procedural stained-glass artwork files.")


if __name__ == "__main__":
    main()

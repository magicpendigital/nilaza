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
    # 1. Subtle stars
    for _ in range(80):
        x = rng.randrange(width)
        y = rng.randrange(height)
        r = rng.choice([1, 2])
        color = rng.choice([pink, cyan, gold, ivory])
        draw.ellipse((x - r, y - r, x + r, y + r), fill=color)
    # 2. Large 4-point sparkling stars
    for _ in range(8):
        x = rng.randrange(40, width - 40)
        y = rng.randrange(40, height - 40)
        size = rng.randint(8, 14)
        color = rng.choice([pink, cyan, gold])
        draw.line((x - size, y, x + size, y), fill=color, width=1)
        draw.line((x, y - size, x, y + size), fill=color, width=1)
        draw.ellipse((x - 2, y - 2, x + 2, y + 2), fill=ivory)


def draw_magical_circle(draw: ImageDraw.ImageDraw, cx: int, cy: int, color1: tuple, color2: tuple):
    draw.ellipse((cx - 160, cy - 160, cx + 160, cy + 160), outline=color1, width=2)
    draw.ellipse((cx - 150, cy - 150, cx + 150, cy + 150), outline=color2, width=1)
    draw.ellipse((cx - 125, cy - 125, cx + 125, cy + 125), outline=color1, width=1)
    for i in range(12):
        angle = i * math.tau / 12
        x1 = cx + math.cos(angle) * 150
        y1 = cy + math.sin(angle) * 150
        x2 = cx + math.cos(angle) * 160
        y2 = cy + math.sin(angle) * 160
        draw.line((x1, y1, x2, y2), fill=color1, width=1)


def draw_anime_major(draw: ImageDraw.ImageDraw, card: dict, cx: int, cy: int, pink: tuple, cyan: tuple, gold: tuple, ivory: tuple, violet: tuple):
    num = card["number"]
    rng = random.Random(f"anime-{num}")
    
    # 1. Base magic circle background
    draw_magical_circle(draw, cx, cy, pink, cyan)
    
    # 2. Center iconic shape
    if num == 0:  # The Fool: Floating magical cat / spark shape
        draw.ellipse((cx - 30, cy - 30, cx + 30, cy + 30), outline=gold, width=3)
        draw.polygon([(cx - 30, cy - 25), (cx - 45, cy - 55), (cx - 15, cy - 35)], fill=pink)
        draw.polygon([(cx + 30, cy - 25), (cx + 45, cy - 55), (cx + 15, cy - 35)], fill=pink)
        draw.ellipse((cx - 8, cy - 8, cx + 8, cy + 8), fill=ivory)
    elif num == 1:  # The Magician: Star wand + infinity loop
        # Lemniscate
        for t in range(150):
            theta = t * math.tau / 150
            scale = 90 / (3 - math.cos(2 * theta))
            px = cx + scale * math.cos(theta)
            py = cy - 60 + scale * math.sin(2 * theta) / 2
            draw.point((px, py), fill=cyan)
        # Wand
        draw.line((cx - 40, cy + 80, cx + 40, cy - 20), fill=gold, width=4)
        draw.polygon([(cx + 40, cy - 25), (cx + 46, cy - 15), (cx + 56, cy - 20), (cx + 48, cy - 30)], fill=pink)
    elif num == 2:  # The High Priestess: Concentric moons & crystal star
        draw.ellipse((cx - 50, cy - 50, cx + 50, cy + 50), outline=ivory, width=3)
        draw.arc((cx - 90, cy - 90, cx + 90, cy + 90), 30, 150, fill=cyan, width=4)
        draw.arc((cx - 90, cy - 90, cx + 90, cy + 90), -150, -30, fill=cyan, width=4)
        # Crystal diamond at center
        draw.polygon([(cx, cy - 30), (cx + 20, cy), (cx, cy + 30), (cx - 20, cy)], fill=gold)
    elif num == 3:  # The Empress: Heart-shaped crest with angel wings
        draw.polygon([(cx, cy + 40), (cx - 40, cy - 10), (cx - 20, cy - 35), (cx, cy - 15), (cx + 20, cy - 35), (cx + 40, cy - 10)], outline=pink, width=3)
        # Left Wing
        draw.polygon([(cx - 40, cy), (cx - 100, cy - 40), (cx - 80, cy - 10)], outline=cyan, width=2)
        # Right Wing
        draw.polygon([(cx + 40, cy), (cx + 100, cy - 40), (cx + 80, cy - 10)], outline=cyan, width=2)
    elif num == 4:  # The Emperor: Star shield / crown crest
        # Crown
        draw.polygon([(cx - 50, cy - 20), (cx - 60, cy - 60), (cx - 20, cy - 40), (cx, cy - 75), (cx + 20, cy - 40), (cx + 60, cy - 60), (cx + 50, cy - 20)], fill=gold)
        draw.rectangle((cx - 50, cy - 10, cx + 50, cy + 20), outline=cyan, width=3)
    elif num == 5:  # The Hierophant: Triple magical circles with star key
        draw.ellipse((cx - 40, cy - 100, cx + 40, cy - 20), outline=cyan, width=2)
        draw.line((cx, cy - 80, cx, cy + 80), fill=gold, width=4)
        draw.line((cx - 30, cy, cx + 30, cy), fill=gold, width=4)
        draw.line((cx - 20, cy + 30, cx + 20, cy + 30), fill=gold, width=4)
    elif num == 6:  # The Lovers: Two interlocking heart shapes
        draw.polygon([(cx - 30, cy + 30), (cx - 70, cy - 20), (cx - 50, cy - 45), (cx - 30, cy - 25), (cx - 10, cy - 45), (cx + 10, cy - 20)], outline=pink, width=3)
        draw.polygon([(cx + 30, cy + 30), (cx - 10, cy - 20), (cx + 10, cy - 45), (cx + 30, cy - 25), (cx + 50, cy - 45), (cx + 70, cy - 20)], outline=cyan, width=3)
    elif num == 7:  # The Chariot: Orbiting celestial rings with winged star
        draw.ellipse((cx - 50, cy - 50, cx + 50, cy + 50), outline=gold, width=3)
        # Ring 1
        draw.arc((cx - 120, cy - 40, cx + 120, cy + 40), 0, 360, fill=cyan, width=2)
        # Star center
        draw.polygon([(cx, cy - 20), (cx + 6, cy - 5), (cx + 20, cy - 5), (cx + 10, cy + 5), (cx + 14, cy + 20), (cx, cy + 10), (cx - 14, cy + 20), (cx - 10, cy + 5), (cx - 20, cy - 5), (cx - 6, cy - 5)], fill=ivory)
    elif num == 8:  # Strength: Crowned lion outline or infinite ribbon
        for t in range(100):
            theta = t * math.tau / 100
            scale = 80 / (3 - math.cos(2 * theta))
            px = cx + scale * math.cos(theta)
            py = cy + scale * math.sin(2 * theta) / 2
            draw.point((px, py), fill=pink)
        # Floating star above ribbon
        draw.ellipse((cx - 8, cy - 60, cx + 8, cy - 44), fill=gold)
    elif num == 9:  # The Hermit: Hourglass star lantern
        draw.line((cx - 40, cy - 60, cx + 40, cy - 60), fill=cyan, width=3)
        draw.line((cx - 40, cy + 60, cx + 40, cy + 60), fill=cyan, width=3)
        draw.line((cx - 40, cy - 60, cx + 40, cy + 60), fill=gold, width=2)
        draw.line((cx + 40, cy - 60, cx - 40, cy + 60), fill=gold, width=2)
        draw.ellipse((cx - 15, cy - 15, cx + 15, cy + 15), fill=ivory)
    elif num == 10:  # Wheel of Fortune: Concentric stars & gears
        draw.ellipse((cx - 80, cy - 80, cx + 80, cy + 80), outline=cyan, width=3)
        for i in range(6):
            angle = i * math.tau / 6
            px = cx + math.cos(angle) * 80
            py = cy + math.sin(angle) * 80
            draw.line((cx, cy, px, py), fill=gold, width=2)
    elif num == 11:  # Justice: Scales with crystal sword
        draw.line((cx - 80, cy - 30, cx + 80, cy - 30), fill=gold, width=4)
        draw.line((cx, cy - 60, cx, cy + 80), fill=cyan, width=3)
        draw.polygon([(cx - 80, cy - 30), (cx - 100, cy + 30), (cx - 60, cy + 30)], outline=pink, width=2)
        draw.polygon([(cx + 80, cy - 30), (cx + 100, cy + 30), (cx + 60, cy + 30)], outline=pink, width=2)
    elif num == 12:  # The Hanged Man: Hourglass flipped inside diamond
        draw.polygon([(cx, cy - 90), (cx + 70, cy), (cx, cy + 90), (cx - 70, cy)], outline=cyan, width=2)
        draw.line((cx - 30, cy - 50, cx + 30, cy - 50), fill=pink, width=3)
        draw.line((cx - 30, cy + 50, cx + 30, cy + 50), fill=pink, width=3)
        draw.line((cx - 30, cy - 50, cx + 30, cy + 50), fill=gold, width=2)
        draw.line((cx + 30, cy - 50, cx - 30, cy + 50), fill=gold, width=2)
    elif num == 13:  # Death: Eclipse moon & butterfly wings
        draw.ellipse((cx - 60, cy - 60, cx + 60, cy + 60), fill=pink)
        draw.ellipse((cx - 40, cy - 60, cx + 80, cy + 60), fill=hex_to_rgb("#120A2B")) # Eclipse shape
        # Butterfly wings
        draw.polygon([(cx - 30, cy), (cx - 90, cy - 40), (cx - 80, cy + 20)], outline=cyan, width=2)
        draw.polygon([(cx + 30, cy), (cx + 90, cy - 40), (cx + 80, cy + 20)], outline=cyan, width=2)
    elif num == 14:  # Temperance: Two celestial cups pouring stars
        draw.polygon([(cx - 70, cy - 40), (cx - 50, cy - 40), (cx - 60, cy - 10)], fill=gold)
        draw.polygon([(cx + 70, cy + 20), (cx + 50, cy + 20), (cx + 60, cy + 50)], fill=gold)
        # Flowing water line
        draw.arc((cx - 60, cy - 20, cx + 60, cy + 40), -120, 60, fill=cyan, width=3)
        draw.ellipse((cx - 5, cy + 10, cx + 5, cy + 20), fill=ivory)
    elif num == 15:  # The Devil: Inverted broken heart with horns
        draw.polygon([(cx, cy + 40), (cx - 45, cy - 10), (cx - 25, cy - 35), (cx - 5, cy - 15), (cx + 5, cy - 15), (cx + 25, cy - 35), (cx + 45, cy - 10)], outline=pink, width=3)
        # Crack down the center
        draw.line((cx, cy - 15, cx - 10, cy + 10), fill=hex_to_rgb("#120A2B"), width=4)
        draw.line((cx - 10, cy + 10, cx, cy + 40), fill=hex_to_rgb("#120A2B"), width=4)
        # Horns
        draw.arc((cx - 40, cy - 70, cx, cy - 30), 180, 270, fill=gold, width=3)
        draw.arc((cx, cy - 70, cx + 40, cy - 30), -90, 0, fill=gold, width=3)
    elif num == 16:  # The Tower: Lightning striking a magic gem
        draw.polygon([(cx, cy - 40), (cx + 30, cy + 10), (cx, cy + 60), (cx - 30, cy + 10)], fill=pink)
        # Lightning
        lightning = [(cx - 20, cy - 140), (cx + 10, cy - 70), (cx - 15, cy - 20), (cx, cy - 40)]
        for i in range(len(lightning) - 1):
            draw.line((lightning[i], lightning[i+1]), fill=gold, width=4)
            draw.line((lightning[i], lightning[i+1]), fill=ivory, width=1)
    elif num == 17:  # The Star: Large 8-point magical star
        for i in range(8):
            angle1 = i * math.tau / 8
            angle2 = (i + 3) % 8 * math.tau / 8
            draw.line([(cx + math.cos(angle1) * 90, cy + math.sin(angle1) * 90), (cx + math.cos(angle2) * 90, cy + math.sin(angle2) * 90)], fill=gold, width=3)
        draw.ellipse((cx - 15, cy - 15, cx + 15, cy + 15), fill=ivory)
    elif num == 18:  # The Moon: Crescent moon with magical profile
        draw.ellipse((cx - 70, cy - 70, cx + 70, cy + 70), outline=cyan, width=2)
        # Crescent overlay
        draw.ellipse((cx - 40, cy - 65, cx + 70, cy + 65), fill=hex_to_rgb("#120A2B"))
        draw.arc((cx - 60, cy - 60, cx + 60, cy + 60), -90, 90, fill=pink, width=4)
        # Small star
        draw.ellipse((cx + 15, cy - 25, cx + 25, cy - 15), fill=gold)
    elif num == 19:  # The Sun: Bright starburst with smiling face
        draw.ellipse((cx - 50, cy - 50, cx + 50, cy + 50), fill=gold)
        for i in range(12):
            angle = i * math.tau / 12
            sx = cx + math.cos(angle) * 55
            sy = cy + math.sin(angle) * 55
            ex = cx + math.cos(angle) * (95 if i % 2 == 0 else 75)
            ey = cy + math.sin(angle) * (95 if i % 2 == 0 else 75)
            draw.line((sx, sy, ex, ey), fill=pink if i % 2 == 0 else cyan, width=3)
    elif num == 20:  # Judgement: Winged bell or trumpet of light
        # Angel wings
        draw.polygon([(cx - 20, cy), (cx - 80, cy - 30), (cx - 60, cy + 20)], outline=cyan, width=2)
        draw.polygon([(cx + 20, cy), (cx + 80, cy - 30), (cx + 60, cy + 20)], outline=cyan, width=2)
        # Bell shape
        draw.polygon([(cx - 20, cy - 30), (cx + 20, cy - 30), (cx + 30, cy + 20), (cx - 30, cy + 20)], fill=gold)
        draw.ellipse((cx - 8, cy + 20, cx + 8, cy + 30), fill=ivory)
    elif num == 21:  # The World: Orbiting planet rings with star center
        draw.ellipse((cx - 50, cy - 50, cx + 50, cy + 50), outline=cyan, width=3)
        # Ring
        draw.arc((cx - 100, cy - 25, cx + 100, cy + 25), 0, 360, fill=pink, width=3)
        # Star center
        draw.polygon([(cx, cy - 15), (cx + 5, cy - 5), (cx + 15, cy - 5), (cx + 7, cy + 5), (cx + 10, cy + 15), (cx, cy + 8), (cx - 10, cy + 15), (cx - 7, cy + 5), (cx - 15, cy - 5), (cx - 5, cy - 5)], fill=ivory)


def draw_anime_suit(draw: ImageDraw.ImageDraw, suit: str, rank: str, cx: int, cy: int, pink: tuple, cyan: tuple, gold: tuple, ivory: tuple, violet: tuple):
    is_court = rank in ["page", "knight", "queen", "king"]
    
    # Define layout coordinates
    if is_court:
        positions = [(cx, cy)]
    else:
        # Lay out icons according to count
        count_map = {
            "ace": 1, "two": 2, "three": 3, "four": 4, "five": 5,
            "six": 6, "seven": 7, "eight": 8, "nine": 9, "ten": 10
        }
        count = count_map.get(rank, 1)
        if count == 1:
            positions = [(cx, cy)]
        elif count == 2:
            positions = [(cx, cy - 160), (cx, cy + 160)]
        elif count == 3:
            positions = [(cx, cy - 180), (cx - 100, cy + 100), (cx + 100, cy + 100)]
        elif count == 4:
            positions = [(cx - 100, cy - 160), (cx + 100, cy - 160), (cx - 100, cy + 160), (cx + 100, cy + 160)]
        elif count == 5:
            positions = [(cx - 100, cy - 160), (cx + 100, cy - 160), (cx, cy), (cx - 100, cy + 160), (cx + 100, cy + 160)]
        elif count == 6:
            positions = [(cx - 100, cy - 180), (cx + 100, cy - 180), (cx - 100, cy), (cx + 100, cy), (cx - 100, cy + 180), (cx + 100, cy + 180)]
        elif count == 7:
            positions = [(cx - 100, cy - 180), (cx + 100, cy - 180), (cx - 100, cy), (cx + 100, cy), (cx - 100, cy + 180), (cx + 100, cy + 180), (cx, cy - 60)]
        elif count == 8:
            positions = [(cx - 100, cy - 200), (cx + 100, cy - 200), (cx - 100, cy - 70), (cx + 100, cy - 70), (cx - 100, cy + 70), (cx + 100, cy + 70), (cx - 100, cy + 200), (cx + 100, cy + 200)]
        elif count == 9:
            positions = [(cx - 100, cy - 200), (cx + 100, cy - 200), (cx - 100, cy - 70), (cx + 100, cy - 70), (cx - 100, cy + 70), (cx + 100, cy + 70), (cx - 100, cy + 200), (cx + 100, cy + 200), (cx, cy)]
        elif count == 10:
            positions = [(cx - 100, cy - 200), (cx + 100, cy - 200), (cx - 100, cy - 70), (cx + 100, cy - 70), (cx - 100, cy + 70), (cx + 100, cy + 70), (cx - 100, cy + 200), (cx + 100, cy + 200), (cx, cy - 130), (cx, cy + 130)]

    def draw_wand(x: int, y: int, length: int = 150):
        # Anime magic staff / wand
        # Shaft
        draw.line((x, y + length//2, x, y - length//2), fill=gold, width=4)
        # Star tip
        draw.polygon([(x, y - length//2 - 15), (x + 5, y - length//2 - 5), (x + 15, y - length//2 - 5), (x + 8, y - length//2 + 2), (x + 10, y - length//2 + 12), (x, y - length//2 + 6), (x - 10, y - length//2 + 12), (x - 8, y - length//2 + 2), (x - 15, y - length//2 - 5), (x - 5, y - length//2 - 5)], fill=pink)
        # Gem bottom
        draw.ellipse((x - 6, y + length//2 - 6, x + 6, y + length//2 + 6), fill=cyan)

    def draw_cup(x: int, y: int, size: int = 70):
        # Ornate magical heart cup
        # Base
        draw.line((x - size//3, y + size//2, x + size//3, y + size//2), fill=cyan, width=4)
        # Stem
        draw.line((x, y + size//2, x, y + size//6), fill=cyan, width=3)
        # Heart bowl
        draw.polygon([(x, y + size//6), (x - size//2, y - size//6), (x - size//3, y - size//2), (x, y - size//4), (x + size//3, y - size//2), (x + size//2, y - size//6)], outline=pink, width=3)
        # Sparkle floating above
        draw.ellipse((x - 4, y - size//2 - 12, x + 4, y - size//2 - 4), fill=gold)

    def draw_sword(x: int, y: int, length: int = 170):
        # Laser / crystal magical sword
        # Blade
        draw.line((x, y - length//2 + 10, x, y + length//2 - 15), fill=pink, width=4)
        draw.line((x, y - length//2 + 10, x, y + length//2 - 15), fill=ivory, width=1)
        # Guard
        draw.line((x - 25, y + length//2 - 15, x + 25, y + length//2 - 15), fill=cyan, width=4)
        # Pommel
        draw.ellipse((x - 6, y + length//2 - 6, x + 6, y + length//2 + 6), fill=gold)

    def draw_pentacle(x: int, y: int, radius: int = 40):
        # Anime magical crest / star coin
        draw.ellipse((x - radius, y - radius, x + radius, y + radius), outline=cyan, width=3)
        pts = []
        for i in range(5):
            angle = i * math.tau / 5 - math.pi / 2
            pts.append((x + math.cos(angle) * (radius - 2), y + math.sin(angle) * (radius - 2)))
        for i in range(5):
            draw.line((pts[i], pts[(i+2)%5]), fill=pink, width=2)
        # Tiny center star
        draw.ellipse((x - 3, y - 3, x + 3, y + 3), fill=gold)

    # Frame decoration for court cards
    if is_court:
        draw.ellipse((cx - 240, cy - 350, cx + 240, cy + 350), outline=violet, width=1)
        if rank == "page":
            draw.ellipse((cx - 180, cy - 280, cx + 180, cy + 280), outline=pink, width=2)
        elif rank == "knight":
            # Crossed star dust lines
            draw.line((cx - 200, cy - 300, cx + 200, cy + 300), fill=cyan, width=1)
            draw.line((cx + 200, cy - 300, cx - 200, cy + 300), fill=cyan, width=1)
        elif rank == "queen":
            # Magical heart shield border
            draw.polygon([(cx, cy - 320), (cx + 170, cy - 100), (cx + 110, cy + 260), (cx - 110, cy + 260), (cx - 170, cy - 100)], outline=pink, width=2)
        elif rank == "king":
            # Double magical diamond border
            draw.polygon([(cx, cy - 320), (cx + 190, cy), (cx, cy + 320), (cx - 190, cy)], outline=gold, width=3)
            draw.polygon([(cx, cy - 290), (cx + 170, cy), (cx, cy + 290), (cx - 170, cy)], outline=cyan, width=1)

    # Draw the elements
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


def generate_card_artwork(card: dict, spec: dict) -> Image.Image:
    area = spec["artworkArea"]
    width, height = area["width"], area["height"]
    colors = spec["colors"]
    
    bg_rgb = hex_to_rgb(colors["background"])
    ink_rgb = hex_to_rgb(colors["ink"])
    img = Image.new("RGB", (width, height), bg_rgb)
    draw = ImageDraw.Draw(img)
    
    # 1. Radial glow for celestial depth
    cx, cy = width // 2, height // 2
    for r in range(height // 2 + 100, 0, -5):
        t = 1.0 - (r / (height // 2 + 100))
        t_curve = math.pow(t, 2.0)
        c = blend(bg_rgb, ink_rgb, t_curve * 0.95)
        draw.ellipse((cx - r, cy - r, cx + r, cy + r), fill=c)
        
    # 2. Add magical starfield background
    rng = random.Random(card["id"])
    pink = hex_to_rgb(colors["pink"])
    cyan = hex_to_rgb(colors["cyan"])
    gold = hex_to_rgb(colors["gold"])
    ivory = hex_to_rgb(colors["ivory"])
    violet = hex_to_rgb(colors["violet"])
    
    draw_starfield(draw, width, height, rng, pink, cyan, gold, ivory)
    
    # 3. Draw Suit/Arcana specific artwork
    if card["arcana"] == "major":
        draw_anime_major(draw, card, cx, cy, pink, cyan, gold, ivory, violet)
    else:
        draw_anime_suit(draw, card["suit"], card["rank"], cx, cy, pink, cyan, gold, ivory, violet)
        
    return img.filter(ImageFilter.SMOOTH)


def main():
    spec = read_json(ROOT / "assets" / "tarot" / "star-seeker" / "card-spec.json")
    cards = read_json(ROOT / "packages" / "content" / "data" / "tarot-cards.json")
    
    artwork_dir = ROOT / spec["output"]["artworkDir"]
    artwork_dir.mkdir(parents=True, exist_ok=True)
    
    print(f"Generating 78 inner artwork files for Star Seeker in: {artwork_dir.relative_to(ROOT)}")
    for card in cards:
        img = generate_card_artwork(card, spec)
        out_path = artwork_dir / f"{card['id']}.png"
        img.save(out_path)
        print(f"- Generated: {out_path.name}")
        
    print("All 78 artwork files generated successfully.")


if __name__ == "__main__":
    main()

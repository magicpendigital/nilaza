from __future__ import annotations

import math
import random
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "assets" / "tarot" / "deck-backs"
CARD_SIZE = (1024, 1768)


def hex_to_rgb(value: str) -> tuple[int, int, int]:
    value = value.lstrip("#")
    return tuple(int(value[i : i + 2], 16) for i in (0, 2, 4))


def blend(a: tuple[int, int, int], b: tuple[int, int, int], t: float) -> tuple[int, int, int]:
    return tuple(int(a[i] * (1 - t) + b[i] * t) for i in range(3))


def rounded_mask(size: tuple[int, int], radius: int) -> Image.Image:
    mask = Image.new("L", size, 0)
    draw = ImageDraw.Draw(mask)
    draw.rounded_rectangle((0, 0, size[0] - 1, size[1] - 1), radius=radius, fill=255)
    return mask


def make_background(base: str, glow: str, seed: str) -> Image.Image:
    width, height = CARD_SIZE
    base_rgb = hex_to_rgb(base)
    glow_rgb = hex_to_rgb(glow)
    img = Image.new("RGB", CARD_SIZE, base_rgb)
    draw = ImageDraw.Draw(img)

    for y in range(height):
        vertical = y / (height - 1)
        color = blend(base_rgb, glow_rgb, 0.16 * math.sin(vertical * math.pi))
        draw.line((0, y, width, y), fill=color)

    rng = random.Random(seed)
    for _ in range(18000):
        x = rng.randrange(width)
        y = rng.randrange(height)
        noise = rng.randrange(10, 34)
        draw.point((x, y), fill=blend(base_rgb, (noise + 18, noise + 16, noise + 14), 0.26))

    vignette = Image.new("L", CARD_SIZE, 0)
    vdraw = ImageDraw.Draw(vignette)
    for radius in range(900, 80, -22):
        alpha = int((900 - radius) / 900 * 110)
        vdraw.ellipse((512 - radius, 884 - radius, 512 + radius, 884 + radius), fill=alpha)
    dark = Image.new("RGB", CARD_SIZE, "#070608")
    img = Image.composite(img, dark, Image.eval(vignette, lambda value: 140 - min(value, 140)))
    return img.filter(ImageFilter.SMOOTH)


def draw_card_frame(draw: ImageDraw.ImageDraw, primary: str, secondary: str) -> None:
    width, height = CARD_SIZE
    primary_rgb = hex_to_rgb(primary)
    secondary_rgb = hex_to_rgb(secondary)
    draw.rounded_rectangle((54, 54, width - 54, height - 54), radius=54, outline=primary_rgb, width=6)
    draw.rounded_rectangle((90, 102, width - 90, height - 102), radius=32, outline=secondary_rgb, width=2)
    draw.rounded_rectangle((134, 154, width - 134, height - 154), radius=24, outline=secondary_rgb, width=2)
    for x in (134, width - 134):
        for y in (154, height - 154):
            draw.ellipse((x - 10, y - 10, x + 10, y + 10), outline=primary_rgb, width=2)
    draw.line((180, 246, width - 180, 246), fill=secondary_rgb, width=2)
    draw.line((180, height - 246, width - 180, height - 246), fill=secondary_rgb, width=2)


def draw_stars(draw: ImageDraw.ImageDraw, color: str, seed: str, count: int = 84) -> None:
    rng = random.Random(seed)
    rgb = hex_to_rgb(color)
    for _ in range(count):
        x = rng.randrange(180, CARD_SIZE[0] - 180)
        y = rng.randrange(240, CARD_SIZE[1] - 240)
        r = rng.choice([2, 2, 3, 4])
        draw.ellipse((x - r, y - r, x + r, y + r), fill=rgb)
        if rng.random() > 0.82:
            draw.line((x - 9, y, x + 9, y), fill=rgb, width=1)
            draw.line((x, y - 9, x, y + 9), fill=rgb, width=1)


def draw_moon_garden(draw: ImageDraw.ImageDraw) -> None:
    gold = "#C9A45C"
    moon = "#A8A3A0"
    teal = "#0E5A5A"
    draw_card_frame(draw, gold, "#6F5A34")
    draw_stars(draw, moon, "moon-garden-stars", 72)
    cx, cy = 512, 792
    draw.ellipse((cx - 178, cy - 178, cx + 178, cy + 178), outline=hex_to_rgb(gold), width=5)
    draw.ellipse((cx - 118, cy - 148, cx + 118, cy + 88), outline=hex_to_rgb(moon), width=6)
    draw.ellipse((cx - 58, cy - 148, cx + 178, cy + 88), fill=hex_to_rgb("#151416"))
    for i in range(10):
        angle = -math.pi * 0.85 + i * math.pi / 4.5
        x = cx + math.cos(angle) * 246
        y = cy + math.sin(angle) * 246
        draw.line((cx, cy + 42, x, y), fill=hex_to_rgb("#8E7340"), width=2)
        petal = 18 + (i % 3) * 4
        draw.ellipse((x - petal, y - petal, x + petal, y + petal), outline=hex_to_rgb(teal), width=3)
        draw.ellipse((x - 7, y - 7, x + 7, y + 7), fill=hex_to_rgb(gold))


def draw_rose_mirror(draw: ImageDraw.ImageDraw) -> None:
    rose = "#C9828D"
    gold = "#C9A45C"
    ivory = "#F7F1E6"
    draw_card_frame(draw, rose, "#81505A")
    draw_stars(draw, "#8E7340", "rose-mirror-stars", 44)
    cx, cy = 512, 820
    draw.ellipse((cx - 188, cy - 270, cx + 188, cy + 270), outline=hex_to_rgb(gold), width=7)
    draw.ellipse((cx - 136, cy - 210, cx + 136, cy + 210), outline=hex_to_rgb(rose), width=4)
    draw.arc((cx - 98, cy - 160, cx + 98, cy + 160), 58, 302, fill=hex_to_rgb(ivory), width=5)
    for i in range(18):
        angle = i * math.tau / 18
        x = cx + math.cos(angle) * (248 + (i % 2) * 28)
        y = cy + math.sin(angle) * (342 + (i % 3) * 18)
        draw.ellipse((x - 26, y - 12, x + 26, y + 12), outline=hex_to_rgb(rose), width=3)
    for x in (332, 692):
        draw.line((x, 1220, x + 42, 1304), fill=hex_to_rgb(gold), width=3)
        draw.ellipse((x + 16, 1178, x + 74, 1238), outline=hex_to_rgb(rose), width=4)


def draw_golden_thread(draw: ImageDraw.ImageDraw) -> None:
    gold = "#C9A45C"
    dim = "#8E7340"
    ivory = "#F7F1E6"
    draw_card_frame(draw, gold, dim)
    cx, cy = 512, 866
    points = []
    for i in range(12):
        angle = -math.pi / 2 + i * math.tau / 12
        radius = 292 if i % 2 == 0 else 172
        points.append((cx + math.cos(angle) * radius, cy + math.sin(angle) * radius))
    for i, point in enumerate(points):
        for offset in (3, 5):
            other = points[(i + offset) % len(points)]
            draw.line((point[0], point[1], other[0], other[1]), fill=hex_to_rgb(dim), width=2)
    draw.polygon(points, outline=hex_to_rgb(gold))
    draw.ellipse((cx - 208, cy - 208, cx + 208, cy + 208), outline=hex_to_rgb(gold), width=5)
    draw.ellipse((cx - 86, cy - 86, cx + 86, cy + 86), outline=hex_to_rgb(ivory), width=3)
    for i in range(7):
        radius = 96 + i * 56
        draw.arc((cx - radius, cy - radius, cx + radius, cy + radius), 18 + i * 12, 142 + i * 12, fill=hex_to_rgb(gold), width=2)
    for i in range(22):
        x = 206 + i * 30
        draw.line((x, 376, 512, 866), fill=hex_to_rgb("#6F5A34"), width=1)
        draw.line((x, 1356, 512, 866), fill=hex_to_rgb("#6F5A34"), width=1)
def draw_star_seeker(draw: ImageDraw.ImageDraw) -> None:
    pink = "#FF5E9F"
    cyan = "#00F5FF"
    gold = "#FFE359"
    ivory = "#FCEBFF"
    violet = "#A55EFF"
    draw_card_frame(draw, pink, gold)
    # Background starry dots
    draw_stars(draw, cyan, "star-seeker-back-stars", 60)
    
    cx, cy = 512, 866
    
    # 1. Concentric magical circles
    draw.ellipse((cx - 240, cy - 240, cx + 240, cy + 240), outline=hex_to_rgb(pink), width=4)
    draw.ellipse((cx - 220, cy - 220, cx + 220, cy + 220), outline=hex_to_rgb(cyan), width=2)
    draw.ellipse((cx - 180, cy - 180, cx + 180, cy + 180), outline=hex_to_rgb(violet), width=2)
    draw.ellipse((cx - 120, cy - 120, cx + 120, cy + 120), outline=hex_to_rgb(pink), width=2)
    
    # 2. Rays radiating from center
    for i in range(12):
        angle = i * math.tau / 12
        x1 = cx + math.cos(angle) * 180
        y1 = cy + math.sin(angle) * 180
        x2 = cx + math.cos(angle) * 240
        y2 = cy + math.sin(angle) * 240
        draw.line((x1, y1, x2, y2), fill=hex_to_rgb(gold), width=2)
        
    # 3. Large central star
    points = []
    for i in range(10):
        angle = -math.pi / 2 + i * math.tau / 10
        radius = 80 if i % 2 == 0 else 30
        points.append((cx + math.cos(angle) * radius, cy + math.sin(angle) * radius))
    draw.polygon(points, fill=hex_to_rgb(ivory), outline=hex_to_rgb(gold))


def draw_stellar_academy(draw: ImageDraw.ImageDraw) -> None:
    gold = "#FFE054"
    gold_dim = "#A3832B"
    lead_ink = "#1A2436"
    
    # 1. Outer Frame
    draw_card_frame(draw, gold, gold_dim)
    
    # Background stars
    draw_stars(draw, "#DBC5FF", "stellar-academy-back-stars", 40)
    
    cx, cy = 512, 866
    
    # Stained Glass Palette
    glass_colors = [
        hex_to_rgb("#152238"),  # Indigo
        hex_to_rgb("#800020"),  # Burgundy
        hex_to_rgb("#4B0082"),  # Violet
        hex_to_rgb("#3B5323"),  # Olive Green
        hex_to_rgb("#004B49"),  # Teal
        hex_to_rgb("#B03060")   # Muted Rose
    ]
    
    radii = [80, 140, 200, 260]
    num_spokes = 12
    
    # 2. Draw Stained-Glass Mosaic Sectors
    for j in range(len(radii) - 1):
        r1 = radii[j]
        r2 = radii[j+1]
        for i in range(num_spokes):
            theta1 = i * math.tau / num_spokes
            theta2 = (i + 1) * math.tau / num_spokes
            
            # Divide arc into sub-segments for smooth curves
            num_arc_pts = 6
            pts1 = []
            pts2 = []
            for a in range(num_arc_pts + 1):
                t = theta1 + (theta2 - theta1) * (a / num_arc_pts)
                pts1.append((cx + r1 * math.cos(t), cy + r1 * math.sin(t)))
                pts2.append((cx + r2 * math.cos(t), cy + r2 * math.sin(t)))
            
            # Polygon vertices (outer arc clockwise, inner arc counter-clockwise)
            poly_pts = pts2 + list(reversed(pts1))
            
            color_idx = (i + j * 3) % len(glass_colors)
            fill_color = glass_colors[color_idx]
            
            draw.polygon(poly_pts, fill=fill_color, outline=hex_to_rgb(lead_ink), width=4)

    # 3. Center circle fill (amethyst dark)
    draw.ellipse((cx - 80, cy - 80, cx + 80, cy + 80), fill=hex_to_rgb("#1F0D3D"), outline=hex_to_rgb(lead_ink), width=4)
    
    # 4. Concentric gold foil tracery rings
    for r in radii:
        draw.ellipse((cx - r, cy - r, cx + r, cy + r), outline=hex_to_rgb(gold), width=3)
    
    # 5. Spokes gold foil lineart
    for i in range(num_spokes):
        theta = i * math.tau / num_spokes
        dx = math.cos(theta)
        dy = math.sin(theta)
        draw.line((cx + 80 * dx, cy + 80 * dy, cx + 260 * dx, cy + 260 * dy), fill=hex_to_rgb(gold), width=3)
        
    # 6. Central Gold Foil Star (8 points) in the inner core
    star_points = []
    for i in range(16):
        angle = -math.pi / 2 + i * math.tau / 16
        r = 54 if i % 2 == 0 else 22
        star_points.append((cx + math.cos(angle) * r, cy + math.sin(angle) * r))
    draw.polygon(star_points, fill=hex_to_rgb("#FFF2FC"), outline=hex_to_rgb(gold), width=3)
    
    # Tiny details around the rose window
    draw.ellipse((cx - 280, cy - 280, cx + 280, cy + 280), outline=hex_to_rgb(gold_dim), width=2)


def draw_astral_pop_atelier(draw: ImageDraw.ImageDraw) -> None:
    cyan = "#7FD8D2"
    coral = "#FF7A8A"
    gold = "#C9A45C"
    gold_dim = "#8E7340"
    ivory = "#F7F1E6"
    indigo = "#23203A"

    draw_card_frame(draw, gold, gold_dim)
    draw_stars(draw, cyan, "astral-pop-atelier-back-stars", 54)

    cx, cy = 512, 820

    draw.rounded_rectangle((328, 450, 696, 1010), radius=176, outline=hex_to_rgb(gold), width=7)
    draw.rounded_rectangle((364, 500, 660, 970), radius=138, outline=hex_to_rgb(cyan), width=3)
    draw.line((512, 456, 512, 1004), fill=hex_to_rgb(gold_dim), width=3)
    draw.arc((372, 512, 652, 792), 180, 360, fill=hex_to_rgb(cyan), width=3)

    for radius, color, width in ((178, cyan, 3), (238, coral, 2), (306, gold_dim, 2)):
        draw.arc((cx - radius, cy - radius, cx + radius, cy + radius), 208, 332, fill=hex_to_rgb(color), width=width)

    charm_points = [
        (344, 1018, "star"),
        (438, 1114, "headphone"),
        (582, 1110, "pen"),
        (684, 1012, "coin"),
        (512, 1190, "star"),
    ]
    for x, y, kind in charm_points:
        if kind == "star":
            points = []
            for i in range(10):
                angle = -math.pi / 2 + i * math.tau / 10
                radius = 28 if i % 2 == 0 else 11
                points.append((x + math.cos(angle) * radius, y + math.sin(angle) * radius))
            draw.polygon(points, fill=hex_to_rgb(ivory), outline=hex_to_rgb(gold))
        elif kind == "headphone":
            draw.arc((x - 32, y - 32, x + 32, y + 32), 200, 340, fill=hex_to_rgb(cyan), width=5)
            draw.rounded_rectangle((x - 38, y - 4, x - 18, y + 34), radius=8, outline=hex_to_rgb(coral), width=3)
            draw.rounded_rectangle((x + 18, y - 4, x + 38, y + 34), radius=8, outline=hex_to_rgb(coral), width=3)
        elif kind == "pen":
            draw.line((x - 34, y + 34, x + 34, y - 34), fill=hex_to_rgb(cyan), width=6)
            draw.line((x - 18, y + 42, x + 42, y - 18), fill=hex_to_rgb(gold), width=2)
        else:
            draw.ellipse((x - 34, y - 34, x + 34, y + 34), outline=hex_to_rgb(gold), width=5)
            draw.ellipse((x - 17, y - 17, x + 17, y + 17), outline=hex_to_rgb(cyan), width=3)

    for i in range(14):
        angle = i * math.tau / 14
        x = cx + math.cos(angle) * 214
        y = cy + math.sin(angle) * 214
        draw.ellipse((x - 5, y - 5, x + 5, y + 5), fill=hex_to_rgb(coral if i % 2 else cyan))

    draw.rounded_rectangle((276, 1266, 748, 1324), radius=29, outline=hex_to_rgb(indigo), width=3)
    draw.line((324, 1296, 700, 1296), fill=hex_to_rgb(gold_dim), width=2)


def render(deck_id: str, base: str, glow: str, draw_motif) -> Path:
    img = make_background(base, glow, deck_id)
    alpha = rounded_mask(CARD_SIZE, 54)
    img.putalpha(alpha)
    draw = ImageDraw.Draw(img)
    draw_motif(draw)
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    out = OUT_DIR / f"{deck_id}.png"
    img.save(out)
    return out


def main() -> None:
    outputs = [
        render("moon-garden", "#151416", "#0E5A5A", draw_moon_garden),
        render("rose-mirror", "#151416", "#C9828D", draw_rose_mirror),
        render("golden-thread", "#0E5A5A", "#151416", draw_golden_thread),
        render("star-seeker", "#120A2B", "#2A1663", draw_star_seeker),
        render("stellar-academy", "#1F0D3D", "#2D1459", draw_stellar_academy),
        render("astral-pop-atelier", "#151416", "#23203A", draw_astral_pop_atelier),
    ]
    for path in outputs:
        print(path.relative_to(ROOT))


if __name__ == "__main__":
    main()

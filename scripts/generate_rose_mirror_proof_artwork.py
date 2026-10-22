from __future__ import annotations

import argparse
import json
import math
import random
from pathlib import Path

from PIL import Image, ImageDraw, ImageEnhance, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "assets" / "tarot" / "rose-mirror" / "artwork"
CARDS_PATH = ROOT / "packages" / "content" / "data" / "tarot-cards.json"
PROOF_CARDS = [
    "major-00-fool",
    "major-02-high-priestess",
    "major-06-lovers",
    "major-08-strength",
    "major-15-devil",
    "major-16-tower",
    "major-18-moon",
    "minor-cups-two",
    "minor-swords-three",
    "minor-pentacles-six",
]
POLISH_CARDS = [
    "minor-wands-three",
    "minor-wands-four",
    "minor-wands-five",
    "minor-wands-six",
    "minor-wands-seven",
    "minor-wands-eight",
    "minor-wands-nine",
    "minor-wands-ten",
    "minor-swords-five",
    "minor-swords-six",
    "minor-swords-seven",
    "minor-swords-eight",
    "minor-swords-nine",
    "minor-swords-ten",
    "minor-pentacles-seven",
]
POLISH_PASS_2_CARDS = [
    "minor-wands-page",
    "minor-wands-knight",
    "minor-wands-queen",
    "minor-wands-king",
    "minor-cups-ace",
    "minor-cups-three",
    "minor-cups-four",
    "minor-cups-five",
    "minor-cups-six",
    "minor-cups-seven",
    "minor-cups-eight",
    "minor-cups-nine",
    "minor-cups-ten",
    "minor-cups-page",
    "minor-cups-knight",
    "minor-cups-queen",
    "minor-cups-king",
    "minor-swords-page",
    "minor-swords-knight",
    "minor-swords-queen",
    "minor-swords-king",
    "minor-pentacles-ace",
    "minor-pentacles-two",
    "minor-pentacles-three",
    "minor-pentacles-four",
    "minor-pentacles-five",
    "minor-pentacles-eight",
    "minor-pentacles-nine",
    "minor-pentacles-ten",
    "minor-pentacles-page",
    "minor-pentacles-knight",
    "minor-pentacles-queen",
    "minor-pentacles-king",
]
POLISH_PASS_3_CARDS = [
    "major-01-magician",
    "major-03-empress",
    "major-04-emperor",
    "major-05-hierophant",
    "major-07-chariot",
    "major-09-hermit",
    "minor-wands-ace",
    "minor-wands-two",
    "minor-swords-ace",
    "minor-swords-two",
]
SIZE = (656, 1130)


COLORS = {
    "charcoal": "#151416",
    "ink": "#241A1F",
    "panel": "#38242C",
    "rose": "#C9828D",
    "rose_deep": "#8E5C64",
    "rose_shadow": "#5B3541",
    "gold": "#C9A45C",
    "gold_dim": "#7E673C",
    "ivory": "#F7F1E6",
    "moon": "#A8A3A0",
    "teal": "#0E5A5A",
}


def hex_rgb(value: str) -> tuple[int, int, int]:
    value = value.lstrip("#")
    return tuple(int(value[i : i + 2], 16) for i in (0, 2, 4))


def rgba(name: str, alpha: int) -> tuple[int, int, int, int]:
    return (*hex_rgb(COLORS[name]), alpha)


def mix(a: str, b: str, t: float) -> tuple[int, int, int]:
    ar, ag, ab = hex_rgb(COLORS.get(a, a))
    br, bg, bb = hex_rgb(COLORS.get(b, b))
    return (round(ar * (1 - t) + br * t), round(ag * (1 - t) + bg * t), round(ab * (1 - t) + bb * t))


def add_blur(base: Image.Image, draw_fn, radius: int) -> None:
    layer = Image.new("RGBA", SIZE, (0, 0, 0, 0))
    draw_fn(ImageDraw.Draw(layer))
    base.alpha_composite(layer.filter(ImageFilter.GaussianBlur(radius)))


def base_canvas(card_id: str) -> Image.Image:
    rng = random.Random(card_id)
    width, height = SIZE
    image = Image.new("RGBA", SIZE, rgba("charcoal", 255))
    draw = ImageDraw.Draw(image)

    for y in range(height):
        t = y / (height - 1)
        color = mix("charcoal", "panel", min(0.85, t * 0.72))
        draw.line((0, y, width, y), fill=color)

    add_blur(image, lambda d: d.ellipse((60, 80, width - 60, 760), fill=rgba("rose", 44)), 62)
    add_blur(image, lambda d: d.ellipse((170, 250, width - 170, 870), fill=rgba("gold", 22)), 48)
    add_blur(image, lambda d: d.rectangle((0, 780, width, height), fill=rgba("rose_shadow", 32)), 36)

    texture = Image.new("RGBA", SIZE, (0, 0, 0, 0))
    tdraw = ImageDraw.Draw(texture)
    for _ in range(6500):
        x = rng.randrange(width)
        y = rng.randrange(height)
        value = rng.randrange(12, 52)
        alpha = rng.randrange(28, 74)
        tdraw.point((x, y), fill=(value + 14, value + 7, value + 12, alpha))
    for _ in range(90):
        x = rng.randrange(width)
        y = rng.randrange(height)
        length = rng.randrange(18, 90)
        tdraw.line((x, y, x + length, y + rng.randrange(-4, 5)), fill=rgba("ivory", rng.randrange(8, 20)), width=1)
    image.alpha_composite(texture.filter(ImageFilter.GaussianBlur(0.35)))

    vignette = Image.new("RGBA", SIZE, (0, 0, 0, 0))
    vdraw = ImageDraw.Draw(vignette)
    for inset, alpha in [(0, 140), (36, 88), (82, 46)]:
        vdraw.rectangle((inset, inset, width - inset, height - inset), outline=(0, 0, 0, alpha), width=70)
    image.alpha_composite(vignette.filter(ImageFilter.GaussianBlur(52)))
    return image


def draw_table(draw: ImageDraw.ImageDraw, y: int = 760) -> None:
    draw.rounded_rectangle((46, y, 610, 1088), radius=36, fill=rgba("ink", 138))
    draw.line((68, y + 28, 588, y + 8), fill=rgba("gold_dim", 48), width=2)
    draw.line((82, y + 70, 560, y + 50), fill=rgba("ivory", 18), width=1)


def draw_mirror(
    draw: ImageDraw.ImageDraw,
    box: tuple[int, int, int, int],
    *,
    width: int = 7,
    fill_alpha: int = 48,
    gold: bool = True,
    crack: bool = False,
    dark: bool = False,
) -> None:
    shadow = (box[0] - 7, box[1] + 9, box[2] + 7, box[3] + 18)
    draw.ellipse(shadow, fill=(0, 0, 0, 82))
    fill = rgba("ink" if dark else "ivory", fill_alpha)
    outline = rgba("gold" if gold else "rose", 220)
    draw.ellipse(box, fill=fill, outline=outline, width=width)
    inset = max(14, width * 4)
    inner = (box[0] + inset, box[1] + inset, box[2] - inset, box[3] - inset)
    draw.ellipse(inner, outline=rgba("rose", 188), width=max(2, width // 2))
    if inner[2] - inner[0] > 92 and inner[3] - inner[1] > 142:
        draw.arc((inner[0] + 32, inner[1] + 54, inner[2] - 20, inner[3] - 42), 202, 330, fill=rgba("ivory", 215), width=4)
        draw.arc((inner[0] + 70, inner[1] + 90, inner[2] - 68, inner[3] - 70), 210, 306, fill=rgba("moon", 88), width=2)
    if crack:
        cx = (box[0] + box[2]) // 2
        cy = (box[1] + box[3]) // 2
        pts = [(cx - 64, cy - 142), (cx - 24, cy - 70), (cx - 48, cy - 8), (cx + 18, cy + 76), (cx - 8, cy + 160)]
        draw.line(pts, fill=rgba("ivory", 210), width=3)
        draw.line([(cx - 24, cy - 70), (cx + 68, cy - 118)], fill=rgba("gold", 150), width=2)
        draw.line([(cx - 48, cy - 8), (cx - 116, cy + 34)], fill=rgba("rose", 155), width=2)


def draw_curtains(draw: ImageDraw.ImageDraw) -> None:
    left = [(0, 0), (118, 0), (94, 260), (130, 630), (84, 1100), (0, 1130)]
    right = [(656, 0), (538, 0), (562, 260), (526, 630), (572, 1100), (656, 1130)]
    draw.polygon(left, fill=rgba("rose_shadow", 78))
    draw.polygon(right, fill=rgba("rose_shadow", 78))
    for x in [48, 92, 558, 604]:
        draw.line((x, 0, x + (18 if x < 300 else -18), 1130), fill=rgba("rose", 36), width=3)


def draw_petals(draw: ImageDraw.ImageDraw, rng: random.Random, count: int, area=(64, 760, 592, 1050)) -> None:
    for _ in range(count):
        x = rng.randint(area[0], area[2])
        y = rng.randint(area[1], area[3])
        rx = rng.randint(7, 22)
        ry = rng.randint(3, 10)
        color = rgba("rose" if rng.random() > 0.32 else "rose_deep", rng.randint(138, 230))
        draw.ellipse((x - rx, y - ry, x + rx, y + ry), fill=color)
        if rng.random() > 0.5:
            draw.line((x - rx // 2, y, x + rx // 2, y), fill=rgba("gold", 70), width=1)


def draw_candle(draw: ImageDraw.ImageDraw, x: int, y: int, scale: float = 1.0) -> None:
    w = round(22 * scale)
    h = round(112 * scale)
    draw.ellipse((x - 52, y - 82, x + 52, y + 70), fill=rgba("gold", 20))
    draw.rounded_rectangle((x - w // 2, y, x + w // 2, y + h), radius=8, fill=rgba("ivory", 240))
    draw.ellipse((x - w // 2, y - 7, x + w // 2, y + 7), fill=rgba("moon", 150))
    draw.ellipse((x - 11, y - 38, x + 11, y - 7), fill=rgba("gold", 225))
    draw.ellipse((x - 5, y - 29, x + 5, y - 10), fill=rgba("ivory", 245))


def draw_figure(draw: ImageDraw.ImageDraw, x: int, y: int, scale: float = 1.0, *, bowed: bool = False) -> None:
    head = round(46 * scale)
    body_w = round(128 * scale)
    body_h = round(225 * scale)
    head_y = y - body_h - head * 2
    draw.ellipse((x - head, head_y, x + head, head_y + head * 2), fill=rgba("ivory", 220))
    draw.arc((x - head + 10, head_y + 24, x + head - 10, head_y + head * 2 - 12), 200, 340, fill=rgba("gold", 150), width=3)
    if bowed:
        draw.pieslice((x - body_w, y - body_h - 8, x + body_w, y + body_h * 0.78), 205, 338, fill=rgba("rose_deep", 232))
    else:
        draw.pieslice((x - body_w, y - body_h - 22, x + body_w, y + body_h), 200, 340, fill=rgba("rose_deep", 230))
    draw.arc((x - body_w + 20, y - body_h + 20, x + body_w - 20, y + 34), 205, 335, fill=rgba("rose", 105), width=3)


def draw_hand(draw: ImageDraw.ImageDraw, x: int, y: int, angle: float = 0.0, scale: float = 1.0) -> None:
    length = round(120 * scale)
    dx = math.cos(angle) * length
    dy = math.sin(angle) * length
    draw.line((x, y, x + dx, y + dy), fill=rgba("ivory", 220), width=max(7, round(12 * scale)))
    palm_x = x + dx
    palm_y = y + dy
    draw.ellipse((palm_x - 18 * scale, palm_y - 12 * scale, palm_x + 18 * scale, palm_y + 12 * scale), fill=rgba("ivory", 222))
    for offset in [-15, -5, 5, 15]:
        fx = palm_x + math.cos(angle - 0.55) * offset
        fy = palm_y + math.sin(angle - 0.55) * offset
        draw.line((palm_x, palm_y, fx + math.cos(angle) * 34 * scale, fy + math.sin(angle) * 34 * scale), fill=rgba("ivory", 205), width=max(2, round(3 * scale)))


def draw_ribbon(draw: ImageDraw.ImageDraw, points: list[tuple[int, int]], color: str = "rose", width: int = 13, alpha: int = 185) -> None:
    draw.line(points, fill=rgba(color, alpha), width=width, joint="curve")
    draw.line(points, fill=rgba("ivory", 40), width=max(2, width // 5), joint="curve")


def draw_rose_branch(draw: ImageDraw.ImageDraw, points: list[tuple[int, int]]) -> None:
    draw.line(points, fill=rgba("teal", 185), width=5, joint="curve")
    for x, y in points[1:-1]:
        draw.line((x, y, x + 22, y - 18), fill=rgba("gold_dim", 145), width=2)
        draw.line((x, y, x - 18, y + 18), fill=rgba("gold_dim", 125), width=2)
    draw.ellipse((points[-1][0] - 20, points[-1][1] - 14, points[-1][0] + 20, points[-1][1] + 14), fill=rgba("rose", 210))


def draw_cup(draw: ImageDraw.ImageDraw, x: int, y: int, scale: float = 1.0) -> None:
    w = round(78 * scale)
    h = round(92 * scale)
    draw.ellipse((x - w // 2, y, x + w // 2, y + 34 * scale), outline=rgba("gold", 215), width=4)
    draw.line((x - w // 2 + 4, y + 14 * scale, x - 26 * scale, y + h), fill=rgba("gold", 215), width=4)
    draw.line((x + w // 2 - 4, y + 14 * scale, x + 26 * scale, y + h), fill=rgba("gold", 215), width=4)
    draw.arc((x - 28 * scale, y + h - 8 * scale, x + 28 * scale, y + h + 36 * scale), 0, 180, fill=rgba("gold", 215), width=4)
    draw.ellipse((x - (w // 2 - 8), y + 8 * scale, x + (w // 2 - 8), y + 30 * scale), fill=rgba("ivory", 45))


def draw_coin(draw: ImageDraw.ImageDraw, x: int, y: int, r: int = 24, alpha: int = 220) -> None:
    draw.ellipse((x - r, y - r, x + r, y + r), fill=rgba("gold", alpha), outline=rgba("ivory", 90), width=2)
    draw.ellipse((x - r + 8, y - r + 8, x + r - 8, y + r - 8), outline=rgba("rose_deep", 110), width=2)


def draw_pearl(draw: ImageDraw.ImageDraw, x: int, y: int, r: int = 12) -> None:
    draw.ellipse((x - r, y - r, x + r, y + r), fill=rgba("ivory", 220), outline=rgba("moon", 120), width=1)
    draw.ellipse((x - r // 2, y - r // 2, x - r // 4, y - r // 4), fill=rgba("gold", 80))


def draw_key(draw: ImageDraw.ImageDraw, x: int, y: int, scale: float = 1.0) -> None:
    r = round(20 * scale)
    draw.ellipse((x - r, y - r, x + r, y + r), outline=rgba("gold", 225), width=4)
    draw.line((x + r, y, x + 104 * scale, y), fill=rgba("gold", 225), width=5)
    draw.line((x + 78 * scale, y, x + 78 * scale, y + 22 * scale), fill=rgba("gold", 225), width=4)
    draw.line((x + 94 * scale, y, x + 94 * scale, y + 15 * scale), fill=rgba("gold", 225), width=4)


def finish(image: Image.Image) -> Image.Image:
    image = image.filter(ImageFilter.SMOOTH_MORE)
    image = ImageEnhance.Contrast(image.convert("RGB")).enhance(1.08)
    image = ImageEnhance.Color(image).enhance(1.05)
    return image.filter(ImageFilter.UnsharpMask(radius=1.2, percent=68, threshold=4))


def major_fool(image: Image.Image, rng: random.Random) -> None:
    draw = ImageDraw.Draw(image, "RGBA")
    draw_table(draw, 744)
    draw_mirror(draw, (182, 112, 474, 626), width=8, fill_alpha=76)
    draw_figure(draw, 328, 690, 0.72)
    draw_ribbon(draw, [(260, 780), (300, 830), (356, 864), (396, 930)], "rose_deep", 11, 130)
    for i in range(12):
        y = 742 + i * 30
        x = 328 + int(math.sin(i * 0.82) * 72)
        draw.ellipse((x - 24, y - 8, x + 24, y + 8), fill=rgba("rose", 198))
    draw_candle(draw, 154, 760, 0.72)
    draw_petals(draw, rng, 24, (80, 810, 570, 1070))


def major_high_priestess(image: Image.Image, rng: random.Random) -> None:
    draw = ImageDraw.Draw(image, "RGBA")
    draw_curtains(draw)
    draw_table(draw, 780)
    draw_mirror(draw, (188, 104, 468, 648), width=8, fill_alpha=92, dark=True)
    draw.arc((272, 246, 384, 420), 108, 278, fill=rgba("ivory", 230), width=8)
    draw_figure(draw, 328, 760, 0.64, bowed=True)
    for i in range(18):
        draw_pearl(draw, 162 + i * 19, 816 + int(math.sin(i) * 11), 7)
    for i in range(5):
        x = 226 + i * 43
        draw.rounded_rectangle((x, 886 + i % 2 * 16, x + 90, 936 + i % 2 * 16), radius=6, fill=rgba("ivory", 34), outline=rgba("moon", 34))
    draw_petals(draw, rng, 18, (90, 840, 560, 1060))


def major_lovers(image: Image.Image, rng: random.Random) -> None:
    draw = ImageDraw.Draw(image, "RGBA")
    draw_table(draw, 760)
    draw_mirror(draw, (92, 118, 306, 606), width=7, fill_alpha=62)
    draw_mirror(draw, (350, 118, 564, 606), width=7, fill_alpha=62)
    draw_hand(draw, 130, 684, -0.42, 0.82)
    draw_hand(draw, 526, 684, math.pi + 0.42, 0.82)
    draw_ribbon(draw, [(190, 778), (268, 824), (322, 802), (388, 844), (474, 796)], "rose", 11, 178)
    draw.arc((194, 682, 462, 922), 18, 162, fill=rgba("gold", 128), width=4)
    draw_petals(draw, rng, 34, (84, 746, 580, 1050))


def major_strength(image: Image.Image, rng: random.Random) -> None:
    draw = ImageDraw.Draw(image, "RGBA")
    draw_table(draw, 766)
    draw_mirror(draw, (156, 112, 500, 690), width=8, fill_alpha=68, crack=True)
    draw_hand(draw, 210, 770, -0.92, 0.95)
    draw_rose_branch(draw, [(448, 902), (410, 824), (432, 750), (384, 666)])
    draw_ribbon(draw, [(460, 920), (408, 870), (430, 804), (402, 742)], "rose", 9, 148)
    draw_candle(draw, 132, 818, 0.64)
    draw_petals(draw, rng, 26, (78, 820, 582, 1060))


def major_devil(image: Image.Image, rng: random.Random) -> None:
    draw = ImageDraw.Draw(image, "RGBA")
    draw_table(draw, 744)
    draw_mirror(draw, (164, 102, 492, 660), width=8, fill_alpha=95, dark=True)
    draw_key(draw, 232, 810, 1.0)
    draw_ribbon(draw, [(226, 812), (276, 776), (346, 804), (282, 842), (238, 816)], "rose_deep", 15, 220)
    draw_rose_branch(draw, [(440, 940), (396, 850), (420, 764), (372, 700)])
    draw_candle(draw, 520, 794, 0.58)
    draw_petals(draw, rng, 22, (82, 830, 572, 1060))


def major_tower(image: Image.Image, rng: random.Random) -> None:
    draw = ImageDraw.Draw(image, "RGBA")
    draw_table(draw, 770)
    draw_mirror(draw, (174, 80, 482, 724), width=8, fill_alpha=54, crack=True)
    cx = 328
    fragments = [
        [(cx - 20, 252), (cx + 56, 314), (cx + 12, 390)],
        [(cx - 116, 426), (cx - 42, 462), (cx - 112, 548)],
        [(cx + 72, 482), (cx + 150, 526), (cx + 94, 616)],
    ]
    for poly in fragments:
        draw.polygon(poly, fill=rgba("ivory", 42), outline=rgba("gold", 158))
    for i in range(16):
        x = rng.randint(96, 560)
        y = rng.randint(604, 930)
        draw.line((x, y, x + rng.randint(-44, 44), y + rng.randint(18, 72)), fill=rgba("rose", 116), width=2)
    draw_candle(draw, 324, 850, 0.62)
    draw_petals(draw, rng, 38, (60, 810, 596, 1070))


def major_moon(image: Image.Image, rng: random.Random) -> None:
    draw = ImageDraw.Draw(image, "RGBA")
    draw_curtains(draw)
    draw_table(draw, 760)
    draw_mirror(draw, (76, 178, 276, 610), width=6, fill_alpha=62, dark=True)
    draw_mirror(draw, (380, 178, 580, 610), width=6, fill_alpha=62, dark=True)
    draw.ellipse((234, 676, 422, 770), fill=rgba("ink", 170), outline=rgba("gold", 146), width=4)
    draw.arc((282, 636, 384, 752), 112, 286, fill=rgba("ivory", 218), width=7)
    add_blur(image, lambda d: d.ellipse((186, 260, 470, 770), fill=rgba("teal", 32)), 40)
    for i in range(10):
        draw_pearl(draw, 202 + i * 28, 838 + int(math.sin(i * 1.3) * 18), 8)
    draw_petals(draw, rng, 24, (80, 826, 580, 1060))


def cups_two(image: Image.Image, rng: random.Random) -> None:
    draw = ImageDraw.Draw(image, "RGBA")
    draw_table(draw, 720)
    draw_mirror(draw, (144, 118, 512, 628), width=7, fill_alpha=46)
    draw.ellipse((108, 710, 548, 858), fill=rgba("ink", 168), outline=rgba("gold", 138), width=4)
    draw_cup(draw, 238, 762, 0.92)
    draw_cup(draw, 418, 762, 0.92)
    draw_hand(draw, 102, 668, 0.18, 0.62)
    draw_hand(draw, 554, 668, math.pi - 0.18, 0.62)
    draw.line((238, 752, 418, 752), fill=rgba("ivory", 78), width=2)
    draw_petals(draw, rng, 30, (86, 840, 580, 1060))


def swords_three(image: Image.Image, rng: random.Random) -> None:
    draw = ImageDraw.Draw(image, "RGBA")
    draw_table(draw, 760)
    draw_mirror(draw, (148, 96, 508, 688), width=8, fill_alpha=58, crack=True)
    silk = [(166, 704), (492, 650), (530, 858), (224, 934)]
    draw.polygon(silk, fill=rgba("rose_deep", 210))
    pins = [((238, 610), (438, 892)), ((328, 526), (328, 908)), ((450, 610), (240, 892))]
    for start, end in pins:
        draw.line((*start, *end), fill=rgba("ivory", 232), width=7)
        draw.ellipse((start[0] - 8, start[1] - 8, start[0] + 8, start[1] + 8), fill=rgba("gold", 180))
    draw.line((176, 550, 492, 550), fill=rgba("rose", 120), width=3)
    draw_petals(draw, rng, 18, (80, 850, 580, 1060))


def pentacles_six(image: Image.Image, rng: random.Random) -> None:
    draw = ImageDraw.Draw(image, "RGBA")
    draw_table(draw, 716)
    draw_mirror(draw, (166, 118, 490, 626), width=7, fill_alpha=42)
    draw.ellipse((86, 700, 570, 900), fill=rgba("ink", 176), outline=rgba("gold", 155), width=5)
    coin_positions = [(230, 748), (328, 730), (426, 748), (242, 846), (328, 866), (414, 846)]
    pearl_positions = [(196, 798), (280, 794), (376, 794), (462, 798), (286, 910), (372, 910)]
    for x, y in coin_positions:
        draw_coin(draw, x, y, 22)
    for x, y in pearl_positions:
        draw_pearl(draw, x, y, 11)
    draw_hand(draw, 94, 940, -0.7, 0.72)
    draw_hand(draw, 562, 940, math.pi + 0.7, 0.72)
    draw.line((170, 810, 486, 810), fill=rgba("ivory", 48), width=2)
    draw_petals(draw, rng, 18, (84, 910, 578, 1074))


RANK_COUNTS = {
    "ace": 1,
    "two": 2,
    "three": 3,
    "four": 4,
    "five": 5,
    "six": 6,
    "seven": 7,
    "eight": 8,
    "nine": 9,
    "ten": 10,
    "page": 1,
    "knight": 2,
    "queen": 3,
    "king": 4,
}


def ring_points(count: int, cx: int, cy: int, rx: int, ry: int, *, start: float = -math.pi / 2) -> list[tuple[int, int]]:
    if count == 1:
        return [(cx, cy)]
    return [
        (round(cx + math.cos(start + i * math.tau / count) * rx), round(cy + math.sin(start + i * math.tau / count) * ry))
        for i in range(count)
    ]


def draw_star(draw: ImageDraw.ImageDraw, x: int, y: int, r: int = 20, alpha: int = 180) -> None:
    draw.line((x - r, y, x + r, y), fill=rgba("gold", alpha), width=2)
    draw.line((x, y - r, x, y + r), fill=rgba("gold", alpha), width=2)
    draw.line((x - r // 2, y - r // 2, x + r // 2, y + r // 2), fill=rgba("ivory", alpha // 2), width=1)
    draw.line((x - r // 2, y + r // 2, x + r // 2, y - r // 2), fill=rgba("ivory", alpha // 2), width=1)


def draw_bottle(draw: ImageDraw.ImageDraw, x: int, y: int, scale: float = 1.0) -> None:
    w = round(48 * scale)
    h = round(112 * scale)
    draw.rounded_rectangle((x - w // 2, y - h // 2, x + w // 2, y + h // 2), radius=14, fill=rgba("ivory", 36), outline=rgba("gold", 180), width=3)
    draw.rounded_rectangle((x - w // 4, y - h // 2 - 28 * scale, x + w // 4, y - h // 2 + 12 * scale), radius=6, fill=rgba("ivory", 44), outline=rgba("gold", 150), width=2)
    draw.ellipse((x - w // 2 + 8, y - 10 * scale, x + w // 2 - 8, y + 26 * scale), fill=rgba("rose", 45))


def draw_silver_pin(draw: ImageDraw.ImageDraw, x: int, y: int, angle: float, length: int = 168) -> None:
    dx = math.cos(angle) * length / 2
    dy = math.sin(angle) * length / 2
    draw.line((x - dx, y - dy, x + dx, y + dy), fill=rgba("ivory", 225), width=6)
    draw.ellipse((x - dx - 7, y - dy - 7, x - dx + 7, y - dy + 7), fill=rgba("gold", 178))


def draw_silk_panel(
    draw: ImageDraw.ImageDraw,
    points: list[tuple[int, int]],
    *,
    alpha: int = 128,
    edge_alpha: int = 108,
) -> None:
    draw.polygon(points, fill=rgba("rose_deep", alpha))
    for i in range(len(points)):
        x1, y1 = points[i]
        x2, y2 = points[(i + 1) % len(points)]
        draw.line((x1, y1, x2, y2), fill=rgba("rose", edge_alpha), width=2)
    min_y = min(y for _, y in points)
    max_y = max(y for _, y in points)
    min_x = min(x for x, _ in points)
    max_x = max(x for x, _ in points)
    for i in range(5):
        t = (i + 1) / 6
        x = round(min_x * (1 - t) + max_x * t)
        draw.line((x, min_y + 12, x - 18, max_y - 12), fill=rgba("ivory", 18), width=2)


def draw_glass_shards(draw: ImageDraw.ImageDraw, rng: random.Random, count: int, area: tuple[int, int, int, int]) -> None:
    for _ in range(count):
        x = rng.randint(area[0], area[2])
        y = rng.randint(area[1], area[3])
        size = rng.randint(14, 34)
        shard = [(x, y - size), (x + size, y + rng.randint(-4, 16)), (x - rng.randint(8, 24), y + size)]
        draw.polygon(shard, fill=rgba("ivory", rng.randint(26, 58)), outline=rgba("gold", rng.randint(42, 96)))


def draw_window_lines(draw: ImageDraw.ImageDraw, y: int = 742) -> None:
    draw.line((112, y, 544, y - 22), fill=rgba("gold", 82), width=2)
    draw.line((128, y + 54, 526, y + 30), fill=rgba("ivory", 22), width=1)
    draw.line((328, y - 96, 328, y + 120), fill=rgba("ivory", 20), width=1)


def draw_polished_wands(image: Image.Image, rng: random.Random, card: dict, count: int) -> None:
    draw = ImageDraw.Draw(image, "RGBA")
    card_id = card["id"]
    draw_table(draw, 700 if count >= 7 else 726)
    mirror_dark = count in {7, 9, 10}
    draw_mirror(draw, (160, 100, 496, 624), width=8, fill_alpha=56, dark=mirror_dark)

    if card_id == "minor-wands-three":
        draw_curtains(draw)
        draw_window_lines(draw, 734)
        for x, y, s in [(214, 812, 0.6), (328, 776, 0.68), (442, 826, 0.6)]:
            draw_candle(draw, x, y, s)
        draw_ribbon(draw, [(186, 952), (278, 882), (360, 908), (470, 824)], "rose", 9, 150)
        draw_rose_branch(draw, [(488, 1004), (454, 928), (460, 842), (414, 760)])

    elif card_id == "minor-wands-four":
        for x in [202, 454]:
            draw_candle(draw, x, 814, 0.58)
            draw_candle(draw, x, 940, 0.46)
        draw.arc((152, 704, 504, 994), 202, 338, fill=rgba("gold", 142), width=5)
        draw.arc((182, 738, 474, 986), 202, 338, fill=rgba("rose", 124), width=3)
        for x, y in [(236, 752), (284, 726), (372, 726), (420, 752)]:
            draw_pearl(draw, x, y, 9)

    elif card_id == "minor-wands-five":
        for x, y, angle in [(196, 860, -0.72), (274, 808, 0.42), (352, 884, -0.28), (430, 802, 0.7), (488, 900, -0.96)]:
            draw_candle(draw, x, y, 0.5)
            draw_ribbon(draw, [(x - 24, y + 54), (328, 890), (x + 34, y + 116)], "rose_deep", 5, 122)
            draw.line((x - 42, y + 48, x + math.cos(angle) * 84, y + math.sin(angle) * 84), fill=rgba("gold", 74), width=2)
        draw_glass_shards(draw, rng, 8, (190, 796, 472, 980))

    elif card_id == "minor-wands-six":
        for i, (x, y) in enumerate([(172, 914), (238, 852), (300, 812), (364, 812), (428, 852), (492, 914)]):
            draw_candle(draw, x, y, 0.5 if i in {0, 5} else 0.56)
        draw_ribbon(draw, [(156, 996), (244, 934), (328, 954), (414, 934), (500, 996)], "rose", 8, 142)
        for x in [244, 328, 414]:
            draw_star(draw, x, 740, 13, 130)

    elif card_id == "minor-wands-seven":
        draw_silk_panel(draw, [(154, 792), (500, 756), (526, 1018), (174, 1050)], alpha=84)
        for x, y in [(160, 934), (214, 858), (274, 820), (328, 800), (382, 820), (442, 858), (496, 934)]:
            draw_candle(draw, x, y, 0.46)
        draw_hand(draw, 104, 996, -0.58, 0.58)
        draw.line((164, 890, 500, 870), fill=rgba("ivory", 50), width=2)

    elif card_id == "minor-wands-eight":
        for i in range(8):
            x = 146 + i * 52
            y = 914 - i * 22
            draw_candle(draw, x, y, 0.43)
            draw.line((x - 48, y + 42, x + 84, y - 68), fill=rgba("gold", 56), width=2)
        draw_ribbon(draw, [(126, 1004), (224, 930), (352, 866), (528, 762)], "rose", 7, 138)
        draw_glass_shards(draw, rng, 7, (170, 754, 526, 970))

    elif card_id == "minor-wands-nine":
        draw_silk_panel(draw, [(126, 742), (530, 728), (552, 1012), (104, 1040)], alpha=98)
        for i, (x, y) in enumerate(ring_points(9, 328, 900, 174, 74, start=-math.pi * 0.95)):
            draw_candle(draw, x, y, 0.42)
            if i in {2, 6}:
                draw.line((x, y + 50, 328, 818), fill=rgba("ivory", 35), width=2)
        draw_hand(draw, 552, 1010, math.pi + 0.55, 0.55)

    elif card_id == "minor-wands-ten":
        draw_silk_panel(draw, [(146, 766), (510, 724), (544, 1032), (158, 1060)], alpha=118)
        for i, (x, y) in enumerate(ring_points(10, 328, 898, 182, 88, start=-math.pi * 0.82)):
            draw_candle(draw, x, y, 0.4)
            if i % 3 == 0:
                draw.line((x, y + 40, 328, 926), fill=rgba("gold", 45), width=2)
        draw_hand(draw, 102, 990, -0.32, 0.56)
        draw_hand(draw, 556, 990, math.pi + 0.32, 0.56)

    draw_petals(draw, rng, min(46, 22 + count * 2), (70, 850, 586, 1078))


def draw_polished_swords(image: Image.Image, rng: random.Random, card: dict, count: int) -> None:
    draw = ImageDraw.Draw(image, "RGBA")
    card_id = card["id"]
    draw_table(draw, 690)
    draw_mirror(draw, (158, 100, 498, 618), width=8, fill_alpha=48, crack=count >= 5, dark=True)

    if card_id == "minor-swords-five":
        draw_silk_panel(draw, [(154, 840), (504, 796), (526, 954), (188, 1016)], alpha=96)
        pin_specs = [(196, 850, -0.46, 148), (278, 914, 0.2, 178), (356, 820, -0.78, 156), (444, 900, 0.5, 150), (500, 808, -0.16, 126)]
        for x, y, angle, length in pin_specs:
            draw_silver_pin(draw, x, y, angle, length)
        draw_glass_shards(draw, rng, 9, (170, 760, 510, 976))

    elif card_id == "minor-swords-six":
        draw_silk_panel(draw, [(134, 858), (520, 802), (548, 956), (166, 1018)], alpha=82)
        for i, x in enumerate([176, 236, 296, 360, 420, 480]):
            draw_silver_pin(draw, x, 884 + (i % 2) * 34, -0.2, 128)
        draw.line((132, 1018, 540, 960), fill=rgba("ivory", 36), width=2)
        draw_pearl(draw, 328, 804, 13)

    elif card_id == "minor-swords-seven":
        draw_silk_panel(draw, [(170, 800), (488, 842), (506, 1008), (150, 980)], alpha=92)
        for i, (x, y) in enumerate([(180, 850), (232, 918), (286, 830), (342, 926), (402, 846), (456, 910), (504, 832)]):
            draw_silver_pin(draw, x, y, -0.92 + i * 0.22, 128)
        draw_key(draw, 220, 1016, 0.46)
        draw.line((476, 780, 526, 736), fill=rgba("rose", 112), width=3)

    elif card_id == "minor-swords-eight":
        draw_silk_panel(draw, [(190, 774), (466, 774), (500, 1038), (158, 1038)], alpha=98)
        for i, x in enumerate([170, 210, 254, 300, 356, 402, 446, 488]):
            draw_silver_pin(draw, x, 892, -math.pi / 2 + (i - 3.5) * 0.08, 164)
        draw_ribbon(draw, [(214, 742), (292, 780), (376, 752), (454, 786)], "rose_deep", 10, 150)

    elif card_id == "minor-swords-nine":
        draw_silk_panel(draw, [(138, 810), (516, 786), (540, 1018), (134, 1048)], alpha=112)
        for i, (x, y) in enumerate(ring_points(9, 328, 890, 178, 82, start=-math.pi * 0.9)):
            draw_silver_pin(draw, x, y, -0.62 + (i % 5) * 0.28, 118)
        for y in [760, 784, 808]:
            draw.line((188, y, 468, y - 18), fill=rgba("ivory", 26), width=1)

    elif card_id == "minor-swords-ten":
        draw_silk_panel(draw, [(136, 812), (520, 784), (548, 984), (160, 1034)], alpha=118)
        for i, (x, y) in enumerate(ring_points(10, 328, 900, 190, 86, start=-math.pi * 0.74)):
            draw_silver_pin(draw, x, y, -0.44 + (i % 4) * 0.32, 112)
        draw_hand(draw, 98, 1034, -0.62, 0.54)
        draw_ribbon(draw, [(176, 1012), (274, 982), (380, 1002), (490, 944)], "rose", 8, 116)

    draw_petals(draw, rng, 34, (72, 846, 586, 1078))


def draw_polished_pentacles(image: Image.Image, rng: random.Random, card: dict, count: int) -> None:
    draw = ImageDraw.Draw(image, "RGBA")
    draw_table(draw, 704)
    draw_mirror(draw, (158, 104, 498, 622), width=8, fill_alpha=54)
    draw_silk_panel(draw, [(132, 800), (524, 768), (554, 1016), (142, 1054)], alpha=78)
    tray = (112, 788, 544, 982)
    draw.ellipse(tray, fill=rgba("ink", 122), outline=rgba("gold", 126), width=4)
    seed_points = [(218, 822), (320, 798), (432, 830), (246, 900), (356, 884), (472, 928), (306, 952)]
    for i, (x, y) in enumerate(seed_points):
        draw_coin(draw, x, y, 20 if i < 3 else 17)
        draw.line((x, y + 22, x + rng.randint(-18, 18), y + rng.randint(42, 72)), fill=rgba("teal", 90), width=2)
    draw_hand(draw, 96, 996, -0.52, 0.58)
    draw_pearl(draw, 492, 780, 12)
    draw_key(draw, 206, 1022, 0.48)
    draw_petals(draw, rng, 30, (76, 884, 584, 1078))


def draw_polished_minor(image: Image.Image, rng: random.Random, card: dict) -> None:
    suit = card["suit"]
    count = RANK_COUNTS.get(card["rank"], 1)
    if suit == "wands":
        draw_polished_wands(image, rng, card, count)
    elif suit == "swords":
        draw_polished_swords(image, rng, card, count)
    elif suit == "pentacles":
        draw_polished_pentacles(image, rng, card, count)
    else:
        draw_minor_numbered(image, rng, card)


def draw_reflection_pool(draw: ImageDraw.ImageDraw, box: tuple[int, int, int, int], *, alpha: int = 54) -> None:
    draw.ellipse(box, fill=rgba("ivory", alpha), outline=rgba("gold", 112), width=3)
    inset = 18
    draw.arc((box[0] + inset, box[1] + inset, box[2] - inset, box[3] - inset), 184, 354, fill=rgba("rose", 86), width=2)


def draw_vanity_box(draw: ImageDraw.ImageDraw, x: int, y: int, w: int = 152, h: int = 92) -> None:
    draw.rounded_rectangle((x - w // 2, y - h // 2, x + w // 2, y + h // 2), radius=18, fill=rgba("rose_deep", 96), outline=rgba("gold", 96), width=2)
    draw.line((x - w // 2 + 16, y - 8, x + w // 2 - 16, y - 18), fill=rgba("ivory", 24), width=2)
    draw_coin(draw, x, y - h // 2 + 8, 10, 170)


def draw_polished_cups(image: Image.Image, rng: random.Random, card: dict) -> None:
    draw = ImageDraw.Draw(image, "RGBA")
    card_id = card["id"]
    count = RANK_COUNTS.get(card["rank"], 1)
    draw_table(draw, 704 if count >= 7 else 728)
    draw_mirror(draw, (158, 102, 498, 622), width=8, fill_alpha=48, dark=count in {4, 5, 7, 8})

    if card_id == "minor-cups-ace":
        draw_reflection_pool(draw, (198, 778, 458, 920), alpha=46)
        draw_cup(draw, 328, 780, 0.82)
        draw_bottle(draw, 328, 940, 0.62)
        for x, y in ring_points(7, 328, 856, 136, 48):
            draw_pearl(draw, x, y, 9)

    elif card_id == "minor-cups-three":
        for x, y, s in [(220, 842, 0.56), (328, 804, 0.62), (436, 842, 0.56)]:
            draw_cup(draw, x, y, s)
        draw_reflection_pool(draw, (154, 896, 502, 992), alpha=34)
        draw_ribbon(draw, [(190, 976), (278, 928), (376, 944), (470, 900)], "rose", 8, 132)

    elif card_id == "minor-cups-four":
        draw_silk_panel(draw, [(162, 780), (500, 758), (520, 1010), (150, 1038)], alpha=74)
        for x, y in [(212, 866), (304, 832), (394, 854)]:
            draw_cup(draw, x, y, 0.48)
        draw_cup(draw, 478, 782, 0.42)
        draw_hand(draw, 98, 1004, -0.64, 0.55)

    elif card_id == "minor-cups-five":
        draw_reflection_pool(draw, (132, 860, 524, 986), alpha=30)
        for x, y, tilt in [(210, 864, -0.32), (284, 898, 0.22), (380, 872, 0.0), (452, 910, 0.28), (328, 790, 0.0)]:
            draw_cup(draw, x, y, 0.45)
            if tilt:
                draw.line((x - 28, y + 60, x + 32, y + 84), fill=rgba("rose", 46), width=4)
        draw_bottle(draw, 328, 980, 0.54)

    elif card_id == "minor-cups-six":
        draw_curtains(draw)
        for x, y in ring_points(6, 328, 866, 160, 72):
            draw_cup(draw, x, y, 0.44)
        draw_key(draw, 246, 984, 0.48)
        draw_pearl(draw, 410, 982, 12)

    elif card_id == "minor-cups-seven":
        for i, (x, y) in enumerate(ring_points(7, 328, 848, 174, 82, start=-math.pi * 0.88)):
            draw_cup(draw, x, y, 0.42)
            draw_star(draw, x, y - 54, 9, 102)
        draw_silk_panel(draw, [(192, 936), (484, 900), (512, 1012), (166, 1044)], alpha=52)

    elif card_id == "minor-cups-eight":
        draw_reflection_pool(draw, (112, 874, 544, 1012), alpha=28)
        for i, x in enumerate([154, 206, 258, 310, 362, 414, 466, 518]):
            draw_cup(draw, x, 900 - i * 18, 0.38)
        draw_ribbon(draw, [(138, 1030), (242, 974), (366, 894), (512, 760)], "rose_deep", 8, 118)

    elif card_id == "minor-cups-nine":
        draw_silk_panel(draw, [(126, 800), (530, 782), (548, 1016), (110, 1042)], alpha=74)
        for i, (x, y) in enumerate(ring_points(9, 328, 898, 178, 78, start=-math.pi * 0.94)):
            draw_cup(draw, x, y, 0.36)
            if i in {1, 4, 7}:
                draw_pearl(draw, x, y + 64, 8)
        draw_figure(draw, 328, 790, 0.44)

    elif card_id == "minor-cups-ten":
        draw_curtains(draw)
        draw_reflection_pool(draw, (110, 852, 546, 1016), alpha=36)
        for i, (x, y) in enumerate(ring_points(10, 328, 884, 188, 86, start=-math.pi * 0.9)):
            draw_cup(draw, x, y, 0.34)
        draw_ribbon(draw, [(122, 1000), (224, 934), (328, 956), (436, 934), (534, 1000)], "rose", 8, 134)

    draw_petals(draw, rng, min(44, 20 + count * 2), (72, 850, 586, 1078))


def draw_polished_pentacles_pass2(image: Image.Image, rng: random.Random, card: dict) -> None:
    draw = ImageDraw.Draw(image, "RGBA")
    card_id = card["id"]
    count = RANK_COUNTS.get(card["rank"], 1)
    draw_table(draw, 714 if count <= 5 else 696)
    draw_mirror(draw, (158, 102, 498, 624), width=8, fill_alpha=56)

    if card_id == "minor-pentacles-ace":
        draw_vanity_box(draw, 328, 850, 170, 108)
        draw_coin(draw, 328, 748, 36)
        draw_key(draw, 248, 966, 0.54)
        draw_pearl(draw, 430, 960, 12)

    elif card_id == "minor-pentacles-two":
        draw_ribbon(draw, [(232, 802), (328, 862), (424, 802), (328, 946), (232, 802)], "rose_deep", 8, 132)
        draw_coin(draw, 242, 824, 26)
        draw_coin(draw, 414, 912, 26)
        draw_hand(draw, 94, 1000, -0.58, 0.54)
        draw_hand(draw, 562, 1000, math.pi + 0.58, 0.54)

    elif card_id == "minor-pentacles-three":
        draw_silk_panel(draw, [(150, 800), (506, 770), (526, 1004), (148, 1030)], alpha=68)
        for x, y in [(228, 850), (328, 790), (428, 860)]:
            draw_coin(draw, x, y, 23)
        draw.line((224, 920, 432, 880), fill=rgba("ivory", 46), width=3)
        draw_key(draw, 230, 1000, 0.46)
        draw_pearl(draw, 430, 986, 10)

    elif card_id == "minor-pentacles-four":
        draw_vanity_box(draw, 328, 872, 212, 116)
        for x, y in [(234, 816), (422, 816), (264, 942), (392, 942)]:
            draw_coin(draw, x, y, 22)
        draw_ribbon(draw, [(224, 1004), (300, 952), (356, 974), (432, 920)], "rose_deep", 7, 118)

    elif card_id == "minor-pentacles-five":
        draw_silk_panel(draw, [(122, 826), (522, 792), (544, 980), (112, 1024)], alpha=70)
        for x, y in [(202, 858), (276, 930), (350, 842), (430, 924), (488, 852)]:
            draw_coin(draw, x, y, 19)
        draw_hand(draw, 98, 1018, -0.5, 0.56)
        draw.line((156, 780, 506, 742), fill=rgba("ivory", 22), width=1)

    elif card_id == "minor-pentacles-eight":
        for i in range(8):
            x = 170 + (i % 4) * 104
            y = 804 + (i // 4) * 116
            draw_vanity_box(draw, x, y, 78, 54)
            draw_coin(draw, x, y - 30, 14)
        draw.line((144, 996, 520, 952), fill=rgba("gold", 56), width=3)

    elif card_id == "minor-pentacles-nine":
        draw_silk_panel(draw, [(142, 778), (518, 758), (548, 1026), (124, 1052)], alpha=74)
        for x, y in ring_points(9, 328, 884, 176, 86, start=-math.pi * 0.84):
            draw_coin(draw, x, y, 17)
        draw_bottle(draw, 328, 812, 0.52)
        draw_pearl(draw, 328, 986, 13)

    elif card_id == "minor-pentacles-ten":
        draw_curtains(draw)
        for x, y in ring_points(10, 328, 870, 186, 90, start=-math.pi * 0.86):
            draw_coin(draw, x, y, 16)
        draw_key(draw, 218, 1006, 0.48)
        draw_key(draw, 356, 970, 0.48)
        draw_reflection_pool(draw, (158, 938, 498, 1030), alpha=24)

    draw_petals(draw, rng, min(42, 22 + count * 2), (76, 850, 584, 1078))


def draw_polished_court(image: Image.Image, rng: random.Random, card: dict) -> None:
    draw = ImageDraw.Draw(image, "RGBA")
    suit = card["suit"]
    rank = card["rank"]
    draw_table(draw, 734)
    draw_mirror(draw, (158, 94, 498, 636), width=8, fill_alpha=56, dark=suit in {"cups", "swords"})

    scale = {"page": 0.56, "knight": 0.64, "queen": 0.72, "king": 0.76}[rank]
    x_offset = {"page": -44, "knight": 38, "queen": 0, "king": 0}[rank]
    draw_figure(draw, 328 + x_offset, 736, scale, bowed=rank == "page")

    if rank == "page":
        draw_pearl(draw, 406, 780, 11)
        draw.line((238, 910, 466, 868), fill=rgba("ivory", 24), width=2)
    elif rank == "knight":
        draw_ribbon(draw, [(132, 968), (242, 884), (360, 904), (526, 792)], "rose", 9, 144)
        draw_star(draw, 478, 760, 13, 116)
    elif rank == "queen":
        for x, y in ring_points(10, 328, 676, 146, 48):
            draw_pearl(draw, x, y, 7)
        draw_silk_panel(draw, [(144, 796), (510, 768), (536, 1014), (124, 1044)], alpha=48)
    elif rank == "king":
        draw_key(draw, 220, 932, 0.54)
        draw_key(draw, 350, 968, 0.54)
        for x, y in ring_points(8, 328, 680, 148, 50):
            draw_star(draw, x, y, 10, 124)

    if suit == "wands":
        draw_candle(draw, 192, 842, 0.5)
        draw_candle(draw, 462, 842, 0.5)
        draw_rose_branch(draw, [(504, 1010), (458, 926), (470, 842), (420, 766)])
    elif suit == "cups":
        draw_cup(draw, 206, 842, 0.52)
        draw_cup(draw, 456, 842, 0.52)
        draw_reflection_pool(draw, (214, 910, 494, 1010), alpha=28)
        draw_bottle(draw, 328, 968, 0.46)
    elif suit == "swords":
        draw_silver_pin(draw, 204, 854, -0.74, 144)
        draw_silver_pin(draw, 456, 854, 0.74, 144)
        draw_silk_panel(draw, [(204, 920), (468, 882), (500, 1000), (230, 1036)], alpha=74)
    elif suit == "pentacles":
        for x, y in ring_points(4, 328, 900, 140, 66):
            draw_coin(draw, x, y, 20)
        draw_vanity_box(draw, 328, 982, 142, 72)

    draw_petals(draw, rng, 28, (80, 874, 584, 1076))


def draw_polish_pass_2(image: Image.Image, rng: random.Random, card: dict) -> None:
    if card["rank"] in {"page", "knight", "queen", "king"}:
        draw_polished_court(image, rng, card)
    elif card["suit"] == "cups":
        draw_polished_cups(image, rng, card)
    elif card["suit"] == "pentacles":
        draw_polished_pentacles_pass2(image, rng, card)
    else:
        draw_minor_numbered(image, rng, card)


def draw_polished_major_pass3(image: Image.Image, rng: random.Random, card: dict) -> None:
    draw = ImageDraw.Draw(image, "RGBA")
    card_id = card["id"]
    draw_table(draw, 724)

    if card_id == "major-01-magician":
        draw_mirror(draw, (156, 92, 500, 626), width=8, fill_alpha=60)
        draw_figure(draw, 328, 710, 0.58)
        draw_silk_panel(draw, [(138, 794), (518, 758), (544, 1016), (120, 1048)], alpha=64)
        tools = [(214, 856, "candle"), (292, 914, "cup"), (374, 856, "pin"), (456, 914, "coin")]
        for x, y, tool in tools:
            if tool == "candle":
                draw_candle(draw, x, y, 0.38)
            elif tool == "cup":
                draw_cup(draw, x, y - 28, 0.36)
            elif tool == "pin":
                draw_silver_pin(draw, x, y, -0.82, 112)
            else:
                draw_coin(draw, x, y, 18)
            draw.line((328, 798, x, y), fill=rgba("gold", 44), width=2)
        draw_star(draw, 328, 792, 18, 150)

    elif card_id == "major-03-empress":
        draw_mirror(draw, (160, 94, 496, 624), width=8, fill_alpha=62)
        draw_figure(draw, 328, 716, 0.62)
        draw_silk_panel(draw, [(132, 798), (526, 770), (550, 1036), (118, 1054)], alpha=72)
        draw_bottle(draw, 254, 858, 0.62)
        draw_rose_branch(draw, [(440, 1010), (398, 928), (414, 842), (366, 766)])
        for x, y in ring_points(9, 328, 912, 154, 68, start=-math.pi * 0.9):
            draw_pearl(draw, x, y, 8)
        draw_hand(draw, 108, 994, -0.48, 0.52)

    elif card_id == "major-04-emperor":
        draw_mirror(draw, (160, 94, 496, 624), width=8, fill_alpha=56)
        draw_figure(draw, 328, 718, 0.66)
        draw_vanity_box(draw, 328, 886, 220, 122)
        draw_key(draw, 210, 982, 0.58)
        draw_key(draw, 346, 940, 0.58)
        draw.line((160, 812, 496, 786), fill=rgba("gold", 78), width=3)
        draw.line((188, 1024, 468, 982), fill=rgba("ivory", 30), width=2)

    elif card_id == "major-05-hierophant":
        draw_curtains(draw)
        draw_mirror(draw, (160, 94, 496, 624), width=8, fill_alpha=58)
        draw_figure(draw, 328, 718, 0.62)
        draw_silk_panel(draw, [(154, 812), (502, 790), (522, 990), (136, 1028)], alpha=58)
        draw_candle(draw, 210, 846, 0.5)
        draw_candle(draw, 446, 846, 0.5)
        for x, y in ring_points(11, 328, 928, 164, 58):
            draw_pearl(draw, x, y, 7)
        draw.line((228, 1004, 428, 960), fill=rgba("ivory", 34), width=3)

    elif card_id == "major-07-chariot":
        draw_mirror(draw, (160, 94, 496, 624), width=8, fill_alpha=60)
        draw_figure(draw, 328, 718, 0.62)
        draw_ribbon(draw, [(86, 938), (210, 844), (328, 878), (446, 844), (570, 938)], "rose", 12, 176)
        draw_ribbon(draw, [(120, 1010), (258, 928), (398, 954), (536, 836)], "rose_deep", 8, 130)
        draw_coin(draw, 328, 878, 24)
        draw_silver_pin(draw, 208, 940, -0.5, 128)
        draw_silver_pin(draw, 448, 940, 0.5, 128)

    elif card_id == "major-09-hermit":
        draw_mirror(draw, (160, 94, 496, 624), width=8, fill_alpha=44, dark=True)
        draw_figure(draw, 328, 720, 0.58, bowed=True)
        draw_candle(draw, 328, 838, 0.64)
        draw_reflection_pool(draw, (210, 930, 446, 1018), alpha=24)
        for i, (x, y) in enumerate(ring_points(7, 328, 944, 146, 48, start=math.pi)):
            draw_pearl(draw, x, y, 7 + (1 if i == 3 else 0))
        draw.line((328, 878, 328, 1012), fill=rgba("gold", 46), width=2)

    draw_petals(draw, rng, 30, (76, 850, 584, 1078))


def draw_polished_minor_pass3(image: Image.Image, rng: random.Random, card: dict) -> None:
    draw = ImageDraw.Draw(image, "RGBA")
    card_id = card["id"]
    draw_table(draw, 716)

    if card_id == "minor-wands-ace":
        draw_mirror(draw, (158, 102, 498, 624), width=8, fill_alpha=60)
        draw_candle(draw, 328, 820, 0.72)
        draw_ribbon(draw, [(250, 972), (298, 910), (328, 862), (370, 918), (426, 982)], "rose", 9, 142)
        draw_hand(draw, 112, 1000, -0.5, 0.52)
        draw_rose_branch(draw, [(472, 1014), (430, 930), (446, 846), (392, 772)])
        draw_star(draw, 328, 742, 16, 150)

    elif card_id == "minor-wands-two":
        draw_mirror(draw, (158, 102, 498, 624), width=8, fill_alpha=58)
        draw_candle(draw, 228, 842, 0.58)
        draw_candle(draw, 430, 842, 0.58)
        draw_ribbon(draw, [(200, 974), (276, 898), (328, 934), (386, 898), (462, 974)], "rose_deep", 9, 138)
        draw_key(draw, 242, 1014, 0.42)
        draw_pearl(draw, 414, 1000, 11)
        draw.line((328, 760, 328, 1000), fill=rgba("ivory", 22), width=1)

    elif card_id == "minor-swords-ace":
        draw_mirror(draw, (158, 102, 498, 624), width=8, fill_alpha=56)
        draw_silk_panel(draw, [(176, 844), (484, 806), (510, 964), (198, 1014)], alpha=70)
        draw_silver_pin(draw, 328, 846, -math.pi / 2, 220)
        draw_star(draw, 328, 740, 18, 145)
        draw.line((196, 944, 462, 910), fill=rgba("ivory", 38), width=2)
        draw_pearl(draw, 328, 986, 11)

    elif card_id == "minor-swords-two":
        draw_mirror(draw, (158, 102, 498, 624), width=8, fill_alpha=54)
        draw_silk_panel(draw, [(170, 818), (490, 818), (516, 1004), (142, 1004)], alpha=74)
        draw_silver_pin(draw, 266, 900, -0.72, 176)
        draw_silver_pin(draw, 390, 900, 0.72, 176)
        draw_ribbon(draw, [(182, 790), (276, 824), (382, 798), (480, 832)], "rose_deep", 9, 142)
        draw_reflection_pool(draw, (218, 944, 438, 1018), alpha=24)

    draw_petals(draw, rng, 28, (76, 870, 584, 1078))


def draw_polish_pass_3(image: Image.Image, rng: random.Random, card: dict) -> None:
    if card["arcana"] == "major":
        draw_polished_major_pass3(image, rng, card)
    else:
        draw_polished_minor_pass3(image, rng, card)


def draw_minor_numbered(image: Image.Image, rng: random.Random, card: dict) -> None:
    draw = ImageDraw.Draw(image, "RGBA")
    suit = card["suit"]
    rank = card["rank"]
    count = RANK_COUNTS.get(rank, 1)
    draw_table(draw, 718 if count <= 6 else 690)

    crack = suit == "swords" and count >= 5
    dark = suit in {"cups", "swords"} and count in {4, 5, 7, 8, 9, 10}
    draw_mirror(draw, (156, 108, 500, 626), width=7, fill_alpha=48, crack=crack, dark=dark)

    if suit == "wands":
        points = ring_points(count, 328, 812, 190, 95, start=-math.pi / 2.5)
        for i, (x, y) in enumerate(points):
            draw_candle(draw, x, y - 28, 0.42 if count > 6 else 0.52)
            if i % 2 == 0:
                draw_ribbon(draw, [(x - 24, y + 52), (x + 18, y + 70), (x - 6, y + 92)], "rose_deep", 5, 120)
        if count >= 5:
            draw_rose_branch(draw, [(472, 980), (430, 900), (448, 804), (392, 734)])

    elif suit == "cups":
        points = ring_points(count, 328, 800, 180, 88)
        for x, y in points:
            draw_cup(draw, x, y - 34, 0.42 if count > 6 else 0.56)
        if count in {5, 8, 10}:
            draw.ellipse((142, 870, 514, 960), fill=rgba("rose", 36), outline=rgba("gold", 72), width=2)
        draw_bottle(draw, 328, 708, 0.58)

    elif suit == "swords":
        points = ring_points(count, 328, 804, 184, 98)
        for i, (x, y) in enumerate(points):
            draw_silver_pin(draw, x, y, -1.05 + (i % 4) * 0.72, 126 if count > 6 else 158)
        if count >= 4:
            draw.polygon([(174, 854), (486, 816), (516, 954), (210, 1002)], fill=rgba("rose_deep", 88))

    elif suit == "pentacles":
        points = ring_points(count, 328, 800, 184, 92)
        for x, y in points:
            draw_coin(draw, x, y, 17 if count > 6 else 22)
        for i, (x, y) in enumerate(points[: min(count, 8)]):
            if i % 2 == 0:
                draw_pearl(draw, x + 24, y + 26, 8)
        if count >= 4:
            draw_key(draw, 206, 934, 0.54)

    draw_petals(draw, rng, min(42, 18 + count * 2), (76, 890 if count <= 5 else 840, 584, 1074))


def draw_minor_court(image: Image.Image, rng: random.Random, card: dict) -> None:
    draw = ImageDraw.Draw(image, "RGBA")
    suit = card["suit"]
    rank = card["rank"]
    draw_table(draw, 748)
    draw_mirror(draw, (160, 96, 496, 642), width=8, fill_alpha=58, dark=suit in {"cups", "swords"})

    scale = {"page": 0.62, "knight": 0.68, "queen": 0.74, "king": 0.78}.get(rank, 0.68)
    draw_figure(draw, 328, 746, scale, bowed=rank == "page")

    if suit == "wands":
        draw_candle(draw, 210, 832, 0.54)
        draw_candle(draw, 446, 832, 0.54)
        draw_ribbon(draw, [(210, 930), (288, 870), (382, 918), (462, 856)], "rose", 10, 160)
        draw_rose_branch(draw, [(492, 1002), (448, 924), (462, 836), (414, 772)])
    elif suit == "cups":
        draw_cup(draw, 220, 826, 0.62)
        draw_cup(draw, 436, 826, 0.62)
        draw_bottle(draw, 328, 914, 0.62)
    elif suit == "swords":
        draw_silver_pin(draw, 224, 840, -0.72, 170)
        draw_silver_pin(draw, 430, 840, 0.72, 170)
        draw.polygon([(210, 920), (466, 882), (496, 1000), (238, 1038)], fill=rgba("rose_deep", 92))
    elif suit == "pentacles":
        for x, y in ring_points(4, 328, 880, 142, 74):
            draw_coin(draw, x, y, 22)
        draw_key(draw, 236, 982, 0.58)
        draw_pearl(draw, 420, 976, 12)

    if rank in {"queen", "king"}:
        for x, y in ring_points(8, 328, 666, 132, 42):
            draw_star(draw, x, y, 10, 124)
    draw_petals(draw, rng, 28, (84, 884, 580, 1070))


MAJOR_OBJECTS = {
    "major-01-magician": ("four_tools", False, False),
    "major-03-empress": ("perfume_rose", False, False),
    "major-04-emperor": ("key_ribbon", False, False),
    "major-05-hierophant": ("two_candles", False, False),
    "major-07-chariot": ("ribbon_clasp", False, False),
    "major-09-hermit": ("single_candle", True, False),
    "major-10-wheel": ("mirror_wheel", False, False),
    "major-11-justice": ("heart_key", False, False),
    "major-12-hanged-man": ("hanging_ribbon", False, False),
    "major-13-death": ("wilt_new_rose", False, True),
    "major-14-temperance": ("two_bottles", False, False),
    "major-17-star": ("water_star", False, False),
    "major-19-sun": ("warm_sun", False, False),
    "major-20-judgement": ("shard_circle", False, True),
    "major-21-world": ("wreath", False, False),
}


def draw_major_generic(image: Image.Image, rng: random.Random, card: dict) -> None:
    draw = ImageDraw.Draw(image, "RGBA")
    mode, dark, crack = MAJOR_OBJECTS.get(card["id"], ("single_candle", False, False))
    if mode in {"two_candles", "water_star", "shard_circle"}:
        draw_curtains(draw)
    draw_table(draw, 754)
    draw_mirror(draw, (164, 96, 492, 650), width=8, fill_alpha=58, dark=dark, crack=crack)

    if mode in {"four_tools", "perfume_rose", "key_ribbon", "two_candles", "ribbon_clasp", "single_candle", "heart_key"}:
        draw_figure(draw, 328, 748, 0.64, bowed=mode == "single_candle")

    if mode == "four_tools":
        draw_candle(draw, 202, 846, 0.42)
        draw_cup(draw, 288, 842, 0.42)
        draw_silver_pin(draw, 374, 866, -1.2, 112)
        draw_coin(draw, 456, 856, 20)
    elif mode == "perfume_rose":
        draw_bottle(draw, 284, 846, 0.72)
        draw_rose_branch(draw, [(430, 948), (390, 870), (410, 796), (366, 742)])
    elif mode == "key_ribbon":
        draw_key(draw, 230, 862, 0.76)
        draw_ribbon(draw, [(210, 930), (302, 888), (380, 926), (476, 868)], "rose_deep", 12, 178)
    elif mode == "two_candles":
        draw_candle(draw, 228, 824, 0.56)
        draw_candle(draw, 428, 824, 0.56)
        for x, y in ring_points(7, 328, 916, 154, 54):
            draw_pearl(draw, x, y, 8)
    elif mode == "ribbon_clasp":
        draw_ribbon(draw, [(90, 888), (212, 822), (328, 860), (444, 822), (566, 888)], "rose", 14, 180)
        draw_coin(draw, 328, 860, 24)
    elif mode == "single_candle":
        draw_candle(draw, 328, 846, 0.72)
    elif mode == "mirror_wheel":
        for x, y in ring_points(10, 328, 804, 170, 96):
            draw_mirror(draw, (x - 28, y - 44, x + 28, y + 44), width=2, fill_alpha=34)
        draw_bottle(draw, 328, 846, 0.62)
    elif mode == "heart_key":
        draw_key(draw, 250, 846, 0.72)
        draw.ellipse((396, 812, 454, 870), fill=rgba("rose", 142), outline=rgba("gold", 90), width=2)
    elif mode == "hanging_ribbon":
        draw_ribbon(draw, [(328, 92), (300, 210), (338, 346), (314, 512)], "rose_deep", 11, 170)
        draw_mirror(draw, (206, 360, 450, 748), width=7, fill_alpha=62)
    elif mode == "wilt_new_rose":
        draw_rose_branch(draw, [(248, 936), (294, 846), (280, 780), (330, 704)])
        draw_rose_branch(draw, [(420, 936), (386, 846), (404, 778), (356, 706)])
        draw.ellipse((312, 752, 348, 778), fill=rgba("ivory", 190))
    elif mode == "two_bottles":
        draw_bottle(draw, 252, 820, 0.82)
        draw_bottle(draw, 404, 820, 0.82)
        draw.ellipse((224, 910, 432, 980), fill=rgba("ivory", 34), outline=rgba("gold", 126), width=3)
    elif mode == "water_star":
        draw.ellipse((208, 794, 448, 910), fill=rgba("ink", 172), outline=rgba("gold", 150), width=4)
        for x, y in ring_points(7, 328, 840, 94, 34):
            draw_star(draw, x, y, 12, 160)
    elif mode == "warm_sun":
        add_blur(image, lambda d: d.ellipse((170, 160, 486, 760), fill=rgba("gold", 60)), 36)
        draw.ellipse((278, 760, 378, 860), fill=rgba("ivory", 58), outline=rgba("gold", 180), width=4)
        draw_petals(draw, rng, 36, (106, 820, 548, 1010))
    elif mode == "shard_circle":
        for x, y in ring_points(12, 328, 780, 182, 106):
            draw.polygon([(x, y - 34), (x + 22, y), (x - 18, y + 26)], fill=rgba("ivory", 38), outline=rgba("gold", 130))
        draw_figure(draw, 328, 850, 0.62)
    elif mode == "wreath":
        for i, (x, y) in enumerate(ring_points(18, 328, 790, 188, 126)):
            if i % 3 == 0:
                draw_pearl(draw, x, y, 9)
            else:
                draw.ellipse((x - 16, y - 8, x + 16, y + 8), fill=rgba("rose", 160))
        draw_key(draw, 292, 904, 0.56)

    draw_petals(draw, rng, 28, (80, 848, 578, 1070))


def draw_generic_card(image: Image.Image, rng: random.Random, card: dict) -> None:
    if card["id"] in POLISH_PASS_3_CARDS:
        draw_polish_pass_3(image, rng, card)
    elif card["arcana"] == "major":
        draw_major_generic(image, rng, card)
    elif card["id"] in POLISH_PASS_2_CARDS:
        draw_polish_pass_2(image, rng, card)
    elif card["rank"] in {"page", "knight", "queen", "king"}:
        draw_minor_court(image, rng, card)
    elif card["id"] in POLISH_CARDS:
        draw_polished_minor(image, rng, card)
    else:
        draw_minor_numbered(image, rng, card)


DRAWERS = {
    "major-00-fool": major_fool,
    "major-02-high-priestess": major_high_priestess,
    "major-06-lovers": major_lovers,
    "major-08-strength": major_strength,
    "major-15-devil": major_devil,
    "major-16-tower": major_tower,
    "major-18-moon": major_moon,
    "minor-cups-two": cups_two,
    "minor-swords-three": swords_three,
    "minor-pentacles-six": pentacles_six,
}


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--cards", nargs="*")
    parser.add_argument("--proof-only", action="store_true")
    args = parser.parse_args()

    cards = json.loads(CARDS_PATH.read_text(encoding="utf-8"))
    by_id = {card["id"]: card for card in cards}
    if args.cards:
        target_ids = args.cards
    elif args.proof_only:
        target_ids = PROOF_CARDS
    else:
        target_ids = [card["id"] for card in cards]

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    written = []
    for card_id in target_ids:
        if card_id not in by_id:
            raise ValueError(f"Unknown tarot card id: {card_id}")
        rng = random.Random(card_id)
        image = base_canvas(card_id)
        if card_id in DRAWERS:
            DRAWERS[card_id](image, rng)
        else:
            draw_generic_card(image, rng, by_id[card_id])
        path = OUT_DIR / f"{card_id}.png"
        finish(image).save(path)
        written.append(path)
        print(path.relative_to(ROOT))
    print(f"Rose Mirror artwork files: {len(written)}")


if __name__ == "__main__":
    main()

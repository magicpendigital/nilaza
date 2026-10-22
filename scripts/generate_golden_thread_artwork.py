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


def lerp(a: float, b: float, t: float) -> float:
    return a + (b - a) * t


def point(cx: int, cy: int, radius: float, angle: float) -> tuple[float, float]:
    return (cx + math.cos(angle) * radius, cy + math.sin(angle) * radius)


def polygon_points(cx: int, cy: int, radius: float, count: int, rotation: float = -math.pi / 2) -> list[tuple[float, float]]:
    return [point(cx, cy, radius, rotation + i * math.tau / count) for i in range(count)]


def draw_polyline(draw: ImageDraw.ImageDraw, pts: list[tuple[float, float]], fill, width: int = 2, close: bool = False):
    if len(pts) < 2:
        return
    for idx in range(len(pts) - 1):
        draw.line((pts[idx], pts[idx + 1]), fill=fill, width=width)
    if close:
        draw.line((pts[-1], pts[0]), fill=fill, width=width)


def draw_node(draw: ImageDraw.ImageDraw, x: float, y: float, radius: int, fill, outline=None, width: int = 1):
    draw.ellipse((x - radius, y - radius, x + radius, y + radius), fill=fill, outline=outline, width=width)


def draw_diamond(draw: ImageDraw.ImageDraw, cx: int, cy: int, rx: int, ry: int, outline, width: int = 2, fill=None):
    pts = [(cx, cy - ry), (cx + rx, cy), (cx, cy + ry), (cx - rx, cy)]
    draw.polygon(pts, outline=outline, fill=fill)
    if width > 1:
        for offset in range(1, width):
            pts2 = [(cx, cy - ry + offset), (cx + rx - offset, cy), (cx, cy + ry - offset), (cx - rx + offset, cy)]
            draw.line(pts2 + [pts2[0]], fill=outline, width=1)


def draw_arc_path(draw: ImageDraw.ImageDraw, box, start: int, end: int, fill, width: int = 2, steps: int = 80):
    pts = []
    x1, y1, x2, y2 = box
    rx = (x2 - x1) / 2
    ry = (y2 - y1) / 2
    cx = x1 + rx
    cy = y1 + ry
    for i in range(steps + 1):
        t = i / steps
        angle = math.radians(lerp(start, end, t))
        pts.append((cx + math.cos(angle) * rx, cy + math.sin(angle) * ry))
    draw_polyline(draw, pts, fill=fill, width=width)


def add_background(img: Image.Image, seed: str, colors: dict) -> Image.Image:
    width, height = img.size
    bg = hex_to_rgb(colors["background"])
    ink = hex_to_rgb(colors["ink"])
    teal = hex_to_rgb(colors["teal"])
    gold_dim = hex_to_rgb(colors["goldDim"])
    ivory = hex_to_rgb(colors["ivory"])
    rng = random.Random(seed)

    base = Image.new("RGB", (width, height), bg)
    draw = ImageDraw.Draw(base)
    for y in range(height):
        yy = y / max(1, height - 1)
        color = blend(bg, ink, min(0.74, 0.18 + yy * 0.34))
        color = blend(color, teal, 0.04 + (1 - abs(yy - 0.45) * 2) * 0.08)
        draw.line((0, y, width, y), fill=color)

    glow = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    glow_draw = ImageDraw.Draw(glow, "RGBA")
    glow_draw.ellipse((-120, -60, width + 120, height + 60), fill=(*ink, 64))
    glow_draw.ellipse((70, 118, width - 70, height - 118), fill=(*teal, 42))
    glow_draw.ellipse((150, 240, width - 150, height - 240), fill=(*gold_dim, 18))
    glow = glow.filter(ImageFilter.GaussianBlur(52))
    base = Image.alpha_composite(base.convert("RGBA"), glow).convert("RGB")

    draw = ImageDraw.Draw(base)
    grid = blend(gold_dim, ink, 0.58)
    for x in range(76, width, 82):
        draw.line((x, 80, x, height - 80), fill=grid, width=1)
    for y in range(92, height, 94):
        draw.line((70, y, width - 70, y), fill=grid, width=1)

    for _ in range(360):
        x = rng.randrange(width)
        y = rng.randrange(height)
        length = rng.randint(8, 42)
        angle = rng.uniform(-0.4, 0.4) + (math.pi if rng.random() < 0.5 else 0)
        ex = x + math.cos(angle) * length
        ey = y + math.sin(angle) * length
        draw.line((x, y, ex, ey), fill=blend(ink, teal, 0.35), width=1)

    for _ in range(1350):
        x = rng.randrange(width)
        y = rng.randrange(height)
        if rng.random() < 0.78:
            shade = blend(bg, ink, rng.uniform(0.15, 0.45))
        else:
            shade = blend(gold_dim, ivory, rng.uniform(0.0, 0.32))
        draw.point((x, y), fill=shade)

    return base


def draw_strategy_field(draw: ImageDraw.ImageDraw, cx: int, cy: int, gold, dim, ivory, seed: str, intensity: int = 1):
    rng = random.Random(f"field-{seed}")
    draw.ellipse((cx - 250, cy - 390, cx + 250, cy + 390), outline=dim, width=1)
    draw_diamond(draw, cx, cy, 220, 340, outline=dim, width=1)
    draw.line((cx, cy - 410, cx, cy + 410), fill=dim, width=1)
    draw.line((cx - 280, cy, cx + 280, cy), fill=dim, width=1)

    nodes: list[tuple[float, float]] = []
    total = 6 + intensity * 2
    for idx in range(total):
        angle = -math.pi / 2 + idx * math.tau / total + rng.uniform(-0.08, 0.08)
        radius = rng.randint(130, 255)
        px, py = point(cx, cy, radius, angle)
        nodes.append((px, py))
        draw_node(draw, px, py, 3 if idx % 2 else 4, ivory if idx % 2 else gold)
    for idx in range(len(nodes)):
        if idx % 2 == 0 or intensity > 1:
            draw.line((nodes[idx], nodes[(idx + 2) % len(nodes)]), fill=dim, width=1)


def draw_thread_route(draw: ImageDraw.ImageDraw, pts: list[tuple[float, float]], gold, ivory, width: int = 3):
    draw_polyline(draw, pts, fill=gold, width=width)
    for idx, (x, y) in enumerate(pts):
        draw_node(draw, x, y, 5 if idx in (0, len(pts) - 1) else 3, ivory if idx == len(pts) - 1 else gold)


def draw_star(draw: ImageDraw.ImageDraw, cx: int, cy: int, radius: int, points_count: int, fill, width: int = 2, step: int = 2):
    pts = polygon_points(cx, cy, radius, points_count)
    for idx in range(points_count):
        draw.line((pts[idx], pts[(idx + step) % points_count]), fill=fill, width=width)


def draw_major(draw: ImageDraw.ImageDraw, card: dict, cx: int, cy: int, gold, dim, ivory, ink):
    num = card["number"]
    draw_strategy_field(draw, cx, cy, gold, dim, ivory, card["id"], intensity=2)

    if num == 0:
        pts = []
        for i in range(170):
            r = 2.0 + i * 1.45
            theta = i * 0.18
            pts.append((cx + math.cos(theta) * r, cy + math.sin(theta) * r))
        draw_polyline(draw, pts, dim, 2)
        draw_thread_route(draw, [(cx - 210, cy + 300), (cx - 80, cy + 100), (cx + 42, cy - 40), (cx + 190, cy - 280)], gold, ivory)
    elif num == 1:
        draw.line((cx - 180, cy + 168, cx + 180, cy + 168), fill=dim, width=2)
        pts = []
        for i in range(240):
            theta = i * math.tau / 239
            scale = 175 / (3 - math.cos(2 * theta))
            pts.append((cx + scale * math.cos(theta), cy + scale * math.sin(2 * theta) / 2))
        draw_polyline(draw, pts, gold, 4, close=True)
        for angle in [0, math.pi / 2, math.pi, math.pi * 1.5]:
            draw.line((cx, cy, *point(cx, cy, 180, angle)), fill=dim, width=2)
    elif num == 2:
        for r in [62, 108, 158]:
            draw.ellipse((cx - r, cy - r, cx + r, cy + r), outline=gold if r == 108 else dim, width=3 if r == 108 else 1)
        draw_arc_path(draw, (cx - 96, cy + 118, cx + 96, cy + 290), 28, 152, gold, 4)
        draw.line((cx - 160, cy - 210, cx + 160, cy + 210), fill=dim, width=1)
    elif num == 3:
        draw_star(draw, cx, cy - 20, 145, 6, gold, 3, step=2)
        for angle in [-0.56, -0.28, 0, 0.28, 0.56]:
            end = (cx + math.sin(angle) * 220, cy + 310 - math.cos(angle) * 205)
            draw.line((cx, cy + 178, *end), fill=ivory if abs(angle) < 0.01 else dim, width=2)
            draw_arc_path(draw, (end[0] - 22, end[1] - 46, end[0] + 22, end[1] + 46), 90, 270, gold, 2)
    elif num == 4:
        draw.rectangle((cx - 170, cy - 170, cx + 170, cy + 170), outline=dim, width=2)
        draw_diamond(draw, cx, cy, 170, 170, gold, 4)
        draw.ellipse((cx - 104, cy - 104, cx + 104, cy + 104), outline=ivory, width=2)
        for offset in [-120, 120]:
            draw.line((cx + offset, cy - 210, cx + offset, cy + 210), fill=dim, width=1)
    elif num == 5:
        draw.ellipse((cx - 168, cy - 168, cx + 168, cy + 168), outline=dim, width=2)
        draw.line((cx, cy - 225, cx, cy + 225), fill=gold, width=4)
        for idx, half in enumerate([132, 104, 76]):
            y = cy - 88 + idx * 88
            draw.line((cx - half, y, cx + half, y), fill=gold, width=4)
        draw_star(draw, cx, cy, 94, 6, dim, 1, step=2)
    elif num == 6:
        draw.ellipse((cx - 170, cy - 82, cx + 10, cy + 98), outline=gold, width=3)
        draw.ellipse((cx - 10, cy - 82, cx + 170, cy + 98), outline=gold, width=3)
        draw_thread_route(draw, [(cx - 170, cy + 160), (cx - 52, cy + 8), (cx + 52, cy + 8), (cx + 170, cy - 160)], gold, ivory)
        draw_diamond(draw, cx, cy + 16, 70, 110, dim, 1)
    elif num == 7:
        for size, rot in [(190, 0), (138, math.pi / 4), (86, 0)]:
            pts = polygon_points(cx, cy, size, 4, -math.pi / 4 + rot)
            draw_polyline(draw, pts, gold if size == 138 else dim, 2, close=True)
        draw_thread_route(draw, [(cx - 190, cy + 220), (cx - 70, cy + 40), (cx + 30, cy - 60), (cx + 170, cy - 250)], gold, ivory)
        draw.polygon([(cx, cy - 270), (cx - 24, cy - 226), (cx + 24, cy - 226)], fill=gold)
    elif num == 8:
        draw.line((cx, cy - 230, cx, cy + 230), fill=dim, width=2)
        for sign in [-1, 1]:
            pts = []
            for i in range(150):
                theta = i * math.tau / 149
                pts.append((cx + sign * 80 + math.cos(theta) * 78, cy + math.sin(theta) * 60))
            draw_polyline(draw, pts, gold, 3, close=True)
        draw_arc_path(draw, (cx - 210, cy - 170, cx + 210, cy + 170), 210, 330, ivory, 3)
    elif num == 9:
        draw_diamond(draw, cx, cy, 130, 212, dim, 2)
        draw.line((cx - 92, cy - 125, cx + 92, cy - 125), fill=gold, width=4)
        draw.line((cx - 92, cy + 125, cx + 92, cy + 125), fill=gold, width=4)
        draw.line((cx - 92, cy - 125, cx + 92, cy + 125), fill=gold, width=2)
        draw.line((cx + 92, cy - 125, cx - 92, cy + 125), fill=gold, width=2)
        draw_node(draw, cx, cy, 12, ivory)
        draw_arc_path(draw, (cx - 220, cy - 320, cx + 220, cy + 320), 245, 295, dim, 2)
    elif num == 10:
        for r in [78, 132, 188]:
            draw.ellipse((cx - r, cy - r, cx + r, cy + r), outline=gold if r == 132 else dim, width=3 if r == 132 else 1)
        for i in range(12):
            angle = i * math.tau / 12
            draw.line((cx, cy, *point(cx, cy, 188, angle)), fill=gold if i % 3 == 0 else dim, width=2)
        draw_thread_route(draw, [point(cx, cy, 188, -2.4), point(cx, cy, 104, -0.8), point(cx, cy, 188, 0.95)], gold, ivory)
    elif num == 11:
        draw.line((cx, cy - 210, cx, cy + 210), fill=dim, width=3)
        draw.line((cx - 190, cy - 64, cx + 190, cy - 64), fill=gold, width=4)
        for x_offset in [-148, 148]:
            draw.line((cx + x_offset, cy - 64, cx + x_offset - 48, cy + 92), fill=dim, width=2)
            draw.line((cx + x_offset, cy - 64, cx + x_offset + 48, cy + 92), fill=dim, width=2)
            draw_arc_path(draw, (cx + x_offset - 72, cy + 74, cx + x_offset + 72, cy + 116), 0, 180, gold, 3)
        draw_diamond(draw, cx, cy + 40, 90, 146, dim, 1)
    elif num == 12:
        draw.ellipse((cx - 160, cy - 160, cx + 160, cy + 160), outline=dim, width=2)
        draw.polygon([(cx, cy + 136), (cx - 132, cy - 84), (cx + 132, cy - 84)], outline=gold)
        draw.line((cx, cy - 248, cx, cy + 248), fill=ivory, width=3)
        draw.line((cx - 84, cy - 184, cx + 84, cy - 184), fill=gold, width=3)
        draw_arc_path(draw, (cx - 220, cy - 220, cx + 220, cy + 220), 55, 125, dim, 2)
    elif num == 13:
        for r in [86, 142]:
            draw.ellipse((cx - r, cy - r, cx + r, cy + r), outline=gold if r == 142 else dim, width=3)
        lightning = [(cx - 46, cy - 230), (cx + 28, cy - 84), (cx - 36, cy + 12), (cx + 46, cy + 142), (cx - 8, cy + 250)]
        draw_polyline(draw, lightning, gold, 4)
        for i in range(14):
            a = i * math.tau / 14
            draw.line((point(cx, cy, 154, a), point(cx, cy, 214, a)), fill=dim, width=1)
    elif num == 14:
        draw.polygon([(cx, cy), (cx - 145, cy - 170), (cx + 145, cy - 170)], outline=gold)
        draw.polygon([(cx, cy), (cx - 145, cy + 170), (cx + 145, cy + 170)], outline=gold)
        draw_thread_route(draw, [(cx - 185, cy - 20), (cx - 60, cy + 64), (cx + 60, cy - 64), (cx + 185, cy + 20)], gold, ivory)
        draw_node(draw, cx, cy, 18, gold)
    elif num == 15:
        draw_star(draw, cx, cy, 162, 5, gold, 4, step=2)
        draw.ellipse((cx - 190, cy - 190, cx + 190, cy + 190), outline=dim, width=1)
        for i in range(5):
            a = i * math.tau / 5 + math.pi / 2
            draw.line((cx, cy, *point(cx, cy, 230, a)), fill=dim, width=1)
        draw_node(draw, cx, cy, 10, ivory)
    elif num == 16:
        for r in [118, 178]:
            draw.ellipse((cx - r, cy - r, cx + r, cy + r), outline=dim, width=2)
        fracture = [(cx - 32, cy - 260), (cx + 34, cy - 112), (cx - 50, cy + 5), (cx + 48, cy + 132), (cx - 16, cy + 270)]
        draw_polyline(draw, fracture, gold, 6)
        draw_polyline(draw, fracture, ivory, 2)
        for px, py in fracture[1:-1]:
            draw_diamond(draw, int(px), int(py), 30, 48, dim, 1)
    elif num == 17:
        draw_star(draw, cx, cy, 170, 8, gold, 3, step=3)
        draw_star(draw, cx, cy, 90, 8, ivory, 1, step=2)
        for i in range(8):
            px, py = point(cx, cy, 230, i * math.tau / 8)
            draw_node(draw, px, py, 5, ivory)
        draw_arc_path(draw, (cx - 230, cy - 230, cx + 230, cy + 230), 212, 328, dim, 2)
    elif num == 18:
        draw.ellipse((cx - 165, cy - 165, cx + 165, cy + 165), outline=gold, width=3)
        draw.ellipse((cx - 90, cy - 142, cx + 190, cy + 142), fill=ink)
        draw_arc_path(draw, (cx - 142, cy - 142, cx + 142, cy + 142), -92, 92, ivory, 4)
        for y in [cy + 198, cy + 224, cy + 250]:
            draw_arc_path(draw, (cx - 150, y - 22, cx + 150, y + 22), 180, 360, dim, 2)
        draw_thread_route(draw, [(cx - 160, cy + 300), (cx - 30, cy + 150), (cx + 60, cy - 10), (cx + 150, cy - 240)], gold, ivory)
    elif num == 19:
        draw_node(draw, cx, cy, 70, gold, ivory, 2)
        for i in range(20):
            a = i * math.tau / 20
            draw.line((point(cx, cy, 94, a), point(cx, cy, 204 if i % 2 == 0 else 162, a)), fill=gold if i % 2 == 0 else dim, width=3)
        draw_arc_path(draw, (cx - 230, cy - 230, cx + 230, cy + 230), 25, 155, ivory, 2)
    elif num == 20:
        draw.line((cx, cy - 230, cx, cy + 230), fill=dim, width=2)
        for r in [58, 96, 134, 172, 210]:
            draw_arc_path(draw, (cx - r, cy - r, cx + r, cy + r), 118, 242, gold, 3)
            draw_arc_path(draw, (cx - r, cy - r, cx + r, cy + r), -62, 62, gold, 3)
        draw_thread_route(draw, [(cx - 170, cy + 228), (cx, cy + 80), (cx + 170, cy - 228)], gold, ivory)
    elif num == 21:
        draw.ellipse((cx - 174, cy - 230, cx + 174, cy + 230), outline=gold, width=3)
        draw.ellipse((cx - 140, cy - 196, cx + 140, cy + 196), outline=dim, width=1)
        draw_star(draw, cx, cy, 116, 12, gold, 2, step=5)
        draw_star(draw, cx, cy, 76, 12, ivory, 1, step=4)
        for i in range(12):
            draw_node(draw, *point(cx, cy, 150, i * math.tau / 12), 4, gold if i % 2 else ivory)


def rank_positions(rank: str, cx: int, cy: int) -> list[tuple[int, int]]:
    layouts = {
        "ace": [(cx, cy)],
        "two": [(cx - 112, cy - 150), (cx + 112, cy + 150)],
        "three": [(cx, cy - 198), (cx - 156, cy + 120), (cx + 156, cy + 120)],
        "four": [(cx - 146, cy - 188), (cx + 146, cy - 188), (cx - 146, cy + 188), (cx + 146, cy + 188)],
        "five": [(cx - 150, cy - 210), (cx + 140, cy - 160), (cx, cy), (cx - 145, cy + 155), (cx + 158, cy + 210)],
        "six": [(cx - 150, cy - 220), (cx + 150, cy - 220), (cx - 150, cy), (cx + 150, cy), (cx - 150, cy + 220), (cx + 150, cy + 220)],
        "seven": [(cx - 150, cy - 230), (cx + 150, cy - 230), (cx - 174, cy - 32), (cx + 174, cy - 32), (cx - 132, cy + 190), (cx + 132, cy + 190), (cx, cy - 106)],
        "eight": [(cx - 152, cy - 260), (cx, cy - 260), (cx + 152, cy - 260), (cx - 152, cy - 40), (cx + 152, cy - 40), (cx - 152, cy + 210), (cx, cy + 210), (cx + 152, cy + 210)],
        "nine": [(cx - 168, cy - 272), (cx + 168, cy - 272), (cx - 168, cy - 112), (cx, cy - 112), (cx + 168, cy - 112), (cx - 168, cy + 84), (cx + 168, cy + 84), (cx - 168, cy + 264), (cx + 168, cy + 264)],
        "ten": [(cx - 168, cy - 290), (cx + 168, cy - 290), (cx - 168, cy - 150), (cx, cy - 150), (cx + 168, cy - 150), (cx - 168, cy + 20), (cx, cy + 20), (cx + 168, cy + 20), (cx - 168, cy + 192), (cx + 168, cy + 192)],
    }
    return layouts.get(rank, [(cx, cy)])


def draw_wand(draw, x: int, y: int, gold, dim, ivory, length: int = 132):
    draw.line((x, y - length // 2, x, y + length // 2), fill=gold, width=4)
    draw.line((x - 12, y - length // 5, x + 12, y - length // 5), fill=dim, width=1)
    draw_node(draw, x, y - length // 2, 6, ivory)
    draw_node(draw, x, y + length // 2, 4, gold)
    draw_arc_path(draw, (x - 24, y - length // 2 - 18, x + 24, y - length // 2 + 30), 210, 330, gold, 2)


def draw_cup(draw, x: int, y: int, gold, dim, ivory, size: int = 72):
    draw_arc_path(draw, (x - size // 2, y - size // 2, x + size // 2, y + size // 4), 0, 180, gold, 3)
    draw.line((x - size // 2, y - size // 8, x + size // 2, y - size // 8), fill=gold, width=2)
    draw.line((x, y + size // 8, x, y + size // 2), fill=gold, width=3)
    draw.line((x - size // 3, y + size // 2, x + size // 3, y + size // 2), fill=gold, width=3)
    draw_arc_path(draw, (x - size // 3, y - size // 2 + 10, x + size // 3, y - 2), 20, 160, ivory, 2)
    draw.line((x - size // 2, y - size // 8, x - size // 3, y + size // 5), fill=dim, width=1)
    draw.line((x + size // 2, y - size // 8, x + size // 3, y + size // 5), fill=dim, width=1)


def draw_sword(draw, x: int, y: int, gold, dim, ivory, length: int = 154):
    draw.line((x, y - length // 2, x, y + length // 2), fill=gold, width=3)
    draw.line((x - 28, y + length // 4, x + 28, y + length // 4), fill=gold, width=3)
    draw.polygon([(x, y - length // 2 - 10), (x - 9, y - length // 2 + 16), (x + 9, y - length // 2 + 16)], fill=gold)
    draw_node(draw, x, y + length // 2, 5, ivory)
    draw.line((x - 18, y - length // 3, x + 18, y - length // 5), fill=dim, width=1)


def draw_pentacle(draw, x: int, y: int, gold, dim, ivory, radius: int = 42):
    draw.ellipse((x - radius, y - radius, x + radius, y + radius), outline=gold, width=3)
    pts = polygon_points(x, y, radius - 4, 5)
    for idx in range(5):
        draw.line((pts[idx], pts[(idx + 2) % 5]), fill=gold, width=2)
        draw.line((pts[idx], pts[(idx + 3) % 5]), fill=dim, width=1)
    draw_node(draw, x, y, 3, ivory)


def draw_suit_symbol(draw, suit: str, x: int, y: int, gold, dim, ivory, scale: float = 1.0):
    if suit == "wands":
        draw_wand(draw, x, y, gold, dim, ivory, int(132 * scale))
    elif suit == "cups":
        draw_cup(draw, x, y, gold, dim, ivory, int(72 * scale))
    elif suit == "swords":
        draw_sword(draw, x, y, gold, dim, ivory, int(154 * scale))
    elif suit == "pentacles":
        draw_pentacle(draw, x, y, gold, dim, ivory, int(42 * scale))


def draw_rank_strategy(draw, suit: str, rank: str, cx: int, cy: int, gold, dim, ivory):
    if rank == "ace":
        draw.ellipse((cx - 168, cy - 168, cx + 168, cy + 168), outline=dim, width=1)
        for angle in [-1.25, -0.52, 0.0, 0.52, 1.25]:
            draw.line((cx, cy, *point(cx, cy, 250, angle - math.pi / 2)), fill=dim, width=1)
    elif rank == "two":
        draw_diamond(draw, cx, cy, 182, 300, dim, 1)
        draw.line((cx - 160, cy - 210, cx + 160, cy + 210), fill=gold, width=2)
        draw.line((cx + 160, cy - 210, cx - 160, cy + 210), fill=dim, width=1)
    elif rank == "three":
        draw_polyline(draw, [(cx, cy - 270), (cx - 230, cy + 220), (cx + 230, cy + 220)], dim, 2, close=True)
        draw_thread_route(draw, [(cx - 210, cy + 240), (cx - 60, cy + 40), (cx + 70, cy - 80), (cx + 210, cy - 240)], gold, ivory, 2)
    elif rank == "four":
        draw.rectangle((cx - 230, cy - 310, cx + 230, cy + 310), outline=dim, width=2)
        draw.line((cx - 230, cy, cx + 230, cy), fill=dim, width=1)
        draw.line((cx, cy - 310, cx, cy + 310), fill=dim, width=1)
    elif rank == "five":
        draw_polyline(draw, [(cx - 220, cy - 230), (cx + 190, cy - 120), (cx - 80, cy + 20), (cx + 210, cy + 180), (cx - 190, cy + 260)], gold, 3)
        for offset in [-150, 0, 150]:
            draw.line((cx - 240, cy + offset, cx + 240, cy - offset), fill=dim, width=1)
    elif rank == "six":
        draw.line((cx - 236, cy - 250, cx + 236, cy + 250), fill=dim, width=1)
        draw.line((cx + 236, cy - 250, cx - 236, cy + 250), fill=dim, width=1)
        draw_arc_path(draw, (cx - 260, cy - 330, cx + 260, cy + 330), 35, 145, gold, 2)
        draw_arc_path(draw, (cx - 260, cy - 330, cx + 260, cy + 330), 215, 325, gold, 2)
    elif rank == "seven":
        draw_diamond(draw, cx, cy, 230, 342, dim, 2)
        draw_polyline(draw, [(cx - 190, cy + 280), (cx - 30, cy + 80), (cx - 80, cy - 60), (cx + 190, cy - 270)], gold, 3)
        for x in [-168, 168]:
            draw.line((cx + x, cy - 260, cx + x, cy + 260), fill=dim, width=1)
    elif rank == "eight":
        for x in [cx - 180, cx, cx + 180]:
            draw.line((x, cy - 320, x, cy + 280), fill=dim, width=1)
        for y in [cy - 250, cy - 70, cy + 110, cy + 290]:
            draw.line((cx - 240, y, cx + 240, y), fill=dim, width=1)
        draw_thread_route(draw, [(cx - 215, cy - 300), (cx - 78, cy - 90), (cx + 76, cy + 88), (cx + 215, cy + 288)], gold, ivory, 2)
    elif rank == "nine":
        draw.ellipse((cx - 245, cy - 360, cx + 245, cy + 360), outline=gold, width=2)
        draw.ellipse((cx - 190, cy - 296, cx + 190, cy + 296), outline=dim, width=1)
        draw_arc_path(draw, (cx - 230, cy - 340, cx + 230, cy + 340), 230, 310, ivory, 2)
    elif rank == "ten":
        for r in [95, 165, 238]:
            draw.ellipse((cx - r, cy - r, cx + r, cy + r), outline=gold if r == 165 else dim, width=2)
        for i in range(10):
            a = -math.pi / 2 + i * math.tau / 10
            draw.line((point(cx, cy, 95, a), point(cx, cy, 238, a)), fill=dim, width=1)
    else:
        draw_court_strategy(draw, suit, rank, cx, cy, gold, dim, ivory)


def draw_court_strategy(draw, suit: str, rank: str, cx: int, cy: int, gold, dim, ivory):
    draw.ellipse((cx - 240, cy - 355, cx + 240, cy + 355), outline=dim, width=1)
    if rank == "page":
        draw.ellipse((cx - 172, cy - 276, cx + 172, cy + 276), outline=gold, width=2)
        draw_thread_route(draw, [(cx - 60, cy + 210), (cx, cy + 40), (cx + 60, cy - 210)], gold, ivory, 2)
    elif rank == "knight":
        draw.line((cx - 220, cy + 300, cx + 220, cy - 300), fill=gold, width=3)
        draw.line((cx - 220, cy - 300, cx + 220, cy + 300), fill=dim, width=1)
        draw.polygon([(cx + 226, cy - 306), (cx + 178, cy - 284), (cx + 214, cy - 246)], fill=gold)
    elif rank == "queen":
        draw.polygon([(cx, cy - 330), (cx + 176, cy - 118), (cx + 116, cy + 270), (cx - 116, cy + 270), (cx - 176, cy - 118)], outline=gold)
        draw.ellipse((cx - 116, cy - 166, cx + 116, cy + 130), outline=dim, width=1)
    elif rank == "king":
        draw_diamond(draw, cx, cy, 194, 330, gold, 3)
        draw_diamond(draw, cx, cy, 158, 282, dim, 1)
        for i in range(4):
            a = -math.pi / 2 + i * math.tau / 4
            draw.line((cx, cy, *point(cx, cy, 236, a)), fill=dim, width=1)


def draw_minor(draw: ImageDraw.ImageDraw, card: dict, cx: int, cy: int, gold, dim, ivory):
    suit = card["suit"]
    rank = card["rank"]
    draw_strategy_field(draw, cx, cy, gold, dim, ivory, card["id"], intensity=1)
    draw_rank_strategy(draw, suit, rank, cx, cy, gold, dim, ivory)

    if rank in {"page", "knight", "queen", "king"}:
        court_counts = {"page": 1, "knight": 2, "queen": 3, "king": 4}
        positions = rank_positions(["ace", "two", "three", "four"][court_counts[rank] - 1], cx, cy)
        scale = 1.45 if rank == "page" else 1.18
    else:
        positions = rank_positions(rank, cx, cy)
        scale = 1.0

    for idx, (x, y) in enumerate(positions):
        draw_suit_symbol(draw, suit, x, y, gold, dim, ivory, scale=scale)
        if idx > 0 and rank not in {"ace", "page"}:
            px, py = positions[idx - 1]
            draw.line((px, py, x, y), fill=dim, width=1)

    if suit == "wands":
        for angle in [-0.38, 0.0, 0.38]:
            draw.line((cx, cy + 360, cx + math.sin(angle) * 210, cy + 108), fill=dim, width=1)
    elif suit == "cups":
        for offset in [240, 280, 320]:
            draw_arc_path(draw, (cx - 210, cy + offset - 28, cx + 210, cy + offset + 28), 180, 360, dim, 2)
    elif suit == "swords":
        for angle in [-0.8, 0.8]:
            draw.line((cx + math.cos(angle) * 240, cy - 330, cx - math.cos(angle) * 240, cy + 330), fill=dim, width=1)
    elif suit == "pentacles":
        for i in range(6):
            draw_node(draw, *point(cx, cy + 8, 270, i * math.tau / 6), 3, gold if i % 2 else ivory)


def generate_card_artwork(card: dict, spec: dict) -> Image.Image:
    area = spec["artworkArea"]
    width, height = area["width"], area["height"]
    colors = spec["colors"]
    img = Image.new("RGB", (width, height), hex_to_rgb(colors["background"]))
    img = add_background(img, card["id"], colors)
    draw = ImageDraw.Draw(img)

    gold = hex_to_rgb(colors["gold"])
    dim = hex_to_rgb(colors["goldDim"])
    ivory = hex_to_rgb(colors["ivory"])
    ink = hex_to_rgb(colors["ink"])
    cx, cy = width // 2, height // 2

    if card["arcana"] == "major":
        draw_major(draw, card, cx, cy, gold, dim, ivory, ink)
    else:
        draw_minor(draw, card, cx, cy, gold, dim, ivory)

    # Final foil glints: small, deterministic, and kept away from the edges.
    rng = random.Random(f"glint-{card['id']}")
    for _ in range(18):
        x = rng.randint(92, width - 92)
        y = rng.randint(118, height - 118)
        if rng.random() < 0.6:
            draw_node(draw, x, y, rng.choice([2, 3]), ivory)
        else:
            draw.line((x - 8, y, x + 8, y), fill=gold, width=1)
            draw.line((x, y - 8, x, y + 8), fill=gold, width=1)

    return img.filter(ImageFilter.SMOOTH)


def main():
    spec = read_json(ROOT / "assets" / "tarot" / "golden-thread" / "card-spec.json")
    cards = read_json(ROOT / "packages" / "content" / "data" / "tarot-cards.json")
    artwork_dir = ROOT / spec["output"]["artworkDir"]
    artwork_dir.mkdir(parents=True, exist_ok=True)

    print(f"Generating 78 premium inner artwork files for Golden Thread in: {artwork_dir.relative_to(ROOT)}")
    for card in cards:
        img = generate_card_artwork(card, spec)
        out_path = artwork_dir / f"{card['id']}.png"
        img.save(out_path)
        print(f"- Generated: {out_path.name}")

    print("Golden Thread premium artwork generation complete.")


if __name__ == "__main__":
    main()

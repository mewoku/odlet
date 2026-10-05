"""ODLET pattern kit: text-free, character-free "starfield" banners and seamless textures.

Game elements (mini rune cubes, Ice Dash gems, HP hearts, Bolt runes, spark diamonds, sparkles) are
scattered like stars in three depth layers: far = dim specks, mid = small glyphs, near = bright cubes.
Drawn at native pixel resolution with the make_art.py palette, upscaled nearest-neighbour.

    python marketing/brand/make_patterns.py

Outputs: marketing/brand/out/patterns/
"""
from __future__ import annotations

import math
import random
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "store" / "tools"))

from PIL import Image  # noqa: E402

import make_art as A  # noqa: E402
from make_art import (  # noqa: E402
    BG, GOLD, OUTLINE, PINK, PINK_DK, TEAL, TEAL_DEEP, TEAL_DK, TEAL_HI, VIOLET, WHITE, dither_glow,
    hexc, lerp, up,
)

OUT = ROOT / "marketing" / "brand" / "out" / "patterns"

# 2-tone glyphs: X = main, h = highlight, d = shade
GEM = ["..h..", ".hXX.", "hXXXd", ".XXd.", "..d.."]
HEART = [".h.X.", "hXXXX", "XXXXX", ".XXd.", "..d.."]
BOLT = ["..X", ".X.", "XXX", ".X.", "X.."]
DIAMOND = [".X.", "XXX", ".X."]
PLUS = [".X.", "XhX", ".X."]
ACCENTS = (TEAL, PINK, GOLD)
CUBES = ((GOLD, TEAL, PINK), (GOLD, TEAL, PINK), (TEAL, TEAL_DK, TEAL_DEEP), (PINK, PINK_DK, VIOLET))

COLORWAYS = {
    "night": BG,
    "deep": hexc("08191E"),
    "violet": hexc("120A22"),
}


def glyph_sprite(rows: list[str], color, bg, dim: float) -> Image.Image:
    main = lerp(color, bg, dim)
    pal = {"X": main, "h": lerp(lerp(color, WHITE, 0.45), bg, dim), "d": lerp(lerp(color, OUTLINE, 0.35), bg, dim)}
    im = Image.new("RGBA", (len(rows[0]), len(rows)), (0, 0, 0, 0))
    px = im.load()
    for y, row in enumerate(rows):
        for x, ch in enumerate(row):
            if ch in pal:
                px[x, y] = pal[ch]
    return im


def cube_sprite(a: int, colors, bg, dim: float) -> Image.Image:
    im = Image.new("RGBA", (2 * a + 4, 2 * a + 4), (0, 0, 0, 0))
    A.iso_cube(im, a + 2, 1, a, a, rune=False, colors=colors)
    if dim:
        px = im.load()
        for y in range(im.height):
            for x in range(im.width):
                if px[x, y][3]:
                    px[x, y] = lerp(px[x, y], bg, dim)
    return im


def stamp(img: Image.Image, spr: Image.Image, x: int, y: int, wrap: bool) -> None:
    offs = [(0, 0)]
    if wrap:
        offs = [(dx, dy) for dx in (-img.width, 0, img.width) for dy in (-img.height, 0, img.height)]
    for dx, dy in offs:
        img.paste(spr, (x + dx, y + dy), spr)


def starfield(w: int, h: int, bg, seed: int, wrap: bool = False, glow: bool = False, density: float = 1.0) -> Image.Image:
    rnd = random.Random(seed)
    img = Image.new("RGBA", (w, h), bg)
    if glow and not wrap:
        r = max(w, h)
        dither_glow(img, w * 0.15, h * 0.2, r * 0.5, lerp(TEAL_DEEP, bg, 0.3), strength=0.35, steps=3)
        dither_glow(img, w * 0.85, h * 0.85, r * 0.55, lerp(VIOLET, bg, 0.2), strength=0.5, steps=3)
    placed: list[tuple[float, float, float]] = []

    def free(cx: float, cy: float, rad: float) -> bool:
        for (px_, py_, pr) in placed:
            dx, dy = abs(cx - px_), abs(cy - py_)
            if wrap:
                dx, dy = min(dx, w - dx), min(dy, h - dy)
            if math.hypot(dx, dy) < rad + pr:
                return False
        return True

    def layer(cell: int, keep: float, make) -> None:
        cell = max(4, round(cell / math.sqrt(density)))
        for gy in range(0, h, cell):
            for gx in range(0, w, cell):
                if rnd.random() > keep:
                    continue
                spr, pad = make()
                x = gx + rnd.randrange(max(1, cell - spr.width))
                y = gy + rnd.randrange(max(1, cell - spr.height))
                cx, cy = x + spr.width / 2, y + spr.height / 2
                rad = max(spr.width, spr.height) / 2 + pad
                if not wrap and (x < 1 or y < 1 or x + spr.width > w - 1 or y + spr.height > h - 1):
                    continue
                if free(cx, cy, rad):
                    placed.append((cx, cy, rad))
                    stamp(img, spr, x, y, wrap)

    # near: bright rune cubes (few, largest)
    layer(64, 0.6, lambda: (cube_sprite(rnd.choice((4, 5, 5)), rnd.choice(CUBES), bg, 0.0), 6))
    # mid: gems, hearts, bolt runes
    layer(30, 0.6, lambda: (glyph_sprite(rnd.choice((GEM, GEM, HEART, BOLT)), rnd.choice(ACCENTS), bg,
                                         rnd.choice((0.0, 0.15, 0.3))), 4))
    # far-mid: tiny dim cubes, diamonds, sparkles
    layer(26, 0.4, lambda: (cube_sprite(3, rnd.choice(CUBES), bg, 0.55) if rnd.random() < 0.35 else
                            glyph_sprite(rnd.choice((DIAMOND, PLUS)), rnd.choice(ACCENTS), bg, rnd.choice((0.35, 0.55))), 3))
    # far: single-pixel specks
    specks = Image.new("RGBA", (1, 1))
    for _ in range(int(w * h / 170 * density)):
        c = lerp(rnd.choice(ACCENTS + (WHITE,)), bg, rnd.choice((0.55, 0.7, 0.8)))
        specks.putpixel((0, 0), c)
        x, y = rnd.randrange(w), rnd.randrange(h)
        if free(x, y, 1.5):
            stamp(img, specks, x, y, wrap)
    return img


def save(img: Image.Image, name: str) -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    img.convert("RGB").save(OUT / name, optimize=True)
    print(f"patterns/{name}  {img.width}x{img.height}")


if __name__ == "__main__":
    night = COLORWAYS["night"]
    # banners (no text, no character)
    save(up(starfield(300, 100, night, 11), 5), "x-header-1500x500.png")
    save(up(starfield(396, 99, night, 12), 4), "linkedin-1584x396.png")
    save(up(starfield(240, 126, night, 13), 5), "og-1200x630.png")
    save(up(starfield(240, 135, night, 14), 4), "discord-960x540.png")
    save(up(starfield(384, 216, night, 15), 5), "wide-1920x1080.png")
    save(up(starfield(512, 288, night, 16), 5), "youtube-2560x1440.png")
    save(up(starfield(270, 270, night, 17), 4), "square-1080x1080.png")
    # wallpapers
    save(up(starfield(270, 600, night, 18), 4), "wallpaper-phone-1080x2400.png")
    save(up(starfield(270, 600, COLORWAYS["violet"], 19), 4), "wallpaper-phone-violet-1080x2400.png")
    save(up(starfield(512, 288, COLORWAYS["deep"], 20), 5), "wallpaper-desktop-deep-2560x1440.png")
    # seamless textures (tile edge to edge; no glow so the repeat is invisible)
    for i, (name, bg) in enumerate(COLORWAYS.items()):
        tile = starfield(128, 128, bg, 30 + i, wrap=True, glow=False)
        save(up(tile, 4), f"tile-seamless-{name}-512.png")
        save(up(tile, 2), f"tile-seamless-{name}-256.png")
    print("patterns ->", OUT)

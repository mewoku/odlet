"""ODLET social / brand kit generator: avatars, banners, static ads and video ads.

Reuses the pixel-art primitives from store/tools/make_art.py (same palette, cube, hero, wordmark),
so everything is drawn at native pixel resolution and upscaled nearest-neighbour. Ads use real
in-game screenshots (docs/evidence) and real gameplay clips (marketing/video/public/clips).

    python marketing/brand/make_social.py            # images + video ads
    python marketing/brand/make_social.py --no-video # images only

Outputs: marketing/brand/out/{avatars,banners,ads,video}/
Requires Python 3.10+, Pillow, and ffmpeg on PATH for the video ads.
"""
from __future__ import annotations

import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "store" / "tools"))

from PIL import Image, ImageDraw  # noqa: E402

import make_art as A  # noqa: E402
from make_art import (  # noqa: E402
    BG, GOLD, GOLD_DK, MUTED, OUTLINE, PINK, PINK_DK, SILK, SILK_BOLD, TEAL, TEAL_DEEP, TEAL_DK,
    TEAL_HI, VIOLET, WHITE, checker_floor, dither_glow, hexc, lerp, pixel_text, small_cube, sparkle, up,
)

OUT = ROOT / "marketing" / "brand" / "out"
EVIDENCE = ROOT / "docs" / "evidence"
CLIPS = ROOT / "marketing" / "video" / "public" / "clips"
GOLD_DEEP = hexc("7A4E08")

BATTLE = EVIDENCE / "arcade-2-battle-hit.png"
RUNES = EVIDENCE / "arcade-5-rune-scoring.png"


def save(img: Image.Image, rel: str) -> None:
    path = OUT / rel
    path.parent.mkdir(parents=True, exist_ok=True)
    img.convert("RGB").save(path, optimize=True)
    print(f"{rel}  {img.width}x{img.height}")


def backdrop(w: int, h: int, floor: float | None = 0.8) -> Image.Image:
    img = Image.new("RGBA", (w, h), BG)
    r = max(w, h)
    dither_glow(img, w * 0.2, h * 0.3, r * 0.55, TEAL_DEEP, strength=0.6, steps=4)
    dither_glow(img, w * 0.8, h * 0.75, r * 0.6, VIOLET, strength=0.9, steps=4)
    if floor is not None:
        checker_floor(img, int(h * floor), PINK_DK, 0.2, 0.9)
    return img


def stage(img: Image.Image, cx: int, floor_y: int, a: int) -> None:
    """Hero on the rune cube with the floating mini cubes and sparkles of the store art."""
    s = a / 20
    A.hero_stage(img, cx, floor_y, a)
    small_cube(img, cx - round(34 * s), floor_y - round(12 * s), max(3, round(5 * s)), (TEAL, TEAL_DK, TEAL_DEEP))
    small_cube(img, cx + round(32 * s), floor_y - round(18 * s), max(3, round(6 * s)), (PINK, PINK_DK, VIOLET))
    small_cube(img, cx + round(22 * s), floor_y - round(58 * s), max(2, round(3 * s)), (GOLD, GOLD_DK, GOLD_DEEP))
    for dx, dy, c in ((-26, -52, GOLD), (30, -40, TEAL_HI), (-30, -34, PINK)):
        sparkle(img, cx + round(dx * s), floor_y + round(dy * s), c)


def wordmark_width(size: int) -> int:
    k = max(1, round(size / 8))
    return sum((len(A.WORDMARK_GLYPHS[ch][0]) + 2) * k for ch in A.WORDMARK) - 2 * k


# ---------------------------------------------------------------------------------------------
# avatars + logos
# ---------------------------------------------------------------------------------------------

def build_avatars() -> None:
    # 40-cell grid with the 32-cell icon motif centred: extra margin survives circle crops (X, Discord, Telegram).
    g = A.icon_background(40)
    g.alpha_composite(A.icon_motif(32), (4, 4))
    save(up(g, 25), "avatars/avatar-1000.png")      # Colosseum, Discord, Telegram, GitHub, YouTube
    save(up(g, 10), "avatars/avatar-400.png")       # X / Twitter
    save(A.round_mask(up(g, 10)), "avatars/avatar-400-circle-preview.png")
    # full-bleed app icon (square crops: Colosseum project logo, stores, favicon)
    square = A.composite(A.icon_background(32), A.icon_motif(32))
    save(up(square, 32), "avatars/icon-square-1024.png")

    mark = A.icon_motif(32)
    up(mark, 16).save(OUT / "avatars" / "logo-mark-transparent-512.png", optimize=True)
    print("avatars/logo-mark-transparent-512.png  512x512")

    w = wordmark_width(16) + 4
    wm = Image.new("RGBA", (w, 22), (0, 0, 0, 0))
    A.wordmark(wm, w // 2, 1, 16)
    up(wm, 8).save(OUT / "avatars" / "logo-wordmark-transparent.png", optimize=True)
    print(f"avatars/logo-wordmark-transparent.png  {w * 8}x{22 * 8}")


# ---------------------------------------------------------------------------------------------
# banners
# ---------------------------------------------------------------------------------------------

def banner(w: int, h: int, scale: int, text_cx: int, text_y: int, wm_size: int, stage_cx: int, floor_y: int,
           a: int, tag: str = "SOLVE TO STRIKE", sub: str = "PIXEL PUZZLE ARCADE", url: bool = True,
           floor: float | None = 0.8) -> Image.Image:
    img = backdrop(w, h, floor)
    bottom = A.wordmark(img, text_cx, text_y, wm_size)
    pixel_text(img, (text_cx, bottom + 6), tag, SILK, 8, GOLD, shadow=OUTLINE, anchor="mt")
    pixel_text(img, (text_cx, bottom + 18), sub, SILK, 8, MUTED, anchor="mt")
    if url:
        pixel_text(img, (text_cx, bottom + 30), "ODLET.XYZ", SILK, 8, TEAL_HI, anchor="mt")
    stage(img, stage_cx, floor_y, a)
    return up(img, scale)


def build_banners() -> None:
    # X header 1500x500 (native 300x100). The avatar covers the bottom-left, phones crop top/bottom a little.
    save(banner(300, 100, 5, 150, 14, 24, 250, 84, 18, url=False), "banners/x-header-1500x500.png")
    # LinkedIn personal 1584x396 (native 396x99)
    save(banner(396, 99, 4, 210, 14, 24, 320, 84, 18, url=False), "banners/linkedin-1584x396.png")
    # Open Graph / link preview / Colosseum cover 1200x630 (native 240x126)
    save(banner(240, 126, 5, 86, 20, 16, 186, 102, 18), "banners/og-1200x630.png")
    # Discord server banner 960x540 (native 240x135)
    save(banner(240, 135, 4, 86, 24, 16, 186, 110, 18), "banners/discord-960x540.png")
    # Telegram / generic 16:9 1920x1080 (native 384x216)
    save(banner(384, 216, 5, 140, 60, 24, 290, 172, 26), "banners/wide-1920x1080.png")
    # YouTube channel art 2560x1440 (native 512x288); everything inside the 1546x423 safe area (native 309x85, y 101..186)
    save(banner(512, 288, 5, 206, 102, 24, 334, 184, 20, url=False, floor=0.66), "banners/youtube-2560x1440.png")


# ---------------------------------------------------------------------------------------------
# ads (static)
# ---------------------------------------------------------------------------------------------

def ad_backdrop(w: int, h: int, accent) -> Image.Image:
    img = Image.new("RGBA", (w, h), BG)
    dither_glow(img, w * 0.5, h * 0.05, max(w, h) * 0.8, lerp(accent, BG, 0.55), strength=0.6, steps=3, ry=h * 0.4)
    dither_glow(img, w * 0.5, h * 0.95, max(w, h) * 0.8, VIOLET, strength=0.8, steps=3, ry=h * 0.45)
    return img


def frame(canvas: Image.Image, x: int, y: int, sw: int, sh: int, accent, b: int = 8) -> None:
    """The store screenshots' pixel frame: accent border, notched corners, hard shadow."""
    d = ImageDraw.Draw(canvas)
    d.rectangle((x - b + 12, y - b + 12, x + sw + b + 12, y + sh + b + 12), fill=OUTLINE)
    d.rectangle((x - b, y - b, x + sw + b - 1, y + sh + b - 1), fill=accent)
    for cx, cy in ((x - b, y - b), (x + sw, y - b), (x - b, y + sh), (x + sw, y + sh)):
        d.rectangle((cx, cy, cx + b - 1, cy + b - 1), fill=canvas.getpixel((max(0, cx - 1), cy)))


def place_shot(canvas: Image.Image, src: Path, x: int, y: int, h: int, accent) -> tuple[int, int, int, int]:
    shot = Image.open(src).convert("RGBA")
    w = round(shot.width * h / shot.height)
    frame(canvas, x, y, w, h, accent)
    canvas.alpha_composite(shot.resize((w, h), Image.LANCZOS), (x, y))
    return x, y, w, h


def cta(img: Image.Image, cx: int, y: int, text: str = "PLAY FREE  ODLET.XYZ") -> None:
    d = ImageDraw.Draw(img)
    bbox = pixel_text(Image.new("RGBA", (1, 1)), (0, 0), text, SILK_BOLD, 8, WHITE)
    tw = bbox[2] - bbox[0]
    x0, x1 = cx - tw // 2 - 6, cx + tw // 2 + 6
    d.rectangle((x0 + 1, y + 1, x1 + 1, y + 14), fill=OUTLINE)
    d.rectangle((x0, y, x1, y + 13), fill=TEAL)
    pixel_text(img, (cx, y + 3), text, SILK_BOLD, 8, BG, anchor="mt")


def text_block(img: Image.Image, cx: int, y: int, head: list[str], sub: list[str], accent, head_size: int = 16,
               anchor: str = "mt") -> int:
    for line in head:
        pixel_text(img, (cx, y), line, SILK_BOLD, head_size, accent, shadow=OUTLINE, anchor=anchor)
        y += head_size + 4
    y += 4
    for line in sub:
        pixel_text(img, (cx, y), line, SILK, 8, WHITE, anchor=anchor)
        y += 12
    return y


def ad_square(shot_rects: list | None = None) -> tuple[Image.Image, list]:
    """1080x1080: copy left, two phones right. Returns canvas and the phone rects (for video)."""
    s, n = 4, 270
    bg = ad_backdrop(n, n, PINK)
    A.wordmark(bg, 62, 34, 16)
    y = text_block(bg, 62, 72, ["SOLVE", "TO", "STRIKE"], ["Beat monsters", "with fast puzzles."], PINK)
    cta(bg, 62, y + 14, "PLAY FREE")
    pixel_text(bg, (62, y + 36), "ODLET.XYZ", SILK, 8, TEAL_HI, anchor="mt")
    canvas = up(bg, s)
    rects = [place_shot(canvas, BATTLE, 560, 100, 860, PINK)]
    return canvas, rects


def ad_portrait() -> Image.Image:
    """1080x1350 feed: headline top, Battle + Rune Hand phones below."""
    s, w, h = 4, 270, 338
    bg = ad_backdrop(w, h, GOLD)
    A.wordmark(bg, w // 2, 14, 16)
    y = text_block(bg, w // 2, 44, ["SOLVE TO STRIKE"], ["Every right answer is an attack."], GOLD)
    cta(bg, w // 2, h - 26)
    canvas = up(bg, s).crop((0, 0, 1080, 1350))
    ph = 830
    pw = round(1080 * ph / 2400)
    gap = 56
    x0 = (1080 - (2 * pw + gap)) // 2
    place_shot(canvas, BATTLE, x0, y * s + 30, ph, PINK)
    place_shot(canvas, RUNES, x0 + pw + gap, y * s + 30, ph, GOLD)
    return canvas


def ad_story() -> tuple[Image.Image, list]:
    """1080x1920 story / reel / TikTok: UI-safe top and bottom 250px kept clear of copy."""
    s, w, h = 4, 270, 480
    bg = ad_backdrop(w, h, TEAL)
    A.wordmark(bg, w // 2, 66, 24)
    y = text_block(bg, w // 2, 104, ["SOLVE TO STRIKE"], ["Fast puzzles. Big combos."], TEAL_HI)
    ph = 880
    pw = round(1080 * ph / 2400)
    top = y * s + 40
    cta(bg, w // 2, (top + ph) // s + 12)   # stays above the 250px bottom UI zone
    canvas = up(bg, s)
    rects = [place_shot(canvas, BATTLE, (1080 - pw) // 2, top, ph, TEAL)]
    return canvas, rects


def ad_landscape() -> Image.Image:
    """1200x628 X card / Facebook link ad: copy left, Battle + Rune Hand right."""
    s, w, h = 4, 300, 157
    bg = ad_backdrop(w, h, PINK)
    A.wordmark(bg, 72, 22, 16)
    y = text_block(bg, 72, 52, ["SOLVE TO", "STRIKE"], ["Beat monsters", "with fast puzzles."], PINK)
    cta(bg, 72, y + 8, "PLAY FREE")
    canvas = up(bg, s)
    ph = 500
    pw = round(1080 * ph / 2400)
    x = 1200 - 2 * pw - 36 - 70
    for i, (src, acc) in enumerate(((BATTLE, PINK), (RUNES, GOLD))):
        place_shot(canvas, src, x + i * (pw + 36), 56, ph, acc)
    return canvas


def build_ads() -> dict:
    sq, sq_rects = ad_square()
    save(sq, "ads/ad-square-1080x1080.png")
    save(ad_portrait(), "ads/ad-portrait-1080x1350.png")
    st, st_rects = ad_story()
    save(st, "ads/ad-story-1080x1920.png")
    save(ad_landscape(), "ads/ad-landscape-1200x628.png")
    return {"square": (sq, sq_rects), "story": (st, st_rects)}


# ---------------------------------------------------------------------------------------------
# video ads: the static layout with a real gameplay clip playing inside the phone frame
# ---------------------------------------------------------------------------------------------

def build_video(layouts: dict) -> None:
    ffmpeg = shutil.which("ffmpeg")
    if not ffmpeg:
        print("skip video ads (ffmpeg not on PATH)")
        return
    (OUT / "video").mkdir(parents=True, exist_ok=True)
    for name, (canvas, rects) in layouts.items():
        x, y, w, h = rects[0]
        bg_path = OUT / "video" / f"_{name}-bg.png"
        canvas.convert("RGB").save(bg_path)
        out = OUT / "video" / f"ad-{name}-battle.mp4"
        subprocess.run([
            ffmpeg, "-v", "error", "-y", "-loop", "1", "-i", str(bg_path), "-i", str(CLIPS / "battle.mp4"),
            "-filter_complex", f"[1:v]scale={w}:{h}:flags=lanczos[c];[0:v][c]overlay={x}:{y}:shortest=1,format=yuv420p",
            "-an", "-r", "30", "-c:v", "libx264", "-crf", "20", "-preset", "slow", "-movflags", "+faststart", str(out),
        ], check=True)
        bg_path.unlink()
        print(f"video/{out.name}  {canvas.width}x{canvas.height}")


if __name__ == "__main__":
    build_avatars()
    build_banners()
    layouts = build_ads()
    if "--no-video" not in sys.argv:
        build_video(layouts)
    print("brand kit ->", OUT)

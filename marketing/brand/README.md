# ODLET brand kit

Regenerate: `python marketing/brand/make_social.py` (Pillow; ffmpeg for the video ads). Art comes from
`store/tools/make_art.py` (same palette, cube, hero and wordmark); ads use real screenshots and gameplay clips.

| File (`out/`) | Size | Use |
|---|---|---|
| `avatars/avatar-400.png` | 400×400 | X / Twitter profile photo |
| `avatars/avatar-1000.png` | 1000×1000 | Colosseum, Discord, Telegram, GitHub, YouTube, LinkedIn |
| `avatars/icon-square-1024.png` | 1024×1024 | Square logo slots (full-bleed app icon) |
| `avatars/logo-mark-transparent-512.png` | 512×512 | Cube + hero on transparent, for overlays |
| `avatars/logo-wordmark-transparent.png` | 672×176 | ODLET wordmark on transparent |
| `banners/x-header-1500x500.png` | 1500×500 | X / Twitter header (bottom-left kept clear for the avatar) |
| `banners/linkedin-1584x396.png` | 1584×396 | LinkedIn banner |
| `banners/og-1200x630.png` | 1200×630 | Link previews, Colosseum project cover, website `og:image` |
| `banners/discord-960x540.png` | 960×540 | Discord server banner |
| `banners/wide-1920x1080.png` | 1920×1080 | Telegram channel, stream screens, slides |
| `banners/youtube-2560x1440.png` | 2560×1440 | YouTube channel art (content inside the 1546×423 safe area) |
| `ads/ad-square-1080x1080.png` | 1080×1080 | X / Instagram / Facebook feed |
| `ads/ad-portrait-1080x1350.png` | 1080×1350 | Instagram / Facebook feed (4:5) |
| `ads/ad-story-1080x1920.png` | 1080×1920 | Stories, Reels, TikTok, Shorts (top/bottom 250 px clear) |
| `ads/ad-landscape-1200x628.png` | 1200×628 | X website card, Facebook link ad |
| `video/ad-square-battle.mp4` | 1080×1080, 11 s | Feed video ad, real Battle footage |
| `video/ad-story-battle.mp4` | 1080×1920, 11 s | Story / Reels / TikTok video ad |

## Patterns (`python marketing/brand/make_patterns.py` → `out/patterns/`)

Text-free, character-free starfield of game elements (rune cubes, gems, hearts, Bolt runes, sparks).

| File | Size | Use |
|---|---|---|
| `x-header-1500x500.png` | 1500×500 | Minimal X / Twitter header |
| `linkedin-1584x396.png`, `discord-960x540.png`, `youtube-2560x1440.png` | — | Minimal banners |
| `og-1200x630.png`, `wide-1920x1080.png`, `square-1080x1080.png` | — | Backgrounds for posts, slides, streams |
| `wallpaper-phone-*.png`, `wallpaper-desktop-deep-2560x1440.png` | — | Wallpapers |
| `tile-seamless-{night,deep,violet}-{256,512}.png` | 256 / 512 | Seamless textures: repeat as CSS `background`, merch, packaging |

Longer edits (30 s trailer, 15 s TikTok, 6 s bumper) live in `marketing/video/out/`.

# Marketing (promo images and videos)

Cloud sessions run `scripts/cloud-setup.sh` on start (deps, Remotion browser, Pillow, ffmpeg).

- Videos: `marketing/video` (Remotion, npm). Plan in `docs/pitch/04-video-ads.md`.
  `npm run render:tiktok|render:trailer|render:bumper|render:pitch`, or
  `npx remotion still <Comp> out/x.png --frame=N` to check a frame before a full render.
  `scripts/prepare.mjs` copies stills (`docs/evidence`), music (`assets/audio`) and fonts into `public/`.
  Gameplay clips are `public/clips/*.mp4`; new footage needs the Unity Footage test, which only runs on the local PC.
- Static kit: `python marketing/brand/make_social.py` and `make_patterns.py` write `marketing/brand/out/`.
- Brand rules: `brand.md` at the repo root.
- Delivering from the cloud: `out/` is gitignored, so copy finished files into
  `marketing/deliverables/<YYYY-MM-DD>-<name>/` and commit them on the session branch. Keep each file under ~25 MB.
- The repo is public: no private pitch text, keys or unreleased partner names in committed files.

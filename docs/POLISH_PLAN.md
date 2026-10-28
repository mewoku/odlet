# ODLET — polish plan (odlet.io, 2026-10-28)

Branch `odlet-polish` = `site-playtest-feedback` (web work) merged with `origin/main` (CHECKMATE cards, combo bar). Companion to `STRATEGY.md` and `STRATEGY_BENCHMARK.md`.

## Verified today

| Check | Result |
|---|---|
| odlet.io live | 200, `og:url` already `https://odlet.io`; odlet.xyz also 200 and must stay (shipped apps use it as API base and wallet-link domain) |
| `/play` first load (8-core desktop, fast network) | Web-native world map shows at ~0.9 s DCL, Unity ready at ~3 s |
| Build served | Oct 2 build. No CHECKMATE cards, combo bar or banner fixes; those are only in source |
| Wasm delivery | 8.9 MB gzip `.unityweb`, no `Content-Encoding`, so Unity decompresses in JS (`decompressionFallback = true`). Costs CPU and memory on weak devices |
| Caching | `?v=<hash>` URLs are `immutable` (gateway nginx); repeat visits are fine |
| Desktop layout | Game renders as a ~300 px phone column in a 1280 px page; lots of empty space |
| Pixel 6a | `adb devices` (`D:\AS_SDK\platform-tools`) lists no device |
| Disk | C: 4.4 GB free, D: 13 GB free. Unity project is on C:. A WebGL IL2CPP build needs several GB of temp: not started |
| Parallel work | A teammate session pushed `0b823ab` (CHECKMATE) on the Unity branch about 35 min before this check. Unity files can collide |

## Backlog, in order

1. **Ship the current game to odlet.io.** Rebuild WebGL from this branch and deploy. Blocked on disk (above).
2. **Faster, lighter load.** Switch WebGL to Brotli and serve `.br` with a real `Content-Encoding` header in `deploy/prod/gateway/nginx.conf` and `next.config.ts`, drop the JS decompression fallback. Expect about 25 % smaller wasm. Must be tested with a real build before deploy.
3. **Instant open.** Web-native map already paints before wasm. Make the first Daily playable in the TS core before Unity finishes loading.
4. **"Samsung fridge" target.** Unity WebGL on old Tizen/Chromium is doubtful (wasm size, WebGL2, memory). Plan a TS canvas "lite" Daily using `@ronriku/core`; Unity stays for phones and desktop. Needs a test on a real or emulated Tizen browser before claiming support.
5. **Mini-game dynamics, transitions, Balatro feel.** Unity pass per screen (Battle, Rune Hand, Ice Dash, Beat Crawl, CHECKMATE, Boss): screen-to-screen colour wipes, card flourishes, score count-ups, shader-free CRT/wobble via UI Toolkit. Verify by play and screenshots on WebGL and the Pixel 6a. Coordinate with the other Unity session first.
6. **Growth plumbing.** Daily SHARE grid, retention SQL view, notifications, streak save, crews (see `STRATEGY_BENCHMARK.md` section 4).

## Done 2026-10-28 (uncommitted on `odlet-polish`)

- WebGL rebuilt from this branch with Brotli and real `Content-Encoding` headers: wasm 6.8 MB, data 2.2 MB, about 9.1 MB in total (was 8.9 MB wasm gzip plus JS fallback). Headers verified through `next dev` for `.br` files. `deploy/prod/gateway/nginx.conf` has matching rules but is not tested against a live nginx.
- Build knobs: `ODLET_WEBGL_OUT` (output folder; the folder name becomes the file prefix, so use `unity`) and `ODLET_WEBGL_FALLBACK=1` (gzip plus JS fallback for portal hosts that cannot send the header).
- New `PixelWipe` (block-dissolve between tabs and fullscreen screens) and `Swirl` (warped-paint background per world palette, fewer pixels on weak devices). New idle sway on Rune Hand cards.
- `/play`: header removed, game frame sized from `100dvh - 150px`.
- Tests: EditMode 89/89, PlayMode 10 passed, 1 ignored. Played Daily, Shop, a Battle and the map in Chrome on the new build.
- Unity `Library` is a junction to `D:\unity-cache\RONRIKU\Library` (C: had 7 GB free). Builds go to `D:\odlet-build`.

- Trial screens (Logic, Pattern, Spatial share `TrialScreenBase`): title/board deal in, SOLVED banner plus punch on a win, shake and red flash on a miss. Compiles, EditMode 89/89. Rebuilt WebGL (Brotli, 9.1 MB) and checked a Pattern miss in Chrome: pick marked red, answer teal, Continue shown.
- `/daily/play` (new, `web/src/components/daily/LiteDaily.tsx`): today's Daily playable at once in plain DOM/SVG over `@ronriku/core`, no Unity. Pattern (tap or keys 1-4), Spatial (buttons or arrows), Link (drag, tap or arrows), then a results card with a copyable share grid. Also the base for the fridge/TV fallback: arrow keys drive everything. Results stay on device, no server submit yet. Played all three trials in Chrome; `pnpm --filter web test` 136/136, lint clean. The Daily page now has Play now and Full game buttons.

Blockers and not yet done:

- Not deployed. `web/public/unity` is gitignored; the new build must be copied to the server by the user, and the gateway nginx file replaced and the gateway recreated.
- `/daily/play` exists, but it is not yet shown while Unity loads on `/play`, not submitted to the server, and untested on a real or emulated Tizen/TV browser.


## Android on the Pixel 6a (2026-10-28)

- Toolchain fixed without elevation: OpenJDK 17.0.18 and NDK r27c (URLs from the Unity Hub manifest) unpacked into `AndroidPlayer/OpenJDK` and `AndroidPlayer/NDK`; `AndroidPlayer/SDK` is a junction to `D:\AS_SDK`, which got `cmdline-tools/latest`, `build-tools;36.0.0` and `cmake;3.22.1` via sdkmanager. `RonrikuBuild` reads `ODLET_ANDROID_SDK` / `_NDK` / `_JDK`; run the build with `GRADLE_USER_HOME=D:\gradle-home` to keep Gradle off C:.
- Release IL2CPP arm64 APK is 21.5 MB, installs over the old v1.0 without a signature clash.
- Played on device: map, Ice Dash (3 stars at par), Daily (Pattern, Shadow, Link, results, rating 1231 to 1253), Bosses, Shop, Me (online ranks live), Rune Hand charm pick and a played hand. PixelWipe and the swirl show on device.
- Memory 275 MB PSS. Idle CPU on the map was 70-76 % of one core at a constant 60 fps; `FrameGovernor` (render every second frame after 2.5 s without input) brought it to 52-58 %.
- Fixed from the pass: the SOLVED banner covered the trial title (now an accent flash), charm cards looked tan with weak contrast (opaque base), Daily results had a flat opaque background (now translucent) and said LOGIC where the rest of the game says LINK.
- Web: `/daily/play` keeps a local streak and shows today's result again on return; `/play` offers it while Unity loads and when Unity fails to start.

## Honest revenue math

- Target stated: 5,000 players and $1,000 a month.
- At the planned Plus price ($2.49/mo) and 2 % of players paying, 5,000 players give about $250 a month. $1,000 needs about 20,000 monthly actives, or a much higher payer rate (about 8 %), or other lines: mainnet figure sales, crew/sponsor Dailies, sponsored raids, grants.
- So treat 5K players as the near-term goal, and $1K/month as reachable only with the extra lines or about 4× the audience.

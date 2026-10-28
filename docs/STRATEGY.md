# ODLET — Growth and Revenue Strategy

Written 2026-10-23. Builds on `docs/pitch/02-roast.md` (what is weak) and `03-ideal-pitch.md` (what we claim). Market figures (~1,561 dApp Store apps, 0 % store fee) are from the September pitch research and are not re-checked. Seeker + Saga had shipped 200K+ units by March 2026 (Solana Compass); `STRATEGY_BENCHMARK.md` uses that. Revenue plan is refined there with daily-game benchmarks. Anything marked **target** or **assumption** is a plan, not a fact. Replace with real numbers once the retention view exists (step 1 below).

## 1. Where we are

- Product is far ahead of distribution and money. Roast score 46/110: build 7/10, monetization 2/10, moat 3/10, target clarity 3/10.
- Revenue today is zero by design: all SOL is devnet, no IAP, no pass, no ads.
- No measurement. Analytics are 4 local events that send nothing. We cannot answer "what is D1?"
- Biggest unused asset: the WebGL build at `/play`. Zero install, 16 MB, 0.3 s start. It is the funnel for every channel below.

## 2. Positioning (one sentence, never more)

**Balatro-style combos where every card is a puzzle. One minute a fight, one Daily a day.**

- Hero visual: battle screen with the `chips × mult` box and a hit pop. Not the map, not the shop.
- Hero mode for marketing: **Battle + Rune Hand**. Ice Dash and Beat Crawl are supporting cast; they do not appear in the first ten seconds of any ad.
- Two faces, one product:
  - **Public face** (web, Play, TikTok/Shorts, Reddit): no crypto words. "Free pixel puzzle arcade, daily streak, no ads."
  - **Seeker face** (dApp Store, X, Solana Mobile): Genesis Founders figure, collectibles you hold, zero-fee payments.
  - Crypto never appears on the Daily surface (matches `brand.md`).

## 3. Audience, in order

| # | Segment | Why first | Channel |
|---|---|---|---|
| 1 | Seeker owners (~200K Seeker + Saga devices) | Small, reachable, store takes 0 %, editorial placement possible, hackathon/grant ecosystem is right there | dApp Store, Solana Mobile, X, Discord |
| 2 | Balatro / deckbuilder fans | Already speak chips × mult; strong Reddit/YouTube/TikTok culture | r/balatro, r/roguelikedev, Shorts, streamers |
| 3 | Daily-puzzle habit (Wordle, Puzzmo, NYT Games) | Share-grid is the only proven free growth loop for a daily | X, Reddit, Threads, group chats |
| 4 | Brain-training users (Elevate, Peak) | Largest paying market, but they buy "science", we sell fun. Do not chase until 1–3 work | Later: Play/iOS search |

## 4. Acquisition

**Rule: every channel lands on `/play` (instant), then offers the APK / store link. Never ask for a download before the first win.**

1. **Daily share card** (not built yet; roast fix #2, biggest lever). `ODLET Daily #023 🟪🟦🟧 01:42 · 1226 · 🔥3 + link`. Link opens that day's Daily in the browser. Each player is an ad.
2. **Short-form clips** (3 per week, 15 s, vertical). Footage exists in `marketing/` and `docs/pitch/04-video-ads.md`. Format: 1 s hook (monster), a 6-hit combo with music rising, end card "play free, no install". One clip per mode, but lead with Battle and Rune Hand.
3. **Seeker/Solana channels.** Pitch Solana Mobile for dApp Store games editorial. Enter hackathons (Colosseum submission draft exists, `docs/pitch/05-colosseum-submission.md`). Post a weekly raid leaderboard on X every Monday.
4. **Dev-community launches.** Show HN / r/gamedev angle: "bit-for-bit C# ↔ TypeScript deterministic game core, server replays answers". Product Hunt for the Daily.
5. **Web game portals** (itch.io first; CrazyGames/Poki later). WebGL build is ready. Portals expect their own ad SDK, so ship a separate portal build; do not break the "no ads" promise in the main app (see decision D1).
6. **Streamers / raid nights.** Weekly boss with a leaderboard is made for it. Give 10 creators a custom seed and a Founders figure.
7. **Stores beyond Seeker, month 2–3.** Google Play (checklist exists; review the blockchain policy first) then iOS (pipeline noted in memory). These are the volume channels; Seeker alone cannot carry the numbers.

Do not spend on paid UA until the gate in section 8 is passed.

## 5. Retention (this is the real product-market test)

| Lever | State | Action |
|---|---|---|
| Daily streak + rating | Built | Add streak-freeze (earned with shards, one per week) so a missed day is not a quit |
| Daily results dead end | Gap | SHARE button; "tomorrow's Daily in 07:12:00" timer |
| Notification at reset | Gap | Local notification at Daily reset, opt-in after first Daily |
| Friend challenge | Gap | "Beat my seed": send a Battle/Rune seed link; opens in browser |
| Weekly raid | Built | Monday announcement, Sunday last-call notification |
| Content cadence | Gap | Monthly "Season": new world or charm set, new figures, new raid boss. Reuse the procedural generators; ship something every 4 weeks |
| Placeholder texture | Gap | Generated player name, hide fake-looking +26 deltas, no "LOCAL" strings (roast fixes #3–4) |

## 6. Revenue

### 6.1 Honest sizing

Illustrative only. **Assumptions:** 2 % payers, $6 average spend per payer over the period.

| Installs + web players | Payers | Revenue |
|---|---|---|
| 5,000 | 100 | ~$600 |
| 30,000 | 600 | ~$3,600 |
| 100,000 | 2,000 | ~$12,000 |

Conclusion: **revenue will not fund the project in year 1.** Seeker alone is too small and its audience skews to free. Plan for three funding sources in parallel: grants, small recurring revenue, and audience that raises the value of both.

### 6.2 Revenue lines, in build order

| # | Line | Price | Fit | Notes |
|---|---|---|---|---|
| 1 | **Grants / hackathon prizes** | $10–50K | Immediate | Solana Foundation, Solana Mobile builder programs, Superteam Earn, Colosseum. Milestones are installs and D7, so growth work doubles as fundraising. Largest realistic cash in the next 6 months |
| 2 | **Mainnet voxel figures** | 0.02–0.1 SOL | Seeker + crypto users | Needs mainnet cutover, MWA in Unity (STATE item 3), live mint test (item 2). Buyer pays rent and fees; store takes 0 % |
| 3 | **Season Pass** (monthly, cosmetic + Daily archive + extra raid entry) | ~$3.99 in SOL/USDC; IAP on Play/iOS | All players | Only after retention gate. Cosmetic and convenience only, never rating or score |
| 4 | **Founders / Genesis figure** | Free for Seeker Genesis Token holders | Seeker acquisition | Cost-free, on-chain-verifiable, gives editorial a reason to feature |
| 5 | **One-time "Full Odlet" unlock** (optional) | $2.99–4.99 on Play/iOS | Balatro-style buyers | Unlocks Daily archive and all cosmetic slots. Tests premium vs free-to-play with real data |
| 6 | **Sponsored raids** | $500–5K per raid | Crypto brands | Branded boss and figure for a week. Needs audience first (>5K weekly actives). Label clearly |
| 7 | **Rewarded ads** | — | Portals / web only | Only on portal builds. Do not add to the main app (decision D1) |

Principles: no pay-to-win (a purchasable rating is worthless); reward/wallet language stays off the Daily surface; prices in the shop stay visible and fixed (also keeps the "no simulated gambling" store answer true).

## 7. 90-day plan

| Window | Ship | Market | Measure |
|---|---|---|---|
| **Days 1–7** | Retention SQL view (D1/D7 by first-seen day, quit level); SHARE button; kill placeholder labels; website copy matches v3; device pass of v3 | Post launch thread; first 3 clips; submit to Solana Mobile editorial | Funnel: landed → first win → Daily done → return |
| **Days 8–30** | Local notification at reset; streak freeze; MWA in Unity; Genesis Founders figure; arcade replay-verification (so arcade leaderboards are fair) | Monday raid posts; itch.io page; Show HN; 10 creators | D1, D7, shares per DAU |
| **Days 31–60** | Mainnet mints; Season 1 (world 6 or new charm set); friend "beat my seed" | Grant applications with real retention data; Google Play closed test | Payer rate, ARPPU, share-driven installs |
| **Days 61–90** | Season Pass; Google Play launch; decide on premium unlock based on conversion | Sponsor outreach; second grant; first paid test (only if gate passed) | Cost per retained player, payer rate |

## 8. Metrics and gates

Targets come from the pitch and are **unvalidated**.

| Metric | Target | Source |
|---|---|---|
| Landed → first level won | ≥ 60 % | funnel view |
| D1 retention | ≥ 35 % | `daily_results`, `level_progress` |
| D7 retention | ≥ 15 % | same |
| Shares per Daily active | ≥ 0.15 | share event |
| Payer rate | 2–4 % (assumption) | purchase tables |

**Gate for any paid acquisition:** D1 ≥ 30 % and D7 ≥ 12 % over a cohort of at least 500 players. If missed, fix onboarding and loop, not spend. Report numbers publicly in grant updates, good or bad.

## 9. Risks

- **Crypto stigma outside Solana.** Mitigation: public face has no crypto words; wallet features sit behind Settings and the shop.
- **Store crowding.** The dApp Store is no longer empty; being listed is not a plan. Mitigation: web-first funnel, own channels.
- **Seeker ceiling.** ~200K devices caps volume. Mitigation: Play and iOS by month 3.
- **Balatro comparison.** Don't claim depth. Claim speed, free, daily.
- **Arcade proofs are not replay-verified.** Any public arcade leaderboard or prize before that is cheatable. Daily and raids are already verified; keep prizes on those.
- **Public repo.** Keep this document free of private numbers, keys and contracts. It is public once pushed.
- **Single-developer bandwidth.** The plan is ordered by impact; if time runs short, cut sponsored raids, premium unlock and the portal build first.

## 10. Decisions needed

- **D1: ads.** Store text says "No ads". Keep that in the main app and take ad revenue only from separate portal builds? (Recommended.)
- **D2: premium unlock** next to the free game on Play/iOS, or free plus pass only?
- **D3: grant target and amount.** The pitch uses a $25K placeholder. Which programme first?
- **D4: mainnet date**, which gates every crypto revenue line.
- **D5: store order after Seeker:** Google Play first (recommended: lower friction, policy work already in `store/`) or iOS first.

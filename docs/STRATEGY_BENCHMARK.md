# ODLET — Daily-game teardown and monetization plan

Written 2026-10-23. Companion to `docs/STRATEGY.md`. Ten daily / habit games, how each makes money, then what ODLET copies and what it skips.

**Evidence grade:** A = company filing, B = credible press, C = weak or third-party estimate, ? = not found. Business models below are reverse-engineered from public reporting and the products themselves. Private companies do not disclose revenue; where I found only estimates I say so and do not quote them as fact.

## 1. Teardown

| # | Game | Owner / type | How it makes money | Mechanics that feed it | Evidence |
|---|---|---|---|---|---|
| 1 | **NYT Games** (Wordle, Connections, Spelling Bee, Mini) | NYT. Parent is a subscription publisher | Standalone Games sub (about $5/mo or $40–50/yr, price sources disagree), bundled with news sub, family plan (separate stats and streaks per member), ads and tracking on free play. Wordle bought for low seven figures in 2022 and kept free | Free daily puzzle forever; paywall on the rest of the suite and archive; push to create an account so streaks and stats are saved; share grid; suite breadth (new game every few months) | B (Press Gazette, Nieman Lab, Statista). Company total 13.35M subs Q2 2026 (A). Games share of revenue not disclosed |
| 2 | **Puzzmo** | Hearst Newspapers (bought it 2023). Indie-built suite | Free tier with ads; **Puzzmo Plus**: ad-free, extra games, leaderboards, archives. **B2B**: white-label platform for other publishers (Postmedia in Canada) with their own paywall and promo pricing | Same-day leaderboards, archive, lifetime-sub launch with a waitlist stunt (100K people, 1M+ attempts) | B (Axios, MediaPost). Subs and revenue: ? |
| 3 | **LinkedIn Games** (Queens, Crossclimb, Pinpoint) | LinkedIn. Parent is an ad platform | **No direct revenue.** Pays back in time-in-app and ad inventory | Once a day; scoreboards compare you with connections, companies, schools; built by the news team | B (TechCrunch, Axios). Engagement numbers: ? |
| 4 | **Duolingo** | Public, learning app with game layer | Q1 2026 revenue $292M: subscriptions **86 %**, ads **7 %**, Duolingo English Test 4 %, in-app purchases 3 %. 12.7M paid subs vs 58.7M DAU (Q2 2026). Gross margin 73 % | Streaks, streak freeze (sold or earned), leagues with weekly promotion/demotion, timed push, mascot tone, half of experiments fail and are kept as learning | A (10-Q and shareholder letters). Tactics: B/C |
| 5 | **GeoGuessr** | Private, Swedish | Freemium until **Feb 2024**, then free play cut to a daily challenge plus limited maps; Pro for unlimited play, Duels, custom challenges. Reason given: rising Google Maps API cost | Daily challenge as free hook; ranked Duels; Pro hosts can let free friends join a party | B/C. Reported price about $3–6/mo, revenue ranges from weak sources. Players complained about being "misled" about free-to-play |
| 6 | **Sudoku.com** (Easybrain) | Private hybrid-casual publisher | Free, ad-supported (banner, interstitial, rewarded video, several networks at once) plus in-app purchases (hints, ad removal) | Daily challenge, seasonal events, trophies; reviews complain about ad load (e.g. several ads per level) | B/C. Revenue split: ? |
| 7 | **Immaculate Grid** | Sports Reference (bought July 2023 from the solo creator, three months after launch) | Ads on a free game; subscription tier for extra features planned; **licensing** the format to a TV production company; grid format cloned across baseball, NBA, NFL, hockey, soccer | Shareable grid, daily reset, huge reach (6.5M users reported in one year) | B. Revenue: ? ("revenue driver" per press) |
| 8 | **Elevate / Peak / Lumosity** | Brain-training subscription apps | Free tier plus annual sub (Elevate reported near $40/yr, weak source). Revenue estimates online are tiny (Elevate ~$750K, Lumosity ~$350K, Peak ~$100K) and unreliable | Science-sounding framing; daily training session; progress charts | **C only.** Treat as a warning that the category is hard, not a benchmark |
| 9 | **Heardle** | Spotify bought it July 2022, closed it May 2023 | None; was a funnel to Spotify. Site traffic fell for months before shutdown | Wordle format for music | B (TechCrunch, MBW). Lesson in section 2 |
| 10 | **Apple News+ Puzzles** (Crossword, Quartiles, Sudoku, Emoji Game) | Apple. Parent is a $12.99/mo bundle | None directly; included in the news bundle. Apple built its own word game after seeing crosswords retain subscribers; streak tracker included | Streaks; publisher data point quoted: readers engaged in **both news and games weekly** show the highest retention of any behavior seen | B (Nieman Lab). Single quoted claim, not published churn data |

Note: Seeker + Saga shipped **over 200K units by March 2026** (Solana Compass). The earlier docs say 150K+; use 200K. No source gave games revenue or per-user spend on the dApp Store.

## 2. The architecture behind the money

Five business shapes. Almost nobody earns from the daily puzzle itself.

| Shape | Who | Where the money comes from | What it needs |
|---|---|---|---|
| **A. Retention engine for a parent** | NYT, LinkedIn, Apple, Hearst, Spotify (failed) | News subs, ad inventory, bundle stickiness. The game is a cost center that lowers churn | A parent product with paying users |
| **B. Free daily, paid depth** | NYT, Puzzmo, GeoGuessr | Sub for archive, extra games, ad-free, leaderboards | Free daily kept free, a suite or archive worth paying for |
| **C. Ads + IAP, hybrid casual** | Sudoku.com, Immaculate Grid | Impressions at scale, small IAP, ad-removal | Millions of players, ad ops |
| **D. Habit subscription** | Duolingo, Elevate | 86 % of Duolingo revenue is subscription | Daily habit machine: streak, freeze, leagues, notifications, then a clear value in paying |
| **E. Exit / license** | Wordle ($1M+), Puzzmo, Immaculate Grid, Heardle | One-off payment from a content owner who wants the audience, or licensing the format | Audience and a format others cannot trivially clone |

Cross-cutting rules that every winner follows:

1. **Today's puzzle stays free.** The paywall sits on archive, depth, ad-free, extra modes. GeoGuessr's hard cut of free play drew "misleading" complaints.
2. **Streak is the asset, so capture the identity.** NYT pushes accounts to save streaks; Duolingo sells and gives streak freezes.
3. **Share artifact, one tap.** Wordle grid, Immaculate Grid, Connections squares.
4. **Social comparison inside a small group** beats global ranks (LinkedIn connections/companies, Duolingo leagues, Puzzmo leaderboards).
5. **One game becomes a suite.** NYT and Puzzmo keep adding games; each new game widens the habit.
6. **Reach first, price later.** Wordle was free and untracked until it had tens of millions of players; Immaculate Grid sold within three months.
7. **Cost of data matters.** GeoGuessr priced up when Google Maps API cost rose. ODLET's costs are one VPS plus Supabase, which is an advantage.

What to avoid:
- Ad load that drives reviews down (Sudoku.com).
- A daily game with no owner or reason to exist in a bigger product (Heardle, shut within a year).
- Selling "brain science" to compete with Elevate/Lumosity: category estimates are small.
- Duolingo hearts-style energy limits. They work for Duolingo's 100M-user funnel; they would kill a young 60-level arcade.

## 3. What this means for ODLET

ODLET has no parent product, so shape A is closed. Shape D (habit subscription) is the one with the strongest filing-grade evidence, but needs scale. Shape B is the realistic first step, and E is the realistic outcome if the audience grows.

Position: **ODLET is a Puzzmo-shaped product (free daily, paid depth, suite of modes) with a Duolingo-shaped habit layer (streak, freeze, leagues), whose parent could be the Solana Mobile / Seeker ecosystem.**

Benchmarks to size the plan (derived, rough):
- Duolingo paid subs are about 22 % of DAU or about 9 % of MAU, and that is best-in-class, with a brand and a billion-dollar marketing machine. For ODLET plan **1–3 % of monthly actives** pay for anything, not 9 %.
- NYT Games prices at about $5/mo, $40–50/yr. A new, unproven game should price **at roughly half**.

## 4. The plan

### 4.1 Rules (copied from the winners)

1. Daily stays free, forever, with no wallet or account.
2. Paywall only: archive, streak safety, extras, friend leagues beyond a free size, cosmetics. Never rating or score.
3. Crypto surfaces stay off the Daily screen.
4. No energy limits or timers that block play.
5. Ads (if any) only on web portal builds, not in the main app (matches store listing "No ads").

### 4.2 Product changes, by revenue shape

| # | Change | Copied from | Why it earns |
|---|---|---|---|
| 1 | **Share grid** + "play today's Daily" link | Wordle, Immaculate Grid | Free acquisition; prerequisite for everything. **Built 2026-10-28:** Unity Daily SHARE button and the web `/daily/play` result card; the link in the share text still needs a landing that explains the game |
| 2 | **Save your streak**: optional account upgrade (email or wallet) after day 3; reinstall keeps the streak | NYT | Makes streak sticky and gives a contact point for reminders. Today accounts are anonymous, so a reinstall loses the habit |
| 3 | **Streak freeze**: 1 free per week, extra earnable with shards, unlimited with Plus | Duolingo | Cheaper retention than any marketing; also a clear Plus feature |
| 4 | **Crews / leagues**: invite link, private leaderboard for 5–200 people, weekly reset with promotion | LinkedIn, Duolingo, Puzzmo | Small-group rank drives return visits. Each Solana community, school or office becomes a distribution node |
| 5 | **Archive**: every past Daily playable (backend already publishes −2…+30 days; extend history) | NYT, Puzzmo | The classic paywall item. Last 3 days free, full archive in Plus |
| 6 | **Suite expansion**: ship one new Daily mode every 6–8 weeks (reuse Battle micro-challenges, Ice Dash and Rune Hand seeds as "Daily Dash", "Daily Hand") | NYT, Puzzmo | Each new Daily widens the habit and gives a reason to re-engage lapsed players. Deterministic seeds make this cheap |
| 7 | **Seasons**: 4–6 weeks, new world/charms/figures, a season leaderboard | Sudoku.com, Duolingo | Event rhythm without ads |
| 8 | **Plus subscription** (below) | NYT, Puzzmo, GeoGuessr | Core recurring revenue |

### 4.3 ODLET Plus (proposal)

| | Free | Plus |
|---|---|---|
| Today's Daily, all arcade levels, weekly raid (shards) | yes | yes |
| Past Dailies | last 3 days | full archive |
| Streak freeze | 1 per week | 3 per week |
| Crews | join 2, up to 50 members | create/join unlimited, up to 200, custom crew name |
| Stats | basic | history, per-mode charts, percentile |
| Cosmetics | shop with shards | monthly exclusive voxel figure + frame |
| Raid | 1 entry per week | +1 entry |

Price (**proposal**, validate): **$2.49/month or $19.99/year**, about half of NYT. Native: SOL/USDC on Seeker (0 % store cut), Play/iOS IAP (store cut applies, so keep one price across channels and accept lower net there). Founders/Genesis holders get a free first season.

### 4.4 Other revenue (secondary)

| Line | Model | When |
|---|---|---|
| Cosmetic figures (mainnet) | Pay per item, 0.02–0.1 SOL | After mainnet and MWA |
| Crew / community Daily (**B2B-lite**) | Sell a branded Daily + leaderboard to Solana projects, guilds, newsletters: $50–200/month. Puzzmo does this at publisher scale | Month 4+, only once crews work; **this is a hypothesis** |
| Web portals (itch.io, CrazyGames, Poki) | Portal ad rev-share on a portal build | Month 2–3, optional |
| Sponsored raid | Branded boss for a week | Needs 5K+ weekly actives |
| Format licensing / acquisition | Pitch Seeker-adjacent, puzzle, or Web3-gaming owners | Month 9+; only with real retention data. Wordle, Puzzmo, Immaculate Grid and Heardle all show exits happen early for formats with audience |

### 4.5 Phases and targets

| Phase | Weeks | Build | Pass condition |
|---|---|---|---|
| **0 Measure** | 1 | Retention SQL view; funnel: landed → first win → Daily done → D1/D7 | You can read D1 and D7 |
| **1 Habit** | 2–6 | Share grid, save-streak accounts, streak freeze, local reset notification | D1 ≥ 30 %, D7 ≥ 12 % on 500+ players; share per DAU ≥ 0.15 |
| **2 Social** | 6–12 | Crews, weekly league, first 20 crews seeded in Solana Discords; Genesis Founders figure | 25 % of DAU in a crew; crews have 3+ active members |
| **3 Depth + first revenue** | 10–16 | Archive, second Daily mode, mainnet figures, **Plus beta** | Plus conversion ≥ 1 % of monthly actives; refund and churn tracked |
| **4 Scale** | 16–30 | Play/iOS, Season 1 and 2, third Daily mode, web portal build, first paid UA test | CAC under about one-third of first-year Plus revenue per payer |
| **5 Options** | 30–52 | Crew B2B pilot, sponsor raid, acquisition/licensing conversations | Decide: grow as an independent habit product, or sell to a content/ecosystem owner |

Illustrative revenue after phase 3 (assumptions: 2 % of monthly actives on Plus, $2.49 monthly equivalent, 30 % of subs yearly at $20):

| Monthly actives | Plus subs | Approx. monthly revenue |
|---|---|---|
| 5,000 | 100 | ~$220 |
| 25,000 | 500 | ~$1,100 |
| 100,000 | 2,000 | ~$4,400 |

This is sobering and intended to be. **A subscription alone needs 100K+ monthly actives to pay one developer.** Therefore: grants fund phases 0–3, Plus validates the habit-pays hypothesis, and the audience is the exit asset (shape E) if independent revenue stays small.

### 4.6 Kill criteria

- D7 under 8 % after phase 1 fixes: stop adding revenue features, fix onboarding and loop.
- Share per DAU under 0.05 after two iterations: the Daily grid is wrong; redesign it before any marketing.
- Crews under 10 % of DAU after 8 weeks: the social layer is not pulling; drop B2B crew plans.
- Plus under 0.5 % of monthly actives after 90 days: drop the subscription, move to cosmetics only.

## 5. Open decisions

1. Price points and whether Plus is sold natively in SOL/USDC only at first (simplest, avoids store review of subscriptions) or also via Play/iOS IAP.
2. Account upgrade method for "save streak": email, Google, or wallet. A wallet-only flow loses non-crypto players.
3. Ads: keep "no ads" (recommended) and treat portals as the only ad channel.
4. Appetite for an exit. If yes, retention data and the format must be defensible from day one, which affects what is kept proprietary in the public repo.

## Sources

- [NYT Q2 2026 results (SEC 8-K)](https://www.sec.gov/Archives/edgar/data/0000071691/000007169126000032/pressrelease6302026.htm), [NYT Q1 2026 10-Q](https://www.sec.gov/Archives/edgar/data/0000071691/000007169126000025/nyt-20260331.htm)
- [Press Gazette: how games power the NYT subscription model](https://pressgazette.co.uk/north-america/new-york-times-games-puzzles-wordle-subscriptions/)
- [Nieman Lab: NYT family subscription with separate Wordles](https://www.niemanlab.org/2025/09/the-new-york-times-launches-a-family-subscription-with-separate-wordles-for-everyone/)
- [Axios: Hearst buys Puzzmo](https://www.axios.com/2023/10/20/puzzmo-hearst-zach-gage-new-york-times), [MediaPost: Hearst acquires Puzzmo](https://www.mediapost.com/publications/article/391586/hearst-newspapers-acquires-puzzmo-puzzle-gaming-p.html), [Postmedia launches Puzzmo in Canada](https://nmc-mic.ca/2024/04/04/postmedia-launches-puzzmo-an-online-puzzle-games-experience-in-canada/)
- [TechCrunch: LinkedIn launches games](https://techcrunch.com/2024/05/01/linkedin-launches-gaming-three-logic-puzzles-aiming-to-extend-time-spent-on-its-networking-platform), [Axios: LinkedIn games](https://www.axios.com/2024/05/01/linkedin-launches-games-closer)
- [Duolingo Q1 2026 10-Q](https://www.sec.gov/Archives/edgar/data/0001562088/000162828026029976/duol-20260331.htm), [Duolingo Q2 2026 shareholder letter](https://www.sec.gov/Archives/edgar/data/0001562088/000162828026053299/q2fy26duolingo6-30x26share.htm)
- [Dealroom: GeoGuessr](https://dealroom.co/companies/geoguessr/)
- [App Store: Sudoku.com](https://apps.apple.com/us/app/sudoku-com-number-games/id1193508329?xs=1), [myTarget Easybrain case study](https://target.vk.ru/publishers/success-stories/easybrain)
- [Action Network: Immaculate Grid story](https://www.actionnetwork.com/mlb/the-story-behind-immaculate-grid-the-game-thats-captivated-baseball-fans), [Awful Announcing: Immaculate Grid TV](https://awfulannouncing.com/tv/immaculate-grid-game-show-religion-sports.html)
- [TechCrunch: Spotify shuts down Heardle](https://techcrunch.com/2023/04/14/spotify-is-shutting-down-heardle-the-wordle-like-music-guessing-game-it-bought-last-year)
- [Nieman Lab: Apple News adds an original game](https://www.niemanlab.org/2024/05/apple-news-adds-a-new-original-game-to-boost-news-subscriptions/)
- [Solana Compass: dApp Store passes 1,561 apps](https://solanacompass.com/news/solana-mobile-dapp-store-surpasses-1561-apps-as-catalog-more-than-doubles-in-three-months), [Solana Mobile: builder grants](https://solanamobile.com/blog/builder-grants-are-live-the-dapp-store-crosses-700-apps-and-seeker-season-2-keeps-shipping)

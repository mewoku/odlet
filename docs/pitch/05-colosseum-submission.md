# Colosseum — Crypto World's Fair submission copy

Paste-ready answers for the Colosseum project page. Limits in brackets; `count.py` numbers checked 2026-09-28.
Anything in [square brackets] is for the team to confirm before submitting.

## Project details

### Brief description [500] — Public
Your brain is the weapon. Odlet is a pixel puzzle arcade for the Solana Seeker: fight voxel monsters with 3–10 second puzzles, chain combos to multiply damage, and come back every day for three new reasoning trials. Plays offline, free, no ads, no pay-to-win.

### What are you building, and who is it for? [1000]
Odlet is a mobile puzzle arcade where every attack is a puzzle. You walk a map of 5 worlds and 60 levels and fight voxel monsters. A right answer is a hit, speed raises damage, and combos multiply it (chips × mult, the scoring language Balatro made popular). There are four modes: Battle (micro-puzzles), Rune Hand (a card duel), Ice Dash (slide puzzles) and Beat Crawl (a rhythm dungeon on the soundtrack's beat). There is also a Daily of three trials that is the same for every player, with a streak and a rating, plus weekly boss raids.

It is for Seeker owners first. They bought a crypto phone and mostly find wallets and utilities, not a polished original game to open every day. After that it is for anyone who likes Wordle-style daily puzzles but wants a real game around them. Players collect voxel figures, which can be minted as Metaplex Core NFTs on the web. The game works fully without a wallet.

### Why did you decide to build this, and why build it now? [1000]
Brain games feel like homework: training apps grade you, and daily puzzles end after three minutes. Balatro showed that people will do arithmetic for hours if every number explodes (5M+ copies). Nobody has put that feeling on reasoning itself. Our own v2 playtest confirmed the problem. A first-time adult player quit after world 1 because the puzzles felt "slow and abstract". The fix was not easier puzzles. It was making every right answer hit something.

Why now: 150K+ Seekers are in people's hands. The dApp Store charges 0% platform fees and grew from about 700 to 1,561 apps in three months, but few of those are real games. Being early and distinctive still matters. Mobile Wallet Adapter and Metaplex Core now make a one-transaction, buyer-pays collectible mint practical on a phone. And mobile puzzle games are a $10B+ genre (Sensor Tower, 2025), so the upside beyond Seeker is large.

### What technologies are you using or integrating with to build your product?
- Client: Unity 6 (Android + WebGL), UI Toolkit, a pixelated 3D voxel renderer, procedural chiptune music and SFX, offline-first.
- Backend: Supabase (Postgres, row-level security on every table, security-definer RPCs, anonymous auth, pgTAP tests). The server replays submitted answers instead of trusting "solved" flags.
- Core: a bit-for-bit TypeScript port of the C# game domain, checked by 352 cross-language fixture tests.
- Web: Next.js site with the WebGL game, leaderboards, friends and collection.
- Solana: @solana/web3.js, Wallet Adapter, Solana Mobile Wallet Standard (MWA), Metaplex Core + Umi.
- Infra: Docker, nginx, Cloudflare; Remotion for trailers.
- AI tools: Claude Code and OpenAI Codex as coding agents (architecture, implementation, tests, reviews), working from our design spec.

### Which chains does your product use?
Solana

### How does your product use these chains? [500]
Each voxel figure is procedurally generated from a seed and minted as a Metaplex Core asset in one transaction. The server prepares and partially signs it (payment + memo + mint). The buyer's wallet signs and pays all fees and rent, and the server never holds funds. The web supports Phantom and Mobile Wallet Adapter. Planned next: a free Founders figure that only Seeker Genesis Token holders can claim, and SOL/USDC Season Pass payments. Live on devnet today.

### What category best describes your product?
Gaming

### Is your project a mobile-focused dApp?
Yes

### Where is your team primarily based?
Ukraine

### Team Telegram contact
[@your_telegram]

### Did anyone not listed on the team here do meaningful work on this project? [600]
[Victor (Product Manager) — invite him to the Colosseum team so he is listed; then this answer covers only the AI tools.] We used AI coding agents (Claude Code and OpenAI Codex) extensively for implementation, tests and code review, driven by our own design spec and playtesting. All product, game design, art direction and decisions are the team's. No other people did meaningful work on the project.

### Is there anything else judges should know about your project? [500]
Everything described is built and playable: 60 levels, 4 modes, the Daily, raids, shop and web play at odlet.xyz/play. We are honest about status. NFT minting runs on devnet only (we claim no value for devnet items), there is no token, and the Android app has no wallet today (MWA in-app is next). Arcade-level results are time-floored and stored; full server replay for arcade comes next, while the Daily and raids are already replay-verified.

## Media and code

### Project logo or graphic
Use `marketing/brand/out/avatars/icon-square-1024.png` (full-bleed, reads on any background). The transparent mark is too small on a white card.

### GitHub link
https://github.com/mewoku/odlet

### Please share any important context about your repo [500]
Monorepo: client/ (Unity 6 game, Android + WebGL), backend/ (Supabase schema, RLS, RPCs, pgTAP), packages/core (TypeScript port of the C# game rules, 352 fixture tests), web/ (Next.js site and Solana purchase flow), deploy/ (self-hosting), marketing/ (trailers, brand kit). The product was renamed from RONRIKU to ODLET, so code folders and namespaces still use "Ronriku". Start with README.md and docs/STATE.md.

### Demo video [≤3 min, YouTube / Loom / Vimeo]
[Upload a screen recording of the live game: map → Battle → Rune Hand → Daily → web collection. `marketing/video/out/trailer30.mp4` is a trailer, not a demo.]

### Live product link
https://odlet.xyz/play

### Access instructions
No login needed. Open odlet.xyz/play and tap to start; an anonymous account is created automatically. Android APK: [link]. Minting is optional: connect Phantom (devnet) on the Market page with devnet SOL from faucet.solana.com.

### Pitch video [≤2 min]
[Record: who you are (Victor, Khabib), the one-liner, the problem, a 20-second gameplay clip, why you two.]

### X profile
odletxyz

## Accelerator application (private)

### How do you know people actually need, or will need this product? [1000]
We don't have market proof yet, and we won't pretend to. What we have: (1) Balatro sold 5M+ copies on mostly arithmetic with loud feedback, which is demand for "maths that feels good". (2) Daily puzzle habits (Wordle, NYT Games) are proven, but they are a 3-minute ritual with no game around them. (3) Seeker owners have 150K+ devices and a store full of utilities, with few original games. (4) Our own playtest: a first-time adult player quit v2 because the puzzles felt "slow and abstract". When we made every right answer an attack (v3), that problem went away in our testing. Our first real test is launch week. We will publish installs, D1 and D7 retention, and Daily share rates, good or bad, and let them decide what we build next.

### How far along are you? Do you have users? [1000]
Pre-launch, no users yet. What exists and is live: the full game on Android (16 MB APK, ~0.3 s cold start, fully offline) and in the browser at odlet.xyz/play. It has 60 levels across 5 worlds, 4 play modes, the Daily (three trials), weekly boss raids, a figure shop, profiles and friends. The backend is live and server-authoritative, with anonymous accounts, RLS on every table, and answer replay for the Daily and raids. The single-transaction NFT purchase (Metaplex Core, buyer pays) is live on devnet. Quality: 500+ automated tests (352 cross-language core fixtures, backend integration, pgTAP, 113 web tests). The dApp Store listing is prepared. Next: submit to the dApp Store, add MWA inside the app, the Seeker Genesis perk, and mainnet mints.

### Who else is building in this space, and what do you think they're getting wrong? [1000]
Brain-training apps (Elevate, Peak, Lumosity) sell discipline by subscription. They grade you, so playing feels like homework. Daily puzzles (Wordle, NYT Games, Puzzmo) nail the habit but end in three minutes, with no progression or game around them. Balatro nails the dopamine, but it is a paid, 40-minute, PC-first run. Most web3 games start from the token and bolt a game on. The economy leads, pay-to-win creeps in, and players leave when rewards dry up. We think the fun must stand alone: Odlet works fully offline with no wallet, crypto is optional, and there is no token. Solana adds what a database can't: Seeker-verified perks, items players really own, and zero-fee native payments. Our position is the free, one-minute, daily version of Balatro's feeling, built for Seeker first.

### How do you make money, or how do you plan to? [500]
Cosmetics only, never pay-to-win. Voxel figures minted on Solana (~0.02–0.1 SOL), a monthly Season Pass (~$3.99 in SOL/USDC) and optional SOL raid entries (shards always work too). The dApp Store takes 0% and buyers pay mint fees, so gross margin is close to 100% minus servers. Later: Google Play and web with standard in-app purchases. The planning assumption is 2–4% payers, replaced by real data after launch.

### How long have you each been working on this? Full time? [500]
[Confirm.] Development started on 23 September 2026 for this hackathon, and the current build was made in the first week. Khabib (co-founder: software engineering, art, UI/UX) [full time / part time]. Victor (product manager: product, roadmap, launch) [full time / part time].

### Where is each member of the team based, and do you work in-person together? Would this change after funding? [500]
[Confirm.] Both founders are based in Ukraine and work [remotely / in person in city]. With funding we would [stay in Ukraine and work full time on Odlet / relocate to ...].

### Have you formed a legal entity yet?
[No / Yes]

### Have you taken any investment yet?
[No / Yes]

### Are you currently fundraising?
[Yes — a $25K grant / pre-seed; or No]

### Do you have a live token?
No

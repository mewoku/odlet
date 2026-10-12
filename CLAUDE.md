# ODLET — working notes

Pixel-art reasoning game (Android / Solana Seeker + WebGL). Product name ODLET, formerly RONRIKU: code identifiers, the `Ronriku` Unity folders/namespaces and `@ronriku/core` keep the old name. Current state and open items: `docs/STATE.md`; arcade design: `docs/PLAN_V3.md`.

## Layout

| Path | What |
|---|---|
| `client/` | Unity 6000.6.5f1 project (UI Toolkit, built-in RP). Code in `client/Assets/Ronriku/Scripts/{Domain,Application,Infrastructure,Presentation,Composition}`; tests in `Tests/{EditMode,PlayMode}`; build tooling in `Editor/RonrikuBuild.cs` |
| `packages/core` | `@ronriku/core`, bit-for-bit TS port of the C# domain; fixtures exported from C# (`packages/core/fixtures`) |
| `backend/` | Supabase: migrations, `wallet-link` edge function, `scripts/publish.ts`, vitest + pgTAP tests |
| `web/` | Next.js 15 site: `/play` (WebGL game), market, ranks, friends, devnet SOL purchase |
| `deploy/` | Docker self-hosting (Next + Caddy + Supabase) |
| `store/` | dApp Store / release checklist, listing, media |
| `marketing/` | Remotion video + brand scripts (own `CLAUDE.md`) |

## Rules that matter

- `Domain` is Unity-free deterministic C#. Any change to puzzle/figure/level/shop/boss logic must be mirrored in `packages/core` and the fixtures regenerated; the server replays answers and does not trust "solved" flags.
- Content/rules changes need an explicit `rulesVersion`; persisted data carries a schema version.
- Run `pnpm publish:content` (in `backend/`) after every `supabase db reset`.
- Arcade proofs are not replay-verified yet (STATE open item 1b).
- Never commit keys, keystores, service-role keys or private RPC URLs. The repo is public.
- Brand: `brand.md` (square corners, 8 px rhythm, terse copy, reward/wallet language off the Daily surface).

## Commands

```bash
pnpm install && pnpm build:core
pnpm test:core
(cd backend && npx supabase start && npx supabase db reset && pnpm publish:content && pnpm test && npx supabase test db)
pnpm --filter web test
pnpm --filter web build && pnpm --filter web start     # :3000, game at /play
```

Unity: menu RONRIKU → Setup Fonts (once), Build WebGL (Website) → `web/public/unity/`, Build Android (Release). CLI tests: `scripts/unity-test.ps1`, `unity command run_tests --mode EditMode`.

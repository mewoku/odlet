# RONRIKU v3 — Arcade adventure

Why: playtesting (a first-time adult player) showed the adventure was three slow abstract puzzles on
repeat, the Pattern trial was not self-explanatory, and players got bored after world 1. v3 turns the
map into a run of fast, juicy, hero-driven games with music, keeping the classic trials for the Daily
and boss raids.

## Level layout (every world, `Domain/Arcade/LevelModes.cs`)

| # | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| mode | Battle | Battle | Ice Dash | Rune Hand | Battle | Beat Crawl | Rune Hand | Ice Dash | Battle | Beat Crawl | Rune Hand | **Boss** |

Tier 0 (gentler) for world 1 levels 1–6, tier 1 everywhere else — difficulty stays in the middle band
instead of ramping per world. Everything derives from `LevelDef.Seed`, so any level can be replayed
exactly from `(world, index)`; records store only stars, best time and a compact input proof.

## Modes

**Battle** — hero vs monster. A stream of 3–10 s micro-challenges; each right answer is an attack worth
`(10 + speed bonus ≤ 10) chips × (1 + combo, max ×6) mult`. The monster swings on a timer (hits push it
back); wrong answers and swings cost hearts. Stars = hearts kept. Micro-challenges (one-line prompts,
tap answers): **Next** (sequence of tokens), **Sum** (tap tiles to hit a number), **Memory** (lights
flash), **Mirror** (complete the symmetric picture), **Arrows** (follow the arrows; the wrong options are other
exits of the board, so none can be ruled out at a glance), **Scales** (weights), **Lines** (tangled lines: which
lettered line reaches the star — crossings are clean X's of two lines, the right line is never the one straight above
the star; after answering it lights up and a dot runs along it). World 1 teaches three, each later world adds one
(W2 Mirror, W3 Arrows, W4 Scales, W5 Lines). (An older kind, **Odd** — find the one flipped shape among four turned
copies — was removed: players could not read the rule.)

Every 4th card is a **BIG CARD** (30 chips, the monster waits, a miss only breaks the combo). The **first**
big card of every adventure battle and boss fight is **CHECKMATE**: the end of a real game (Morphy's Opera
Game, Anderssen's Immortal and Evergreen games, Réti–Tartakower 1910 …), mate in 2–3 moves; the opponent
always answers with the move actually played. It comes in two formats:

- **Worlds 1–4: pick the move** (`MateChoiceScreen`, `Domain/Chess/MateChoices`). The board cannot be touched;
  each of the player's moves is a stage with 3 options under the board (the game's move + 2 tempting legal moves:
  checks, captures, the same piece, squares near the king), labelled with a piece icon and "QUEEN / TAKES H7".
  The first tap on an option plays it on the board as a preview ("CHECK!" when it is one); a second tap on the
  same option commits it. A wrong pick is shown, explained, crossed out and costs one of **2** tries. HINT
  crosses out one wrong option.
- **World 5: the full board** (`MateScreen`). The player moves the winner (tap a piece, its legal squares light
  up, tap a square). A wrong legal move is shown, explained in one line ("BLACK ESCAPES WITH Kxh7") and taken
  back; three wrong moves fail the card and show the solution. HINT names the piece, then the move. The change
  is announced three times: a gold line on every W5 battle/boss panel of the map ("CHECKMATE GETS HARDER"), the
  "HARDER CHECKMATE!" banner instead of "BIG CARD!", and a gold notice on the card itself.

The 25 checkmate fights of the adventure (4 battles + boss per world) are numbered in
play order and walk the difficulty-ordered bank (`LevelModes.MatePuzzle` → `MatePuzzleBank.ForFight`): world 1
opens with mates in 2, the last bosses get mates in 3 with sacrifices, difficulty never drops, and no game is dealt
twice while the bank has at least 25 puzzles (a smaller bank repeats some, never in two fights in a row). A missed
BIG CARD shows "COMBO LOST" only — no monster hit or heart animation, since no heart is lost. Later big cards stay
Pattern / Shadow / Link. Sources and verification of every game: `docs/MATE_PUZZLES.md`; rules engine:
`Domain/Chess` (perft-tested).

**Rune Hand** (Balatro-like) — 36 runes (1–9 × Fire/Wave/Leaf/Bolt), hand of 7, 4 hands, 3 discards.
Play 1–5 runes as a combo (pair … sign ladder), score `(combo chips + rune values) × mult`, beat the
monster's HP. Before the fight pick 1 of 3 **charms** (jokers) that bend scoring; their rules stay on screen
under the charm chips. Preview shows combo and chips×mult before committing; HINT selects the best play, or —
when even the best play cannot keep pace with the HP left and a discard remains — the runes to discard first
("WEAK HAND · DISCARD THESE"; HINT again shows the best play). Balance: the greedy bot with discards wins ~80 %
of card fights (48/60 at the last run), a player who follows HINT about the same, a player who only ever plays
the best hand without discarding ~45 % — `ArcadeTests.Cards_Balance…`, `Cards_FollowingHint…`.

**Ice Dash** (hero) — swipe; the hero slides until a wall. Grab all gems, then the door opens; spikes
reset. BFS-generated, par = optimal moves; ★★★ at par.

**Beat Crawl** (hero, rhythm) — monsters act on the music beat (every 2nd beat of the 140 BPM HeroRun
track); one hero move per beat, on-beat moves build combo, bump to attack, clear the room, take the
stairs. Monsters telegraph their next step (slime hops, bat flies straight, skeleton chases); the arrow is drawn
only where the monster will really step (or strike), never into a wall it will turn at (`CrawlState.NextStep`).

**Boss** — phase 1 battle (big HP), phase 2 rune hand with two charms. Stars = weaker phase.

## Juice & music

`Presentation/Arcade/ArcadeKit.cs`: shake, punch, pop-up numbers, flashes, banners, count-ups, hero/
monster lunges, chips×mult boxes. `Presentation/Audio`: procedural chiptune (9 tracks, 3 intensity
layers, stingers, sample-accurate beat clock). Combos raise intensity; big hits fire stingers.

## Tuning without code

`Assets/Ronriku/Resources/RonrikuTuning.asset` (linked from the RONRIKU object in the Bootstrap scene):
shake, pop-up size, SFX volume, battle stagger / pauses, crawl beats-per-move and timing window.

## Server

`complete_arcade_level(world, level, mode, stars, elapsed_ms, proof)` (migration
`20260926000003_arcade.sql`): mode must match the layout, unlock order enforced, time floors per mode,
proof shape checked and stored, first clear + new stars pay (same economy as v2). Full replay
verification needs the arcade rules ported to `packages/core` — tracked in STATE open items.

## Pattern trial (Daily)

Examples now act out their rule (rotate / flip / slide / invert animation) until the input becomes the
output; after answering, the yellow grid performs the change into the right answer.

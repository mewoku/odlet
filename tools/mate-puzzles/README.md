# Checkmate puzzle bank: tools

These scripts produce `client/Assets/Ronriku/Scripts/Domain/Chess/MatePuzzleBank.Data.cs` and `docs/MATE_PUZZLES.md`.
Every puzzle is the end of a real game; nothing is composed. Run them with Node 24 (`npm install` here first).

| Step | Script | What it does |
|---|---|---|
| 1 | `mine.mjs <pgnDir> candidates.json` | Reads PGN collections (one folder per player, e.g. the free pgnmentor.com `players/*.zip` files), keeps decisive games whose last move is checkmate and lists the positions 2 and 3 winner-moves before the end, with the full move list. |
| 2 | `solve.mjs candidates.json solved.json [maxLegal] [ks] [nameRegex]` | Exhaustive forced-mate search with chess.js: the game's move must be the **only** move that forces mate in the remaining moves at every step, with no faster mate. |
| 3 | `select.mjs` | Joins candidates and solver results for the hand-picked list of games (`picks`: the first batch of 14 and a second batch of 25 famous-player games added so the 25 adventure fights need no repeats) and writes `selected.json`. Picks the second source does not confirm are simply left out by step 5. |
| 4 | `make-cc-input.mjs`, then `crosscheck.mjs crosscheck-in.json crosscheck-out.json` | Finds each game on chessgames.com and compares the whole move list with the first source. Slow on purpose (one request every few seconds, backs off when the site asks). `crosscheck3.mjs <key>…` is a more thorough second pass (searches with the year, cleans annotated PGNs). |
| 5 | `build-bank.mjs selected.json crosscheck-out.json,crosscheck3-out.json <Data.cs> <MATE_PUZZLES.md>` | Writes the C# bank and the documentation table. Order = the order the adventure deals them: Easy → Standard → Hard, and inside a band plain mates before sacrifices, a king-move discovered mate last, White to move before Black, fewer legal moves first. Games without a second-source match are left out (games whose search hit the site's rate limit are reported as unfinished, not as mismatches). `manual.json` records games matched by hand and notes about how the second source records them. |

Checks that do not need the network:

- `perft.mjs` prints the standard perft node counts with chess.js (the same numbers are asserted by `ChessEngineTests` against the game's own engine).
- `render.mjs out.png "<fen>" [selected] [targets] [flipped]` draws the board with the same sprites and colours as `ChessBoardElement`, for checking the pixel art without Unity.

After regenerating, run the EditMode tests: `MatePuzzleTests` replays every game with the game's engine, checks the stored start position, the checkmate, the uniqueness of the solution at every step and the battle integration.

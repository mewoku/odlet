# Checkmate puzzles: the real games

Every "BIG CARD · CHECKMATE" in a battle is a position from a game that was really played. The puzzle starts 2–3 of the winner's moves before the end of the game; the player makes the winner's moves, and the opponent answers with the moves that were actually played. **Nothing here is composed or invented.**

How each game was verified (all automated, scripts in `tools/mate-puzzles/`):

1. **Mined from a game database.** Games come from the free pgnmentor.com player collections (17,089 games of 23 famous players were scanned; 413 end in checkmate). Only games whose last move is checkmate, with a decisive result, were considered.
2. **Re-found in a second, independent database.** Each chosen game was located on chessgames.com and its complete move list compared move by move with the first source: identical for 28 of 29; the exception is explained under *Notes*. The chessgames.com game id is listed below. Candidates that could not be found there with the same moves were dropped (Cochrane–Staunton, Nimzowitsch–Tartakower, Capablanca–Marshall, Zukertort–Winawer, Marshall–Bogoljubow, Morphy–Morphy, Anderssen–Suhle, Steinitz–Rosenthal, Morphy–Maurian), and candidates whose check could not be completed (the site rate-limits) were not used.
3. **Legality and mate are proven by two engines.** chess.js (an independent library) and the game's own engine (`Domain/Chess`, validated with the standard perft node counts) both replay the whole game with every move legal and reach checkmate. EditMode tests (`MatePuzzleTests`) repeat this for every shipped puzzle at every build.
4. **One solution only.** An exhaustive search proves that at each of the player's steps exactly **one** move forces mate within the remaining moves, and that no faster mate exists. Several well-known finishes were rejected because they fail this (for example the Levitsky–Marshall "gold coins" game ended by resignation, the Lasker–Thomas 1912 finish has alternative mates, and Légal's trap only works if the opponent errs).

The player always moves the winning side. Wrong (legal) moves are taken back with a short explanation; three wrong moves end the card.

| # | Level | Mate in | Game | Event · place · year | Result | Solution | Checks only | Sources |
|---|---|---|---|---|---|---|---|---|
| 1 | Easy | 2 | Adolf Anderssen – Howard Staunton | London · London · 1851 | 1-0 | `Qg7+ Kxe6 Qe7#` | yes | pgnmentor `Staunton.pgn`; chessgames [1001355](https://www.chessgames.com/perl/chessgame?gid=1001355) |
| 2 | Easy | 2 | Adolf Anderssen – Karl Mayet | Casual Game · Berlin · 1855 | 1-0 | `Nf6+ Ke7 Re8#` | yes | pgnmentor `Anderssen.pgn`; chessgames [1019010](https://www.chessgames.com/perl/chessgame?gid=1019010) |
| 3 | Easy | 2 | Siegbert Tarrasch – Karl August Walbrodt | 9th DSB Kongress, Leipzig · Leipzig · 1894 | 1-0 | `Qh7+ Ke8 Rg8#` | yes | pgnmentor `Tarrasch.pgn`; chessgames [1075844](https://www.chessgames.com/perl/chessgame?gid=1075844) |
| 4 | Easy | 2 | James Mason – Emanuel Lasker | London · London · 1899 | 0-1 | `Qc3+ Rb3 Ra7#` | yes | pgnmentor `Lasker.pgn`; chessgames [1224615](https://www.chessgames.com/perl/chessgame?gid=1224615) |
| 5 | Easy | 2 | Savielly Tartakower – Edgar Colle | San Remo · San Remo · 1930 | 0-1 | `Qg2+ Ke1 Rf1#` | yes | pgnmentor `Tartakower.pgn`; chessgames [1007973](https://www.chessgames.com/perl/chessgame?gid=1007973) |
| 6 | Easy | 2 | Georg Marco – Siegbert Tarrasch | Hastings · Hastings · 1895 | 0-1 | `Qh4+ Kg2 Qh2#` | yes | pgnmentor `Tarrasch.pgn`; chessgames [1283398](https://www.chessgames.com/perl/chessgame?gid=1283398) |
| 7 | Easy | 2 | Aron Nimzowitsch – Siegbert Tarrasch | St. Petersburg · St Petersburg · 1914 | 0-1 | `Re8+ Kd7 Bb5#` | yes | pgnmentor `Tarrasch.pgn`; chessgames [1102384](https://www.chessgames.com/perl/chessgame?gid=1102384) |
| 8 | Easy | 2 | Aron Nimzowitsch – Semion Alapin | Casual game · St Petersburg · 1914 | 1-0 | `Qd8+ Bxd8 Re8#` | yes | pgnmentor `Nimzowitsch.pgn`; chessgames [1102375](https://www.chessgames.com/perl/chessgame?gid=1102375) |
| 9 | Easy | 2 | **Opera Game**: Paul Morphy – Duke Karl / Count Isouard | Paris · Paris · 1858 | 1-0 | `Qb8+ Nxb8 Rd8#` | yes | pgnmentor `Morphy.pgn`; chessgames [1233404](https://www.chessgames.com/perl/chessgame?gid=1233404) |
| 10 | Easy | 2 | Emanuel Lasker – Henry Edward Bird | Lasker - Bird · Liverpool · 1890 | 1-0 | `Ng5+ hxg5 Rh1#` | yes | pgnmentor `Lasker.pgn`; chessgames [1028143](https://www.chessgames.com/perl/chessgame?gid=1028143) |
| 11 | Easy | 2 | Johannes Zukertort – Adolf Anderssen | Casual Game · Breslau · 1865 | 1-0 | `Ba5+ Qxa5 Qe7#` | yes | pgnmentor `Zukertort.pgn`; chessgames [1019268](https://www.chessgames.com/perl/chessgame?gid=1019268) |
| 12 | Easy | 2 | James Mason – Mikhail Chigorin | Paris · Paris · 1900 | 0-1 | `Ra3+ Rxa3 Qb2#` | yes | pgnmentor `Chigorin.pgn`; chessgames [1000075](https://www.chessgames.com/perl/chessgame?gid=1000075) |
| 13 | Easy | 2 | Karl Mayet – Adolf Anderssen | Casual Game · Berlin · 1855 | 0-1 | `Qh1+ Rxh1 Rxh1#` | yes | pgnmentor `Anderssen.pgn`; chessgames [1018996](https://www.chessgames.com/perl/chessgame?gid=1018996) |
| 14 | Easy | 2 | Greenblatt (Computer) – Robert James Fischer | Computer match · Cambridge · 1977 | 0-1 | `Rf1+ Nxf1 Qd1#` | yes | pgnmentor `Fischer.pgn`; chessgames [1294689](https://www.chessgames.com/perl/chessgame?gid=1294689) |
| 15 | Easy | 2 | Harry Nelson Pillsbury – Geza Maroczy | Paris · Paris · 1900 | 1-0 | `Qxh7+ Kxh7 Kg2#` | yes | pgnmentor `Pillsbury.pgn`; chessgames [1000043](https://www.chessgames.com/perl/chessgame?gid=1000043) |
| 16 | Standard | 3 | Daniel Harrwitz – Adolf Anderssen | Anderssen - Harrwitz · Breslau · 1848 | 1-0 | `Nf6+ Kg7 Qxh7+ Kxf6 Ng4#` | yes | pgnmentor `Anderssen.pgn`; chessgames [1001282](https://www.chessgames.com/perl/chessgame?gid=1001282) |
| 17 | Standard | 3 | Max Euwe – Richard Reti | Reti - Euwe · Amsterdam · 1920 | 1-0 | `Rd7+ Ka8 Nxb6+ Kb8 Bd6#` | yes | pgnmentor `Reti.pgn`; chessgames [1041900](https://www.chessgames.com/perl/chessgame?gid=1041900) |
| 18 | Standard | 3 | Adolf Anderssen – Ignatz von Kolisch | Paris · Paris · 1860 | 1-0 | `Rd3+ Ke2 Qd1+ Kf2 Rf3#` | yes | pgnmentor `Anderssen.pgn`; chessgames [1080409](https://www.chessgames.com/perl/chessgame?gid=1080409) |
| 19 | Standard | 3 | **Evergreen Game**: Adolf Anderssen – Jean Dufresne | Casual Game · Berlin · 1852 | 1-0 | `Bf5+ Ke8 Bd7+ Kf8 Bxe7#` | yes | pgnmentor `Anderssen.pgn`; chessgames [1018961](https://www.chessgames.com/perl/chessgame?gid=1018961) |
| 20 | Standard | 3 | Wilhelm Steinitz – Augustus Mongredien | B.C.A. Grand Tourney · London · 1862 | 1-0 | `Qxg6+ Kd8 Rf8+ Qe8 Qxe8#` | yes | pgnmentor `Steinitz.pgn`; chessgames [1001497](https://www.chessgames.com/perl/chessgame?gid=1001497) |
| 21 | Standard | 3 | Adolf Anderssen – Emil Schallopp | 2nd NSB Congress, Hamburg · Altona · 1869 | 1-0 | `Qf6+ Kg8 Re8+ Qf8 Ne7#` | yes | pgnmentor `Anderssen.pgn`; chessgames [1337010](https://www.chessgames.com/perl/chessgame?gid=1337010) |
| 22 | Standard | 3 | Howard Staunton – Elijah Williams | Staunton - Williams · London · 1851 | 0-1 | `Nh2+ Ke1 Nf3+ Kf1 Rf2#` | yes | pgnmentor `Staunton.pgn`; chessgames [1271931](https://www.chessgames.com/perl/chessgame?gid=1271931) |
| 23 | Standard | 3 | Emanuel Lasker – Gyula Breyer | Simul, 30b · Budapest · 1911 | 0-1 | `Qg5+ Kh2 Qh4+ Kg2 Qh3#` | yes | pgnmentor `Lasker.pgn`; chessgames [1033522](https://www.chessgames.com/perl/chessgame?gid=1033522) |
| 24 | Standard | 3 | Alexander Beaufort Meek – Paul Morphy | Casual Game · New Orleans · 1855 | 0-1 | `Qg4+ Kh1 Qh3+ Kg1 Nf3#` | yes | pgnmentor `Morphy.pgn`; chessgames [1336385](https://www.chessgames.com/perl/chessgame?gid=1336385) |
| 25 | Standard | 3 | Joseph Henry Blackburne – Wilhelm Steinitz | London · London · 1883 | 1-0 | `Qh6+ Kg8 Rf8+ Qxf8 Qxh7#` | yes | pgnmentor `Steinitz.pgn`; chessgames [1001879](https://www.chessgames.com/perl/chessgame?gid=1001879) |
| 26 | Hard | 3 | **Immortal Game**: Adolf Anderssen – Lionel Kieseritzky | Casual game · London · 1851 | 1-0 | `Nxg7+ Kd8 Qf6+ Nxf6 Be7#` | yes | pgnmentor `Anderssen.pgn`; chessgames [1018910](https://www.chessgames.com/perl/chessgame?gid=1018910) |
| 27 | Hard | 3 | Richard Reti – Savielly Tartakower | Vienna · Vienna · 1910 | 1-0 | `Qd8+ Kxd8 Bg5+ Kc7 Bd8#` | yes | pgnmentor `Tartakower.pgn`; chessgames [1250654](https://www.chessgames.com/perl/chessgame?gid=1250654) |
| 28 | Hard | 3 | James McConnell – Paul Morphy | New Orleans · New Orleans · 1849 | 0-1 | `Nh3+ Kh1 Qg1+ Rxg1 Nf2#` | yes | pgnmentor `Morphy.pgn`; chessgames [1075508](https://www.chessgames.com/perl/chessgame?gid=1075508) |
| 29 | Hard | 3 | Carl Hamppe – Wilhelm Steinitz | Vienna · Vienna · 1859 | 0-1 | `Qd2+ Kb1 Qd1+ Rxd1 Rxd1#` | yes | pgnmentor `Steinitz.pgn`; chessgames [1228226](https://www.chessgames.com/perl/chessgame?gid=1228226) |

## Notes

- **Evergreen Game**: chessgames.com gives the score up to 20...Nxe7 (Schachzeitung, Sept 1852) and the mating finish 21.Qxd7+ Kxd7 22.Bf5+ Ke8 23.Bd7+ Kf8 24.Bxe7# as the ending published in Schachzeitung, Oct 1852, p383. Its first 40 plies are identical to the pgnmentor score and the published ending is identical to the last 7 plies.
- **Immortal Game**: chessgames.com notes that the score printed in La Regence (July 1851) ends at 19.Ke2; the complete score with 21.Nxg7+ Kd8 22.Qf6+ Nxf6 23.Be7# comes from The Chess Player (19 July 1851). That main line is identical to the pgnmentor score.

"Level" is the difficulty band: *Easy* = mate in 2; *Standard* = mate in 3; *Hard* = mate in 3 that includes a queen sacrifice. In the adventure the 25 checkmate fights (4 battles and the boss of each world, in play order) walk this table from top to bottom, so difficulty only grows and, with at least 25 puzzles, no game is dealt twice; spare puzzles stay in reserve, chosen evenly among the untitled games, so the famous named games are always played (see `LevelModes.MatePuzzle` and `MatePuzzleBank.ForFight`).

## Famous games

- **Opera Game**: Paul Morphy – Duke Karl / Count Isouard, Paris 1858.
- **Evergreen Game**: Adolf Anderssen – Jean Dufresne, Berlin 1852.
- **Immortal Game**: Adolf Anderssen – Lionel Kieseritzky, London 1851.

The others are real tournament, match, casual or exhibition games (1848–1977), mostly won by world-class players of their time (players: Anderssen, Staunton, Mayet, Tarrasch, Walbrodt, Mason, Lasker, Tartakower, Colle, Marco, Nimzowitsch, Alapin, Bird, Zukertort, Chigorin, Greenblatt, Fischer, Pillsbury, Maroczy, Harrwitz, Euwe, Reti, Kolisch, Steinitz, Mongredien, Schallopp, Williams, Breyer, Meek, Morphy, Blackburne, McConnell, Hamppe) that are less famous as games; they are listed under their own names and are not presented as famous.

## Regenerating

See `tools/mate-puzzles/README.md`.

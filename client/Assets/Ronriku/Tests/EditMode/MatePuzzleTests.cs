using System;
using System.Collections.Generic;
using System.Linq;
using NUnit.Framework;
using Ronriku.Domain.Adventure;
using Ronriku.Domain.Arcade;
using Ronriku.Domain.Chess;
using Ronriku.Domain.Puzzles;

namespace Ronriku.Tests
{
    /// <summary>
    /// The Checkmate cards. Every puzzle is a real game (see docs/MATE_PUZZLES.md): these tests re-prove, with the
    /// game's own engine, that the stored game is legal move by move, reaches the stored position, that the rest of the
    /// game is a forced checkmate in 2–3 moves, and that at every step the solution is the ONLY move that works.
    /// </summary>
    public sealed class MatePuzzleTests
    {
        private static IEnumerable<MatePuzzle> Puzzles => MatePuzzleBank.All;

        [Test]
        public void Bank_HasEnoughRealGames_WithCreditsAndSources()
        {
            Assert.That(MatePuzzleBank.All.Count, Is.GreaterThanOrEqualTo(10));
            Assert.That(MatePuzzleBank.All.Select(p => p.Id).Distinct().Count(), Is.EqualTo(MatePuzzleBank.All.Count), "unique ids");
            foreach (MatePuzzle p in Puzzles)
            {
                Assert.That(p.White, Is.Not.Empty, p.Id);
                Assert.That(p.Black, Is.Not.Empty, p.Id);
                Assert.That(p.Site, Is.Not.Empty, p.Id);
                Assert.That(p.Date, Does.Match(@"^\d{4}$"), p.Id);
                Assert.That(p.Source, Does.Contain("pgnmentor.com").And.Match(@"chessgames\.com gid \d+"), $"{p.Id}: both independent sources are recorded");
                Assert.That(p.Result, Is.EqualTo("1-0").Or.EqualTo("0-1"), p.Id);
                Assert.That(p.MateIn, Is.InRange(2, 3), p.Id);
            }
        }

        [Test]
        public void EveryGame_IsLegal_ReachesTheStoredPosition_AndEndsInCheckmate()
        {
            foreach (MatePuzzle p in Puzzles)
            {
                Position start = p.Start; // replays the whole game; throws on any illegal move
                Assert.That(start.PlacementKey(), Is.EqualTo(p.StartFen), $"{p.Id}: start position");
                Assert.That(p.Solution.Count, Is.EqualTo(2 * p.MateIn - 1), $"{p.Id}: solution length");
                Assert.That(p.StartPly + p.Solution.Count, Is.EqualTo(p.GameMoves.Length), $"{p.Id}: the solution is the end of the game");

                Position pos = start;
                foreach (Move m in p.Solution) pos = pos.Play(m);
                Assert.That(pos.IsCheckmate, Is.True, $"{p.Id}: the game ends in checkmate");

                bool whiteWon = p.Result == "1-0";
                Assert.That(p.Attacker, Is.EqualTo(whiteWon ? Side.White : Side.Black), $"{p.Id}: the player moves for the winner");
                Assert.That(p.SolutionSan.Last(), Does.EndWith("#"), p.Id);
            }
        }

        [Test]
        public void Solution_IsForcedMate_Unique_AndNotShorter_AtEveryStep()
        {
            foreach (MatePuzzle p in Puzzles)
            {
                Position pos = p.Start;
                for (int step = 0; step < p.MateIn; step++)
                {
                    int left = p.MateIn - step;
                    List<Move> forcing = MateSolver.ForcingMoves(pos, left);
                    Assert.That(forcing.Count, Is.EqualTo(1), $"{p.Id} step {step + 1}: exactly one move forces mate in {left}");
                    Assert.That(forcing[0], Is.EqualTo(p.Solution[2 * step]), $"{p.Id} step {step + 1}: it is the move played in the game");
                    if (left > 1)
                        Assert.That(MateSolver.ForcingMoves(pos, left - 1), Is.Empty, $"{p.Id} step {step + 1}: no faster mate exists");
                    pos = pos.Play(p.Solution[2 * step]);
                    if (2 * step + 1 < p.Solution.Count) pos = pos.Play(p.Solution[2 * step + 1]);
                }
            }
        }

        [Test]
        public void AllChecksFlag_MatchesTheSolution()
        {
            foreach (MatePuzzle p in Puzzles)
            {
                Position pos = p.Start;
                bool allChecks = true;
                for (int i = 0; i < p.Solution.Count; i++)
                {
                    pos = pos.Play(p.Solution[i]);
                    if (i % 2 == 0 && !pos.IsCheck) allChecks = false;
                }
                Assert.That(p.AllChecks, Is.EqualTo(allChecks), p.Id);
            }
        }

        [Test]
        public void Session_PlayingTheSolution_Solves_WithTheGamesOwnReplies()
        {
            foreach (MatePuzzle p in Puzzles)
            {
                var s = new MateSession(p);
                for (int step = 0; step < p.MateIn; step++)
                {
                    Move m = p.Solution[2 * step];
                    MoveResult r = s.TryMove(m.From, m.To);
                    if (step < p.MateIn - 1)
                    {
                        Assert.That(r.Outcome, Is.EqualTo(MoveOutcome.Correct), $"{p.Id} step {step + 1}");
                        Assert.That(r.Reply, Is.EqualTo(p.Solution[2 * step + 1]), $"{p.Id}: the reply is the one from the game");
                    }
                    else Assert.That(r.Outcome, Is.EqualTo(MoveOutcome.Solved), p.Id);
                }
                Assert.That(s.Solved && !s.Failed && s.Mistakes == 0 && s.Position.IsCheckmate, Is.True, p.Id);
            }
        }

        [Test]
        public void Session_EveryOtherLegalMove_IsWrong_Explained_AndTakenBack()
        {
            foreach (MatePuzzle p in Puzzles)
            {
                Position pos = p.Start;
                foreach (Move wrong in pos.LegalMoves().Where(m => m != p.Solution[0]))
                {
                    var s = new MateSession(p);
                    MoveResult r = s.TryMove(wrong.From, wrong.To);
                    // promotion squares default to a queen; any queen/other promotion of the same squares is wrong too
                    Assert.That(r.Outcome, Is.EqualTo(MoveOutcome.Wrong), $"{p.Id}: {pos.ToSan(wrong)}");
                    Assert.That(r.Message, Is.Not.Empty, $"{p.Id}: {pos.ToSan(wrong)}");
                    Assert.That(r.Message.Length, Is.LessThanOrEqualTo(48), r.Message);
                    Assert.That(s.Position.ToFen(), Is.EqualTo(pos.ToFen()), "a wrong move is taken back");
                    Assert.That(s.Mistakes, Is.EqualTo(1));
                }
            }
        }

        [Test]
        public void Session_IllegalMoves_AreRefused_WithoutPenalty_AndThreeMistakesEndTheCard()
        {
            MatePuzzle p = MatePuzzleBank.All[0];
            var s = new MateSession(p);
            Position pos = p.Start;

            int refused = 0;
            for (int from = 0; from < 64; from++)
            for (int to = 0; to < 64; to++)
            {
                if (pos.LegalMoves().Any(m => m.From == from && m.To == to)) continue;
                MoveResult r = s.TryMove(from, to);
                Assert.That(r.Outcome, Is.EqualTo(MoveOutcome.Illegal), $"{Squares.Name(from)}{Squares.Name(to)}");
                Assert.That(r.Message, Is.Not.Empty);
                refused++;
            }
            Assert.That(refused, Is.GreaterThan(3000));
            Assert.That(s.Mistakes, Is.EqualTo(0), "illegal moves cost nothing");
            Assert.That(s.Position.ToFen(), Is.EqualTo(pos.ToFen()));

            Move[] wrongMoves = pos.LegalMoves().Where(m => m != p.Solution[0]).Take(3).ToArray();
            Assert.That(s.TryMove(wrongMoves[0].From, wrongMoves[0].To).Outcome, Is.EqualTo(MoveOutcome.Wrong));
            Assert.That(s.TryMove(wrongMoves[1].From, wrongMoves[1].To).Outcome, Is.EqualTo(MoveOutcome.Wrong));
            Assert.That(s.TryMove(wrongMoves[2].From, wrongMoves[2].To).Outcome, Is.EqualTo(MoveOutcome.Failed));
            Assert.That(s.Failed && s.Over && !s.Solved, Is.True);
            Assert.That(s.TryMove(p.Solution[0].From, p.Solution[0].To).Outcome, Is.EqualTo(MoveOutcome.Ignored));
            Assert.That(s.RemainingSolution(), Is.EqualTo(string.Join(" ", p.SolutionSan)));
        }

        [Test]
        public void Session_OnlyThePlayersOwnPieces_CanBeMoved_AndHintWalksThroughTheSolution()
        {
            MatePuzzle p = MatePuzzleBank.All[0];
            var s = new MateSession(p);
            Position pos = p.Start;
            int enemy = Enumerable.Range(0, 64).First(sq => pos.HasPieceOf(sq, Position.Opposite(p.Attacker)));
            Assert.That(s.LegalMovesFrom(enemy), Is.Empty);
            Assert.That(s.TryMove(enemy, (enemy + 8) % 64).Outcome, Is.EqualTo(MoveOutcome.Illegal));

            var (from, to) = s.Hint();
            Assert.That(from, Is.EqualTo((int)p.Solution[0].From));
            Assert.That(to, Is.EqualTo(-1), "first hint names the piece only");
            (from, to) = s.Hint();
            Assert.That(to, Is.EqualTo((int)p.Solution[0].To), "second hint gives the move");
            Assert.That(s.Mistakes, Is.EqualTo(0), "hints are free");

            Move first = p.Solution[0];
            s.TryMove(first.From, first.To);
            Assert.That(s.HintLevel, Is.EqualTo(0), "a new step starts without a hint");
        }

        [Test]
        public void ForFight_WalksTheBankEasyToHard_WithoutRepeats()
        {
            int n = MatePuzzleBank.All.Count;
            // the bank is ordered easiest → hardest
            Assert.That(MatePuzzleBank.All.Select(p => (int)p.Difficulty).ToList(), Is.Ordered);

            foreach (int fights in new[] { LevelModes.MateFights, n, n + 7, 2 * n + 3, Math.Max(2, n / 2) })
            {
                var dealt = Enumerable.Range(0, fights).Select(f => MatePuzzleBank.ForFight(f, fights)).ToList();
                Assert.That(dealt.All(i => i >= 0 && i < n), $"{fights} fights stay in the bank");
                Assert.That(dealt[0], Is.EqualTo(0), "the adventure opens with the easiest puzzle");
                Assert.That(dealt[fights - 1], Is.GreaterThanOrEqualTo(n >= fights ? n - 1 : n - 2), "and ends with the hardest");
                for (int f = 1; f < fights; f++)
                    Assert.That(dealt[f], Is.Not.EqualTo(dealt[f - 1]), $"{fights} fights: fight {f} repeats the previous puzzle");
                if (n >= fights)
                {
                    Assert.That(dealt.Distinct().Count(), Is.EqualTo(fights), $"{fights} fights: no puzzle is dealt twice");
                    Assert.That(dealt, Is.Ordered, $"{fights} fights: puzzles never get easier");
                }
                Assert.That(MatePuzzleBank.ForFight(fights / 2, fights), Is.EqualTo(dealt[fights / 2]), "deterministic");
            }
        }

        [Test]
        public void Battles_ShowACheckmateBigCard_AlongTheAdventure()
        {
            var seen = new List<int>();
            for (int w = 0; w < LevelDef.WorldCount; w++)
            for (int i = 0; i < LevelDef.LevelsPerWorld; i++)
            {
                LevelDef def = LevelDef.For(w, i);
                if (LevelModes.For(i) != LevelMode.Battle && LevelModes.For(i) != LevelMode.Boss) continue;
                BattleConfig config = i == LevelDef.BossIndex ? LevelModes.BossBattle(def) : LevelModes.Battle(def);
                Assert.That(config.MatePuzzle, Is.InRange(0, MatePuzzleBank.All.Count - 1), $"w{w} l{i}");
                Assert.That(LevelModes.MateFight(w, i), Is.EqualTo(seen.Count), $"w{w} l{i}: fights are numbered in play order");
                if (seen.Count > 0 && MatePuzzleBank.All.Count >= LevelModes.MateFights)
                    Assert.That(MatePuzzleBank.All[config.MatePuzzle].Difficulty, Is.GreaterThanOrEqualTo(MatePuzzleBank.All[seen[seen.Count - 1]].Difficulty),
                        $"w{w} l{i}: puzzles never get easier");
                seen.Add(config.MatePuzzle);

                // the first big card of the fight is the checkmate puzzle; the following ones stay classic
                var battle = new BattleState(config);
                for (int card = 0; card < BattleState.BigCardEvery - 1; card++) battle.Answer(battle.Current.Answer, 3000);
                Challenge big = battle.Current;
                Assert.That(big.Kind, Is.EqualTo(ChallengeKind.Classic), $"w{w} l{i}");
                Assert.That(big.Items[0], Is.EqualTo(Challenges.MateTrial), $"w{w} l{i}");
                Assert.That(big.Items[1], Is.InRange(0, MatePuzzleBank.All.Count - 1));
                Assert.That(big.Prompt, Is.EqualTo("BIG CARD · CHECKMATE"));
                Assert.That(Challenges.IsMateChoice(big), Is.EqualTo(w < LevelDef.WorldCount - 1),
                    $"w{w} l{i}: move options in worlds 1–4, the full board in the last world");

                // deterministic: the same level always deals the same puzzle
                var again = new BattleState(config);
                for (int card = 0; card < BattleState.BigCardEvery - 1; card++) again.Answer(again.Current.Answer, 3000);
                Assert.That(again.Current.Items[1], Is.EqualTo(big.Items[1]));
                Assert.That(big.Items[1], Is.EqualTo(config.MatePuzzle), $"w{w} l{i}: the card deals the fight's puzzle");
            }
            Assert.That(seen.Count, Is.EqualTo(LevelModes.MateFights));
            Assert.That(seen[0], Is.EqualTo(0), "the first fight gets the easiest puzzle");
            Assert.That(seen[seen.Count - 1], Is.GreaterThanOrEqualTo(MatePuzzleBank.All.Count - (MatePuzzleBank.All.Count >= LevelModes.MateFights ? 1 : 2)),
                "the last boss gets the hardest");
            for (int f = 1; f < seen.Count; f++) Assert.That(seen[f], Is.Not.EqualTo(seen[f - 1]), $"fight {f} repeats the previous fight's game");
            if (MatePuzzleBank.All.Count >= LevelModes.MateFights)
            {
                Assert.That(seen.Distinct().Count(), Is.EqualTo(seen.Count), "every fight of the adventure deals a different real game");
                foreach (MatePuzzle famous in MatePuzzleBank.All.Where(p => !string.IsNullOrEmpty(p.Title)))
                    Assert.That(seen.Select(i => MatePuzzleBank.All[i]), Does.Contain(famous), $"the {famous.Title} is played in the adventure, not left in reserve");
            }
        }

        [Test]
        public void Choices_OfferTheGameMove_AndTwoLegalWrongMoves_AtEveryStep()
        {
            int checks = 0, total = 0;
            var forcing = new Dictionary<string, List<Move>>(); // the position at a step is the same for every seed
            foreach (MatePuzzle puzzle in MatePuzzleBank.All)
            for (long seed = 1; seed <= 20; seed++)
            {
                var session = new MateSession(puzzle, MateChoices.MaxMistakes);
                while (!session.Solved)
                {
                    Move[] options = MateChoices.For(session, seed);
                    string at = $"{puzzle.Id} seed {seed} step {session.Step}";
                    Assert.That(options.Length, Is.EqualTo(MateChoices.Count), at);
                    Assert.That(options.Count(m => m == session.Expected), Is.EqualTo(1), $"{at}: the game's move is offered once");
                    Assert.That(options.Distinct().Count(), Is.EqualTo(options.Length), $"{at}: no duplicates");
                    var labels = options.Select(m => MateChoices.Label(session.Position, m, options)).ToList();
                    Assert.That(labels.Distinct().Count(), Is.EqualTo(options.Length), $"{at}: every button reads differently");
                    foreach (Move m in options)
                    {
                        Assert.That(session.Position.IsLegal(m), Is.True, $"{at}: {m} is legal");
                        if (m == session.Expected) continue;
                        total++;
                        if (session.Position.Play(m).IsCheck) checks++;
                        string key = $"{puzzle.Id}/{session.Step}";
                        if (!forcing.TryGetValue(key, out List<Move> winning))
                            forcing[key] = winning = MateSolver.ForcingMoves(session.Position, session.MovesLeft);
                        Assert.That(winning, Has.No.Member(m), $"{at}: {m} is really wrong");
                    }
                    Assert.That(MateChoices.For(session, seed), Is.EqualTo(options), $"{at}: deterministic");
                    MoveResult r = session.TryMove(session.Expected.From, session.Expected.To);
                    Assert.That(r.Outcome, Is.EqualTo(MoveOutcome.Correct).Or.EqualTo(MoveOutcome.Solved), at);
                }
            }
            // tempting, not random: most wrong options give check or take something
            TestContext.WriteLine($"wrong options that give check: {checks}/{total}");
            Assert.That(checks, Is.GreaterThan(total / 3));
        }

        [Test]
        public void Choices_TwoWrongPicksLoseTheCard()
        {
            MatePuzzle puzzle = MatePuzzleBank.All[0];
            var session = new MateSession(puzzle, MateChoices.MaxMistakes);
            Move[] options = MateChoices.For(session, 7);
            Move[] wrong = options.Where(m => m != session.Expected).ToArray();
            Assert.That(session.TryMove(wrong[0].From, wrong[0].To).Outcome, Is.EqualTo(MoveOutcome.Wrong));
            Assert.That(session.MistakesLeft, Is.EqualTo(1));
            Assert.That(session.TryMove(wrong[1].From, wrong[1].To).Outcome, Is.EqualTo(MoveOutcome.Failed));
            Assert.That(session.Over, Is.True);
        }

        [Test]
        public void Difficulty_Maps_ToTheScoringTables()
        {
            foreach (PuzzleDifficulty d in new[] { PuzzleDifficulty.Easy, PuzzleDifficulty.Standard, PuzzleDifficulty.Hard })
            {
                Assert.That(TrialScoring.TargetMilliseconds("mate", d), Is.GreaterThan(0));
                Assert.That(TrialScoring.TimeLimitSeconds("mate", d), Is.GreaterThan(TrialScoring.TargetMilliseconds("mate", d) / 1000));
            }
        }
    }
}

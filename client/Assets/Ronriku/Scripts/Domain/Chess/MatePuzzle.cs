using System;
using System.Collections.Generic;
using Ronriku.Domain.Puzzles;

namespace Ronriku.Domain.Chess
{
    /// <summary>
    /// One checkmate puzzle taken from a real game. The whole game is stored as SAN so the position and the
    /// solution are derived (and re-checked by the tests) instead of being typed in as a separate FEN:
    /// the puzzle starts at <see cref="StartPly"/> (0-based ply of the winner's first solution move) and the
    /// rest of the game IS the solution, ending in checkmate. The defender's replies are the moves that were
    /// actually played.
    /// </summary>
    public sealed class MatePuzzle
    {
        public string Id { get; }
        /// <summary>Common name of the game, or null.</summary>
        public string Title { get; }
        public string White { get; }
        public string Black { get; }
        public string Event { get; }
        public string Site { get; }
        public string Date { get; }
        public string Result { get; }
        /// <summary>Where the game text comes from and what it was cross-checked against.</summary>
        public string Source { get; }
        /// <summary>Number of the winner's moves from the start position to checkmate (2 or 3).</summary>
        public int MateIn { get; }
        public PuzzleDifficulty Difficulty { get; }
        public int StartPly { get; }
        /// <summary>
        /// FEN (first four fields) of the start position as computed by chess.js when the puzzle was generated.
        /// Used only by the tests: the engine's own replay must land on exactly this position.
        /// </summary>
        public string StartFen { get; }
        public string[] GameMoves { get; }

        private Position _start;
        private Move[] _solution;
        private string[] _solutionSan;

        public MatePuzzle(string id, string title, string white, string black, string eventName, string site, string date,
            string result, string source, int mateIn, PuzzleDifficulty difficulty, int startPly, string startFen, string gameMoves)
        {
            StartFen = startFen;
            Id = id;
            Title = title;
            White = white;
            Black = black;
            Event = eventName;
            Site = site;
            Date = date;
            Result = result;
            Source = source;
            MateIn = mateIn;
            Difficulty = difficulty;
            StartPly = startPly;
            GameMoves = gameMoves.Split(new[] { ' ' }, StringSplitOptions.RemoveEmptyEntries);
        }

        /// <summary>The position the player sees (after the game's first <see cref="StartPly"/> plies).</summary>
        public Position Start
        {
            get
            {
                Build();
                return _start;
            }
        }

        /// <summary>Solution as played: attacker, defender, attacker, … ending with the mating move.</summary>
        public IReadOnlyList<Move> Solution
        {
            get
            {
                Build();
                return _solution;
            }
        }

        public IReadOnlyList<string> SolutionSan
        {
            get
            {
                Build();
                return _solutionSan;
            }
        }

        /// <summary>The side that delivers mate (and the one the player controls).</summary>
        public Side Attacker => Start.Turn;

        /// <summary>True when every move the player has to make is a check.</summary>
        public bool AllChecks
        {
            get
            {
                Position p = Start;
                for (int i = 0; i < Solution.Count; i++)
                {
                    p = p.Play(Solution[i]);
                    if (i % 2 == 0 && !p.IsCheck) return false;
                }
                return true;
            }
        }

        /// <summary>Short credit line, e.g. "Morphy – Duke of Brunswick & Count Isouard, Paris 1858".</summary>
        public string Credit => $"{White} – {Black}, {Site} {Date}";

        private void Build()
        {
            if (_solution != null) return;
            Position p = Position.Start();
            var moves = new List<Move>();
            for (int i = 0; i < GameMoves.Length; i++)
            {
                if (i == StartPly) _start = p;
                Move m = p.ParseSan(GameMoves[i]);
                if (i >= StartPly) moves.Add(m);
                p = p.Play(m);
            }
            if (_start == null) throw new InvalidOperationException($"{Id}: start ply {StartPly} is beyond the game.");
            var san = new string[moves.Count];
            Position q = _start;
            for (int i = 0; i < moves.Count; i++)
            {
                san[i] = q.ToSan(moves[i]);
                q = q.Play(moves[i]);
            }
            _solutionSan = san;
            _solution = moves.ToArray();
        }
    }

    /// <summary>The curated bank (see MatePuzzleBank.Data.cs) and how battles pick from it.</summary>
    public static partial class MatePuzzleBank
    {
        /// <summary>Puzzles ordered from easiest to hardest.</summary>
        public static IReadOnlyList<MatePuzzle> All => Puzzles;

        public static MatePuzzle ById(string id)
        {
            foreach (MatePuzzle p in Puzzles) if (p.Id == id) return p;
            return null;
        }

        /// <summary>
        /// Bank index of the puzzle dealt in the <paramref name="fight"/>-th checkmate fight of the adventure (0 …
        /// <paramref name="fights"/> − 1, in play order). Fights walk the difficulty-ordered bank from easiest to hardest,
        /// so difficulty never drops; while the bank has at least as many puzzles as there are fights, no puzzle is dealt
        /// twice. A smaller bank repeats some, but never in two fights in a row.
        /// </summary>
        public static int ForFight(int fight, int fights)
        {
            int n = Puzzles.Length;
            if (fights <= 1 || n <= 1) return 0;
            fight = Math.Max(0, Math.Min(fights - 1, fight));
            if (n >= fights) return Dealt(fights)[fight];
            // Smaller bank: follow the same ramp, stepping one puzzle aside whenever it would repeat the previous fight.
            int previous = -1, index = 0;
            for (int k = 0; k <= fight; k++)
            {
                index = (int)Math.Round(k * (n - 1) / (double)(fights - 1));
                if (index == previous) index = index + 1 <= n - 1 ? index + 1 : index - 1;
                previous = index;
            }
            return index;
        }

        /// <summary>
        /// For a bank at least as large as the adventure: the <paramref name="fights"/> puzzles that are dealt, in bank
        /// order. The spare ones stay in reserve, picked evenly among the untitled games — the famous named games (Opera,
        /// Evergreen, Immortal …), the easiest and the hardest are always dealt.
        /// </summary>
        private static int[] Dealt(int fights)
        {
            int n = Puzzles.Length, spare = n - fights;
            var untitled = new List<int>();
            var titled = new List<int>();
            for (int i = 1; i < n - 1; i++) (string.IsNullOrEmpty(Puzzles[i].Title) ? untitled : titled).Add(i);
            var reserve = new HashSet<int>();
            foreach (List<int> pool in new[] { untitled, titled })
            {
                int take = Math.Min(spare - reserve.Count, pool.Count);
                for (int j = 0; j < take; j++) reserve.Add(pool[(int)((j + 0.5) * pool.Count / take)]);
            }
            var dealt = new List<int>(fights);
            for (int i = 0; i < n; i++) if (!reserve.Contains(i)) dealt.Add(i);
            return dealt.ToArray();
        }
    }
}

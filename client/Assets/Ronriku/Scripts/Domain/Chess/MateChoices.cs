using System;
using System.Collections.Generic;

namespace Ronriku.Domain.Chess
{
    /// <summary>
    /// Answer options for the easy CHECKMATE card (worlds 1–4): the board cannot be touched, the player picks one of
    /// <see cref="Count"/> moves. One is the game's move; the others are legal moves of the attacker chosen to look
    /// tempting (checks, captures, the same piece, squares near the king). The solution is proven unique, so every
    /// other legal move really fails.
    /// </summary>
    public static class MateChoices
    {
        public const int Count = 3;

        /// <summary>Wrong picks allowed before the card is lost (the full-board card allows <see cref="MateSession.MaxMistakes"/>).</summary>
        public const int MaxMistakes = 2;

        /// <summary>Options for the current step of <paramref name="session"/>, in display order.</summary>
        public static Move[] For(MateSession session, long seed) =>
            For(session.Position, session.Expected, unchecked(seed * 31 + session.Step));

        public static Move[] For(Position position, Move expected, long seed)
        {
            var rng = new DeterministicRandom(unchecked((ulong)seed ^ 0x9E3779B97F4A7C15UL));
            int enemyKing = position.KingSquare(Position.Opposite(position.Turn));
            PieceType expectedType = position.TypeAt(expected.From);

            var scored = new List<(Move move, int score, int tie)>();
            foreach (Move m in position.LegalMoves())
            {
                if (m.From == expected.From && m.To == expected.To) continue; // the same move with another promotion
                if (m.Promotion != PieceType.None && m.Promotion != PieceType.Queen) continue;
                Position after = position.Play(m);
                if (after.IsCheckmate) continue; // cannot happen with a unique solution; never offer a second right answer
                int score = 0;
                if (after.IsCheck) score += 4;
                if (!position.IsEmpty(m.To)) score += 2;
                if (position.TypeAt(m.From) == expectedType) score += 2;
                if (Distance(m.To, enemyKing) <= 2) score += 1;
                if (position.TypeAt(m.From) == PieceType.King) score -= 3;
                scored.Add((m, score, rng.NextInt(1000)));
            }
            scored.Sort((a, b) => b.score != a.score ? b.score - a.score : a.tie - b.tie);

            // Two distractors drawn from the most tempting few, so the same position does not always offer the same pair.
            var pool = scored.GetRange(0, Math.Min(5, scored.Count));
            var options = new List<Move> { expected };
            while (options.Count < Count && pool.Count > 0)
            {
                int pick = rng.NextInt(pool.Count);
                options.Add(pool[pick].move);
                pool.RemoveAt(pick);
            }
            for (int i = options.Count - 1; i > 0; i--)
            {
                int j = rng.NextInt(i + 1);
                (options[i], options[j]) = (options[j], options[i]);
            }
            return options.ToArray();
        }

        /// <summary>
        /// Button text for a move, e.g. ("QUEEN", "TAKES H7"). <paramref name="others"/> are the other options: when two
        /// of them read the same (two rooks to d8) the starting square is added.
        /// </summary>
        public static (string piece, string action) Label(Position position, Move move, IReadOnlyList<Move> others)
        {
            string piece = Position.Name(position.TypeAt(move.From));
            bool capture = !position.IsEmpty(move.To) || position.TypeAt(move.From) == PieceType.Pawn && Squares.File(move.From) != Squares.File(move.To);
            string action = (capture ? "TAKES " : "TO ") + Squares.Name(move.To).ToUpperInvariant();
            if (move.Promotion != PieceType.None) action += " = " + Position.Name(move.Promotion);
            foreach (Move o in others)
                if (o != move && o.To == move.To && position.TypeAt(o.From) == position.TypeAt(move.From))
                    return (piece + " " + Squares.Name(move.From).ToUpperInvariant(), action);
            return (piece, action);
        }

        private static int Distance(int a, int b) =>
            Math.Max(Math.Abs(Squares.File(a) - Squares.File(b)), Math.Abs(Squares.Rank(a) - Squares.Rank(b)));
    }
}

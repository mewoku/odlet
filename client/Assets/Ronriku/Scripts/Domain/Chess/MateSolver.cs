using System.Collections.Generic;

namespace Ronriku.Domain.Chess
{
    /// <summary>
    /// Exhaustive forced-mate search. "Mate in n" means the side to move (the attacker) can checkmate within
    /// n of his own moves whatever the defender answers. Used to prove that every shipped puzzle has exactly
    /// one solution at each step and to explain wrong moves; the game itself follows the recorded solution.
    /// </summary>
    public static class MateSolver
    {
        /// <summary>The side to move can force mate within <paramref name="n"/> of his own moves.</summary>
        public static bool AttackerForcesMate(Position position, int n)
        {
            if (n < 1) return false;
            List<Move> moves = position.LegalMoves();
            foreach (Move m in moves)
                if (position.Apply(m).IsCheckmate) return true;
            if (n == 1) return false;
            foreach (Move m in moves)
                if (DefenderLoses(position.Apply(m), n - 1)) return true;
            return false;
        }

        /// <summary>The side to move (the defender) is mated by force within <paramref name="n"/> attacker moves.</summary>
        public static bool DefenderLoses(Position position, int n)
        {
            List<Move> replies = position.LegalMoves();
            if (replies.Count == 0) return false; // stalemate (a mated defender is handled by the caller)
            foreach (Move r in replies)
                if (!AttackerForcesMate(position.Apply(r), n)) return false;
            return true;
        }

        /// <summary>Every first move that forces mate within <paramref name="n"/> moves (including mate in one).</summary>
        public static List<Move> ForcingMoves(Position position, int n)
        {
            var result = new List<Move>();
            foreach (Move m in position.LegalMoves())
            {
                Position next = position.Apply(m);
                if (next.IsCheckmate || n > 1 && DefenderLoses(next, n - 1)) result.Add(m);
            }
            return result;
        }

        /// <summary>
        /// A defender reply (after the attacker's <paramref name="afterWrongMove"/>) that avoids a forced mate within
        /// <paramref name="remaining"/> attacker moves, or null if the defender has none. Captures and king moves
        /// are preferred because they are the easiest to read for a player.
        /// </summary>
        public static Move? Refutation(Position afterWrongMove, int remaining)
        {
            List<Move> replies = afterWrongMove.LegalMoves();
            Move? best = null;
            int bestScore = -1;
            foreach (Move r in replies)
            {
                if (remaining >= 1 && AttackerForcesMate(afterWrongMove.Apply(r), remaining)) continue;
                int score = (afterWrongMove.IsEmpty(r.To) ? 0 : 2) + (afterWrongMove.TypeAt(r.From) == PieceType.King ? 1 : 0);
                if (score > bestScore) { best = r; bestScore = score; }
            }
            return best;
        }
    }
}

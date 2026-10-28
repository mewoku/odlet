using System;
using System.Collections.Generic;

namespace Ronriku.Domain.Chess
{
    public enum MoveOutcome
    {
        /// <summary>Not a legal chess move (nothing happens, no penalty).</summary>
        Illegal,
        /// <summary>The session is already over.</summary>
        Ignored,
        /// <summary>The solution move; the defender's recorded reply follows.</summary>
        Correct,
        /// <summary>The mating move: the puzzle is solved.</summary>
        Solved,
        /// <summary>A legal move that is not the solution. The move is taken back and costs one try.</summary>
        Wrong,
        /// <summary>A wrong move that used up the last try.</summary>
        Failed
    }

    public sealed class MoveResult
    {
        public MoveOutcome Outcome;
        public Move Move;
        public string San;
        /// <summary>Defender's reply after a correct move (null when the puzzle is solved).</summary>
        public Move? Reply;
        public string ReplySan;
        /// <summary>One short sentence for the player (why it failed / why it is illegal).</summary>
        public string Message;
    }

    /// <summary>
    /// Rules of one "Checkmate" card: the player moves the attacking side, the defender answers with the moves
    /// of the real game. Only legal moves are accepted; a legal move that is not the (unique) solution is taken
    /// back, explained, and costs one of <see cref="Tries"/> tries (<see cref="MaxMistakes"/> unless the card says otherwise).
    /// </summary>
    public sealed class MateSession
    {
        public const int MaxMistakes = 3;

        public MatePuzzle Puzzle { get; }
        public Position Position { get; private set; }
        /// <summary>Correct moves made so far (0..MateIn).</summary>
        public int Step { get; private set; }
        public int Mistakes { get; private set; }
        /// <summary>Wrong moves allowed before the card is lost.</summary>
        public int Tries { get; }
        public int HintLevel { get; private set; }
        public bool Solved { get; private set; }
        public bool Failed { get; private set; }

        public Side Attacker => Puzzle.Attacker;
        public bool Over => Solved || Failed;
        public int MistakesLeft => Tries - Mistakes;
        /// <summary>The move the player has to find now.</summary>
        public Move Expected => Puzzle.Solution[2 * Step];
        /// <summary>Attacker moves still to play including the current one.</summary>
        public int MovesLeft => Puzzle.MateIn - Step;

        public MateSession(MatePuzzle puzzle, int tries = MaxMistakes)
        {
            Puzzle = puzzle ?? throw new ArgumentNullException(nameof(puzzle));
            Tries = Math.Max(1, tries);
            Position = puzzle.Start;
        }

        /// <summary>Squares the piece on <paramref name="square"/> may legally move to (empty when it is not the player's).</summary>
        public List<Move> LegalMovesFrom(int square) =>
            Over || !Position.HasPieceOf(square, Attacker) ? new List<Move>() : Position.LegalMovesFrom(square);

        /// <summary>Tries the move from one square to another (pawn promotion defaults to a queen unless the solution says otherwise).</summary>
        public MoveResult TryMove(int from, int to)
        {
            if (Over) return new MoveResult { Outcome = MoveOutcome.Ignored };

            Move chosen = default;
            bool found = false;
            if (Position.HasPieceOf(from, Attacker))
                foreach (Move m in Position.LegalMovesFrom(from))
                {
                    if (m.To != to) continue;
                    if (m == Expected) { chosen = m; found = true; break; }
                    // a promotion square has four legal moves: take the queen unless the solution says otherwise
                    if (!found || m.Promotion == PieceType.Queen) { chosen = m; found = true; }
                }
            if (!found) return new MoveResult { Outcome = MoveOutcome.Illegal, Message = WhyIllegal(from, to) };

            string san = Position.ToSan(chosen);
            if (chosen == Expected)
            {
                Position = Position.Play(chosen);
                Step++;
                HintLevel = 0;
                if (Position.IsCheckmate)
                {
                    Solved = true;
                    return new MoveResult { Outcome = MoveOutcome.Solved, Move = chosen, San = san };
                }
                Move reply = Puzzle.Solution[2 * Step - 1];
                string replySan = Position.ToSan(reply);
                Position = Position.Play(reply);
                return new MoveResult { Outcome = MoveOutcome.Correct, Move = chosen, San = san, Reply = reply, ReplySan = replySan };
            }

            Mistakes++;
            string message = Explain(Position, chosen, MovesLeft);
            if (Mistakes >= Tries) Failed = true;
            return new MoveResult { Outcome = Failed ? MoveOutcome.Failed : MoveOutcome.Wrong, Move = chosen, San = san, Message = message };
        }

        /// <summary>
        /// First press names the piece to move, the second also its destination. Free, like HINT in Rune Hand.
        /// </summary>
        public (int from, int to) Hint()
        {
            if (Over) return (-1, -1);
            Move m = Expected;
            HintLevel = Math.Min(2, HintLevel + 1);
            return (m.From, HintLevel >= 2 ? m.To : -1);
        }

        /// <summary>The whole solution in SAN from the current step, e.g. "Qb8+ Nxb8 Rd8#".</summary>
        public string RemainingSolution()
        {
            var parts = new List<string>();
            for (int i = 2 * Step; i < Puzzle.SolutionSan.Count; i++) parts.Add(Puzzle.SolutionSan[i]);
            return string.Join(" ", parts);
        }

        // ------------------------------------------------------------------ explanations

        /// <summary>Why a legal but wrong move does not work, in one short sentence (≈ 40 characters).</summary>
        public static string Explain(Position before, Move wrong, int movesLeft)
        {
            Position after = before.Play(wrong);
            string defender = Position.Name(after.Turn);
            Move? refutation = MateSolver.Refutation(after, movesLeft - 1);
            if (refutation == null) return "NOT THE MATE. TRY ANOTHER MOVE";
            string reply = after.ToSan(refutation.Value);
            if (movesLeft == 1)
                return after.IsCheck ? $"CHECK, BUT {defender} PLAYS {reply}" : $"NOT MATE. {defender} PLAYS {reply}";
            return after.IsCheck ? $"{defender} ANSWERS {reply}. NO MATE" : $"{defender} ESCAPES WITH {reply}";
        }

        /// <summary>Why the piece cannot go there: not yours, would expose your king, or simply not how it moves.</summary>
        public string WhyIllegal(int from, int to)
        {
            if (Position.IsEmpty(from)) return "PICK ONE OF YOUR PIECES";
            if (!Position.HasPieceOf(from, Attacker)) return $"THAT IS A {Position.Name(Position.Opposite(Attacker))} PIECE";
            foreach (Move m in Position.PseudoLegalMoves())
                if (m.From == from && m.To == to) return "THAT WOULD LEAVE YOUR KING IN CHECK";
            return $"A {Position.Name(Position.TypeAt(from))} CAN'T MOVE THERE";
        }

        /// <summary>One-line movement rule shown when a piece is selected.</summary>
        public static string Rule(PieceType type) => type switch
        {
            PieceType.Pawn => "PAWN: ONE STEP FORWARD, TAKES DIAGONALLY",
            PieceType.Knight => "KNIGHT: JUMPS IN AN L-SHAPE",
            PieceType.Bishop => "BISHOP: SLIDES ALONG DIAGONALS",
            PieceType.Rook => "ROOK: SLIDES ALONG ROWS AND FILES",
            PieceType.Queen => "QUEEN: SLIDES LIKE ROOK AND BISHOP",
            PieceType.King => "KING: ONE STEP IN ANY DIRECTION",
            _ => string.Empty
        };
    }
}

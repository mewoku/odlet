using System.Linq;
using NUnit.Framework;
using Ronriku.Domain.Chess;

namespace Ronriku.Tests
{
    /// <summary>
    /// The chess rules engine against published references: perft node counts (the standard test of move
    /// generation: pins, castling, en passant, promotion) plus focused cases for every way a move can be illegal.
    /// The perft numbers were also reproduced with the independent chess.js library.
    /// </summary>
    public sealed class ChessEngineTests
    {
        private static long Perft(Position p, int depth)
        {
            var moves = p.LegalMoves();
            if (depth == 1) return moves.Count;
            long total = 0;
            foreach (Move m in moves) total += Perft(p.Play(m), depth - 1);
            return total;
        }

        private static Move Mv(string from, string to, PieceType promotion = PieceType.None) =>
            new Move(Squares.Parse(from), Squares.Parse(to), promotion);

        [TestCase("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1", new long[] { 20, 400, 8902, 197281 })]
        [TestCase("r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1", new long[] { 48, 2039, 97862 })]
        [TestCase("8/2p5/3p4/KP5r/1R3p1k/8/4P1P1/8 w - - 0 1", new long[] { 14, 191, 2812, 43238 })]
        [TestCase("r3k2r/Pppp1ppp/1b3nbN/nP6/BBP1P3/q4N2/Pp1P2PP/R2Q1RK1 w kq - 0 1", new long[] { 6, 264, 9467 })]
        [TestCase("rnbq1k1r/pp1Pbppp/2p5/8/2B5/8/PPP1NnPP/RNBQK2R w KQ - 1 8", new long[] { 44, 1486, 62379 })]
        [TestCase("r4rk1/1pp1qppp/p1np1n2/2b1p1B1/2B1P1b1/P1NP1N2/1PP1QPPP/R4RK1 w - - 0 10", new long[] { 46, 2079, 89890 })]
        public void Perft_MatchesPublishedNodeCounts(string fen, long[] expected)
        {
            Position p = Position.FromFen(fen);
            for (int d = 1; d <= expected.Length; d++)
                Assert.That(Perft(p, d), Is.EqualTo(expected[d - 1]), $"depth {d} of {fen}");
        }

        [Test]
        public void Fen_RoundTrips()
        {
            foreach (string fen in new[]
            {
                Position.StartFen,
                "r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1",
                "4k3/8/8/3pP3/8/8/8/4K3 w - d6 0 1",
                "8/2p5/3p4/KP5r/1R3p1k/8/4P1P1/8 b - - 12 40"
            })
                Assert.That(Position.FromFen(fen).ToFen(), Is.EqualTo(fen));
        }

        [Test]
        public void PinnedPiece_CannotLeaveThePin()
        {
            Position p = Position.FromFen("4k3/4r3/8/8/8/8/4R3/4K3 w - - 0 1");
            Assert.That(p.IsLegal(Mv("e2", "a2")), Is.False, "a pinned rook may not leave the e-file");
            Assert.That(p.IsLegal(Mv("e2", "e7")), Is.True, "but it may capture along the pin");
            Assert.That(p.LegalMovesFrom(Squares.Parse("e2")).All(m => Squares.File(m.To) == 4));
        }

        [Test]
        public void King_CannotStepIntoCheck_OrStayInIt()
        {
            Position p = Position.FromFen("3rk3/8/8/8/8/8/8/4K3 w - - 0 1");
            Assert.That(p.IsLegal(Mv("e1", "d1")), Is.False);
            Assert.That(p.IsLegal(Mv("e1", "d2")), Is.False);
            Assert.That(p.IsLegal(Mv("e1", "e2")), Is.True);
            Assert.That(p.IsLegal(Mv("e1", "f1")), Is.True);

            // in check: only moves that remove the check are legal
            Position check = Position.FromFen("4k3/8/8/8/8/8/3r4/R3K3 w - - 0 1");
            Assert.That(check.IsCheck, Is.False);
            Position inCheck = Position.FromFen("4k3/8/8/8/8/8/4r3/R3K3 w - - 0 1");
            Assert.That(inCheck.IsCheck, Is.True);
            Assert.That(inCheck.IsLegal(Mv("a1", "a8")), Is.False, "ignoring the check is illegal");
            Assert.That(inCheck.IsLegal(Mv("e1", "e2")), Is.True, "capturing the checking rook is legal");
        }

        [Test]
        public void Castling_Rules()
        {
            Position open = Position.FromFen("r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1");
            Assert.That(open.IsLegal(Mv("e1", "g1")), Is.True);
            Assert.That(open.IsLegal(Mv("e1", "c1")), Is.True);

            Position throughCheck = Position.FromFen("r3k2r/8/8/8/8/8/5r2/R3K2R w KQkq - 0 1");
            Assert.That(throughCheck.IsLegal(Mv("e1", "g1")), Is.False, "the king may not cross an attacked square");
            Assert.That(throughCheck.IsLegal(Mv("e1", "c1")), Is.True);

            Position fromCheck = Position.FromFen("r3k2r/8/8/8/8/8/4r3/R3K2R w KQkq - 0 1");
            Assert.That(fromCheck.IsLegal(Mv("e1", "g1")) || fromCheck.IsLegal(Mv("e1", "c1")), Is.False, "no castling out of check");

            Position noRights = Position.FromFen("r3k2r/8/8/8/8/8/8/R3K2R w kq - 0 1");
            Assert.That(noRights.IsLegal(Mv("e1", "g1")), Is.False);

            Position blocked = Position.FromFen("r3k2r/8/8/8/8/8/8/RN2K2R w KQkq - 0 1");
            Assert.That(blocked.IsLegal(Mv("e1", "c1")), Is.False, "a piece between king and rook blocks castling");

            // castling moves the rook too and removes the rights
            Position after = open.Play(Mv("e1", "g1"));
            Assert.That(after.ToFen(), Does.StartWith("r3k2r/8/8/8/8/8/8/R4RK1 b kq"));
        }

        [Test]
        public void EnPassant_And_Promotion()
        {
            Position ep = Position.FromFen("4k3/8/8/3pP3/8/8/8/4K3 w - d6 0 1");
            Assert.That(ep.IsLegal(Mv("e5", "d6")), Is.True);
            Position after = ep.Play(Mv("e5", "d6"));
            Assert.That(after.IsEmpty(Squares.Parse("d5")), Is.True, "the captured pawn is removed");

            // en passant that would expose the own king along the rank is illegal
            Position pinnedEp = Position.FromFen("8/8/8/K2pP2r/8/8/8/4k3 w - d6 0 1");
            Assert.That(pinnedEp.IsLegal(Mv("e5", "d6")), Is.False);

            Position promo = Position.FromFen("4k3/P7/8/8/8/8/8/4K3 w - - 0 1");
            foreach (PieceType t in new[] { PieceType.Queen, PieceType.Rook, PieceType.Bishop, PieceType.Knight })
                Assert.That(promo.IsLegal(Mv("a7", "a8", t)), Is.True, t.ToString());
            Assert.That(promo.IsLegal(Mv("a7", "a8")), Is.False, "a pawn must promote");
            Assert.That(promo.Play(Mv("a7", "a8", PieceType.Queen)).TypeAt(Squares.Parse("a8")), Is.EqualTo(PieceType.Queen));
        }

        [Test]
        public void Checkmate_And_Stalemate_AreRecognised()
        {
            Position p = Position.Start();
            foreach (string san in new[] { "f3", "e5", "g4", "Qh4#" }) p = p.Play(p.ParseSan(san));
            Assert.That(p.IsCheckmate, Is.True, "fool's mate");
            Assert.That(p.LegalMoves(), Is.Empty);

            Position stalemate = Position.FromFen("7k/5Q2/6K1/8/8/8/8/8 b - - 0 1");
            Assert.That(stalemate.IsCheck, Is.False);
            Assert.That(stalemate.IsStalemate, Is.True);
            Assert.That(stalemate.IsCheckmate, Is.False);

            // a king that can capture its attacker is not mated
            Assert.That(Position.FromFen("7k/6Q1/8/8/8/8/8/K7 b - - 0 1").IsCheckmate, Is.False);
        }

        [Test]
        public void San_Disambiguation_And_Roundtrip()
        {
            Position p = Position.FromFen("4k3/8/8/8/8/8/4K3/R6R w - - 0 1");
            Assert.That(p.ToSan(Mv("a1", "d1")), Is.EqualTo("Rad1"));
            Assert.That(p.ToSan(Mv("h1", "d1")), Is.EqualTo("Rhd1"));
            Assert.That(p.ParseSan("Rhd1"), Is.EqualTo(Mv("h1", "d1")));
            Assert.That(p.TryParseSan("Rd1", out _), Is.False, "ambiguous SAN is rejected");

            Position q = Position.FromFen("r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1");
            Assert.That(q.ToSan(Mv("e1", "g1")), Is.EqualTo("O-O"));
            Assert.That(q.ToSan(Mv("e1", "c1")), Is.EqualTo("O-O-O"));

            // every legal move of a busy position survives ToSan → ParseSan
            Position busy = Position.FromFen("r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1");
            foreach (Move m in busy.LegalMoves())
                Assert.That(busy.ParseSan(busy.ToSan(m)), Is.EqualTo(m), busy.ToSan(m));
        }
    }
}

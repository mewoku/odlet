using System;
using System.Collections.Generic;
using System.Text;

namespace Ronriku.Domain.Chess
{
    public enum Side : byte { White = 0, Black = 1 }

    public enum PieceType : byte { None = 0, Pawn = 1, Knight = 2, Bishop = 3, Rook = 4, Queen = 5, King = 6 }

    /// <summary>Board squares are 0..63 with a1 = 0, b1 = 1 … h1 = 7, a2 = 8 … h8 = 63.</summary>
    public static class Squares
    {
        public static int Make(int file, int rank) => rank * 8 + file;
        public static int File(int square) => square & 7;
        public static int Rank(int square) => square >> 3;
        public static string Name(int square) => new string(new[] { (char)('a' + File(square)), (char)('1' + Rank(square)) });

        public static int Parse(string name)
        {
            if (name == null || name.Length != 2 || name[0] < 'a' || name[0] > 'h' || name[1] < '1' || name[1] > '8')
                throw new FormatException($"Bad square '{name}'.");
            return Make(name[0] - 'a', name[1] - '1');
        }
    }

    /// <summary>A move by squares. Castling is a king move of two files; en passant is a pawn move to the EP square.</summary>
    public readonly struct Move : IEquatable<Move>
    {
        public readonly byte From;
        public readonly byte To;
        public readonly PieceType Promotion;

        public Move(int from, int to, PieceType promotion = PieceType.None)
        {
            From = (byte)from;
            To = (byte)to;
            Promotion = promotion;
        }

        public bool Equals(Move other) => From == other.From && To == other.To && Promotion == other.Promotion;
        public override bool Equals(object obj) => obj is Move other && Equals(other);
        public override int GetHashCode() => From | (To << 6) | ((int)Promotion << 12);
        public static bool operator ==(Move a, Move b) => a.Equals(b);
        public static bool operator !=(Move a, Move b) => !a.Equals(b);

        /// <summary>Long algebraic ("e2e4", "e7e8q").</summary>
        public override string ToString()
        {
            string s = Squares.Name(From) + Squares.Name(To);
            return Promotion == PieceType.None ? s : s + "  nbrqk"[(int)Promotion];
        }
    }

    /// <summary>
    /// A chess position with full rules: legal move generation (pins, check, castling, en passant,
    /// promotion), check/checkmate/stalemate detection, FEN and SAN. Immutable from the outside:
    /// <see cref="Play"/> returns a new position.
    /// </summary>
    public sealed class Position
    {
        public const string StartFen = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

        private const int WhiteKingside = 1, WhiteQueenside = 2, BlackKingside = 4, BlackQueenside = 8;

        private static readonly int[] KnightSteps = { 17, 15, 10, 6, -6, -10, -15, -17 };
        private static readonly int[] KingSteps = { 8, -8, 1, -1, 9, 7, -7, -9 };
        // (file delta, rank delta) rays
        private static readonly int[][] Orthogonal = { new[] { 1, 0 }, new[] { -1, 0 }, new[] { 0, 1 }, new[] { 0, -1 } };
        private static readonly int[][] Diagonal = { new[] { 1, 1 }, new[] { -1, 1 }, new[] { 1, -1 }, new[] { -1, -1 } };
        private static readonly PieceType[] PromotionChoices = { PieceType.Queen, PieceType.Rook, PieceType.Bishop, PieceType.Knight };

        // +1..+6 white pawn..king, -1..-6 black, 0 empty
        private readonly sbyte[] _board = new sbyte[64];

        public Side Turn { get; private set; }
        /// <summary>Bit flags: 1 white O-O, 2 white O-O-O, 4 black O-O, 8 black O-O-O.</summary>
        public int Castling { get; private set; }
        /// <summary>Square a pawn passed over with a double step on the previous move, or -1.</summary>
        public int EnPassantSquare { get; private set; } = -1;
        public int HalfmoveClock { get; private set; }
        public int FullmoveNumber { get; private set; } = 1;

        private Position() { }

        public static Position Start() => FromFen(StartFen);

        // ------------------------------------------------------------------ accessors

        public PieceType TypeAt(int square) => (PieceType)Math.Abs(_board[square]);

        public bool IsEmpty(int square) => _board[square] == 0;

        /// <summary>Side of the piece on the square (only meaningful when it is not empty).</summary>
        public Side SideAt(int square) => _board[square] > 0 ? Side.White : Side.Black;

        public bool HasPieceOf(int square, Side side) => _board[square] != 0 && SideAt(square) == side;

        public static Side Opposite(Side side) => side == Side.White ? Side.Black : Side.White;

        public int KingSquare(Side side)
        {
            sbyte king = (sbyte)(side == Side.White ? 6 : -6);
            for (int i = 0; i < 64; i++) if (_board[i] == king) return i;
            return -1;
        }

        public Position Clone()
        {
            var copy = new Position { Turn = Turn, Castling = Castling, EnPassantSquare = EnPassantSquare, HalfmoveClock = HalfmoveClock, FullmoveNumber = FullmoveNumber };
            Array.Copy(_board, copy._board, 64);
            return copy;
        }

        // ------------------------------------------------------------------ FEN

        public static Position FromFen(string fen)
        {
            if (string.IsNullOrWhiteSpace(fen)) throw new FormatException("Empty FEN.");
            string[] parts = fen.Trim().Split(' ');
            if (parts.Length < 4) throw new FormatException($"FEN needs at least 4 fields: '{fen}'.");
            var p = new Position();
            string[] ranks = parts[0].Split('/');
            if (ranks.Length != 8) throw new FormatException($"FEN needs 8 ranks: '{fen}'.");
            for (int r = 0; r < 8; r++)
            {
                int rank = 7 - r;
                int file = 0;
                foreach (char c in ranks[r])
                {
                    if (c >= '1' && c <= '8') { file += c - '0'; continue; }
                    int type = "pnbrqk".IndexOf(char.ToLowerInvariant(c)) + 1;
                    if (type == 0 || file > 7) throw new FormatException($"Bad FEN piece placement: '{fen}'.");
                    p._board[Squares.Make(file, rank)] = (sbyte)(char.IsUpper(c) ? type : -type);
                    file++;
                }
                if (file != 8) throw new FormatException($"FEN rank {rank + 1} does not have 8 files: '{fen}'.");
            }
            p.Turn = parts[1] == "w" ? Side.White : parts[1] == "b" ? Side.Black : throw new FormatException($"Bad side to move: '{fen}'.");
            foreach (char c in parts[2])
                switch (c)
                {
                    case 'K': p.Castling |= WhiteKingside; break;
                    case 'Q': p.Castling |= WhiteQueenside; break;
                    case 'k': p.Castling |= BlackKingside; break;
                    case 'q': p.Castling |= BlackQueenside; break;
                }
            p.EnPassantSquare = parts[3] == "-" ? -1 : Squares.Parse(parts[3]);
            if (parts.Length > 4 && int.TryParse(parts[4], out int half)) p.HalfmoveClock = half;
            if (parts.Length > 5 && int.TryParse(parts[5], out int full)) p.FullmoveNumber = Math.Max(1, full);
            if (p.KingSquare(Side.White) < 0 || p.KingSquare(Side.Black) < 0) throw new FormatException($"Both kings are required: '{fen}'.");
            return p;
        }

        /// <summary>
        /// FEN. The en-passant field is written only when a legal en-passant capture exists (the common
        /// convention, so positions that differ only by an uncapturable double step compare equal).
        /// </summary>
        public string ToFen()
        {
            var sb = new StringBuilder();
            for (int rank = 7; rank >= 0; rank--)
            {
                int empty = 0;
                for (int file = 0; file < 8; file++)
                {
                    sbyte v = _board[Squares.Make(file, rank)];
                    if (v == 0) { empty++; continue; }
                    if (empty > 0) { sb.Append(empty); empty = 0; }
                    char letter = "pnbrqk"[Math.Abs(v) - 1];
                    sb.Append(v > 0 ? char.ToUpperInvariant(letter) : letter);
                }
                if (empty > 0) sb.Append(empty);
                if (rank > 0) sb.Append('/');
            }
            sb.Append(Turn == Side.White ? " w " : " b ");
            if (Castling == 0) sb.Append('-');
            else
            {
                if ((Castling & WhiteKingside) != 0) sb.Append('K');
                if ((Castling & WhiteQueenside) != 0) sb.Append('Q');
                if ((Castling & BlackKingside) != 0) sb.Append('k');
                if ((Castling & BlackQueenside) != 0) sb.Append('q');
            }
            sb.Append(' ');
            sb.Append(HasLegalEnPassant() ? Squares.Name(EnPassantSquare) : "-");
            sb.Append(' ').Append(HalfmoveClock).Append(' ').Append(FullmoveNumber);
            return sb.ToString();
        }

        /// <summary>Piece placement, side, castling and (legal) en passant only; the clocks are ignored.</summary>
        public string PlacementKey()
        {
            string[] f = ToFen().Split(' ');
            return $"{f[0]} {f[1]} {f[2]} {f[3]}";
        }

        private bool HasLegalEnPassant()
        {
            if (EnPassantSquare < 0) return false;
            foreach (Move m in LegalMoves())
                if (m.To == EnPassantSquare && TypeAt(m.From) == PieceType.Pawn && Squares.File(m.From) != Squares.File(m.To)) return true;
            return false;
        }

        // ------------------------------------------------------------------ attacks and check

        /// <summary>True when <paramref name="by"/> has a piece attacking the square (pins do not matter).</summary>
        public bool IsAttacked(int square, Side by)
        {
            int file = Squares.File(square), rank = Squares.Rank(square);
            int sign = by == Side.White ? 1 : -1;

            // pawns: a white pawn attacks the squares one rank up, so it stands one rank below the target
            int pawnRank = rank - sign;
            if (pawnRank >= 0 && pawnRank < 8)
                for (int df = -1; df <= 1; df += 2)
                {
                    int f = file + df;
                    if (f >= 0 && f < 8 && _board[Squares.Make(f, pawnRank)] == sign) return true;
                }

            foreach (int step in KnightSteps)
            {
                int to = square + step;
                if (to < 0 || to > 63) continue;
                if (Math.Abs(Squares.File(to) - file) > 2 || Math.Abs(Squares.Rank(to) - rank) > 2) continue;
                if (_board[to] == 2 * sign) return true;
            }

            foreach (int step in KingSteps)
            {
                int to = square + step;
                if (to < 0 || to > 63) continue;
                if (Math.Abs(Squares.File(to) - file) > 1 || Math.Abs(Squares.Rank(to) - rank) > 1) continue;
                if (_board[to] == 6 * sign) return true;
            }

            foreach (int[] d in Orthogonal)
                if (RayHits(file, rank, d[0], d[1], 4 * sign, 5 * sign)) return true;
            foreach (int[] d in Diagonal)
                if (RayHits(file, rank, d[0], d[1], 3 * sign, 5 * sign)) return true;
            return false;
        }

        private bool RayHits(int file, int rank, int df, int dr, int pieceA, int pieceB)
        {
            int f = file + df, r = rank + dr;
            while (f >= 0 && f < 8 && r >= 0 && r < 8)
            {
                sbyte v = _board[Squares.Make(f, r)];
                if (v != 0) return v == pieceA || v == pieceB;
                f += df;
                r += dr;
            }
            return false;
        }

        public bool IsKingAttacked(Side side) => IsAttacked(KingSquare(side), Opposite(side));

        /// <summary>The side to move is in check.</summary>
        public bool IsCheck => IsKingAttacked(Turn);

        public bool IsCheckmate => IsCheck && !HasLegalMove();

        public bool IsStalemate => !IsCheck && !HasLegalMove();

        // ------------------------------------------------------------------ move generation

        public bool HasLegalMove()
        {
            foreach (Move m in PseudoLegalMoves())
                if (!Apply(m).IsKingAttacked(Turn)) return true;
            return false;
        }

        /// <summary>All legal moves for the side to move, in a deterministic order (by origin square, then target).</summary>
        public List<Move> LegalMoves()
        {
            var pseudo = PseudoLegalMoves();
            var legal = new List<Move>(pseudo.Count);
            foreach (Move m in pseudo)
                if (!Apply(m).IsKingAttacked(Turn)) legal.Add(m);
            return legal;
        }

        public List<Move> LegalMovesFrom(int square)
        {
            var result = new List<Move>();
            foreach (Move m in LegalMoves()) if (m.From == square) result.Add(m);
            return result;
        }

        public bool IsLegal(Move move)
        {
            foreach (Move m in LegalMoves()) if (m == move) return true;
            return false;
        }

        /// <summary>Moves that obey piece movement but may leave the own king in check. For explanations only.</summary>
        internal List<Move> PseudoLegalMoves()
        {
            var moves = new List<Move>(48);
            int sign = Turn == Side.White ? 1 : -1;
            for (int from = 0; from < 64; from++)
            {
                sbyte v = _board[from];
                if (v == 0 || Math.Sign(v) != sign) continue;
                int file = Squares.File(from), rank = Squares.Rank(from);
                switch ((PieceType)Math.Abs(v))
                {
                    case PieceType.Pawn: GeneratePawn(moves, from, file, rank, sign); break;
                    case PieceType.Knight:
                        foreach (int step in KnightSteps)
                        {
                            int to = from + step;
                            if (to < 0 || to > 63) continue;
                            if (Math.Abs(Squares.File(to) - file) > 2 || Math.Abs(Squares.Rank(to) - rank) > 2) continue;
                            if (_board[to] == 0 || Math.Sign(_board[to]) != sign) moves.Add(new Move(from, to));
                        }
                        break;
                    case PieceType.Bishop: Slide(moves, from, file, rank, sign, Diagonal); break;
                    case PieceType.Rook: Slide(moves, from, file, rank, sign, Orthogonal); break;
                    case PieceType.Queen: Slide(moves, from, file, rank, sign, Orthogonal); Slide(moves, from, file, rank, sign, Diagonal); break;
                    case PieceType.King:
                        foreach (int step in KingSteps)
                        {
                            int to = from + step;
                            if (to < 0 || to > 63) continue;
                            if (Math.Abs(Squares.File(to) - file) > 1 || Math.Abs(Squares.Rank(to) - rank) > 1) continue;
                            if (_board[to] == 0 || Math.Sign(_board[to]) != sign) moves.Add(new Move(from, to));
                        }
                        GenerateCastling(moves, from);
                        break;
                }
            }
            moves.Sort((a, b) => a.From != b.From ? a.From.CompareTo(b.From) : a.To != b.To ? a.To.CompareTo(b.To) : a.Promotion.CompareTo(b.Promotion));
            return moves;
        }

        private void Slide(List<Move> moves, int from, int file, int rank, int sign, int[][] directions)
        {
            foreach (int[] d in directions)
            {
                int f = file + d[0], r = rank + d[1];
                while (f >= 0 && f < 8 && r >= 0 && r < 8)
                {
                    int to = Squares.Make(f, r);
                    sbyte v = _board[to];
                    if (v == 0) moves.Add(new Move(from, to));
                    else
                    {
                        if (Math.Sign(v) != sign) moves.Add(new Move(from, to));
                        break;
                    }
                    f += d[0];
                    r += d[1];
                }
            }
        }

        private void GeneratePawn(List<Move> moves, int from, int file, int rank, int sign)
        {
            int forward = rank + sign;
            if (forward < 0 || forward > 7) return;
            int lastRank = sign > 0 ? 7 : 0;
            int startRank = sign > 0 ? 1 : 6;

            void Add(int to)
            {
                if (Squares.Rank(to) == lastRank) foreach (PieceType promo in PromotionChoices) moves.Add(new Move(from, to, promo));
                else moves.Add(new Move(from, to));
            }

            int one = Squares.Make(file, forward);
            if (_board[one] == 0)
            {
                Add(one);
                int two = Squares.Make(file, rank + 2 * sign);
                if (rank == startRank && _board[two] == 0) moves.Add(new Move(from, two));
            }
            for (int df = -1; df <= 1; df += 2)
            {
                int f = file + df;
                if (f < 0 || f > 7) continue;
                int to = Squares.Make(f, forward);
                if (_board[to] != 0 && Math.Sign(_board[to]) != sign) Add(to);
                else if (to == EnPassantSquare && _board[to] == 0) moves.Add(new Move(from, to));
            }
        }

        private void GenerateCastling(List<Move> moves, int kingSquare)
        {
            Side side = Turn;
            Side enemy = Opposite(side);
            int home = side == Side.White ? 4 : 60;
            if (kingSquare != home) return;
            int rankBase = side == Side.White ? 0 : 56;
            int king = side == Side.White ? 6 : -6, rook = side == Side.White ? 4 : -4;
            if (_board[home] != king || IsAttacked(home, enemy)) return;

            bool kingside = (Castling & (side == Side.White ? WhiteKingside : BlackKingside)) != 0;
            bool queenside = (Castling & (side == Side.White ? WhiteQueenside : BlackQueenside)) != 0;
            if (kingside && _board[rankBase + 7] == rook && _board[rankBase + 5] == 0 && _board[rankBase + 6] == 0
                && !IsAttacked(rankBase + 5, enemy) && !IsAttacked(rankBase + 6, enemy))
                moves.Add(new Move(home, rankBase + 6));
            if (queenside && _board[rankBase] == rook && _board[rankBase + 1] == 0 && _board[rankBase + 2] == 0 && _board[rankBase + 3] == 0
                && !IsAttacked(rankBase + 2, enemy) && !IsAttacked(rankBase + 3, enemy))
                moves.Add(new Move(home, rankBase + 2));
        }

        // ------------------------------------------------------------------ playing moves

        /// <summary>Plays a legal move and returns the new position; throws for an illegal move.</summary>
        public Position Play(Move move)
        {
            if (!IsLegal(move)) throw new InvalidOperationException($"Illegal move {move} in {ToFen()}");
            return Apply(move);
        }

        public bool TryPlay(Move move, out Position next)
        {
            if (!IsLegal(move)) { next = null; return false; }
            next = Apply(move);
            return true;
        }

        /// <summary>Applies a (pseudo-legal) move without checking legality. For the solver and the generators.</summary>
        internal Position Apply(Move m)
        {
            var next = Clone();
            int sign = Turn == Side.White ? 1 : -1;
            sbyte piece = _board[m.From];
            var type = (PieceType)Math.Abs(piece);
            bool capture = _board[m.To] != 0;

            next._board[m.From] = 0;
            if (type == PieceType.Pawn && m.To == EnPassantSquare && Squares.File(m.From) != Squares.File(m.To) && !capture)
            {
                next._board[Squares.Make(Squares.File(m.To), Squares.Rank(m.From))] = 0;
                capture = true;
            }
            if (type == PieceType.King && Math.Abs(Squares.File(m.To) - Squares.File(m.From)) == 2)
            {
                int rankBase = Squares.Rank(m.From) * 8;
                bool kingside = Squares.File(m.To) == 6;
                int rookFrom = rankBase + (kingside ? 7 : 0), rookTo = rankBase + (kingside ? 5 : 3);
                next._board[rookTo] = next._board[rookFrom];
                next._board[rookFrom] = 0;
            }
            next._board[m.To] = m.Promotion != PieceType.None ? (sbyte)(sign * (int)m.Promotion) : piece;

            // castling rights: any move from/to a king or rook home square clears them
            int rights = Castling;
            if (m.From == 4 || m.To == 4) rights &= ~(WhiteKingside | WhiteQueenside);
            if (m.From == 60 || m.To == 60) rights &= ~(BlackKingside | BlackQueenside);
            if (m.From == 7 || m.To == 7) rights &= ~WhiteKingside;
            if (m.From == 0 || m.To == 0) rights &= ~WhiteQueenside;
            if (m.From == 63 || m.To == 63) rights &= ~BlackKingside;
            if (m.From == 56 || m.To == 56) rights &= ~BlackQueenside;
            next.Castling = rights;

            next.EnPassantSquare = type == PieceType.Pawn && Math.Abs(m.To - m.From) == 16 ? (m.From + m.To) / 2 : -1;
            next.HalfmoveClock = type == PieceType.Pawn || capture ? 0 : HalfmoveClock + 1;
            next.Turn = Opposite(Turn);
            if (Turn == Side.Black) next.FullmoveNumber = FullmoveNumber + 1;
            return next;
        }

        // ------------------------------------------------------------------ SAN

        /// <summary>Standard algebraic notation with check/mate suffix, e.g. "Nxe5", "O-O-O", "e8=Q+", "Rd8#".</summary>
        public string ToSan(Move m)
        {
            var sb = new StringBuilder();
            var type = TypeAt(m.From);
            bool capture = _board[m.To] != 0 || type == PieceType.Pawn && Squares.File(m.From) != Squares.File(m.To);

            if (type == PieceType.King && Math.Abs(Squares.File(m.To) - Squares.File(m.From)) == 2)
                sb.Append(Squares.File(m.To) == 6 ? "O-O" : "O-O-O");
            else
            {
                if (type == PieceType.Pawn)
                {
                    if (capture) sb.Append((char)('a' + Squares.File(m.From)));
                }
                else
                {
                    sb.Append(Letter(type));
                    bool ambiguous = false, sameFile = false, sameRank = false;
                    foreach (Move other in LegalMoves())
                    {
                        if (other.To != m.To || other.From == m.From || TypeAt(other.From) != type) continue;
                        ambiguous = true;
                        if (Squares.File(other.From) == Squares.File(m.From)) sameFile = true;
                        if (Squares.Rank(other.From) == Squares.Rank(m.From)) sameRank = true;
                    }
                    if (ambiguous)
                    {
                        if (!sameFile) sb.Append((char)('a' + Squares.File(m.From)));
                        else if (!sameRank) sb.Append((char)('1' + Squares.Rank(m.From)));
                        else sb.Append(Squares.Name(m.From));
                    }
                }
                if (capture) sb.Append('x');
                sb.Append(Squares.Name(m.To));
                if (m.Promotion != PieceType.None) sb.Append('=').Append(Letter(m.Promotion));
            }

            Position after = Apply(m);
            if (after.IsCheck) sb.Append(after.HasLegalMove() ? '+' : '#');
            return sb.ToString();
        }

        /// <summary>Finds the legal move written in SAN (annotations and check marks are ignored).</summary>
        public bool TryParseSan(string san, out Move move)
        {
            move = default;
            if (string.IsNullOrWhiteSpace(san)) return false;
            string wanted = Strip(san);
            List<Move> legal = LegalMoves();

            // Cheap pre-filter (target square and piece letter) so only a couple of candidates need full SAN.
            bool castle = wanted.StartsWith("O-O");
            int target = -1;
            var type = PieceType.Pawn;
            if (!castle)
            {
                string core = wanted.IndexOf('=') >= 0 ? wanted.Substring(0, wanted.IndexOf('=')) : wanted;
                if (core.Length >= 2)
                {
                    string square = core.Substring(core.Length - 2);
                    if (square[0] >= 'a' && square[0] <= 'h' && square[1] >= '1' && square[1] <= '8') target = Squares.Parse(square);
                }
                int letter = "NBRQK".IndexOf(core[0]);
                if (letter >= 0) type = (PieceType)(letter + 2);
            }
            foreach (Move m in legal)
            {
                if (castle ? TypeAt(m.From) != PieceType.King || Math.Abs(Squares.File(m.To) - Squares.File(m.From)) != 2
                           : target >= 0 && (m.To != target || TypeAt(m.From) != type)) continue;
                if (Strip(ToSan(m)) == wanted) { move = m; return true; }
            }
            return false;
        }

        public Move ParseSan(string san) =>
            TryParseSan(san, out Move m) ? m : throw new FormatException($"Illegal or unknown move '{san}' in {ToFen()}");

        private static string Strip(string san) =>
            san.Trim().Replace("+", string.Empty).Replace("#", string.Empty).Replace("!", string.Empty).Replace("?", string.Empty).Replace("0-0-0", "O-O-O").Replace("0-0", "O-O");

        public static char Letter(PieceType type) => type switch
        {
            PieceType.Knight => 'N',
            PieceType.Bishop => 'B',
            PieceType.Rook => 'R',
            PieceType.Queen => 'Q',
            PieceType.King => 'K',
            _ => 'P'
        };

        public static string Name(PieceType type) => type switch
        {
            PieceType.Pawn => "PAWN",
            PieceType.Knight => "KNIGHT",
            PieceType.Bishop => "BISHOP",
            PieceType.Rook => "ROOK",
            PieceType.Queen => "QUEEN",
            PieceType.King => "KING",
            _ => "NONE"
        };

        public static string Name(Side side) => side == Side.White ? "WHITE" : "BLACK";
    }
}

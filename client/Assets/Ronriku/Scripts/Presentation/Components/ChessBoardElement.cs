using System;
using System.Collections.Generic;
using Ronriku.Domain.Chess;
using UnityEngine;
using UnityEngine.UIElements;
// UnityEngine.UIElements also has a "Position" enum; the chess board position wins in this file.
using Position = Ronriku.Domain.Chess.Position;

namespace Ronriku.Presentation.Components
{
    /// <summary>10×10 pixel-art chess pieces. '#' = filled. Same hand-drawn style as <see cref="PixelIcon"/>.</summary>
    public static class ChessPieceArt
    {
        public const int Size = 10;

        private static readonly Dictionary<PieceType, string[]> Sprites = new Dictionary<PieceType, string[]>
        {
            [PieceType.Pawn] = new[]
            {
                "..........", "....##....", "...####...", "...####...", "....##....",
                "...####...", "..######..", "...####...", "..######..", ".########."
            },
            [PieceType.Knight] = new[]
            {
                "..##......", ".####.....", "#####.....", "######....", "#.#####...",
                "...######.", "...######.", "..#######.", ".#########", ".#########"
            },
            // mitre with a slit
            [PieceType.Bishop] = new[]
            {
                "....##....", "...####...", "..##.###..", "..#.####..", "..######..",
                "...####...", "....##....", "...####...", "..######..", ".########."
            },
            // flat battlements, straight tower
            [PieceType.Rook] = new[]
            {
                "##..##..##", "##########", ".########.", "..######..", "..######..",
                "..######..", "..######..", ".########.", "##########", "##########"
            },
            // pointed crown, narrow waist (never mistaken for the rook)
            [PieceType.Queen] = new[]
            {
                "#...##...#", "##..##..##", ".##.##.##.", ".########.", "..######..",
                "...####...", "...####...", "..######..", ".########.", "##########"
            },
            // cross on top
            [PieceType.King] = new[]
            {
                "....##....", "..######..", "....##....", "..######..", ".########.",
                ".########.", "..######..", "...####...", "..######..", "##########"
            }
        };

        /// <summary>Draws a piece centred on <paramref name="center"/> within a square of <paramref name="square"/> pixels.</summary>
        public static void Draw(Painter2D p, PieceType type, Side side, Vector2 center, float square, float alpha = 1f)
        {
            if (!Sprites.TryGetValue(type, out string[] sprite)) return;
            float cell = square * 0.74f / Size;
            Vector2 origin = center - new Vector2(Size, Size) * cell * 0.5f;
            Color fill = side == Side.White ? RonrikuTheme.Text : RonrikuTheme.Hex("0B0C10");
            Color outline = side == Side.White ? RonrikuTheme.Hex("090A0C") : RonrikuTheme.Text;
            fill.a = outline.a = alpha;

            float o = Mathf.Max(1f, cell * 0.9f);
            // outline: the silhouette pushed one step in every direction, then the fill on top
            foreach (Vector2 d in new[] { new Vector2(o, 0), new Vector2(-o, 0), new Vector2(0, o), new Vector2(0, -o), new Vector2(o, o), new Vector2(-o, -o), new Vector2(o, -o), new Vector2(-o, o) })
                Paint(p, sprite, origin + d, cell, outline);
            Paint(p, sprite, origin, cell, fill);
        }

        private static void Paint(Painter2D p, string[] sprite, Vector2 origin, float cell, Color color)
        {
            p.fillColor = color;
            for (int y = 0; y < Size; y++)
            for (int x = 0; x < Size; x++)
            {
                if (sprite[y][x] != '#') continue;
                p.BeginPath();
                p.MoveTo(origin + new Vector2(x * cell, y * cell));
                p.LineTo(origin + new Vector2((x + 1) * cell, y * cell));
                p.LineTo(origin + new Vector2((x + 1) * cell, (y + 1) * cell));
                p.LineTo(origin + new Vector2(x * cell, (y + 1) * cell));
                p.ClosePath();
                p.Fill();
            }
        }
    }

    /// <summary>
    /// Chessboard for the Checkmate card: 8×8 squares in the game's teal/blue palette, pixel pieces, tap input via
    /// <see cref="SquareAt"/>, move/selection/hint highlights and a sliding-piece animation. The board shows the
    /// side to move at the bottom so the player's pieces always move "up".
    /// </summary>
    public sealed class ChessBoardElement : VisualElement
    {
        private static readonly Color LightSquare = Color.Lerp(RonrikuTheme.BlueGrey, RonrikuTheme.OffWhite, 0.3f);
        private static readonly Color DarkSquare = RonrikuTheme.DeepBlue;

        private Position _position;
        private bool _flipped;
        private int _selected = -1;
        private readonly HashSet<int> _targets = new HashSet<int>();
        private int _lastFrom = -1, _lastTo = -1;
        private int _hintFrom = -1, _hintTo = -1;
        private int _wrongTo = -1;

        private bool _animating;
        private int _animFrom, _animTo;
        private float _animStart, _animSeconds;
        private PieceType _animType;
        private Side _animSide;
        private Action _animDone;

        public ChessBoardElement()
        {
            generateVisualContent += Draw;
            // Redraw continuously only while something moves or pulses; finish animations outside the paint callback.
            schedule.Execute(() =>
            {
                if (_animating && Time.realtimeSinceStartup - _animStart >= _animSeconds)
                {
                    _animating = false;
                    Action done = _animDone;
                    _animDone = null;
                    MarkDirtyRepaint();
                    done?.Invoke();
                }
                else if (_animating || _hintFrom >= 0) MarkDirtyRepaint();
            }).Every(16);
        }

        public Position Position => _position;

        public void SetPosition(Position position, bool flipped)
        {
            _position = position;
            _flipped = flipped;
            MarkDirtyRepaint();
        }

        public void SetSelection(int square, IEnumerable<int> targets)
        {
            _selected = square;
            _targets.Clear();
            if (targets != null) foreach (int t in targets) _targets.Add(t);
            MarkDirtyRepaint();
        }

        public void ClearSelection() => SetSelection(-1, null);

        public void SetLastMove(int from, int to)
        {
            _lastFrom = from;
            _lastTo = to;
            MarkDirtyRepaint();
        }

        /// <summary>Pulsing teal frame on the piece to move (and its destination once known). -1 clears.</summary>
        public void SetHint(int from, int to)
        {
            _hintFrom = from;
            _hintTo = to;
            MarkDirtyRepaint();
        }

        /// <summary>Red tint on the square of a refuted move. -1 clears.</summary>
        public void SetWrong(int to)
        {
            _wrongTo = to;
            MarkDirtyRepaint();
        }

        /// <summary>Slides the piece standing on the move's origin to its target, then calls <paramref name="done"/>.</summary>
        public void AnimateMove(int from, int to, float seconds, Action done)
        {
            if (_position == null || _position.IsEmpty(from) || seconds <= 0f)
            {
                done?.Invoke();
                return;
            }
            _animating = true;
            _animFrom = from;
            _animTo = to;
            _animType = _position.TypeAt(from);
            _animSide = _position.SideAt(from);
            _animStart = Time.realtimeSinceStartup;
            _animSeconds = seconds;
            _animDone = done;
            MarkDirtyRepaint();
        }

        /// <summary>Chess square under a local position, or -1.</summary>
        public int SquareAt(Vector2 local)
        {
            Layout(out Vector2 origin, out float size);
            int col = Mathf.FloorToInt((local.x - origin.x) / size);
            int row = Mathf.FloorToInt((local.y - origin.y) / size);
            if (col < 0 || row < 0 || col > 7 || row > 7) return -1;
            return FromScreen(col, row);
        }

        private void Layout(out Vector2 origin, out float size)
        {
            float side = Mathf.Min(contentRect.width, contentRect.height);
            size = side / 8f;
            origin = new Vector2((contentRect.width - side) * 0.5f, (contentRect.height - side) * 0.5f);
        }

        private int FromScreen(int col, int row) =>
            _flipped ? Squares.Make(7 - col, row) : Squares.Make(col, 7 - row);

        private Vector2 CenterOf(int square, Vector2 origin, float size)
        {
            int file = Squares.File(square), rank = Squares.Rank(square);
            int col = _flipped ? 7 - file : file;
            int row = _flipped ? rank : 7 - rank;
            return origin + new Vector2((col + 0.5f) * size, (row + 0.5f) * size);
        }

        private void Draw(MeshGenerationContext context)
        {
            var p = context.painter2D;
            Layout(out Vector2 origin, out float size);
            if (_position == null || size <= 1f) return;

            // squares
            for (int sq = 0; sq < 64; sq++)
            {
                Vector2 c = CenterOf(sq, origin, size);
                bool light = (Squares.File(sq) + Squares.Rank(sq)) % 2 == 1;
                Fill(p, c, size, light ? LightSquare : DarkSquare);
                if (sq == _lastFrom || sq == _lastTo) Fill(p, c, size, RonrikuTheme.WithAlpha(RonrikuTheme.Yellow, 0.28f));
                if (sq == _wrongTo) Fill(p, c, size, RonrikuTheme.WithAlpha(RonrikuTheme.Red, 0.6f));
                if (sq == _selected) Fill(p, c, size, RonrikuTheme.WithAlpha(RonrikuTheme.Yellow, 0.6f));
                if (_position.IsCheck && _position.TypeAt(sq) == PieceType.King && _position.SideAt(sq) == _position.Turn && !_position.IsEmpty(sq))
                    Fill(p, c, size, RonrikuTheme.WithAlpha(RonrikuTheme.Red, 0.55f));
            }

            DrawCoordinates(p, origin, size);

            // pieces (the sliding one is drawn separately)
            for (int sq = 0; sq < 64; sq++)
            {
                if (_position.IsEmpty(sq) || _animating && sq == _animFrom) continue;
                ChessPieceArt.Draw(p, _position.TypeAt(sq), _position.SideAt(sq), CenterOf(sq, origin, size), size);
            }
            if (_animating)
            {
                float t = Mathf.Clamp01((Time.realtimeSinceStartup - _animStart) / _animSeconds);
                float e = t * t * (3f - 2f * t);
                Vector2 pos = Vector2.Lerp(CenterOf(_animFrom, origin, size), CenterOf(_animTo, origin, size), e);
                ChessPieceArt.Draw(p, _animType, _animSide, pos, size);
            }

            // legal targets: a dot on empty squares, a ring on captures
            foreach (int target in _targets)
            {
                Vector2 c = CenterOf(target, origin, size);
                if (_position.IsEmpty(target)) Fill(p, c, size * 0.3f, RonrikuTheme.WithAlpha(RonrikuTheme.Teal, 0.95f));
                else Frame(p, c, size, size * 0.1f, RonrikuTheme.Teal);
            }

            if (_hintFrom >= 0)
            {
                float pulse = 0.55f + 0.45f * Mathf.Sin(Time.realtimeSinceStartup * 7f);
                Color hint = RonrikuTheme.WithAlpha(RonrikuTheme.Teal, pulse);
                Frame(p, CenterOf(_hintFrom, origin, size), size, size * 0.12f, hint);
                if (_hintTo >= 0) Frame(p, CenterOf(_hintTo, origin, size), size, size * 0.12f, hint);
            }

            // board outline
            Frame(p, origin + new Vector2(size * 4f, size * 4f), size * 8f, Mathf.Max(2f, size * 0.05f), RonrikuTheme.Line);
        }

        private void DrawCoordinates(Painter2D p, Vector2 origin, float size)
        {
            float pixel = Mathf.Max(1f, size * 0.026f);
            for (int i = 0; i < 8; i++)
            {
                int file = _flipped ? 7 - i : i;
                int rank = _flipped ? i : 7 - i;
                // file letters along the bottom edge, rank numbers along the left edge
                PixelLabel.DrawCentered(p, ((char)('a' + file)).ToString(), origin + new Vector2((i + 1f) * size - size * 0.13f, 8f * size - size * 0.12f), pixel,
                    RonrikuTheme.WithAlpha(RonrikuTheme.Background, 0.75f));
                PixelLabel.DrawCentered(p, ((char)('1' + rank)).ToString(), origin + new Vector2(size * 0.12f, i * size + size * 0.14f), pixel,
                    RonrikuTheme.WithAlpha(RonrikuTheme.Background, 0.75f));
            }
        }

        private static void Fill(Painter2D p, Vector2 center, float size, Color color)
        {
            float h = size * 0.5f;
            p.fillColor = color;
            p.BeginPath();
            p.MoveTo(center + new Vector2(-h, -h));
            p.LineTo(center + new Vector2(h, -h));
            p.LineTo(center + new Vector2(h, h));
            p.LineTo(center + new Vector2(-h, h));
            p.ClosePath();
            p.Fill();
        }

        private static void Frame(Painter2D p, Vector2 center, float size, float width, Color color)
        {
            float h = size * 0.5f;
            p.fillColor = color;
            void Bar(float x, float y, float w, float hgt)
            {
                p.BeginPath();
                p.MoveTo(center + new Vector2(x, y));
                p.LineTo(center + new Vector2(x + w, y));
                p.LineTo(center + new Vector2(x + w, y + hgt));
                p.LineTo(center + new Vector2(x, y + hgt));
                p.ClosePath();
                p.Fill();
            }
            Bar(-h, -h, size, width);
            Bar(-h, h - width, size, width);
            Bar(-h, -h, width, size);
            Bar(h - width, -h, width, size);
        }
    }
}

using System.Collections.Generic;
using Ronriku.Domain.Chess;
using Ronriku.Domain.Daily;
using Ronriku.Domain.Player;
using Ronriku.Domain.Puzzles;
using Ronriku.Presentation.Accessibility;
using Ronriku.Presentation.Components;
using UnityEngine;
using UnityEngine.UIElements;
// UnityEngine.UIElements also has a "Position" enum; the chess board position wins in this file.
using Position = Ronriku.Domain.Chess.Position;

namespace Ronriku.Presentation.Screens
{
    /// <summary>
    /// Checkmate trial: a position from a real game, find the 2–3 moves that mate. Tap a piece (its legal squares
    /// light up), tap a square. A correct move is answered with the defender's move from the real game; a wrong
    /// move is shown, explained in one line and taken back (3 tries). HINT names the piece, then the move.
    /// Played as a BIG CARD in the last world's battles (worlds 1–4 pick moves from options: <see cref="MateChoiceScreen"/>).
    /// </summary>
    public sealed class MateScreen : TrialScreenBase
    {
        private const float MoveSeconds = 0.28f;

        private readonly MatePuzzle _puzzle;
        private readonly MateSession _session;
        private readonly ChessBoardElement _board;
        private readonly List<string> _played = new List<string>();
        private readonly bool _flipped;
        private int _selected = -1;
        private int _lastFrom = -1, _lastTo = -1;
        private bool _busy;

        public MateSession Session => _session;

        /// <summary>True while a move or the defender's reply is being animated (taps are ignored).</summary>
        public bool Busy => _busy;

        /// <summary>Shown on the last world's checkmate cards, where the move options of worlds 1–4 are gone.</summary>
        public const string HarderNotice = "HARDER NOW: NO OPTIONS  ·  MOVE THE PIECES YOURSELF";

        private readonly Label _notice;

        public MateScreen(MatePuzzle puzzle, TrialScreenContext context, string notice = null)
            : base(context, "CHECKMATE", Instruction(puzzle), TrialScoring.TimeLimitSeconds("mate", puzzle.Difficulty), puzzle.Id)
        {
            _puzzle = puzzle;
            _session = new MateSession(puzzle);
            _flipped = puzzle.Attacker == Side.Black;

            if (!string.IsNullOrEmpty(notice))
            {
                // stays for the whole card: hiding it would resize the board between taps
                _notice = UiFactory.Heading(notice, 11, RonrikuTheme.Background);
                _notice.name = "harder-notice";
                _notice.style.backgroundColor = RonrikuTheme.Gold;
                _notice.style.whiteSpace = WhiteSpace.Normal;
                _notice.style.paddingTop = _notice.style.paddingBottom = 4;
                _notice.style.paddingLeft = _notice.style.paddingRight = 6;
                _notice.style.flexShrink = 0;
                Body.Add(_notice);
            }

            _board = new ChessBoardElement { name = "chess-board" };
            _board.style.flexGrow = 1;
            _board.style.marginTop = 6;
            _board.SetPosition(_session.Position, _flipped);
            _board.RegisterCallback<PointerDownEvent>(OnPointerDown);
            Body.Add(_board);

            var credit = UiFactory.Label($"REAL GAME  ·  {puzzle.Credit}", 10, RonrikuTheme.Muted);
            credit.name = "credit";
            credit.style.whiteSpace = WhiteSpace.Normal;
            credit.style.minHeight = 20;
            credit.style.flexShrink = 0;
            Body.Add(credit);

            Controls.Add(ControlRow(("HINT", "hint-button", Hint)));

            UpdateCounter();
            SetStatus("TAP A PIECE, THEN A GLOWING SQUARE", RonrikuTheme.Muted);
        }

        private static string Instruction(MatePuzzle puzzle)
        {
            string line = $"{Position.Name(puzzle.Attacker)} TO MOVE  ·  CHECKMATE IN {puzzle.MateIn}";
            return puzzle.AllChecks ? line + "\nEVERY MOVE IS A CHECK" : line;
        }

        protected override string CounterPrefix() =>
            $"MOVE {Mathf.Min(_session.Step + 1, _puzzle.MateIn)}/{_puzzle.MateIn}  ·  TRIES {_session.MistakesLeft}";

        protected override int EmbeddedHoldMs(bool solved) => solved ? 1800 : 3400;

        protected override TrialOutcome CreateOutcome(bool solved, int elapsedMilliseconds)
        {
            PuzzleDifficulty difficulty = _puzzle.Difficulty;
            int target = TrialScoring.TargetMilliseconds("mate", difficulty);
            // Tries used are "resets" (same penalty as other trials); par is the number of moves in the solution.
            int points = TrialScoring.Points(difficulty, solved, elapsedMilliseconds, target, _session.Step, _puzzle.MateIn, _session.Mistakes, 0);
            return new TrialOutcome(TrialKind.Mate, difficulty, solved, elapsedMilliseconds, target, _session.Step, _puzzle.MateIn,
                _session.Mistakes, points, "[" + string.Join(",", _played.ConvertAll(m => $"\"{m}\"")) + "]");
        }

        // ------------------------------------------------------------------ input

        private void OnPointerDown(PointerDownEvent evt)
        {
            int square = _board.SquareAt(evt.localPosition);
            if (square >= 0) Tap(square);
        }

        /// <summary>One tap on a square (also the entry point for automated tests).</summary>
        public void Tap(int square)
        {
            if (_busy || _session.Over) return;
            Position position = _session.Position;
            Side mine = _session.Attacker;

            if (_selected >= 0 && square != _selected && !position.HasPieceOf(square, mine))
            {
                TryMove(_selected, square);
                return;
            }
            if (square == _selected)
            {
                Deselect();
                return;
            }
            if (position.HasPieceOf(square, mine))
            {
                Select(square);
                return;
            }
            SetStatus(position.IsEmpty(square)
                ? "TAP ONE OF YOUR PIECES FIRST"
                : $"THAT IS A {Position.Name(Position.Opposite(mine))} PIECE. YOU PLAY {Position.Name(mine)}", RonrikuTheme.Muted);
            Feedback.Error();
        }

        private void Select(int square)
        {
            List<Move> moves = _session.LegalMovesFrom(square);
            var targets = new List<int>(moves.Count);
            foreach (Move m in moves) targets.Add(m.To);
            _selected = square;
            _board.SetSelection(square, targets);
            PieceType type = _session.Position.TypeAt(square);
            SetStatus(moves.Count == 0 ? $"THIS {Position.Name(type)} HAS NO LEGAL MOVE" : MateSession.Rule(type), Palette.Accent);
            Feedback.Tap();
        }

        private void Deselect()
        {
            _selected = -1;
            _board.ClearSelection();
        }

        private void TryMove(int from, int to)
        {
            Position before = _session.Position;
            MoveResult result = _session.TryMove(from, to);
            switch (result.Outcome)
            {
                case MoveOutcome.Illegal:
                    SetStatus(result.Message, RonrikuTheme.Red);
                    Feedback.Error();
                    break;
                case MoveOutcome.Correct:
                case MoveOutcome.Solved:
                    PlayCorrect(before, result);
                    break;
                case MoveOutcome.Wrong:
                case MoveOutcome.Failed:
                    PlayWrong(before, result);
                    break;
            }
        }

        // ------------------------------------------------------------------ move playback

        private void Slide(Position position, Move move, System.Action done)
        {
            _board.SetPosition(position, _flipped);
            _board.AnimateMove(move.From, move.To, MotionSettings.ReducedMotion ? 0f : MoveSeconds, done);
        }

        private void ShowLast(int from, int to)
        {
            _lastFrom = from;
            _lastTo = to;
            _board.SetLastMove(from, to);
        }

        private void PlayCorrect(Position before, MoveResult result)
        {
            _busy = true;
            Deselect();
            _board.SetHint(-1, -1);
            _played.Add(result.Move.ToString());
            Position afterMove = before.Play(result.Move);
            Feedback.Move();
            Slide(before, result.Move, () =>
            {
                _board.SetPosition(afterMove, _flipped);
                ShowLast(result.Move.From, result.Move.To);
                if (result.Outcome == MoveOutcome.Solved)
                {
                    UpdateCounter();
                    string title = string.IsNullOrEmpty(_puzzle.Title) ? string.Empty : $"  ·  {_puzzle.Title.ToUpperInvariant()}";
                    MarkFinished(true, "CHECKMATE!" + title, RonrikuTheme.Teal);
                    return;
                }
                SetStatus($"{Position.Name(afterMove.Turn)} REPLIES {result.ReplySan}", RonrikuTheme.Muted);
                Move reply = result.Reply.Value;
                _board.schedule.Execute(() => Slide(afterMove, reply, () =>
                {
                    _board.SetPosition(_session.Position, _flipped);
                    ShowLast(reply.From, reply.To);
                    UpdateCounter();
                    SetStatus($"YOUR MOVE  ·  MATE IN {_session.MovesLeft}", RonrikuTheme.Muted);
                    _busy = false;
                })).StartingIn(MotionSettings.ReducedMotion ? 0 : 380);
            });
        }

        private void PlayWrong(Position before, MoveResult result)
        {
            _busy = true;
            Deselect();
            Position afterWrong = before.Play(result.Move);
            Feedback.Error();
            Slide(before, result.Move, () =>
            {
                _board.SetPosition(afterWrong, _flipped);
                _board.SetWrong(result.Move.To);
                SetStatus(result.Message, RonrikuTheme.Red);
                UpdateCounter();
                bool failed = result.Outcome == MoveOutcome.Failed;
                _board.schedule.Execute(() =>
                {
                    _board.SetWrong(-1);
                    _board.SetPosition(before, _flipped);
                    _board.SetLastMove(_lastFrom, _lastTo);
                    if (failed)
                    {
                        MarkFinished(false, "NOT THIS TIME  ·  SOLUTION " + _session.RemainingSolution(), RonrikuTheme.Red);
                        return;
                    }
                    SetStatus($"TRY AGAIN  ·  {_session.MistakesLeft} TRIES LEFT", RonrikuTheme.Muted);
                    _busy = false;
                }).StartingIn(failed ? 1000 : 1500);
            });
        }

        private void Hint()
        {
            if (_busy || _session.Over) return;
            (int from, int to) = _session.Hint();
            _board.SetHint(from, to);
            PieceType type = _session.Position.TypeAt(from);
            SetStatus(to < 0
                ? $"HINT: MOVE THE {Position.Name(type)} ON THE PULSING SQUARE"
                : $"HINT: {_session.Position.ToSan(_session.Expected)}  ·  PULSING SQUARES", Palette.Accent);
            Feedback.Snap();
        }
    }
}

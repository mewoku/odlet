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
    /// Easy Checkmate card (worlds 1–4): the same real-game puzzle as <see cref="MateScreen"/>, but the board is
    /// not touched. Each of the player's moves is a stage with <see cref="MateChoices.Count"/> options below the
    /// board: the first tap on an option plays the move on the board as a preview, a second tap on the same option
    /// commits it. A wrong pick is explained, struck out and costs one of <see cref="MateChoices.MaxMistakes"/> tries.
    /// HINT strikes out one wrong option.
    /// </summary>
    public sealed class MateChoiceScreen : TrialScreenBase
    {
        private const float MoveSeconds = 0.32f;

        private readonly MatePuzzle _puzzle;
        private readonly MateSession _session;
        private readonly ChessBoardElement _board;
        private readonly VisualElement _optionRow;
        private readonly List<string> _played = new List<string>();
        private readonly List<Button> _buttons = new List<Button>();
        private readonly HashSet<int> _struck = new HashSet<int>();
        private readonly long _seed;
        private readonly bool _flipped;
        private Move[] _options = new Move[0];
        private int _selected = -1;
        private int _lastFrom = -1, _lastTo = -1;
        private int _previewToken;
        private bool _busy;

        public MateSession Session => _session;

        /// <summary>Moves offered for the current stage, in button order.</summary>
        public IReadOnlyList<Move> Options => _options;

        /// <summary>Option being previewed (−1: none).</summary>
        public int Selected => _selected;

        /// <summary>True while the committed move or the defender's reply is being animated (taps are ignored).</summary>
        public bool Busy => _busy;

        public MateChoiceScreen(MatePuzzle puzzle, long seed, TrialScreenContext context)
            : base(context, "CHECKMATE", Instruction(puzzle), TrialScoring.TimeLimitSeconds("mate", puzzle.Difficulty), puzzle.Id)
        {
            _puzzle = puzzle;
            _seed = seed;
            _session = new MateSession(puzzle, MateChoices.MaxMistakes);
            _flipped = puzzle.Attacker == Side.Black;

            _board = new ChessBoardElement { name = "chess-board" };
            _board.style.flexGrow = 1;
            _board.style.marginTop = 4;
            _board.pickingMode = PickingMode.Ignore;
            _board.SetPosition(_session.Position, _flipped);
            Body.Add(_board);

            var credit = UiFactory.Label($"REAL GAME  ·  {puzzle.Credit}", 10, RonrikuTheme.Muted);
            credit.name = "credit";
            credit.style.whiteSpace = WhiteSpace.Normal;
            credit.style.minHeight = 18;
            credit.style.flexShrink = 0;
            Body.Add(credit);

            _optionRow = new VisualElement { name = "move-options" };
            _optionRow.style.flexDirection = FlexDirection.Row;
            _optionRow.style.flexShrink = 0;
            _optionRow.style.marginTop = 4;
            Body.Add(_optionRow);

            Controls.Add(ControlRow(("HINT", "hint-button", Hint)));

            BuildOptions();
            UpdateCounter();
        }

        private static string Instruction(MatePuzzle puzzle)
        {
            string line = $"{Position.Name(puzzle.Attacker)} TO MOVE  ·  CHECKMATE IN {puzzle.MateIn}";
            return puzzle.AllChecks ? line + "  ·  EVERY MOVE IS A CHECK" : line;
        }

        protected override string CounterPrefix() =>
            $"MOVE {Mathf.Min(_session.Step + 1, _puzzle.MateIn)}/{_puzzle.MateIn}  ·  TRIES {_session.MistakesLeft}";

        protected override int EmbeddedHoldMs(bool solved) => solved ? 1800 : 3400;

        protected override TrialOutcome CreateOutcome(bool solved, int elapsedMilliseconds)
        {
            PuzzleDifficulty difficulty = _puzzle.Difficulty;
            int target = TrialScoring.TargetMilliseconds("mate", difficulty);
            int points = TrialScoring.Points(difficulty, solved, elapsedMilliseconds, target, _session.Step, _puzzle.MateIn, _session.Mistakes, 0);
            return new TrialOutcome(TrialKind.Mate, difficulty, solved, elapsedMilliseconds, target, _session.Step, _puzzle.MateIn,
                _session.Mistakes, points, "[" + string.Join(",", _played.ConvertAll(m => $"\"{m}\"")) + "]");
        }

        // ------------------------------------------------------------------ options

        private void BuildOptions()
        {
            _options = MateChoices.For(_session, _seed);
            _struck.Clear();
            _selected = -1;
            _optionRow.Clear();
            _buttons.Clear();
            Position position = _session.Position;
            for (int i = 0; i < _options.Length; i++)
            {
                int index = i;
                (string piece, string action) = MateChoices.Label(position, _options[i], _options);
                var button = new Button(() => Tap(index)) { name = $"move-option-{i}", text = string.Empty };
                button.style.flexGrow = 1;
                button.style.flexBasis = 0;
                button.style.height = 58;
                button.style.marginLeft = i == 0 ? 0 : 4;
                button.style.marginRight = button.style.marginTop = button.style.marginBottom = 0;
                button.style.paddingLeft = button.style.paddingRight = 2;
                button.style.paddingTop = button.style.paddingBottom = 2;
                button.style.flexDirection = FlexDirection.Row;
                button.style.alignItems = Align.Center;
                button.style.justifyContent = Justify.Center;
                button.style.backgroundColor = RonrikuTheme.Surface2;
                UiFactory.Pressable(button);

                var icon = new PieceIcon(position.TypeAt(_options[i].From), _session.Attacker);
                icon.style.width = icon.style.height = 26;
                icon.style.flexShrink = 0;
                icon.pickingMode = PickingMode.Ignore;
                button.Add(icon);

                var text = new VisualElement();
                text.pickingMode = PickingMode.Ignore;
                text.style.marginLeft = 2;
                text.style.flexShrink = 1;
                var top = UiFactory.Label(piece, 9, RonrikuTheme.Muted);
                top.pickingMode = PickingMode.Ignore;
                top.style.unityTextAlign = TextAnchor.MiddleLeft;
                text.Add(top);
                var bottom = UiFactory.Heading(action, 12, RonrikuTheme.Text);
                bottom.pickingMode = PickingMode.Ignore;
                bottom.style.unityTextAlign = TextAnchor.MiddleLeft;
                bottom.style.whiteSpace = WhiteSpace.Normal;
                text.Add(bottom);
                button.Add(text);

                _optionRow.Add(button);
                _buttons.Add(button);
            }
            Paint();
            SetStatus("TAP A MOVE TO SEE IT  ·  TAP IT AGAIN TO PLAY", RonrikuTheme.Muted);
        }

        private void Paint()
        {
            for (int i = 0; i < _buttons.Count; i++)
            {
                Color frame = _struck.Contains(i) ? RonrikuTheme.Red
                    : i == _selected ? RonrikuTheme.Gold
                    : RonrikuTheme.WithAlpha(Palette.Accent, 0.45f);
                UiFactory.SetBorder(_buttons[i], 3, frame);
                _buttons[i].style.opacity = _struck.Contains(i) ? 0.35f : 1f;
                _buttons[i].style.backgroundColor = i == _selected ? RonrikuTheme.WithAlpha(RonrikuTheme.Gold, 0.18f) : RonrikuTheme.Surface2;
            }
        }

        /// <summary>One tap on an option (also the entry point for automated tests): preview first, commit on the second tap.</summary>
        public void Tap(int option)
        {
            if (_busy || _session.Over || option < 0 || option >= _options.Length || _struck.Contains(option)) return;
            if (option == _selected) Commit(option);
            else Preview(option);
        }

        private void Preview(int option)
        {
            _selected = option;
            Paint();
            Move move = _options[option];
            Position before = _session.Position;
            Position after = before.Play(move);
            int token = ++_previewToken;
            _board.SetWrong(-1);
            _board.SetHint(-1, -1);
            _board.SetPosition(before, _flipped);
            _board.SetLastMove(-1, -1);
            _board.AnimateMove(move.From, move.To, MotionSettings.ReducedMotion ? 0f : MoveSeconds, () =>
            {
                if (token != _previewToken) return;
                _board.SetPosition(after, _flipped);
                _board.SetLastMove(move.From, move.To);
            });
            SetStatus(after.IsCheck ? "CHECK!  ·  TAP AGAIN TO PLAY THIS MOVE" : "TAP AGAIN TO PLAY THIS MOVE", RonrikuTheme.Gold);
            Feedback.Tap();
        }

        private void Commit(int option)
        {
            Position before = _session.Position;
            Move move = _options[option];
            MoveResult result = _session.TryMove(move.From, move.To);
            _previewToken++;
            switch (result.Outcome)
            {
                case MoveOutcome.Correct:
                case MoveOutcome.Solved:
                    PlayCorrect(before, result);
                    break;
                case MoveOutcome.Wrong:
                case MoveOutcome.Failed:
                    PlayWrong(option, before, result);
                    break;
            }
        }

        // ------------------------------------------------------------------ playback

        private void PlayCorrect(Position before, MoveResult result)
        {
            _busy = true;
            _played.Add(result.Move.ToString());
            Position afterMove = before.Play(result.Move);
            _board.SetHint(-1, -1);
            _board.SetPosition(afterMove, _flipped);
            ShowLast(result.Move.From, result.Move.To);
            MarkRight(_selected);
            Feedback.Move();
            if (result.Outcome == MoveOutcome.Solved)
            {
                UpdateCounter();
                string title = string.IsNullOrEmpty(_puzzle.Title) ? string.Empty : $"  ·  {_puzzle.Title.ToUpperInvariant()}";
                MarkFinished(true, "CHECKMATE!" + title, RonrikuTheme.Teal);
                LockOptions();
                return;
            }
            SetStatus($"GOOD MOVE  ·  {Position.Name(afterMove.Turn)} REPLIES {result.ReplySan}", RonrikuTheme.Teal);
            Move reply = result.Reply.Value;
            _board.schedule.Execute(() =>
                _board.AnimateMove(reply.From, reply.To, MotionSettings.ReducedMotion ? 0f : MoveSeconds, () =>
                {
                    _board.SetPosition(_session.Position, _flipped);
                    ShowLast(reply.From, reply.To);
                    UpdateCounter();
                    _busy = false;
                    BuildOptions();
                    SetStatus($"YOUR MOVE  ·  MATE IN {_session.MovesLeft}  ·  TAP A MOVE TO SEE IT", RonrikuTheme.Muted);
                })).StartingIn(MotionSettings.ReducedMotion ? 0 : 520);
        }

        private void PlayWrong(int option, Position before, MoveResult result)
        {
            _busy = true;
            _struck.Add(option);
            _selected = -1;
            Paint();
            Position afterWrong = before.Play(result.Move);
            _board.SetPosition(afterWrong, _flipped);
            _board.SetLastMove(result.Move.From, result.Move.To);
            _board.SetWrong(result.Move.To);
            SetStatus(result.Message, RonrikuTheme.Red);
            UpdateCounter();
            Feedback.Error();
            bool failed = result.Outcome == MoveOutcome.Failed;
            _board.schedule.Execute(() =>
            {
                _board.SetWrong(-1);
                _board.SetPosition(before, _flipped);
                _board.SetLastMove(_lastFrom, _lastTo);
                if (failed)
                {
                    int right = System.Array.IndexOf(_options, _session.Expected);
                    if (right >= 0) MarkRight(right);
                    _board.SetHint(_session.Expected.From, _session.Expected.To);
                    MarkFinished(false, "NOT THIS TIME  ·  SOLUTION " + _session.RemainingSolution(), RonrikuTheme.Red);
                    LockOptions();
                    return;
                }
                SetStatus($"TRY ANOTHER MOVE  ·  {_session.MistakesLeft} {(_session.MistakesLeft == 1 ? "TRY" : "TRIES")} LEFT", RonrikuTheme.Muted);
                _busy = false;
            }).StartingIn(failed ? 1200 : 1700);
        }

        private void ShowLast(int from, int to)
        {
            _lastFrom = from;
            _lastTo = to;
            _board.SetLastMove(from, to);
        }

        /// <summary>The right move turns green (fill and frame), like the right answer of every other card.</summary>
        private void MarkRight(int option)
        {
            UiFactory.SetBorder(_buttons[option], 3, RonrikuTheme.Green);
            _buttons[option].style.backgroundColor = RonrikuTheme.WithAlpha(RonrikuTheme.Green, 0.3f);
            _buttons[option].style.opacity = 1f;
        }
        private void LockOptions()
        {
            foreach (Button b in _buttons) b.SetEnabled(false);
        }

        /// <summary>Strikes out one wrong option (free). With one option left it is the right move.</summary>
        private void Hint()
        {
            if (_busy || _session.Over) return;
            for (int i = 0; i < _options.Length; i++)
            {
                if (_options[i] == _session.Expected || _struck.Contains(i)) continue;
                _struck.Add(i);
                if (_selected == i)
                {
                    // the crossed-out move was on preview: put the board back
                    _selected = -1;
                    _previewToken++;
                    _board.SetPosition(_session.Position, _flipped);
                    _board.SetLastMove(_lastFrom, _lastTo);
                }
                Paint();
                SetStatus("HINT: ONE WRONG MOVE CROSSED OUT", Palette.Accent);
                Feedback.Snap();
                return;
            }
            SetStatus("HINT: THE LAST MOVE LEFT IS THE ONE", Palette.Accent);
        }

        /// <summary>Small pixel chess piece for an option button.</summary>
        private sealed class PieceIcon : VisualElement
        {
            private readonly PieceType _type;
            private readonly Side _side;

            public PieceIcon(PieceType type, Side side)
            {
                _type = type;
                _side = side;
                generateVisualContent += ctx =>
                {
                    float s = Mathf.Min(contentRect.width, contentRect.height);
                    if (s > 1f) ChessPieceArt.Draw(ctx.painter2D, _type, _side, contentRect.center, s * 1.25f);
                };
            }
        }
    }
}

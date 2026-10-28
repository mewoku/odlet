using System.Collections;
using System.Reflection;
using NUnit.Framework;
using Ronriku.Domain.Chess;
using Ronriku.Domain.Puzzles;
using Ronriku.Presentation.Screens;
using UnityEngine;
using UnityEngine.UIElements;

namespace Ronriku.Tests
{
    /// <summary>Solves an embedded classic trial (BIG CARD) through its real controls.</summary>
    internal static class BigCardSolver
    {
        private static T Data<T>(object screen) where T : class =>
            screen.GetType().GetField("_data", BindingFlags.Instance | BindingFlags.NonPublic)?.GetValue(screen) as T;

        public static IEnumerator Solve(VisualElement card)
        {
            if (card.Q<PatternPuzzleScreen>() is { } pattern)
            {
                var data = Data<PatternPuzzleData>(pattern);
                DailyRouteTests.Click(pattern.Q<Button>($"option-{data.CorrectOption}"));
            }
            else if (card.Q<LogicPuzzleScreen>() is { } logic)
            {
                var data = Data<LogicPuzzleData>(logic);
                var path = LogicPuzzleSolver.Solve(data);
                for (int i = 1; i < path.Count; i++) Assert.That(logic.TryExtend(path[i]), Is.True, $"link step {i}");
            }
            else if (card.Q<SpatialPuzzleScreen>() is { } spatial)
            {
                var data = Data<SpatialPuzzleData>(spatial);
                foreach (SpatialMove move in SpatialPuzzleSolver.Solve(data))
                {
                    DailyRouteTests.Click(spatial.Q<Button>(DailyRouteTests.ButtonName(move)));
                    yield return new WaitForSecondsRealtime(0.2f);
                }
            }
            else if (card.Q<MateChoiceScreen>() is { } choice)
            {
                // first tap previews the move, the second tap on the same option plays it
                while (!choice.Session.Solved)
                {
                    int option = -1;
                    for (int i = 0; i < choice.Options.Count; i++) if (choice.Options[i] == choice.Session.Expected) option = i;
                    Assert.That(option, Is.GreaterThanOrEqualTo(0), "the game's move is among the options");
                    var button = choice.Q<Button>($"move-option-{option}");
                    int step = choice.Session.Step;
                    DailyRouteTests.Click(button);
                    Assert.That(choice.Selected, Is.EqualTo(option), "one tap selects the option");
                    Assert.That(choice.Session.Step, Is.EqualTo(step), "one tap only previews");
                    yield return new WaitForSecondsRealtime(0.1f);
                    DailyRouteTests.Click(button);
                    float until = Time.realtimeSinceStartup + 5f;
                    yield return null;
                    while (choice.Busy && !choice.Session.Solved && Time.realtimeSinceStartup < until) yield return null;
                    Assert.That(choice.Session.Mistakes, Is.EqualTo(0), "the solution move was accepted");
                }
            }
            else if (card.Q<MateScreen>() is { } mate)
            {
                // tap piece, tap square, then wait for the defender's reply from the real game
                while (!mate.Session.Solved)
                {
                    Move move = mate.Session.Expected;
                    mate.Tap(move.From);
                    mate.Tap(move.To);
                    float until = Time.realtimeSinceStartup + 5f;
                    yield return null;
                    while (mate.Busy && !mate.Session.Solved && Time.realtimeSinceStartup < until) yield return null;
                    Assert.That(mate.Session.Mistakes, Is.EqualTo(0), "the solution move was accepted");
                }
            }
            else Assert.Fail("BIG CARD without a classic trial");
            yield return null;
        }
    }
}

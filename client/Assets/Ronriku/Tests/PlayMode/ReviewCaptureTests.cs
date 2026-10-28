using System;
using System.Collections;
using System.IO;
using NUnit.Framework;
using Ronriku.Composition;
using Ronriku.Domain.Arcade;
using Ronriku.Domain.Player;
using Ronriku.Presentation.Arcade;
using Ronriku.Presentation.Components;
using Ronriku.Presentation.Shell;
using UnityEngine;
using UnityEngine.SceneManagement;
using UnityEngine.TestTools;
using UnityEngine.UIElements;

namespace Ronriku.Tests
{
    /// <summary>
    /// Design review contact sheet: every mode's how-to card, every battle micro-card at both tiers (fresh, and after
    /// a wrong answer), every big card, the first screen of each level type and the map of every world, on the Seeker
    /// aspect. Writes to artifacts/review (git-ignored). Run with: scripts/unity-test.ps1 -Platform PlayMode -Category Review
    /// </summary>
    [Category("Review")]
    public sealed class ReviewCaptureTests
    {
        private static readonly ChallengeKind[] SmallKinds =
            { ChallengeKind.Next, ChallengeKind.Sum, ChallengeKind.Memory, ChallengeKind.Mirror, ChallengeKind.Arrows, ChallengeKind.Scales, ChallengeKind.Lines };

        [UnityTest]
        public IEnumerator CaptureContactSheet_OnSeeker()
        {
            string folder = Path.GetFullPath(Path.Combine(Application.dataPath, "../../artifacts/review"));
            Directory.CreateDirectory(folder);
            string profileDir = Path.Combine(Path.GetTempPath(), "ronriku-review-" + Guid.NewGuid().ToString("N"));
            RuntimeConfig.ProfileDirectory = profileDir;
            RuntimeConfig.OnlineEnabled = false;
            RuntimeConfig.SkipHowTo = true;
            RuntimeConfig.UtcNowOverride = new DateTime(2026, 9, 23, 16, 41, 7, DateTimeKind.Utc);
            try
            {
                SceneManager.LoadScene("Bootstrap");
                yield return null;
                var app = UnityEngine.Object.FindAnyObjectByType<RonrikuBootstrap>();
                var document = app.GetComponent<UIDocument>();
                var target = new RenderTexture(1080, 2400, 24, RenderTextureFormat.ARGB32, RenderTextureReadWrite.sRGB);
                document.panelSettings = UnityEngine.Object.Instantiate(document.panelSettings);
                document.panelSettings.targetTexture = target;
                var root = document.rootVisualElement;
                yield return new WaitForSecondsRealtime(1.4f);
                void Shot(string step) => Save(target, folder, step);

                // How-to cards.
                foreach (LevelMode mode in Enum.GetValues(typeof(LevelMode)))
                {
                    var host = Host(root, 0);
                    host.Add(new HowToScreen(mode, RonrikuTheme.Lab, () => { }, () => { }));
                    yield return new WaitForSecondsRealtime(0.9f);
                    yield return Settle();
                    Shot("howto-" + mode.ToString().ToLowerInvariant());
                    host.RemoveFromHierarchy();
                }

                // Micro-cards: intro, puzzle, then a wrong answer with its reveal.
                foreach (ChallengeKind kind in SmallKinds)
                for (int tier = 0; tier < 2; tier++)
                {
                    var challenge = Challenges.Generate(kind, 4242 + 17 * tier + (int)kind, tier);
                    var host = Host(root, 300);
                    var view = new ChallengeView(challenge, RonrikuTheme.Worlds[(int)kind % RonrikuTheme.Worlds.Length]);
                    host.Add(view);
                    string name = $"card-{kind.ToString().ToLowerInvariant()}-t{tier}";
                    yield return new WaitForSecondsRealtime(0.5f);
                    yield return Settle();
                    if (tier == 0) Shot(name + "-0intro");
                    view.SkipIntro();
                    yield return new WaitForSecondsRealtime(0.4f);
                    yield return Settle();
                    Shot(name + "-1puzzle");
                    if (kind == ChallengeKind.Memory)
                    {
                        yield return new WaitForSecondsRealtime(2.6f);
                        yield return Settle();
                        Shot(name + "-2recall");
                    }
                    int wrong = WrongAnswer(view, challenge);
                    view.Reveal(false, wrong);
                    yield return new WaitForSecondsRealtime(0.9f);
                    yield return Settle();
                    Shot(name + "-3wrong");
                    host.RemoveFromHierarchy();
                }

                // Big cards: Pattern, Shadow, Link (checkmate has its own capture test).
                string[] bigNames = { "pattern", "shadow", "link" };
                for (int big = 0; big < 3; big++)
                {
                    var host = Host(root, 300);
                    host.Add(new ChallengeView(new Challenge(ChallengeKind.Classic, 9000 + big, 0, new[] { big }, Array.Empty<int>(), 1), RonrikuTheme.Lab));
                    yield return new WaitForSecondsRealtime(1.2f);
                    yield return Settle();
                    Shot("big-" + bigNames[big]);
                    host.RemoveFromHierarchy();
                }

                // Checkmate, worlds 1–4: pick a move (one tap previews, a second tap plays), a wrong pick; then the last world's board.
                {
                    var host = Host(root, 300);
                    host.Add(new ChallengeView(Challenges.GenerateMate(LevelModes.MatePuzzle(0, 0), 4242, 0, true), RonrikuTheme.Lab));
                    yield return new WaitForSecondsRealtime(1.2f);
                    yield return Settle();
                    Shot("mate-choice-1-start");
                    var choice = root.Q<Ronriku.Presentation.Screens.MateChoiceScreen>();
                    int right = -1, wrong = -1;
                    for (int i = 0; i < choice.Options.Count; i++)
                        if (choice.Options[i] == choice.Session.Expected) right = i;
                        else wrong = i;
                    DailyRouteTests.Click(root.Q<Button>($"move-option-{wrong}"));
                    yield return new WaitForSecondsRealtime(0.6f);
                    yield return Settle();
                    Shot("mate-choice-2-preview-wrong");
                    DailyRouteTests.Click(root.Q<Button>($"move-option-{wrong}"));
                    yield return new WaitForSecondsRealtime(0.5f);
                    yield return Settle();
                    Shot("mate-choice-3-wrong");
                    yield return new WaitForSecondsRealtime(1.6f);
                    DailyRouteTests.Click(root.Q<Button>($"move-option-{right}"));
                    yield return new WaitForSecondsRealtime(0.6f);
                    yield return Settle();
                    Shot("mate-choice-4-preview-right");
                    DailyRouteTests.Click(root.Q<Button>($"move-option-{right}"));
                    yield return new WaitForSecondsRealtime(1.6f);
                    yield return Settle();
                    Shot("mate-choice-5-reply-next-options");
                    host.RemoveFromHierarchy();

                    host = Host(root, 300);
                    host.Add(new ChallengeView(Challenges.GenerateMate(LevelModes.MatePuzzle(4, 0), 4243, 1, false), RonrikuTheme.Lab));
                    yield return new WaitForSecondsRealtime(1.2f);
                    yield return Settle();
                    Shot("mate-board-w5-harder");
                    host.RemoveFromHierarchy();
                }

                // A real W1 battle: three right answers (green), ON FIRE over the arena, the combo bar, then BIG CARD alone.
                {
                    var playLevel = typeof(RonrikuBootstrap).GetMethod("PlayLevel", System.Reflection.BindingFlags.Instance | System.Reflection.BindingFlags.NonPublic);
                    playLevel.Invoke(app, new object[] { 0, 0 });
                    var battle = root.Q<BattleScreen>();
                    for (int card = 0; card < 3; card++)
                    {
                        yield return ArcadeRouteTests.WaitFor(() => root.Q<ChallengeView>() is { } v && v.Challenge == battle.State.Current, 5f, "card");
                        yield return new WaitForSecondsRealtime(0.4f);
                        int index = battle.State.Index;
                        yield return ArcadeRouteTests.Answer(root, battle.State.Current);
                        yield return ArcadeRouteTests.WaitFor(() => battle.State.Index > index, 5f, "judged");
                        if (card == 0)
                        {
                            yield return new WaitForSecondsRealtime(0.15f);
                            yield return Settle();
                            Shot("battle-1-right-answer-green");
                        }
                    }
                    yield return new WaitForSecondsRealtime(0.25f);
                    yield return Settle();
                    Shot("battle-2-on-fire-over-arena");
                    yield return ArcadeRouteTests.WaitFor(() => root.Q<ChallengeView>() == null, 5f, "slot cleared for the big card");
                    yield return new WaitForSecondsRealtime(0.3f);
                    yield return Settle();
                    Shot("battle-3-big-card-intro");
                    yield return ArcadeRouteTests.WaitFor(() => root.Q<ChallengeView>() != null, 5f, "big card");
                    yield return new WaitForSecondsRealtime(0.6f);
                    yield return Settle();
                    Shot("battle-4-big-card");
                }

                // Level types as the map opens them.
                var play = typeof(RonrikuBootstrap).GetMethod("PlayLevel", System.Reflection.BindingFlags.Instance | System.Reflection.BindingFlags.NonPublic);
                (int world, int index, string label, float wait)[] levels =
                {
                    (0, 0, "level-w1-01-battle", 3.6f), (0, 3, "level-w1-04-runehand-charms", 0.9f), (0, 2, "level-w1-03-icedash", 1.2f),
                    (0, 5, "level-w1-06-beatcrawl", 4.5f), (0, 11, "level-w1-12-boss", 3.6f), (4, 8, "level-w5-09-battle", 3.6f)
                };
                foreach (var (world, index, label, wait) in levels)
                {
                    play.Invoke(app, new object[] { world, index });
                    yield return new WaitForSecondsRealtime(wait);
                    yield return Settle();
                    Shot(label);
                    if (label.Contains("charms"))
                    {
                        DailyRouteTests.Click(root.Q<Button>("charm-0"));
                        yield return new WaitForSecondsRealtime(1.2f);
                        yield return Settle();
                        Shot("level-w1-04-runehand-hand");
                    }
                }

                // Maps: open every world (records for W1–W4 cleared, W5 half way).
                var profile = DailyRouteTests.Field<PlayerProfile>(app, "_profile");
                for (int w = 0; w < 5; w++)
                for (int i = 0; i < (w < 4 ? 12 : 5); i++)
                    if (profile.LevelRecordFor(w, i) == null) profile.levels.Add(new LevelRecord { world = w, level = i, stars = 1 + (w + i) % 3, bestMs = 60000 });
                DailyRouteTests.ShowTab(app, AppTab.Daily);
                yield return Settle();
                DailyRouteTests.ShowTab(app, AppTab.Play);
                yield return new WaitForSecondsRealtime(0.6f);
                for (int w = 0; w < 5; w++)
                {
                    DailyRouteTests.Click(root.Q<Button>($"world-{w}"));
                    yield return new WaitForSecondsRealtime(0.8f);
                    yield return Settle();
                    Shot($"map-w{w + 1}");
                }
                // The last world's battle panel warns that the checkmate card gets harder.
                var map = root.Q<Ronriku.Presentation.Screens.PlayMapScreen>();
                typeof(Ronriku.Presentation.Screens.PlayMapScreen).GetMethod("ShowEncounter", System.Reflection.BindingFlags.Instance | System.Reflection.BindingFlags.NonPublic)
                    .Invoke(map, new object[] { 4 });
                yield return new WaitForSecondsRealtime(0.5f);
                yield return Settle();
                Assert.That(root.Q<Label>("mate-harder"), Is.Not.Null, "W5 battle panel warns about the harder checkmate");
                Shot("map-w5-battle-panel-harder");

                document.panelSettings.targetTexture = null;
                target.Release();
                UnityEngine.Object.Destroy(target);
            }
            finally
            {
                RuntimeConfig.Reset();
                if (Directory.Exists(profileDir)) Directory.Delete(profileDir, true);
            }
        }

        private static VisualElement Host(VisualElement root, float top)
        {
            var host = new VisualElement();
            host.style.position = Position.Absolute;
            host.style.left = host.style.right = host.style.bottom = 0;
            host.style.top = top;
            host.style.backgroundColor = RonrikuTheme.Background;
            root.Add(host);
            return host;
        }

        /// <summary>Taps a wrong answer the way a player would and returns it in the kind's answer encoding.</summary>
        private static int WrongAnswer(ChallengeView view, Challenge c)
        {
            switch (c.Kind)
            {
                case ChallengeKind.Sum:
                {
                    int mask = 0;
                    for (int i = 0; i < c.Items.Length && Challenges.PopCount(mask) < c.Pick; i++)
                        if ((c.Answer & (1 << i)) == 0) mask |= 1 << i;
                    for (int i = 0; i < c.Items.Length && Challenges.PopCount(mask) < c.Pick; i++) mask |= 1 << i;
                    return mask;
                }
                case ChallengeKind.Memory:
                {
                    int lit = c.Answer & -c.Answer;
                    int miss = 1;
                    while ((c.Answer & miss) != 0) miss <<= 1;
                    return lit | miss;
                }
                default:
                    return (c.Answer + 1) % Math.Max(1, c.Options.Length);
            }
        }

        private static IEnumerator Settle()
        {
            for (int i = 0; i < 6; i++) yield return null;
        }

        private static void Save(RenderTexture source, string folder, string step)
        {
            var previous = RenderTexture.active;
            RenderTexture.active = source;
            var texture = new Texture2D(source.width, source.height, TextureFormat.RGBA32, false);
            texture.ReadPixels(new Rect(0, 0, source.width, source.height), 0, 0);
            texture.Apply();
            RenderTexture.active = previous;
            File.WriteAllBytes(Path.Combine(folder, step + ".png"), texture.EncodeToPNG());
            UnityEngine.Object.Destroy(texture);
        }
    }
}

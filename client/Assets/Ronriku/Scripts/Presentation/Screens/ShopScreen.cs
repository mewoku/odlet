using System;
using System.Collections.Generic;
using Ronriku.Domain.Figures;
using Ronriku.Domain.Player;
using Ronriku.Domain.Shop;
using Ronriku.Presentation.Accessibility;
using Ronriku.Presentation.Components;
using Ronriku.Presentation.Voxels;
using UnityEngine;
using UnityEngine.UIElements;

namespace Ronriku.Presentation.Screens
{
    /// <summary>Daily figure shelf (shards; Legendary is devnet SOL via the online store) and marketplace entry.</summary>
    public sealed class ShopScreen : VisualElement
    {
        private static readonly string[] Lore =
        {
            "Solves the daily before breakfast. Never says how.",
            "Collects odd cubes. Claims each one hums a different note.",
            "Once rotated a whole board with one look.",
            "Walked out of the Lab with a shadow that was not theirs.",
            "Keeps score in chalk on the back of a boss door.",
            "Trains on mirror puzzles until the reflection blinks first.",
            "Swears the Link paths spell a name if you squint.",
            "Never lost a streak. Never mentions the one before that.",
            "Arrived on a ball that rolled off the arrow maze.",
            "Reads patterns in rain, crowds and chiptune drums."
        };

        private readonly PlayerProfile _profile;
        private readonly Func<ShopItem, PurchaseResult> _buy;
        private readonly IReadOnlyList<ShopItem> _shelf;
        private int _index;
        private VisualElement _stage;
        private Scenery _scenery;
        private VoxelView _figure;
        private Label _place;
        private VisualElement _info;
        private VisualElement _dots;

        public ShopScreen(PlayerProfile profile, IReadOnlyList<ShopItem> shelf, Func<TimeSpan> untilRefresh,
            Func<ShopItem, PurchaseResult> buy)
        {
            _profile = profile;
            _buy = buy;
            _shelf = shelf;
            name = "shop";
            style.flexGrow = 1;

            var scroll = new ScrollView(ScrollViewMode.Vertical);
            scroll.style.flexGrow = 1;
            scroll.verticalScrollerVisibility = ScrollerVisibility.Hidden;
            scroll.horizontalScrollerVisibility = ScrollerVisibility.Hidden;
            scroll.mode = ScrollViewMode.Vertical;
            scroll.contentContainer.style.paddingLeft = scroll.contentContainer.style.paddingRight = RonrikuTheme.Gutter;
            scroll.contentContainer.style.paddingBottom = 24;
            Add(scroll);

            var title = UiFactory.Row();
            title.style.height = 44;
            var heading = UiFactory.Heading("FIGURE SHOP", 20, RonrikuTheme.Pattern.Accent);
            heading.style.flexGrow = 1;
            heading.style.unityTextAlign = TextAnchor.MiddleLeft;
            title.Add(heading);
            var timer = UiFactory.Label(string.Empty, 11, RonrikuTheme.Muted);
            timer.name = "shop-timer";
            title.Add(timer);
            void Tick()
            {
                TimeSpan left = untilRefresh();
                timer.text = $"NEW IN {(int)left.TotalHours:00}:{left.Minutes:00}";
            }
            Tick();
            timer.schedule.Execute(Tick).Every(1000);
            scroll.Add(title);

            if (shelf.Count > 0) scroll.Add(BuildPicker());

            if (!Composition.RuntimeConfig.OnlineAvailable || Composition.RuntimeConfig.StoreBuild) return;
            var market = UiFactory.Panel(RonrikuTheme.Pattern.Accent2);
            market.style.marginTop = 16;
            var marketTitle = UiFactory.Heading("PLAYER MARKET", 14, RonrikuTheme.Text);
            marketTitle.style.unityTextAlign = TextAnchor.MiddleLeft;
            market.Add(marketTitle);
            var marketText = UiFactory.Paragraph(
                "Trade figures with other players for shards or test SOL. Early access: collectibles live on Solana devnet. Opens when you connect online.", 12, RonrikuTheme.Muted);
            marketText.style.marginTop = 6;
            market.Add(marketText);
            scroll.Add(market);
        }

        /// <summary>
        /// Character picker: the figure turns on its own little diorama (drag to spin), arrows on the
        /// sides step through the shelf, and the details and buy button sit next to it.
        /// </summary>
        private VisualElement BuildPicker()
        {
            var wrap = new VisualElement { name = "shop-picker" };

            var picker = UiFactory.Row();
            picker.style.alignItems = Align.Stretch;
            picker.style.height = 420;
            picker.style.marginTop = 4;
            wrap.Add(picker);

            _stage = new VisualElement { name = "shop-stage" };
            _stage.style.width = Length.Percent(56);
            _stage.style.overflow = Overflow.Hidden;
            _scenery = new Scenery(SceneryKind.Forest);
            _scenery.style.position = Position.Absolute;
            _scenery.style.left = _scenery.style.right = _scenery.style.top = _scenery.style.bottom = 0;
            _stage.Add(_scenery);

            // The voxel render is square, so the view gets a fixed square box standing on the ground line.
            var slot = new VisualElement { pickingMode = PickingMode.Ignore };
            slot.style.position = Position.Absolute;
            slot.style.left = slot.style.right = 0;
            slot.style.bottom = Length.Percent((1f - Scenery.Ground) * 100f - 5f);
            slot.style.alignItems = Align.Center;
            _figure = new VoxelView(_shelf[0].Figure, 96, 22f) { name = "shop-figure" };
            _figure.style.width = _figure.style.height = 176;
            slot.Add(_figure);
            _stage.Add(slot);

            _place = UiFactory.Heading(string.Empty, 10, RonrikuTheme.Text);
            _place.style.position = Position.Absolute;
            _place.style.left = _place.style.right = 0;
            _place.style.bottom = 8;
            _stage.Add(_place);

            if (_shelf.Count > 1)
            {
                _stage.Add(Arrow("<", -1));
                _stage.Add(Arrow(">", 1));
            }
            picker.Add(_stage);

            _info = new VisualElement { name = "shop-info" };
            _info.style.flexGrow = 1;
            _info.style.flexBasis = 0;
            _info.style.paddingLeft = 12;
            picker.Add(_info);

            _dots = UiFactory.Row();
            _dots.name = "shop-dots";
            _dots.style.justifyContent = Justify.Center;
            _dots.style.marginTop = 10;
            wrap.Add(_dots);

            Show(0);
            return wrap;
        }

        private Button Arrow(string glyph, int step)
        {
            var arrow = UiFactory.FlatButton(glyph, () => Step(step));
            arrow.name = step < 0 ? "shop-prev" : "shop-next";
            arrow.style.position = Position.Absolute;
            arrow.style.top = Length.Percent(38);
            if (step < 0) arrow.style.left = 4;
            else arrow.style.right = 4;
            arrow.style.width = arrow.style.minWidth = 40;
            arrow.style.height = 48;
            arrow.style.paddingLeft = arrow.style.paddingRight = 0;
            arrow.style.fontSize = 22;
            arrow.style.unityFontDefinition = RonrikuTheme.DisplayBold;
            arrow.style.backgroundColor = RonrikuTheme.WithAlpha(RonrikuTheme.Background, 0.7f);
            return arrow;
        }

        private void Step(int delta)
        {
            Show((_index + delta + _shelf.Count) % _shelf.Count);
            if (MotionSettings.ReducedMotion) return;
            // Quick pixel-stepped slide from the side the arrow points away from.
            _figure.style.translate = new Translate(delta * 48f, 0);
            _figure.schedule.Execute(() => _figure.style.translate = new Translate(delta * 16f, 0)).StartingIn(50);
            _figure.schedule.Execute(() => _figure.style.translate = new Translate(0, 0)).StartingIn(100);
            _figure.Hop();
        }

        private void Show(int index)
        {
            _index = index;
            ShopItem item = _shelf[index];
            Color rarity = RarityColour(item.Figure.Rarity);
            _figure.SetFigure(item.Figure);
            SceneryKind kind = Scenery.ForSeed(item.Seed);
            _scenery.Set(kind);
            _place.text = Scenery.Name(kind);
            UiFactory.SetBorder(_stage, 2, RonrikuTheme.WithAlpha(rarity, 0.7f));

            _info.Clear();
            _info.name = $"shop-{item.Id}";
            var badge = UiFactory.Heading($"{item.Figure.Rarity.ToString().ToUpperInvariant()}  ·  {item.Size}×{item.Size}", 11, rarity);
            badge.style.unityTextAlign = TextAnchor.MiddleLeft;
            _info.Add(badge);
            var figureName = UiFactory.Heading(item.Figure.Name, 20, RonrikuTheme.Text);
            figureName.style.unityTextAlign = TextAnchor.MiddleLeft;
            figureName.style.whiteSpace = WhiteSpace.Normal;
            figureName.style.marginTop = 4;
            _info.Add(figureName);

            _info.Add(Stat("VOXELS", item.Figure.FilledCount.ToString(), true));
            _info.Add(Stat("HEIGHT", $"{item.Figure.Height} BLOCKS", false));
            _info.Add(Stat("GLOW", item.Figure.Traits.Glow ? "YES" : "NO", false));

            var lore = UiFactory.Paragraph(Lore[(int)(item.Seed % (ulong)Lore.Length)], 13, RonrikuTheme.Muted);
            lore.style.unityTextAlign = TextAnchor.UpperLeft;
            lore.style.marginTop = 10;
            _info.Add(lore);
            _info.Add(UiFactory.Spacer());
            _info.Add(BuyButton(item, rarity));

            _dots.Clear();
            for (int i = 0; i < _shelf.Count; i++)
            {
                var dot = new VisualElement { pickingMode = PickingMode.Ignore };
                dot.style.width = i == index ? 16 : 8;
                dot.style.height = 8;
                dot.style.marginLeft = dot.style.marginRight = 3;
                dot.style.backgroundColor = i == index ? rarity : RonrikuTheme.Line;
                _dots.Add(dot);
            }
        }

        private static VisualElement Stat(string label, string value, bool first)
        {
            var line = UiFactory.Row();
            line.style.marginTop = first ? 10 : 4;
            var key = UiFactory.Label(label, 11, RonrikuTheme.Muted);
            key.style.width = 64;
            key.style.unityTextAlign = TextAnchor.MiddleLeft;
            line.Add(key);
            var val = UiFactory.Heading(value, 12, RonrikuTheme.Text);
            val.style.unityTextAlign = TextAnchor.MiddleLeft;
            line.Add(val);
            return line;
        }

        private Button BuyButton(ShopItem item, Color rarity)
        {
            bool owned = _profile.figures.Exists(f => f.id == item.Id);
            Button buy;
            if (owned) buy = UiFactory.FlatButton("OWNED", null);
            else if (item.SolOnly && Composition.RuntimeConfig.StoreBuild)
                buy = UiFactory.FlatButton("COMING SOON", () => Toast.Show(this, "LEGENDARY FIGURES ARE COMING SOON", rarity));
            else if (item.SolOnly)
                buy = Composition.RuntimeConfig.OnlineAvailable
                    ? UiFactory.GlowButton("TEST SOL", () => Toast.Show(this, "EARLY ACCESS: LEGENDARIES ARE SOLANA DEVNET NFTS (TEST SOL). BUY ON THE WEBSITE.", rarity), RonrikuTheme.Boss)
                    : UiFactory.FlatButton("COMING SOON", () => Toast.Show(this, "LEGENDARY FIGURES ARRIVE WITH ONLINE PLAY", rarity));
            else
            {
                buy = UiFactory.GlowButton(string.Empty, () => Purchase(item), RonrikuTheme.Pattern);
                var price = UiFactory.Row();
                price.style.justifyContent = Justify.Center;
                price.style.flexGrow = 1;
                price.pickingMode = PickingMode.Ignore;
                price.Add(new PixelIcon("shard", RonrikuTheme.Background, 14));
                var amount = UiFactory.Heading(item.PriceShards.ToString(), 15, RonrikuTheme.Background);
                amount.style.marginLeft = 6;
                price.Add(amount);
                buy.Add(price);
            }
            buy.name = "buy-button";
            buy.style.height = 44;
            buy.style.alignSelf = Align.Stretch;
            buy.SetEnabled(!owned);
            return buy;
        }

        private void Purchase(ShopItem item)
        {
            switch (_buy(item))
            {
                case PurchaseResult.Ok:
                    Feedback.Win();
                    Toast.Show(this, $"{item.Figure.Name} JOINED YOUR COLLECTION", RarityColour(item.Figure.Rarity));
                    _figure.Hop();
                    Show(_index);
                    break;
                case PurchaseResult.InsufficientShards:
                    Feedback.Error();
                    Toast.Show(this, "NOT ENOUGH SHARDS. CLEAR LEVELS AND DAILIES TO EARN MORE.", RonrikuTheme.Red);
                    break;
                default:
                    Feedback.Error();
                    break;
            }
        }

        public static Color RarityColour(FigureRarity rarity) => rarity switch
        {
            FigureRarity.Rare => RonrikuTheme.Rare,
            FigureRarity.Epic => RonrikuTheme.Epic,
            FigureRarity.Legendary => RonrikuTheme.Legendary,
            _ => RonrikuTheme.Common
        };
    }
}

using UnityEngine;
using UnityEngine.UIElements;

namespace Ronriku.Presentation.Components
{
    /// <summary>Backdrop kinds for <see cref="Scenery"/>.</summary>
    public enum SceneryKind { Forest, Castle, Frost, Lab, Dunes }

    /// <summary>
    /// A small pixel diorama drawn behind a figure: banded sky, far silhouettes, near props and a ground
    /// strip the figure stands on. Everything snaps to a 4 dp grid so it reads as pixel art.
    /// </summary>
    public sealed class Scenery : VisualElement
    {
        private const float Px = 4f;
        private SceneryKind _kind;
        private Palette _palette;

        public Scenery(SceneryKind kind)
        {
            pickingMode = PickingMode.Ignore;
            Set(kind);
            generateVisualContent += Draw;
        }

        /// <summary>Ground line as a fraction of the height, so callers can stand things on it.</summary>
        public const float Ground = 0.8f;

        public SceneryKind Kind => _kind;

        public void Set(SceneryKind kind)
        {
            _kind = kind;
            _palette = kind switch
            {
                SceneryKind.Forest => RonrikuTheme.Forest,
                SceneryKind.Castle => RonrikuTheme.Pattern,
                SceneryKind.Frost => RonrikuTheme.Frost,
                SceneryKind.Lab => RonrikuTheme.Lab,
                _ => RonrikuTheme.Link
            };
            MarkDirtyRepaint();
        }

        public static SceneryKind ForSeed(ulong seed) => (SceneryKind)(int)(seed % 5UL);

        public static string Name(SceneryKind kind) => kind switch
        {
            SceneryKind.Forest => "PINE WOODS",
            SceneryKind.Castle => "OLD KEEP",
            SceneryKind.Frost => "FROST PEAKS",
            SceneryKind.Lab => "THE LAB",
            _ => "EMBER DUNES"
        };

        private static float Snap(float v) => Mathf.Round(v / Px) * Px;

        private static void Rect(Painter2D p, float x, float y, float w, float h, Color c)
        {
            x = Snap(x); y = Snap(y); w = Mathf.Max(Px, Snap(w)); h = Mathf.Max(Px, Snap(h));
            p.fillColor = c;
            p.BeginPath();
            p.MoveTo(new Vector2(x, y));
            p.LineTo(new Vector2(x + w, y));
            p.LineTo(new Vector2(x + w, y + h));
            p.LineTo(new Vector2(x, y + h));
            p.ClosePath();
            p.Fill();
        }

        /// <summary>Stepped triangle (pine, peak, dune) built from horizontal pixel rows.</summary>
        private static void Steps(Painter2D p, float cx, float baseY, float halfWidth, float height, Color c)
        {
            int rows = Mathf.Max(1, Mathf.RoundToInt(height / Px));
            for (int r = 0; r < rows; r++)
            {
                float w = halfWidth * (r + 1) / rows;
                Rect(p, cx - w, baseY - height + r * Px, w * 2, Px, c);
            }
        }

        private void Draw(MeshGenerationContext ctx)
        {
            float w = contentRect.width, h = contentRect.height;
            if (w <= 0 || h <= 0) return;
            var p = ctx.painter2D;
            float ground = Snap(h * Ground);

            // Sky: four bands from ambient into the background, dark at the top.
            Color top = Color.Lerp(RonrikuTheme.Background, _palette.Ambient, 0.35f);
            Color low = Color.Lerp(_palette.Ambient, _palette.Accent2, 0.35f);
            for (int b = 0; b < 4; b++)
                Rect(p, 0, ground * b / 4f, w, ground / 4f + Px, Color.Lerp(top, low, b / 3f));
            // A few stars / dust motes, fixed per kind.
            var rng = new System.Random((int)_kind * 7919 + 17);
            for (int i = 0; i < 14; i++)
                Rect(p, (float)rng.NextDouble() * w, (float)rng.NextDouble() * ground * 0.55f, Px, Px,
                    RonrikuTheme.WithAlpha(Color.white, 0.12f + (float)rng.NextDouble() * 0.2f));

            Color far = Color.Lerp(_palette.Ambient, RonrikuTheme.Background, 0.25f);
            Color near = Color.Lerp(_palette.Accent2, RonrikuTheme.Background, 0.45f);
            Color prop = _palette.Accent2;

            switch (_kind)
            {
                case SceneryKind.Forest:
                    for (int i = 0; i < 7; i++)
                    {
                        float x = w * (i + 0.5f) / 7f;
                        Steps(p, x, ground, w * 0.07f, h * (0.34f + 0.08f * (i % 3)), far);
                    }
                    Steps(p, w * 0.1f, ground, w * 0.09f, h * 0.5f, near);
                    Rect(p, w * 0.1f - Px, ground - Px * 2, Px * 2, Px * 2, RonrikuTheme.Hex("4A2E1A"));
                    Steps(p, w * 0.9f, ground, w * 0.08f, h * 0.42f, near);
                    for (int i = 0; i < 4; i++) // bushes
                    {
                        float x = w * (0.22f + i * 0.2f);
                        Rect(p, x, ground - Px * 3, Px * 6, Px * 3, prop);
                        Rect(p, x + Px, ground - Px * 4, Px * 4, Px, prop);
                    }
                    break;

                case SceneryKind.Castle:
                {
                    float baseY = ground;
                    // Wall with crenellations, two towers.
                    Rect(p, w * 0.05f, baseY - h * 0.28f, w * 0.9f, h * 0.28f, far);
                    for (float x = w * 0.05f; x < w * 0.95f; x += Px * 4) Rect(p, x, baseY - h * 0.28f - Px * 2, Px * 2, Px * 2, far);
                    foreach (float tx in new[] { 0.14f, 0.86f })
                    {
                        float cx = w * tx;
                        Rect(p, cx - w * 0.07f, baseY - h * 0.5f, w * 0.14f, h * 0.5f, near);
                        for (int k = 0; k < 3; k++) Rect(p, cx - w * 0.07f + k * w * 0.055f, baseY - h * 0.5f - Px * 3, Px * 3, Px * 3, near);
                        Rect(p, cx - Px, baseY - h * 0.38f, Px * 2, Px * 4, RonrikuTheme.WithAlpha(RonrikuTheme.Gold, 0.85f));
                    }
                    // Banner.
                    Rect(p, w * 0.86f, baseY - h * 0.5f - Px * 9, Px, Px * 6, near);
                    Rect(p, w * 0.86f + Px, baseY - h * 0.5f - Px * 9, Px * 4, Px * 3, _palette.Accent);
                    break;
                }

                case SceneryKind.Frost:
                    Steps(p, w * 0.22f, ground, w * 0.3f, h * 0.55f, far);
                    Steps(p, w * 0.75f, ground, w * 0.34f, h * 0.62f, far);
                    Steps(p, w * 0.75f, ground - h * 0.62f + h * 0.14f, w * 0.34f * 0.22f, h * 0.14f, RonrikuTheme.WithAlpha(Color.white, 0.75f));
                    Steps(p, w * 0.22f, ground - h * 0.55f + h * 0.12f, w * 0.3f * 0.22f, h * 0.12f, RonrikuTheme.WithAlpha(Color.white, 0.75f));
                    Steps(p, w * 0.5f, ground, w * 0.22f, h * 0.3f, near);
                    for (int i = 0; i < 18; i++) // snow
                        Rect(p, (float)rng.NextDouble() * w, (float)rng.NextDouble() * ground, Px, Px, RonrikuTheme.WithAlpha(Color.white, 0.5f));
                    break;

                case SceneryKind.Lab:
                    for (int i = 0; i < 6; i++)
                    {
                        float x = w * (0.04f + i * 0.17f);
                        float ph = h * (0.36f + 0.1f * ((i * 3) % 4) / 3f);
                        Rect(p, x, ground - ph, w * 0.09f, ph, far);
                        Rect(p, x + Px, ground - ph + Px * 2, w * 0.09f - Px * 2, Px, RonrikuTheme.WithAlpha(_palette.Accent, 0.6f));
                    }
                    // Floor grid hint.
                    for (float x = 0; x < w; x += Px * 8) Rect(p, x, ground - Px, Px * 4, Px, RonrikuTheme.WithAlpha(_palette.Accent, 0.35f));
                    // Floating cubes.
                    Rect(p, w * 0.12f, h * 0.2f, Px * 3, Px * 3, RonrikuTheme.Yellow);
                    Rect(p, w * 0.84f, h * 0.28f, Px * 3, Px * 3, _palette.Accent);
                    break;

                default: // Dunes
                    Rect(p, w * 0.72f, h * 0.12f, Px * 6, Px * 6, RonrikuTheme.WithAlpha(_palette.Accent, 0.9f)); // sun
                    Steps(p, w * 0.25f, ground, w * 0.4f, h * 0.22f, far);
                    Steps(p, w * 0.8f, ground, w * 0.35f, h * 0.18f, near);
                    // Cactus.
                    Rect(p, w * 0.12f, ground - Px * 9, Px * 2, Px * 9, prop);
                    Rect(p, w * 0.12f - Px * 2, ground - Px * 6, Px * 2, Px, prop);
                    Rect(p, w * 0.12f - Px * 2, ground - Px * 8, Px, Px * 2, prop);
                    break;
            }

            // Ground strip with a lit top edge and dither.
            Rect(p, 0, ground, w, h - ground, Color.Lerp(_palette.Ambient, RonrikuTheme.Background, 0.4f));
            Rect(p, 0, ground, w, Px, RonrikuTheme.WithAlpha(_palette.Accent, 0.7f));
            for (float x = 0; x < w; x += Px * 4)
            for (float y = ground + Px * 2; y < h; y += Px * 3)
                Rect(p, x + ((int)(y / Px) % 2) * Px * 2, y, Px, Px, RonrikuTheme.WithAlpha(Color.black, 0.25f));
        }
    }
}

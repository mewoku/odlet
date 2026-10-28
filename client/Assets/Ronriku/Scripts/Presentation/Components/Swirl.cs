using Ronriku.Presentation.Accessibility;
using UnityEngine;
using UnityEngine.UIElements;

namespace Ronriku.Presentation.Components
{
    /// <summary>
    /// Slow warped-paint background in the spirit of Balatro's: a domain-warped field mapped onto three palette
    /// colours, rendered on the CPU into a tiny point-filtered texture so it stays chunky and cheap (a few
    /// thousand pixels a few times a second, no shader). Weak devices get fewer pixels and a lower rate.
    /// </summary>
    public sealed class Swirl : VisualElement
    {
        private readonly Texture2D _texture;
        private readonly Color32[] _pixels;
        private readonly int _width, _height;
        private readonly float _start;
        private Color _c1, _c2, _c3;

        public Swirl()
        {
            name = "swirl";
            pickingMode = PickingMode.Ignore;
            style.position = Position.Absolute;
            style.left = style.right = style.top = style.bottom = 0;
            style.opacity = 0.55f;

            bool weak = SystemInfo.processorCount <= 4 || SystemInfo.systemMemorySize < 3000;
            _width = weak ? 22 : 32;
            _height = weak ? 40 : 58;
            _pixels = new Color32[_width * _height];
            _texture = new Texture2D(_width, _height, TextureFormat.RGBA32, false)
            {
                filterMode = FilterMode.Point,
                wrapMode = TextureWrapMode.Clamp,
                hideFlags = HideFlags.DontSave
            };
            style.backgroundImage = new StyleBackground(_texture);
            style.backgroundSize = new BackgroundSize(Length.Percent(100), Length.Percent(100));
            _start = Time.realtimeSinceStartup;
            int everyMs = weak ? 140 : 80;
            schedule.Execute(Tick).Every(everyMs);
        }

        public void SetPalette(Palette palette)
        {
            _c1 = Color.Lerp(RonrikuTheme.Background, palette.Ambient, 0.9f);
            _c2 = Color.Lerp(RonrikuTheme.Background, palette.Accent2, 0.42f);
            _c3 = Color.Lerp(RonrikuTheme.Background, palette.Accent, 0.22f);
            Render(MotionSettings.ReducedMotion ? 0f : Time.realtimeSinceStartup - _start);
        }

        private void Tick()
        {
            if (MotionSettings.ReducedMotion) return;
            if (resolvedStyle.display == DisplayStyle.None || panel == null) return;
            Render(Time.realtimeSinceStartup - _start);
        }

        private void Render(float time)
        {
            if (_pixels == null) return;
            float speed = time * 0.5f;
            float aspect = _width / (float)_height;
            for (int y = 0; y < _height; y++)
            for (int x = 0; x < _width; x++)
            {
                float ux = (x / (float)_width - 0.5f) * aspect * 7f;
                float uy = (y / (float)_height - 0.5f) * 7f;
                float uv2x = ux + uy, uv2y = ux + uy;
                for (int i = 0; i < 5; i++)
                {
                    float m = Mathf.Sin(Mathf.Max(ux, uy));
                    uv2x += m + ux;
                    uv2y += m + uy;
                    ux += 0.5f * Mathf.Cos(5.1123314f + 0.353f * uv2y + speed * 0.131121f);
                    uy += 0.5f * Mathf.Sin(uv2x - 0.113f * speed);
                    float k = Mathf.Cos(ux + uy) - Mathf.Sin(ux * 0.711f - uy);
                    ux -= k;
                    uy -= k;
                }
                float paint = Mathf.Clamp(Mathf.Sqrt(ux * ux + uy * uy) * 0.12f, 0f, 2f);
                float p1 = Mathf.Max(0f, 1f - 1.6f * paint);
                float p2 = Mathf.Max(0f, 1f - 1.6f * Mathf.Abs(paint - 1f));
                float p3 = 1f - Mathf.Min(1f, p1 + p2);
                // Quantise to a few bands so it reads as pixel art, not a smooth gradient.
                p1 = Mathf.Round(p1 * 4f) / 4f;
                p2 = Mathf.Round(p2 * 4f) / 4f;
                p3 = Mathf.Round(p3 * 4f) / 4f;
                float sum = Mathf.Max(0.001f, p1 + p2 + p3);
                Color c = (_c1 * p1 + _c2 * p2 + _c3 * p3) / sum;
                _pixels[x + y * _width] = new Color32((byte)(c.r * 255f), (byte)(c.g * 255f), (byte)(c.b * 255f), 255);
            }
            _texture.SetPixels32(_pixels);
            _texture.Apply(false);
        }
    }
}

using Ronriku.Presentation.Accessibility;
using UnityEngine;
using UnityEngine.UIElements;

namespace Ronriku.Presentation.Components
{
    /// <summary>
    /// Screen-to-screen transition. The new screen is already in place; a field of coloured blocks covers it and
    /// shrinks away along a diagonal wave, so every change of screen reads as a colour burst. Input passes
    /// straight through, and reduced motion skips it.
    /// </summary>
    public sealed class PixelWipe : VisualElement
    {
        private const int Columns = 9;
        private const float Seconds = 0.52f;
        // Share of the clock a cell spends moving; the rest is spread over the diagonal delay.
        private const float Travel = 0.5f;

        private Color[] _colors = new Color[4];
        private float _start;
        private float _progress = 1f;
        private int _seed;
        private IVisualElementScheduledItem _tick;

        public PixelWipe()
        {
            name = "pixel-wipe";
            pickingMode = PickingMode.Ignore;
            style.position = Position.Absolute;
            style.left = style.right = style.top = style.bottom = 0;
            style.display = DisplayStyle.None;
            generateVisualContent += Draw;
        }

        public void Play(Palette palette)
        {
            if (MotionSettings.ReducedMotion) return;
            _colors = new[]
            {
                Color.Lerp(palette.Accent, palette.Ambient, 0.4f),
                palette.Accent2,
                Color.Lerp(palette.Ambient, palette.Accent, 0.25f),
                Color.Lerp(palette.Accent, Color.white, 0.55f)
            };
            _seed = Random.Range(1, 9999);
            _start = Time.realtimeSinceStartup;
            _progress = 0f;
            style.display = DisplayStyle.Flex;
            _tick?.Pause();
            _tick = schedule.Execute(Step).Every(16);
            MarkDirtyRepaint();
        }

        private void Step()
        {
            _progress = Mathf.Clamp01((Time.realtimeSinceStartup - _start) / Seconds);
            if (_progress >= 1f)
            {
                _tick.Pause();
                style.display = DisplayStyle.None;
                return;
            }
            MarkDirtyRepaint();
        }

        private static float Hash(int x, int y, int seed)
        {
            unchecked
            {
                uint h = (uint)(x * 73856093) ^ (uint)(y * 19349663) ^ (uint)(seed * 83492791);
                h ^= h >> 13;
                h *= 0x5bd1e995u;
                h ^= h >> 15;
                return (h & 0xFFFF) / 65535f;
            }
        }

        private void Draw(MeshGenerationContext context)
        {
            if (_progress >= 1f) return;
            float w = contentRect.width, h = contentRect.height;
            if (w <= 0f || h <= 0f) return;
            float cell = Mathf.Ceil(w / Columns);
            int cols = Columns, rows = Mathf.CeilToInt(h / cell);
            var p = context.painter2D;
            for (int y = 0; y < rows; y++)
            for (int x = 0; x < cols; x++)
            {
                float diagonal = (x / (float)(cols - 1) * 0.6f + y / (float)Mathf.Max(1, rows - 1) * 0.4f) * (1f - Travel);
                float jitter = Hash(x, y, _seed) * 0.12f;
                float t = Mathf.Clamp01((_progress - diagonal - jitter * (1f - Travel)) / Travel);
                if (t >= 1f) continue;
                float eased = t * t;
                float size = cell * (1f - eased);
                float cx = x * cell + cell * 0.5f, cy = y * cell + cell * 0.5f;
                // Cells in the first beat of their shrink flash bright; the rest take a palette colour.
                Color c = t > 0f && t < 0.15f ? _colors[3] : _colors[Mathf.FloorToInt(Hash(y, x, _seed + 7) * 3f) % 3];
                c.a = 1f;
                p.fillColor = c;
                p.BeginPath();
                p.MoveTo(new Vector2(cx - size * 0.5f, cy - size * 0.5f));
                p.LineTo(new Vector2(cx + size * 0.5f, cy - size * 0.5f));
                p.LineTo(new Vector2(cx + size * 0.5f, cy + size * 0.5f));
                p.LineTo(new Vector2(cx - size * 0.5f, cy + size * 0.5f));
                p.ClosePath();
                p.Fill();
            }
        }
    }
}

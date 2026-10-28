using UnityEngine;
using UnityEngine.Rendering;
using UnityEngine.UIElements;

namespace Ronriku.Presentation.Components
{
    /// <summary>
    /// Renders every second frame once the player has not touched the screen for a moment, and goes back to
    /// every frame on the next touch, key or wheel event. The UI is mostly still, so idle screens cost about
    /// a third less CPU and GPU, which matters for battery on phones and for weak TV and fridge browsers.
    /// </summary>
    public static class FrameGovernor
    {
        private const float IdleSeconds = 2.5f;
        private const int IdleInterval = 2;

        private static float _lastInput;

        public static void Attach(VisualElement root)
        {
            _lastInput = Time.realtimeSinceStartup;
            root.RegisterCallback<PointerDownEvent>(_ => Wake(), TrickleDown.TrickleDown);
            root.RegisterCallback<PointerMoveEvent>(_ => Wake(), TrickleDown.TrickleDown);
            root.RegisterCallback<WheelEvent>(_ => Wake(), TrickleDown.TrickleDown);
            root.RegisterCallback<KeyDownEvent>(_ => Wake(), TrickleDown.TrickleDown);
            root.schedule.Execute(Tick).Every(250);
        }

        private static void Wake()
        {
            _lastInput = Time.realtimeSinceStartup;
            if (OnDemandRendering.renderFrameInterval != 1) OnDemandRendering.renderFrameInterval = 1;
        }

        private static void Tick()
        {
            bool idle = Time.realtimeSinceStartup - _lastInput > IdleSeconds;
            int want = idle ? IdleInterval : 1;
            if (OnDemandRendering.renderFrameInterval != want) OnDemandRendering.renderFrameInterval = want;
        }
    }
}

using System;
#if UNITY_WEBGL && !UNITY_EDITOR
using System.Runtime.InteropServices;
#endif

namespace Ronriku.Infrastructure.Online
{
    /// <summary>
    /// WebGL only: the session of the page hosting the game (see web/src/lib/unityBridge.ts), so the game and
    /// the site are one account. JSON {access_token, expires_at, user_id}, or empty when the page has none.
    /// </summary>
    public static class HostSession
    {
        /// <summary>Source of the host JSON; tests replace it. Null/empty result = no host session.</summary>
        public static Func<string> Reader = ReadFromPage;

#if UNITY_WEBGL && !UNITY_EDITOR
        [DllImport("__Internal")]
        private static extern string OdletHost_GetSession();

        private static string ReadFromPage()
        {
            try { return OdletHost_GetSession(); }
            catch (Exception) { return null; }
        }
#else
        private static string ReadFromPage() => null;
#endif
    }
}

using System;
using System.Text;
using System.Threading.Tasks;
using Newtonsoft.Json.Linq;
using UnityEngine;
using UnityEngine.Networking;

namespace Ronriku.Infrastructure.Online
{
    /// <summary>Failure from the backend. <see cref="Code"/> is the stable snake_case error (e.g. insufficient_shards).</summary>
    public sealed class OnlineException : Exception
    {
        public string Code { get; }
        public long Status { get; }

        public OnlineException(string code, long status, string detail = null) : base($"{code} ({status}) {detail}")
        {
            Code = code;
            Status = status;
        }
    }

    [Serializable]
    public sealed class OnlineConfig
    {
        public string url;
        public string anonKey;
        public int timeoutSeconds = 6;
        /// <summary>
        /// Backend for the WebGL build. "same-origin" = the page's own origin (the site proxies the
        /// Supabase API paths, see deploy/Caddyfile), so the browser never needs a cross-origin call.
        /// </summary>
        public string webUrl = "same-origin";
        /// <summary>
        /// Backend for non-development player builds (store APK). Empty = the release plays fully offline
        /// until a public HTTPS backend exists; null/missing = same as <see cref="url"/>.
        /// </summary>
        public string releaseUrl;
        /// <summary>Public anon key for <see cref="releaseUrl"/> (null = same as anonKey).</summary>
        public string releaseAnonKey;

        public static OnlineConfig Load()
        {
            var asset = Resources.Load<TextAsset>("ronriku-online");
            if (asset == null) return null;
            var config = JsonUtility.FromJson<OnlineConfig>(asset.text);
            if (!Application.isEditor && !Debug.isDebugBuild && config.releaseUrl != null)
            {
                config.url = config.releaseUrl;
                if (!string.IsNullOrEmpty(config.releaseAnonKey)) config.anonKey = config.releaseAnonKey;
            }
            if (Application.platform == RuntimePlatform.WebGLPlayer && !string.IsNullOrEmpty(config.webUrl))
                config.url = config.webUrl == "same-origin" ? Origin(Application.absoluteURL) ?? config.url : config.webUrl;
            return config;
        }

        private static string Origin(string url)
        {
            if (!Uri.TryCreate(url, UriKind.Absolute, out var uri)) return null;
            return uri.GetLeftPart(UriPartial.Authority);
        }
    }

    /// <summary>
    /// Minimal Supabase client over UnityWebRequest (works on Android and WebGL): anonymous auth with a
    /// persisted, refreshed session, PostgREST RPC calls and reads. All calls run on the main thread.
    /// </summary>
    public sealed class SupabaseClient
    {
        private const string SessionKey = "ronriku.session";
        private readonly OnlineConfig _config;
        private Session _session;
        // True while _session is the hosting page's session: it is never persisted and never refreshed here.
        private bool _hosted;

        [Serializable]
        private sealed class Session
        {
            public string access_token;
            public string refresh_token;
            public long expires_at;
            public string user_id;
        }

        public SupabaseClient(OnlineConfig config)
        {
            _config = config ?? throw new ArgumentNullException(nameof(config));
            _session = LoadSaved();
        }

        public string UserId
        {
            get
            {
                AdoptHostSession();
                return _session?.user_id;
            }
        }

        private static Session LoadSaved()
        {
            string saved = PlayerPrefs.GetString(SessionKey, string.Empty);
            return string.IsNullOrEmpty(saved) ? null : JsonUtility.FromJson<Session>(saved);
        }

        /// <summary>
        /// On the website the page owns the account: its session wins over a stored one, so the Daily played
        /// in the browser and the game share rating and streak. The page keeps the token fresh (the refresh
        /// token stays there: two refreshers on one token would revoke each other).
        /// </summary>
        private void AdoptHostSession()
        {
            string json = HostSession.Reader?.Invoke();
            if (string.IsNullOrEmpty(json))
            {
                if (_hosted)
                {
                    _hosted = false; // the page signed out: back to the stored identity
                    _session = LoadSaved();
                }
                return;
            }
            Session host;
            try { host = JsonUtility.FromJson<Session>(json); }
            catch (ArgumentException) { return; }
            if (host == null || string.IsNullOrEmpty(host.access_token) || string.IsNullOrEmpty(host.user_id)) return;
            if (_hosted && _session != null && _session.access_token == host.access_token) return;
            host.refresh_token = null;
            _session = host;
            _hosted = true;
        }

        /// <summary>Valid access token: reuses, refreshes, or signs in anonymously.</summary>
        public async Task EnsureSessionAsync()
        {
            AdoptHostSession();
            long now = DateTimeOffset.UtcNow.ToUnixTimeSeconds();
            if (_session != null && _session.expires_at - 60 > now) return;
            // The page refreshes its token well before expiry; if it has not, wait for it rather than
            // quietly starting a second anonymous account.
            if (_hosted) throw new OnlineException("session_expired", 401);
            if (_session?.refresh_token != null)
            {
                try
                {
                    Store(await Send("POST", "/auth/v1/token?grant_type=refresh_token",
                        new JObject { ["refresh_token"] = _session.refresh_token }, false));
                    return;
                }
                catch (OnlineException e) when (e.Status == 400 || e.Status == 401)
                {
                    _session = null; // refresh token revoked: start a new anonymous identity
                }
            }
            Store(await Send("POST", "/auth/v1/signup", new JObject { ["data"] = new JObject() }, false));
        }

        public async Task<JToken> Rpc(string function, JObject args = null)
        {
            await EnsureSessionAsync();
            return await Send("POST", "/rest/v1/rpc/" + function, args ?? new JObject(), true);
        }

        /// <summary>PostgREST read, e.g. Select("figures", "select=id,seed,tier&amp;owner_id=eq.X").</summary>
        public async Task<JArray> Select(string table, string query)
        {
            await EnsureSessionAsync();
            return (JArray)await Send("GET", $"/rest/v1/{table}?{query}", null, true);
        }

        public void SignOut()
        {
            _session = null;
            _hosted = false;
            PlayerPrefs.DeleteKey(SessionKey);
        }

        private void Store(JToken auth)
        {
            _session = new Session
            {
                access_token = (string)auth["access_token"],
                refresh_token = (string)auth["refresh_token"],
                expires_at = auth["expires_at"]?.Value<long>() ?? DateTimeOffset.UtcNow.ToUnixTimeSeconds() + (auth["expires_in"]?.Value<long>() ?? 3600),
                user_id = (string)auth["user"]?["id"]
            };
            PlayerPrefs.SetString(SessionKey, JsonUtility.ToJson(_session));
            PlayerPrefs.Save();
        }

        private async Task<JToken> Send(string method, string path, JObject body, bool authorised)
        {
            using var request = new UnityWebRequest(_config.url.TrimEnd('/') + path, method)
            {
                downloadHandler = new DownloadHandlerBuffer(),
                timeout = _config.timeoutSeconds
            };
            if (body != null)
            {
                request.uploadHandler = new UploadHandlerRaw(Encoding.UTF8.GetBytes(body.ToString(Newtonsoft.Json.Formatting.None)));
                request.SetRequestHeader("Content-Type", "application/json");
            }
            request.SetRequestHeader("apikey", _config.anonKey);
            request.SetRequestHeader("Authorization", "Bearer " + (authorised && _session != null ? _session.access_token : _config.anonKey));

            await request.SendWebRequest();

            string text = request.downloadHandler.text;
            if (request.result == UnityWebRequest.Result.ConnectionError)
                throw new OnlineException("offline", 0, request.error);
            if (request.responseCode >= 400)
            {
                string code = "http_" + request.responseCode;
                try
                {
                    JToken error = JToken.Parse(text);
                    code = (string)error["message"] ?? (string)error["error_code"] ?? (string)error["msg"] ?? code;
                }
                catch (Newtonsoft.Json.JsonException) { }
                throw new OnlineException(code, request.responseCode, text.Length > 200 ? text.Substring(0, 200) : text);
            }
            return string.IsNullOrWhiteSpace(text) ? JValue.CreateNull() : JToken.Parse(text);
        }
    }
}

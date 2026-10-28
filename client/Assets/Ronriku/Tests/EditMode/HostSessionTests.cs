using System;
using NUnit.Framework;
using Ronriku.Infrastructure.Online;
using UnityEngine;

namespace Ronriku.Tests
{
    public sealed class HostSessionTests
    {
        private const string Key = "ronriku.session";
        private Func<string> _reader;
        private string _savedPrefs;
        private static readonly OnlineConfig Config = new OnlineConfig { url = "http://127.0.0.1:1", anonKey = "k" };

        [SetUp]
        public void SetUp()
        {
            _reader = HostSession.Reader;
            _savedPrefs = PlayerPrefs.GetString(Key, string.Empty);
            PlayerPrefs.DeleteKey(Key);
        }

        [TearDown]
        public void TearDown()
        {
            HostSession.Reader = _reader;
            if (string.IsNullOrEmpty(_savedPrefs)) PlayerPrefs.DeleteKey(Key);
            else PlayerPrefs.SetString(Key, _savedPrefs);
        }

        private static long InSeconds(int s) => DateTimeOffset.UtcNow.ToUnixTimeSeconds() + s;

        private static string Host(string user, long expires, string token = "host-token") =>
            "{\"access_token\":\"" + token + "\",\"expires_at\":" + expires + ",\"user_id\":\"" + user + "\"}";

        private static void Stored(string user) =>
            PlayerPrefs.SetString(Key, "{\"access_token\":\"s\",\"refresh_token\":\"r\",\"expires_at\":" + InSeconds(3600) + ",\"user_id\":\"" + user + "\"}");

        [Test]
        public void HostSessionIsUsedWithoutAnyNetworkCall()
        {
            HostSession.Reader = () => Host("host-user", InSeconds(3600));
            var client = new SupabaseClient(Config);
            client.EnsureSessionAsync().GetAwaiter().GetResult();
            Assert.AreEqual("host-user", client.UserId);
        }

        [Test]
        public void HostSessionBeatsAStoredOneAndIsNeverPersisted()
        {
            Stored("stored-user");
            string before = PlayerPrefs.GetString(Key);
            HostSession.Reader = () => Host("host-user", InSeconds(3600));
            var client = new SupabaseClient(Config);
            Assert.AreEqual("host-user", client.UserId);
            Assert.AreEqual(before, PlayerPrefs.GetString(Key), "the host session must not overwrite the stored one");
            StringAssert.DoesNotContain("host-token", PlayerPrefs.GetString(Key));
        }

        [Test]
        public void SignedOutHostFallsBackToTheStoredIdentity()
        {
            Stored("stored-user");
            string host = Host("host-user", InSeconds(3600));
            HostSession.Reader = () => host;
            var client = new SupabaseClient(Config);
            Assert.AreEqual("host-user", client.UserId);
            host = string.Empty;
            Assert.AreEqual("stored-user", client.UserId);
        }

        [Test]
        public void AnExpiredHostTokenFailsInsteadOfStartingANewAccount()
        {
            HostSession.Reader = () => Host("host-user", InSeconds(-10));
            var client = new SupabaseClient(Config);
            var e = Assert.Throws<OnlineException>(() => client.EnsureSessionAsync().GetAwaiter().GetResult());
            Assert.AreEqual("session_expired", e.Code);
        }

        [Test]
        public void MalformedOrIncompleteHostJsonIsIgnored()
        {
            Stored("stored-user");
            string[] bad = { "not json", "{}", "{\"access_token\":\"t\"}", "{\"user_id\":\"u\"}" };
            foreach (string json in bad)
            {
                string captured = json;
                HostSession.Reader = () => captured;
                Assert.AreEqual("stored-user", new SupabaseClient(Config).UserId, captured);
            }
        }
    }
}

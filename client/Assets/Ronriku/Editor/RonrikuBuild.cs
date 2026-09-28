using System;
using System.IO;
using Ronriku.Composition;
using Ronriku.Domain.Daily;
using Ronriku.Domain.Puzzles;
using UnityEditor;
using UnityEditor.Build;
using UnityEditor.Build.Reporting;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.SceneManagement;
using UnityEngine.UIElements;

namespace Ronriku.Editor
{
    public static class RonrikuBuild
    {
        private const string ScenePath = "Assets/Ronriku/Scenes/Bootstrap.unity";
        private const string PanelSettingsPath = "Assets/Ronriku/Settings/RonrikuPanelSettings.asset";

        [MenuItem("RONRIKU/Verify Phase 1")]
        public static void Verify()
        {
            ConfigureProject();
            CreateScene();
            VerifyDomain();
            Debug.Log("RONRIKU_VERIFY_OK");
        }

        [MenuItem("RONRIKU/Build Android (Development)")]
        public static void BuildAndroid() => Build("ODLET-dev.apk", BuildOptions.Development);

        [MenuItem("RONRIKU/Build Android (Release)")]
        public static void BuildAndroidRelease() => Build("ODLET.apk", BuildOptions.None);

        /// <summary>Scripting define for App Store / Google Play builds: no crypto in the app (RuntimeConfig.StoreBuild).</summary>
        public const string StoreDefine = "ODLET_STORE";

        /// <summary>
        /// Google Play build without Solana features: an .aab for Play (signed with the upload key from
        /// RONRIKU_KEYSTORE…) plus a matching .apk for direct testing. versionCode = ODLET_BUILD_NUMBER or yyMMddHH.
        /// </summary>
        [MenuItem("RONRIKU/Build Google Play (Store, no crypto)")]
        public static void BuildAndroidStore()
        {
            int build = StoreBuildNumber();
            PlayerSettings.Android.bundleVersionCode = build;
            Build("ODLET-play.apk", BuildOptions.None, StoreDefine, appBundle: false);
            Build("ODLET-play.aab", BuildOptions.None, StoreDefine, appBundle: true);
            Debug.Log($"RONRIKU_PLAY_BUILD_OK versionCode={build}");
        }

        /// <summary>
        /// App Store build without Solana features: exports the Xcode project to Builds/iOS/ODLET (archive and
        /// upload happen on macOS — .github/workflows/ios-testflight.yml). Build number = ODLET_BUILD_NUMBER or yyMMddHH.
        /// </summary>
        [MenuItem("RONRIKU/Export iOS (Store, no crypto)")]
        public static void ExportIOSStore()
        {
            Verify();
            int build = StoreBuildNumber();
            PlayerSettings.SetApplicationIdentifier(NamedBuildTarget.iOS, "com.odlet.game");
            PlayerSettings.iOS.buildNumber = build.ToString();
            PlayerSettings.iOS.targetOSVersionString = "15.0";
            PlayerSettings.iOS.targetDevice = iOSTargetDevice.iPhoneAndiPad;
            PlayerSettings.iOS.requiresFullScreen = true;
            PlayerSettings.iOS.appInBackgroundBehavior = iOSAppInBackgroundBehavior.Suspend;
            PlayerSettings.iOS.hideHomeButton = false;
            // Signing happens in CI with an App Store Connect API key (automatic signing, cloud-managed certs).
            PlayerSettings.iOS.appleEnableAutomaticSigning = true;
            string team = Environment.GetEnvironmentVariable("ODLET_APPLE_TEAM_ID");
            if (!string.IsNullOrEmpty(team)) PlayerSettings.iOS.appleDeveloperTeamID = team;
            PlayerSettings.SetScriptingBackend(NamedBuildTarget.iOS, ScriptingImplementation.IL2CPP);
            PlayerSettings.SetManagedStrippingLevel(NamedBuildTarget.iOS, ManagedStrippingLevel.High);
            PlayerSettings.SetIl2CppCodeGeneration(NamedBuildTarget.iOS, Il2CppCodeGeneration.OptimizeSize);
            PlayerSettings.insecureHttpOption = InsecureHttpOption.NotAllowed;
            ApplyIOSIcons();

            // ODLET_IOS_OUT: export elsewhere (the Xcode project is several GB before zipping).
            string output = Environment.GetEnvironmentVariable("ODLET_IOS_OUT");
            if (string.IsNullOrEmpty(output)) output = Path.GetFullPath(Path.Combine(Application.dataPath, "../../Builds/iOS/ODLET"));
            if (Directory.Exists(output)) Directory.Delete(output, true);
            Directory.CreateDirectory(output);
            var options = new BuildPlayerOptions
            {
                scenes = new[] { ScenePath },
                locationPathName = output,
                target = BuildTarget.iOS,
                options = BuildOptions.None,
                extraScriptingDefines = new[] { StoreDefine },
            };
            BuildReport report = BuildPipeline.BuildPlayer(options);
            if (report.summary.result != BuildResult.Succeeded)
                throw new BuildFailedException($"iOS export failed: {report.summary.result}");
            if (!Directory.Exists(Path.Combine(output, "Unity-iPhone.xcodeproj")))
                throw new BuildFailedException("iOS export produced no Xcode project (is the iOS module installed?)");
            Debug.Log($"RONRIKU_IOS_EXPORT_OK path={output} build={build}");
        }

        private static int StoreBuildNumber()
        {
            string env = Environment.GetEnvironmentVariable("ODLET_BUILD_NUMBER");
            if (int.TryParse(env, out int n) && n > 0) return n;
            return int.Parse(DateTime.UtcNow.ToString("yyMMddHH", System.Globalization.CultureInfo.InvariantCulture));
        }

        /// <summary>Every iOS icon slot from the opaque 1024 master (App Store icons may not have alpha).</summary>
        private static void ApplyIOSIcons()
        {
            RonrikuIcon.TryApply(logSuccess: false);
            var master = AssetDatabase.LoadAssetAtPath<Texture2D>(RonrikuIcon.IconFolder + "/ronriku-icon-1024.png");
            if (master == null) throw new BuildFailedException("iOS needs Art/Icon/ronriku-icon-1024.png");
            foreach (PlatformIconKind kind in PlayerSettings.GetSupportedIconKinds(NamedBuildTarget.iOS))
            {
                PlatformIcon[] icons = PlayerSettings.GetPlatformIcons(NamedBuildTarget.iOS, kind);
                foreach (PlatformIcon icon in icons) icon.SetTexture(master);
                PlayerSettings.SetPlatformIcons(NamedBuildTarget.iOS, kind, icons);
            }
        }

        /// <summary>
        /// Browser build embedded by the website (web/public/unity/Build/unity.*). Gzip with the
        /// decompression fallback so any static server works without special headers.
        /// </summary>
        [MenuItem("RONRIKU/Build WebGL (Website)")]
        public static void BuildWebGL()
        {
            Verify();
            string output = Path.GetFullPath(Path.Combine(Application.dataPath, "../../web/public/unity"));
            if (Directory.Exists(output)) Directory.Delete(output, true);
            PlayerSettings.WebGL.compressionFormat = WebGLCompressionFormat.Gzip;
            // Same-origin API calls follow the page scheme; the browser enforces mixed content itself.
            PlayerSettings.insecureHttpOption = InsecureHttpOption.AlwaysAllowed;
            PlayerSettings.WebGL.decompressionFallback = true;
            PlayerSettings.WebGL.nameFilesAsHashes = false;
            PlayerSettings.WebGL.dataCaching = true;
            PlayerSettings.WebGL.memorySize = 256;
            PlayerSettings.SetManagedStrippingLevel(NamedBuildTarget.WebGL, ManagedStrippingLevel.High);
            var options = new BuildPlayerOptions
            {
                scenes = new[] { ScenePath },
                locationPathName = output,
                target = BuildTarget.WebGL,
                options = BuildOptions.None
            };
            BuildReport report = BuildPipeline.BuildPlayer(options);
            if (report.summary.result != BuildResult.Succeeded)
                throw new BuildFailedException($"WebGL build failed: {report.summary.result}");
            // BuildPipeline can report success when the platform module is unavailable; trust the files.
            if (!File.Exists(Path.Combine(output, "Build", "unity.loader.js")))
                throw new BuildFailedException("WebGL build produced no loader (is the WebGL module loaded? restart the editor)");
            Debug.Log($"RONRIKU_WEBGL_BUILD_OK path={output} bytes={report.summary.totalSize}");
        }

        /// <summary>Applies the project's player settings without building. Safe to run any time.</summary>
        [MenuItem("RONRIKU/Apply Project Settings")]
        public static void ApplyProjectSettings()
        {
            ConfigureProject();
            AssetDatabase.SaveAssets();
            Debug.Log("RONRIKU_SETTINGS_APPLIED");
        }

        private static void Build(string fileName, BuildOptions buildOptions, string define = null, bool appBundle = false)
        {
            Verify();
            EditorUserBuildSettings.buildAppBundle = appBundle;
            // Development builds may talk to the adb-reversed http dev backend; store builds may not.
            PlayerSettings.insecureHttpOption = BackendIsCleartext((buildOptions & BuildOptions.Development) != 0)
                ? InsecureHttpOption.AlwaysAllowed : InsecureHttpOption.NotAllowed;
            bool icons = RonrikuIcon.TryApply(logSuccess: false);
            if (!icons && (buildOptions & BuildOptions.Development) == 0)
                throw new BuildFailedException("Release build needs the app icons (RONRIKU/Apply Icons failed).");
            string output = Path.GetFullPath(Path.Combine(Application.dataPath, "../../Builds/Android", fileName));
            Directory.CreateDirectory(Path.GetDirectoryName(output) ?? throw new InvalidOperationException());
            // Always write a fresh file: in-place APK updates leave dead space between zip entries.
            if (File.Exists(output)) File.Delete(output);
            var options = new BuildPlayerOptions
            {
                scenes = new[] { ScenePath },
                locationPathName = output,
                target = BuildTarget.Android,
                options = buildOptions,
                extraScriptingDefines = define == null ? Array.Empty<string>() : new[] { define },
            };
            BuildReport report = BuildPipeline.BuildPlayer(options);
            if (report.summary.result != BuildResult.Succeeded)
                throw new BuildFailedException($"Android build failed: {report.summary.result}");
            EditorUserBuildSettings.buildAppBundle = false;
            Debug.Log($"RONRIKU_ANDROID_BUILD_OK path={output} bytes={new FileInfo(output).Length}");
        }

        private static void ConfigureProject()
        {
            PlayerSettings.companyName = "ODLET";
            PlayerSettings.productName = "ODLET";
            PlayerSettings.SetApplicationIdentifier(NamedBuildTarget.Android, "com.odlet.game");
            PlayerSettings.defaultInterfaceOrientation = UIOrientation.Portrait;
            PlayerSettings.allowedAutorotateToLandscapeLeft = false;
            PlayerSettings.allowedAutorotateToLandscapeRight = false;
            PlayerSettings.allowedAutorotateToPortrait = true;
            PlayerSettings.allowedAutorotateToPortraitUpsideDown = false;
            PlayerSettings.Android.minSdkVersion = AndroidSdkVersions.AndroidApiLevel26;
            PlayerSettings.Android.targetSdkVersion = AndroidSdkVersions.AndroidApiLevelAuto;
            PlayerSettings.Android.targetArchitectures = AndroidArchitecture.ARM64;
            PlayerSettings.SetScriptingBackend(NamedBuildTarget.Android, ScriptingImplementation.IL2CPP);
            PlayerSettings.colorSpace = ColorSpace.Linear;

            // No engine splash: the game shows its own pixel boot sequence.
            PlayerSettings.SplashScreen.show = false;
            PlayerSettings.SplashScreen.showUnityLogo = false;

            // Cleartext HTTP only when the configured backend is http:// (local dev via adb reverse);
            // an https:// backend turns it off automatically. See docs/RISKS.md.
            PlayerSettings.insecureHttpOption = BackendIsCleartext(false) ? InsecureHttpOption.AlwaysAllowed : InsecureHttpOption.NotAllowed;
            ConfigureSigning();

            // Size: strip unused engine and managed code; Ronriku.Runtime is preserved by link.xml.
            PlayerSettings.stripEngineCode = true;
            PlayerSettings.SetManagedStrippingLevel(NamedBuildTarget.Android, ManagedStrippingLevel.High);
            PlayerSettings.SetIl2CppCodeGeneration(NamedBuildTarget.Android, Il2CppCodeGeneration.OptimizeSize);
            PlayerSettings.SetIl2CppCompilerConfiguration(NamedBuildTarget.Android, Il2CppCompilerConfiguration.Release);
            PlayerSettings.Android.minifyRelease = true;

            // Runtime cost: plain logs carry no stack trace; errors keep script frames for diagnosis.
            PlayerSettings.SetStackTraceLogType(LogType.Log, StackTraceLogType.None);
            PlayerSettings.SetStackTraceLogType(LogType.Warning, StackTraceLogType.None);
            PlayerSettings.SetStackTraceLogType(LogType.Error, StackTraceLogType.ScriptOnly);
            PlayerSettings.SetStackTraceLogType(LogType.Assert, StackTraceLogType.ScriptOnly);
            PlayerSettings.SetStackTraceLogType(LogType.Exception, StackTraceLogType.ScriptOnly);
        }

        /// <summary>Plain HTTP only when the backend this build will actually use is http://.</summary>
        private static bool BackendIsCleartext(bool development)
        {
            var asset = AssetDatabase.LoadAssetAtPath<TextAsset>("Assets/Ronriku/Resources/ronriku-online.json");
            if (asset == null) return false;
            var config = JsonUtility.FromJson<Ronriku.Infrastructure.Online.OnlineConfig>(asset.text);
            string url = !development && config.releaseUrl != null ? config.releaseUrl : config.url;
            return !string.IsNullOrEmpty(url) && url.StartsWith("http://");
        }

        /// <summary>
        /// Release signing from environment variables so the store key never lives in the repo:
        /// RONRIKU_KEYSTORE (path), RONRIKU_KEYSTORE_PASS, RONRIKU_KEY_ALIAS, RONRIKU_KEY_PASS.
        /// Without them the build is debug-signed (fine for local testing, rejected by the dApp Store).
        /// </summary>
        private static void ConfigureSigning()
        {
            string keystore = Environment.GetEnvironmentVariable("RONRIKU_KEYSTORE");
            bool useCustom = !string.IsNullOrEmpty(keystore) && File.Exists(keystore);
            PlayerSettings.Android.useCustomKeystore = useCustom;
            if (!useCustom) return;
            PlayerSettings.Android.keystoreName = keystore;
            PlayerSettings.Android.keystorePass = Environment.GetEnvironmentVariable("RONRIKU_KEYSTORE_PASS") ?? string.Empty;
            PlayerSettings.Android.keyaliasName = Environment.GetEnvironmentVariable("RONRIKU_KEY_ALIAS") ?? "ronriku";
            PlayerSettings.Android.keyaliasPass = Environment.GetEnvironmentVariable("RONRIKU_KEY_PASS") ?? string.Empty;
        }

        private static void CreateScene()
        {
            // Regenerating the scene every build churns fileIDs in git; only create it when missing.
            if (File.Exists(ScenePath))
            {
                EditorBuildSettings.scenes = new[] { new EditorBuildSettingsScene(ScenePath, true) };
                CreatePanelSettings();
                AssetDatabase.SaveAssets();
                return;
            }
            Directory.CreateDirectory(Path.GetDirectoryName(ScenePath) ?? throw new InvalidOperationException());
            Scene scene = EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, NewSceneMode.Single);
            var cameraObject = new GameObject("Camera");
            var camera = cameraObject.AddComponent<Camera>();
            camera.clearFlags = CameraClearFlags.SolidColor;
            camera.backgroundColor = new Color32(0x28, 0x29, 0x2F, 0xFF);
            camera.orthographic = true;
            cameraObject.tag = "MainCamera";
            var app = new GameObject("RONRIKU");
            var document = app.AddComponent<UIDocument>();
            document.panelSettings = CreatePanelSettings();
            app.AddComponent<RonrikuBootstrap>();
            EditorSceneManager.SaveScene(scene, ScenePath);
            EditorBuildSettings.scenes = new[] { new EditorBuildSettingsScene(ScenePath, true) };
            AssetDatabase.SaveAssets();
        }

        private static PanelSettings CreatePanelSettings()
        {
            var panel = AssetDatabase.LoadAssetAtPath<PanelSettings>(PanelSettingsPath);
            if (panel == null)
            {
                Directory.CreateDirectory(Path.GetDirectoryName(PanelSettingsPath) ?? throw new InvalidOperationException());
                panel = ScriptableObject.CreateInstance<PanelSettings>();
                panel.name = "RONRIKU Panel Settings";
                AssetDatabase.CreateAsset(panel, PanelSettingsPath);
            }

            panel.scaleMode = PanelScaleMode.ScaleWithScreenSize;
            panel.referenceResolution = new Vector2Int(432, 960);
            panel.match = 0.5f;
            panel.clearColor = true;
            panel.colorClearValue = new Color32(0x28, 0x29, 0x2F, 0xFF);
            panel.themeStyleSheet = AssetDatabase.LoadAssetAtPath<ThemeStyleSheet>(
                "Assets/Ronriku/Settings/RonrikuRuntimeTheme.tss");
            if (panel.themeStyleSheet == null)
                throw new InvalidOperationException("Unity DefaultRuntimeTheme.tss could not be loaded.");
            EditorUtility.SetDirty(panel);
            return panel;
        }

        private static void VerifyDomain()
        {
            // Gate every build on the next 60 Dailies generating valid trials.
            int today = DailyCalendar.DayNumber(DateTime.UtcNow);
            var spatial = new SpatialPuzzleGenerator();
            var pattern = new PatternPuzzleGenerator();
            var logic = new LogicPuzzleGenerator();
            for (int day = today; day < today + 60; day++)
            foreach (TrialSpec spec in DailyPlan.For(day).Trials)
            {
                string violation = spec.Kind switch
                {
                    TrialKind.Pattern => PatternPuzzleInvariants.Check(pattern.Generate(spec.Seed, spec.Difficulty, 0)),
                    TrialKind.Logic => LogicPuzzleInvariants.Check(logic.Generate(spec.Seed, spec.Difficulty, 0)),
                    _ => SpatialPuzzleInvariants.Check(spatial.Generate(spec.Seed, spec.Difficulty, 0))
                };
                if (violation != null)
                    throw new InvalidOperationException($"Invalid {spec.Kind} trial on day {day}: {violation}");
            }
        }
    }
}

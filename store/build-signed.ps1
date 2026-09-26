# Builds the store-signed ODLET release APK with your dApp Store keystore.
# Close the Unity editor first (batch mode can't open a project that's already open).
#
#   powershell -ExecutionPolicy Bypass -File C:\Users\dedpu\Desktop\RONRIKU\store\build-signed.ps1
#
# The password is read from the prompt into this process only; it is never written to disk.

$ErrorActionPreference = "Stop"
$repo = Split-Path -Parent $PSScriptRoot
$unity = "D:\6000.6.0f1\Editor\Unity.exe"
$keystore = Join-Path $HOME "ronriku-keys\ronriku-dappstore.keystore"
$apk = Join-Path $repo "Builds\Android\ODLET.apk"
$log = Join-Path $repo "Builds\android-signed.log"

if (-not (Test-Path $keystore)) { throw "Keystore not found: $keystore (run store\make-keystore.ps1 first)" }
if (Get-Process -Name Unity -ErrorAction SilentlyContinue) { throw "Close the Unity editor first, then run this again." }

$secure = Read-Host "Keystore password" -AsSecureString
$plain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure))

$env:RONRIKU_KEYSTORE = $keystore
$env:RONRIKU_KEY_ALIAS = "ronriku"
$env:RONRIKU_KEYSTORE_PASS = $plain
$env:RONRIKU_KEY_PASS = $plain
try {
    Write-Host "Building (5-10 min)..."
    & $unity -batchmode -quit -projectPath (Join-Path $repo "client") -executeMethod Ronriku.Editor.RonrikuBuild.BuildAndroidRelease -logFile $log | Out-Null
    if (-not (Test-Path $apk)) { throw "Build failed, see $log" }
}
finally {
    Remove-Item Env:RONRIKU_KEYSTORE_PASS, Env:RONRIKU_KEY_PASS -ErrorAction SilentlyContinue
    $plain = $null
}

# Verify the signature (must NOT be 'Android Debug').
$apksigner = Get-ChildItem "D:\6000.6.0f1\Editor\Data\PlaybackEngines\AndroidPlayer\SDK\build-tools" -Recurse -Filter apksigner.bat | Select-Object -First 1
if ($apksigner) { & $apksigner.FullName verify --print-certs $apk | Select-String "Signer #1 certificate DN|SHA-256" }
Write-Host "Signed APK: $apk"
Write-Host "Expected SHA-256 fingerprint starts 1E:F6:C0:AA (from make-keystore)."
Write-Host "Unity may have saved the keystore PATH into client\ProjectSettings\ProjectSettings.asset - don't commit that line."

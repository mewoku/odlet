$ErrorActionPreference = 'Stop'
$workspace = Split-Path -Parent $PSScriptRoot
New-Item -ItemType Directory -Force (Join-Path $workspace 'artifacts/logs') | Out-Null
$unity = if ($env:UNITY_EDITOR) { $env:UNITY_EDITOR } else { 'C:\Program Files\Unity\Hub\Editor\6000.6.5f1\Editor\Unity.exe' }

$arguments = @(
    '-batchmode', '-quit',
    '-projectPath', (Join-Path $workspace 'client'),
    '-executeMethod', 'Ronriku.Editor.RonrikuBuild.BuildAndroidRelease',
    '-logFile', (Join-Path $workspace 'artifacts/logs/unity-android.log')
)
$process = Start-Process -FilePath $unity -ArgumentList $arguments -Wait -PassThru -WindowStyle Hidden
exit $process.ExitCode

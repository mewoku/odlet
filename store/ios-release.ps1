# Ships the exported iOS Xcode project to TestFlight through GitHub Actions (.github/workflows/ios-testflight.yml).
#
#   1. Unity: RONRIKU > Export iOS (Store, no crypto)      -> Builds/iOS/ODLET
#   2. powershell -ExecutionPolicy Bypass -File store\ios-release.ps1 [-Project D:\odlet-ios\ODLET]
#
# The zip goes to a DRAFT release (visible only to repo collaborators), the workflow archives, signs and
# uploads it, and the draft is deleted afterwards. Needs `gh` logged in and the ASC_* / APPLE_TEAM_ID secrets.

param([string]$Project)
$ErrorActionPreference = "Stop"
$repo = Split-Path -Parent $PSScriptRoot
# -Project: the export folder when ODLET_IOS_OUT was used (e.g. D:\odlet-ios\ODLET)
$project = if ($Project) { $Project } else { Join-Path $repo "Builds\iOS\ODLET" }
if (-not (Test-Path (Join-Path $project "Unity-iPhone.xcodeproj"))) { throw "No Xcode project at $project - export it from Unity first." }

$tag = "ios-build-" + (Get-Date).ToUniversalTime().ToString("yyyyMMdd-HHmm")
$zip = Join-Path (Split-Path -Parent $project) "ODLET-ios-xcode.zip"
if (Test-Path $zip) { Remove-Item $zip }
Write-Host "Zipping $project ..."
Compress-Archive -Path (Join-Path $project "*") -DestinationPath $zip -CompressionLevel Optimal
Write-Host ("Zip: {0:N0} MB" -f ((Get-Item $zip).Length / 1MB))

gh release create $tag $zip --draft --title "iOS build $tag" --notes "Xcode project for TestFlight (draft, deleted after upload)."
if ($LASTEXITCODE -ne 0) { throw "gh release create failed" }
gh workflow run ios-testflight.yml -f release_tag=$tag
if ($LASTEXITCODE -ne 0) { throw "gh workflow run failed" }
Start-Sleep -Seconds 5
$run = gh run list --workflow ios-testflight.yml --limit 1 --json databaseId --jq ".[0].databaseId"
Write-Host "Watching run $run ..."
gh run watch $run --exit-status
$ok = $LASTEXITCODE -eq 0
gh release delete $tag --yes --cleanup-tag | Out-Null
if (-not $ok) { throw "TestFlight workflow failed: gh run view $run --log-failed" }
Write-Host "Uploaded. The build appears in App Store Connect > TestFlight after processing (~10-30 min)."

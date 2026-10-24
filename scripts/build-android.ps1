$ErrorActionPreference = 'Stop'
$projectDir = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $projectDir
if (-not $env:JAVA_HOME) {
  $taskJdk = Get-ChildItem "$env:LOCALAPPDATA/ThinkTwice/tools" -Directory -Filter 'jdk-21*' -ErrorAction SilentlyContinue | Select-Object -First 1
  if ($taskJdk) { $env:JAVA_HOME = $taskJdk.FullName }
}
if (-not $env:JAVA_HOME -or -not (Test-Path "$env:JAVA_HOME/bin/java.exe")) { throw 'Set JAVA_HOME ke instalasi JDK 21.' }
if (-not $env:ANDROID_HOME) { $env:ANDROID_HOME = "$env:LOCALAPPDATA/Android/Sdk" }
if (-not (Test-Path $env:ANDROID_HOME)) { throw 'Set ANDROID_HOME ke Android SDK platform 36.' }
npm run build
if ($LASTEXITCODE -ne 0) { throw 'Build web gagal.' }
npx cap sync android
if ($LASTEXITCODE -ne 0) { throw 'Sinkronisasi Capacitor gagal.' }
& ./android/gradlew.bat -p android assembleDebug --console=plain
if ($LASTEXITCODE -ne 0) { throw 'Build Android gagal.' }
New-Item -ItemType Directory -Force -Path artifacts | Out-Null
Copy-Item -LiteralPath 'android/app/build/outputs/apk/debug/app-debug.apk' -Destination 'artifacts/think-twice-debug.apk' -Force
Write-Output 'APK: artifacts/think-twice-debug.apk'

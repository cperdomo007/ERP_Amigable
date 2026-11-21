param([switch]$Release)
$ErrorActionPreference='Stop'
$projectRoot=Split-Path -Parent $PSScriptRoot
$portable=Join-Path $projectRoot 'work/android-tools'
if (-not $env:JAVA_HOME -and (Test-Path -LiteralPath "$portable/jdk")) {
    $env:JAVA_HOME=(Get-ChildItem -LiteralPath "$portable/jdk" -Directory | Select-Object -First 1).FullName
}
if (-not $env:ANDROID_HOME -and (Test-Path -LiteralPath "$portable/sdk")) { $env:ANDROID_HOME="$portable/sdk" }
$env:GRADLE_USER_HOME=Join-Path $portable 'gradle-cache'
$env:ANDROID_USER_HOME=Join-Path $portable 'android-user'
Push-Location $projectRoot
try {
    & npm.cmd run build:android
    if ($LASTEXITCODE -ne 0) { throw 'Falló la compilación de la interfaz.' }
    $task=if($Release){'assembleRelease'}else{'assembleDebug'}
    $gradle=Join-Path $portable 'gradle/gradle-8.11.1/bin/gradle.bat'
    if (-not (Test-Path -LiteralPath $gradle)) { $gradle=Join-Path $PSScriptRoot 'gradlew.bat' }
    if (-not (Test-Path -LiteralPath $gradle)) { throw 'Abrí android en Android Studio o instalá Gradle 8.11.1 y generá el wrapper.' }
    & $gradle -p $PSScriptRoot $task --no-daemon --console=plain
    if ($LASTEXITCODE -ne 0) { throw 'Falló la compilación Android.' }
} finally { Pop-Location }

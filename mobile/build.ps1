param([switch]$Release)
$ErrorActionPreference='Stop'
$projectRoot=Split-Path -Parent $PSScriptRoot
$portable=Join-Path $projectRoot 'work/android-tools'
$flutter=Join-Path $projectRoot 'work/flutter-sdk/bin/flutter.bat'
if (-not (Test-Path -LiteralPath $flutter)) { $flutter=(Get-Command flutter -ErrorAction Stop).Source }
if (-not $env:JAVA_HOME -and (Test-Path -LiteralPath "$portable/jdk")) { $env:JAVA_HOME=(Get-ChildItem -LiteralPath "$portable/jdk" -Directory | Select-Object -First 1).FullName }
if (-not $env:ANDROID_HOME -and (Test-Path -LiteralPath "$portable/sdk")) { $env:ANDROID_HOME="$portable/sdk" }
$env:PUB_CACHE=Join-Path $projectRoot 'work/flutter-pub-cache'
$env:GRADLE_USER_HOME=Join-Path $projectRoot 'work/flutter-gradle-cache'
$env:ANDROID_USER_HOME=Join-Path $portable 'android-user'
Push-Location $projectRoot
try {
    & npm.cmd run build:flutter
    if ($LASTEXITCODE -ne 0) { throw 'Falló la interfaz del ERP.' }
    Push-Location $PSScriptRoot
    try {
        & $flutter pub get
        if ($LASTEXITCODE -ne 0) { throw 'Fallaron las dependencias Flutter.' }
        & $flutter analyze
        if ($LASTEXITCODE -ne 0) { throw 'Falló el análisis Flutter.' }
        & $flutter test
        if ($LASTEXITCODE -ne 0) { throw 'Fallaron las pruebas Flutter.' }
        $mode=if($Release){'--release'}else{'--debug'}
        & $flutter build apk $mode
        if ($LASTEXITCODE -ne 0) { throw 'Falló la compilación Flutter.' }
        if (-not $Release) {
            New-Item -ItemType Directory -Path "$projectRoot/output" -Force | Out-Null
            Copy-Item -LiteralPath 'build/app/outputs/flutter-apk/app-debug.apk' -Destination "$projectRoot/output/Pyme360-1.5.0-flutter-pruebas.apk" -Force
        }
    } finally { Pop-Location }
} finally { Pop-Location }

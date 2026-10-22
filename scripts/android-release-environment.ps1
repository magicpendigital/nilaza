[CmdletBinding()]
param(
    [ValidateSet('Inspect', 'SdkInventory', 'NativeConfigure')]
    [string]$Action = 'Inspect',
    [string]$JavaHome = 'C:/Program Files/Microsoft/jdk-17.0.19.10-hotspot',
    [string]$SdkRoot,
    [string]$GradleUserHome
)

$ErrorActionPreference = 'Stop'
$repositoryRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
if (-not $SdkRoot) { $SdkRoot = Join-Path $repositoryRoot '.brand-work/android-sdk' }
if (-not $GradleUserHome) { $GradleUserHome = Join-Path $repositoryRoot '.brand-work/gradle' }
$javaExecutable = Join-Path $JavaHome 'bin/java.exe'
$sdkManager = Join-Path $SdkRoot 'cmdline-tools/22.0/bin/sdkmanager.bat'
if (-not (Test-Path -LiteralPath $javaExecutable)) { throw 'Required JDK 17 installation is missing.' }
if (-not (Test-Path -LiteralPath $sdkManager)) { throw 'Pinned Android command-line tools 22.0 are missing.' }
foreach ($component in @('build-tools/36.0.0', 'platforms/android-36', 'ndk/27.1.12297006', 'cmake/3.22.1', 'licenses')) {
    if (-not (Test-Path -LiteralPath (Join-Path $SdkRoot $component))) { throw "SDK prerequisite missing: $component" }
}

$environmentNames = @('JAVA_HOME', 'ANDROID_HOME', 'ANDROID_SDK_ROOT', 'GRADLE_USER_HOME', 'NODE_ENV', 'Path')
$previousEnvironment = @{}
foreach ($environmentName in $environmentNames) {
    $previousEnvironment[$environmentName] = [Environment]::GetEnvironmentVariable($environmentName, 'Process')
}
$previousLocation = Get-Location
try {
    $env:JAVA_HOME = [IO.Path]::GetFullPath($JavaHome)
    $env:ANDROID_HOME = [IO.Path]::GetFullPath($SdkRoot)
    $env:ANDROID_SDK_ROOT = $env:ANDROID_HOME
    $env:GRADLE_USER_HOME = [IO.Path]::GetFullPath($GradleUserHome)
    $env:NODE_ENV = 'production'
    $env:Path = "$env:JAVA_HOME/bin;$env:ANDROID_HOME/cmdline-tools/22.0/bin;$env:ANDROID_HOME/platform-tools;$env:Path"

    $javaVersion = (& $javaExecutable -version 2>&1 | Out-String).Trim()
    if ($LASTEXITCODE -ne 0 -or $javaVersion -notmatch 'version "17\.') { throw 'Gradle requires JDK 17; selected executable does not match.' }
    Write-Output $javaVersion
    Write-Output "Android SDK: $env:ANDROID_HOME"
    $sdkVersion = (& $sdkManager --version 2>&1 | Out-String).Trim()
    if ($LASTEXITCODE -ne 0 -or $sdkVersion -notmatch '(?m)^22\.0\s*$') { throw "Pinned SDK tool verification failed: $sdkVersion" }
    Write-Output 'Command-line tools: 22.0'

    if ($Action -eq 'SdkInventory') {
        & $sdkManager "--sdk_root=$env:ANDROID_HOME" --list_installed
        if ($LASTEXITCODE -ne 0) { throw 'SDK inventory failed.' }
    }
    if ($Action -eq 'NativeConfigure') {
        $projectCache = Join-Path $repositoryRoot '.brand-work/store-release-readiness-2026-10-04/project-cache'
        Set-Location (Join-Path $repositoryRoot 'apps/mobile/android')
        & './gradlew.bat' ':app:configureCMakeRelWithDebInfo[arm64-v8a]' '-PreactNativeArchitectures=arm64-v8a' '--project-cache-dir' $projectCache '--console=plain' '--no-daemon' '--max-workers=1'
        if ($LASTEXITCODE -ne 0) { throw 'Native release configuration failed; inspect the Gradle output.' }
    }
}
finally {
    Set-Location $previousLocation
    foreach ($environmentName in $environmentNames) {
        [Environment]::SetEnvironmentVariable($environmentName, $previousEnvironment[$environmentName], 'Process')
    }
}

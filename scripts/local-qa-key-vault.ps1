# Synthetic QA only. Raw keys are exchanged over anonymous child-process pipes,
# never arguments, environment variables, console logs or repository files.
param(
    [Parameter(Mandatory = $true)]
    [ValidateSet('init', 'inspect', 'protect', 'unprotect')]
    [string]$Action,
    [string]$RunId = ''
)
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
# Node can inherit a PowerShell 7 module search path. Select the bundled Windows
# PowerShell modules explicitly so the DPAPI helper cannot load incompatible ones.
foreach ($qaModule in @('Microsoft.PowerShell.Security', 'Microsoft.PowerShell.Management', 'Microsoft.PowerShell.Utility')) {
    Import-Module (Join-Path $PSHOME ('Modules\' + $qaModule + '\' + $qaModule + '.psd1')) -ErrorAction Stop
}
Add-Type -AssemblyName System.Security

$qaProfile = [Environment]::GetFolderPath('LocalApplicationData')
$expectedProfile = 'C:\Users\Admin\AppData\Local'
$qaRoot = Join-Path $qaProfile 'NilazaQARecovery'
$qaBackups = Join-Path $qaRoot 'Backups'
$qaKeys = Join-Path $qaRoot 'Keys'
$qaSid = [Security.Principal.WindowsIdentity]::GetCurrent().User
$systemSid = [Security.Principal.SecurityIdentifier]::new('S-1-5-18')
$entropy = [Text.Encoding]::UTF8.GetBytes('Nilaza synthetic QA key vault v1')
$rawKey = $null
$wrapped = $null
$inputBuffer = $null

function Assert-NoReparse([string]$Target) {
    $qaPath = [IO.Path]::GetFullPath($Target)
    while ($qaPath) {
        if (Test-Path -LiteralPath $qaPath) {
            $qaItem = Get-Item -LiteralPath $qaPath -Force
            if (($qaItem.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0) { throw 'Reparse path refused' }
        }
        $qaParent = [IO.Directory]::GetParent($qaPath)
        if ($null -eq $qaParent) { break }
        $qaPath = $qaParent.FullName
    }
}

function Assert-Acl([string]$Target, [bool]$Directory) {
    Assert-NoReparse $Target
    $qaAcl = Get-Acl -LiteralPath $Target
    if ($qaAcl.GetOwner([Security.Principal.SecurityIdentifier]).Value -ne $qaSid.Value) { throw 'Owner mismatch' }
    if ($Directory -and -not $qaAcl.AreAccessRulesProtected) { throw 'Inherited directory ACL refused' }
    $qaRules = @($qaAcl.GetAccessRules($true, $true, [Security.Principal.SecurityIdentifier]))
    if ($qaRules.Count -ne 2) { throw 'Unexpected ACL rule count' }
    foreach ($qaRule in $qaRules) {
        if ($qaRule.IdentityReference.Value -notin @($qaSid.Value, $systemSid.Value)) { throw 'Unexpected ACL principal' }
        if ($qaRule.AccessControlType -ne 'Allow' -or $qaRule.FileSystemRights -ne 'FullControl') { throw 'Unexpected ACL rights' }
    }
    $qaPrincipals = @($qaRules | ForEach-Object { $_.IdentityReference.Value } | Sort-Object -Unique)
    if ($qaPrincipals.Count -ne 2) { throw 'Missing ACL principal' }
}

function New-RestrictedDirectory([string]$Target) {
    Assert-NoReparse $Target
    if (Test-Path -LiteralPath $Target) {
        if (-not (Test-Path -LiteralPath $Target -PathType Container)) { throw 'Directory expected' }
        Assert-Acl $Target $true
        return
    }
    $null = [IO.Directory]::CreateDirectory($Target)
    $qaAcl = [Security.AccessControl.DirectorySecurity]::new()
    $qaAcl.SetOwner($qaSid)
    $qaAcl.SetAccessRuleProtection($true, $false)
    foreach ($qaPrincipal in @($qaSid, $systemSid)) {
        $qaAcl.AddAccessRule([Security.AccessControl.FileSystemAccessRule]::new(
            $qaPrincipal, 'FullControl', 'ContainerInherit, ObjectInherit', 'None', 'Allow'))
    }
    Set-Acl -LiteralPath $Target -AclObject $qaAcl
    Assert-Acl $Target $true
}

try {
    if ($qaProfile -ne $expectedProfile) { throw 'Unexpected Windows profile' }
    Assert-NoReparse $qaProfile
    if ($Action -eq 'init') {
        New-RestrictedDirectory $qaRoot
        New-RestrictedDirectory $qaBackups
        New-RestrictedDirectory $qaKeys
    }
    foreach ($qaDirectory in @($qaRoot, $qaBackups, $qaKeys)) { Assert-Acl $qaDirectory $true }
    if ($Action -in @('init', 'inspect')) {
        [Console]::Out.WriteLine((@{
            status = 'PASS'; root = $qaRoot; backupDirectory = $qaBackups; keyDirectory = $qaKeys;
            ownerSid = $qaSid.Value; allowedSids = @($qaSid.Value, $systemSid.Value);
            directoriesAclProtected = $true; protection = 'DPAPI CurrentUser'; syntheticOnly = $true
        } | ConvertTo-Json -Compress))
        exit 0
    }
    if ($RunId -notmatch '^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z-[a-f0-9]{6}$') { throw 'Invalid run ID' }
    $qaKeyPath = Join-Path $qaKeys ($RunId + '.dpapi')
    Assert-NoReparse $qaKeyPath
    if ($Action -eq 'protect') {
        # Read at most 33 bytes; the only permitted input is a 32-byte key.
        $inputBuffer = [byte[]]::new(33)
        $qaInput = [Console]::OpenStandardInput()
        $qaTotal = 0
        while ($qaTotal -lt 33) {
            $qaRead = $qaInput.Read($inputBuffer, $qaTotal, 33 - $qaTotal)
            if ($qaRead -eq 0) { break }
            $qaTotal += $qaRead
        }
        if ($qaTotal -ne 32) { throw 'Invalid key length' }
        $rawKey = [byte[]]::new(32)
        [Array]::Copy($inputBuffer, $rawKey, 32)
        $wrapped = [Security.Cryptography.ProtectedData]::Protect($rawKey, $entropy, [Security.Cryptography.DataProtectionScope]::CurrentUser)
        $qaFile = [IO.File]::Open($qaKeyPath, [IO.FileMode]::CreateNew, [IO.FileAccess]::Write, [IO.FileShare]::None)
        try { $qaFile.Write($wrapped, 0, $wrapped.Length); $qaFile.Flush($true) } finally { $qaFile.Dispose() }
        Assert-Acl $qaKeyPath $false
        [Console]::Out.WriteLine('{"status":"PASS","protection":"DPAPI CurrentUser"}')
    } else {
        Assert-Acl $qaKeyPath $false
        $wrapped = [IO.File]::ReadAllBytes($qaKeyPath)
        if ($wrapped.Length -gt 4096) { throw 'Unexpected wrapped key size' }
        $rawKey = [Security.Cryptography.ProtectedData]::Unprotect($wrapped, $entropy, [Security.Cryptography.DataProtectionScope]::CurrentUser)
        if ($rawKey.Length -ne 32) { throw 'Invalid unwrapped key' }
        # Only the Node child-pipe consumer receives this binary stream.
        $qaOutput = [Console]::OpenStandardOutput()
        $qaOutput.Write($rawKey, 0, $rawKey.Length)
        $qaOutput.Flush()
    }
} catch {
    if ($Action -in @('init', 'inspect')) {
        # These actions touch directory metadata only, never any key bytes.
        [Console]::Error.WriteLine($_.Exception.Message)
    }
    [Console]::Error.WriteLine('Local synthetic QA vault operation refused; no secret output.')
    exit 1
} finally {
    foreach ($qaBytes in @($rawKey, $wrapped, $inputBuffer)) {
        if ($null -ne $qaBytes) { [Array]::Clear($qaBytes, 0, $qaBytes.Length) }
    }
}

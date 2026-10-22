# Owner-private Drive-copy drill. Never run Run in a captured terminal.
# The downloaded encrypted identity is passed to age; plaintext identity is never exported.
param(
    [ValidateSet('Plan','Prepare','Run','Inspect')][string]$Action = 'Plan',
    [string]$DownloadUrl = ''
)
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
foreach ($restoreModule in @('Microsoft.PowerShell.Security','Microsoft.PowerShell.Management','Microsoft.PowerShell.Utility')) {
    Import-Module ([IO.Path]::Combine($PSHOME,'Modules',$restoreModule,$restoreModule+'.psd1')) -ErrorAction Stop
}
$restoreRepo = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$restoreRoot = 'C:\Users\Admin\AppData\Local\NilazaRecovery'
$restoreParent = Join-Path $restoreRoot 'RestoreTests'
$restoreWork = Join-Path $restoreParent 'drive-owner-v1-20261018'
$restoreKey = Join-Path $restoreWork 'downloaded-owner-v1.age'
$restoreChallenge = Join-Path $restoreWork 'public-challenge.txt'
$restoreProbe = Join-Path $restoreWork 'public-challenge.age'
$restorePlain = Join-Path $restoreWork 'public-challenge-confirmed.txt'
$restorePrepared = Join-Path $restoreWork 'prepared.json'
$restoreReceipt = Join-Path $restoreWork 'result.json'
$restoreLock = Join-Path $restoreWork 'owner-run.lock'
$restoreExpectedHash = '4bb2563f9627d223ac9116e442a13bef5046aa4d6cbb87082a70581714d5718a'
$restoreRecipient = 'age1rekcyasv7rgg8k77wfuf0een6re6yy32exuzsw6qsxqhudawlycsxrhd74'
$restoreDriveId = '14PAhlK38T5w8r_BqSyfHSmo_UUKVwqsf'
$restoreAge = Join-Path $restoreRepo '.brand-work\drive-recovery-tools-2026-10-13\vendor\age\age.exe'
$restoreAgeHash = '2821a4ed191da07372acd302e5f6feae7a7985e285e1417765ebe74025af45f0'
$restoreSid = [Security.Principal.WindowsIdentity]::GetCurrent().User
$restoreSystemSid = [Security.Principal.SecurityIdentifier]::new('S-1-5-18')
$restoreEncoding = [Text.UTF8Encoding]::new($false)
$restorePhase = 'VALIDATE_CONTEXT'
$restoreLockHandle = $null

function Get-RestoreHash([string]$Path) { return (Get-FileHash -LiteralPath $Path -Algorithm SHA256).Hash.ToLowerInvariant() }
function Assert-RestorePath([string]$Target) {
    $resolved = [IO.Path]::GetFullPath($Target)
    if ($resolved -ne $restoreRoot -and -not $resolved.StartsWith($restoreRoot+'\',[StringComparison]::OrdinalIgnoreCase)) { throw 'Path refused' }
    $cursor = $resolved
    while ($cursor) {
        if (Test-Path -LiteralPath $cursor) {
            if (((Get-Item -LiteralPath $cursor -Force).Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0) { throw 'Reparse path refused' }
        }
        $parent = [IO.Directory]::GetParent($cursor)
        if ($null -eq $parent) { break }
        $cursor = $parent.FullName
    }
}
function Assert-RestoreAcl([string]$Target,[bool]$Directory) {
    Assert-RestorePath $Target
    $acl = Get-Acl -LiteralPath $Target
    if ($acl.GetOwner([Security.Principal.SecurityIdentifier]).Value -ne $restoreSid.Value) { throw 'Owner mismatch' }
    if ($Directory -and -not $acl.AreAccessRulesProtected) { throw 'Inherited directory ACL refused' }
    $rules = @($acl.GetAccessRules($true,$true,[Security.Principal.SecurityIdentifier]))
    if ($rules.Count -ne 2) { throw 'Unexpected ACL rule count' }
    foreach ($rule in $rules) {
        if ($rule.IdentityReference.Value -notin @($restoreSid.Value,$restoreSystemSid.Value) -or $rule.AccessControlType -ne 'Allow' -or $rule.FileSystemRights -ne 'FullControl') { throw 'Unexpected ACL' }
    }
    if (@($rules | ForEach-Object {$_.IdentityReference.Value} | Sort-Object -Unique).Count -ne 2) { throw 'Missing principal' }
}
function New-RestoreDirectory([string]$Target) {
    Assert-RestorePath $Target
    if (Test-Path -LiteralPath $Target) { Assert-RestoreAcl $Target $true; return }
    $null = [IO.Directory]::CreateDirectory($Target)
    $acl = [Security.AccessControl.DirectorySecurity]::new()
    $acl.SetOwner($restoreSid); $acl.SetAccessRuleProtection($true,$false)
    foreach ($sid in @($restoreSid,$restoreSystemSid)) { $acl.AddAccessRule([Security.AccessControl.FileSystemAccessRule]::new($sid,'FullControl','ContainerInherit, ObjectInherit','None','Allow')) }
    Set-Acl -LiteralPath $Target -AclObject $acl
    Assert-RestoreAcl $Target $true
}
function Write-RestoreNew([string]$Target,[byte[]]$Bytes) {
    Assert-RestorePath $Target
    $stream = [IO.File]::Open($Target,[IO.FileMode]::CreateNew,[IO.FileAccess]::Write,[IO.FileShare]::None)
    try { $stream.Write($Bytes,0,$Bytes.Length) } finally { $stream.Dispose() }
    Assert-RestoreAcl $Target $false
}
function Assert-RestoreConsole {
    if ([Console]::IsInputRedirected -or [Console]::IsOutputRedirected -or [Console]::IsErrorRedirected) { throw 'Private console required' }
    foreach ($policy in @('HKCU:\Software\Policies\Microsoft\Windows\PowerShell\Transcription','HKLM:\Software\Policies\Microsoft\Windows\PowerShell\Transcription')) {
        if (Test-Path -LiteralPath $policy) {
            $setting = Get-ItemProperty -LiteralPath $policy
            if ($setting.PSObject.Properties.Name -contains 'EnableTranscripting' -and $setting.EnableTranscripting -eq 1) { throw 'Transcript policy refused' }
        }
    }
}
function Read-RestorePrepared {
    foreach ($dir in @($restoreRoot,$restoreParent,$restoreWork)) { Assert-RestoreAcl $dir $true }
    foreach ($file in @($restoreKey,$restoreChallenge,$restoreProbe,$restorePrepared)) { Assert-RestoreAcl $file $false }
    $meta = [IO.File]::ReadAllText($restorePrepared) | ConvertFrom-Json
    if ($meta.status -ne 'DOWNLOADED_COPY_PREPARED' -or $meta.driveFileId -ne $restoreDriveId -or $meta.keySha256 -ne $restoreExpectedHash -or $meta.publicRecipient -ne $restoreRecipient) { throw 'Prepared metadata mismatch' }
    if ((Get-Item -LiteralPath $restoreKey).Length -ne 371 -or (Get-RestoreHash $restoreKey) -ne $restoreExpectedHash) { throw 'Downloaded identity mismatch' }
    if ($meta.helperSha256 -ne (Get-RestoreHash $PSCommandPath) -or $meta.probeSha256 -ne (Get-RestoreHash $restoreProbe) -or $meta.challengeSha256 -ne (Get-RestoreHash $restoreChallenge)) { throw 'Prepared input changed' }
    return $meta
}

try {
    if ($Action -eq 'Run') { $restorePhase='PRIVATE_CONSOLE_REQUIRED'; Assert-RestoreConsole }
    $restorePhase='VALIDATE_CONTEXT'
    if ([Environment]::GetFolderPath('LocalApplicationData') -ne 'C:\Users\Admin\AppData\Local') { throw 'Unexpected profile' }
    if ((Get-RestoreHash $restoreAge) -ne $restoreAgeHash) { throw 'Vendor mismatch' }
    if ($Action -ne 'Prepare' -and $DownloadUrl) { throw 'Unexpected download argument' }
    if ($Action -eq 'Plan') {
        [Console]::Out.WriteLine((@{status='READY_TO_PREPARE_DRIVE_COPY';workDirectory=$restoreWork;downloadedKey=$restoreKey;receipt=$restoreReceipt;originalLocalKeyAccessed=$false;writesPerformed=$false;offMachineRecoveryVerified=$false} | ConvertTo-Json -Compress))
        exit 0
    }
    if ($Action -eq 'Prepare') {
        $restorePhase='VALIDATE_DOWNLOAD'
        Assert-RestoreAcl $restoreRoot $true
        Assert-RestorePath $restoreWork
        if (Test-Path -LiteralPath $restoreWork) { throw 'Prior drill preserved' }
        $uri = [Uri]$DownloadUrl
        if (-not $uri.IsAbsoluteUri -or $uri.Scheme -ne 'https' -or -not $uri.Host.EndsWith('.oaiusercontent.com',[StringComparison]::OrdinalIgnoreCase) -or $uri.UserInfo -or -not $uri.IsDefaultPort) { throw 'Unexpected download URL' }
        $client = [Net.WebClient]::new()
        try { $bytes = $client.DownloadData($uri) } finally { $client.Dispose(); $DownloadUrl=''; $uri=$null }
        $sha = [Security.Cryptography.SHA256]::Create()
        try { $digest = ([BitConverter]::ToString($sha.ComputeHash($bytes))).Replace('-','').ToLowerInvariant() } finally { $sha.Dispose() }
        $header = [Text.Encoding]::ASCII.GetString($bytes,0,[Math]::Min(256,$bytes.Length))
        if ($bytes.Length -ne 371 -or $digest -ne $restoreExpectedHash -or -not $header.StartsWith('age-encryption.org/v1') -or $header -notmatch '-> scrypt ') { throw 'Downloaded ciphertext rejected' }
        $restorePhase='PREPARE_PRIVATE_FILES'
        New-RestoreDirectory $restoreParent
        New-RestoreDirectory $restoreWork
        Write-RestoreNew $restoreKey $bytes
        [Array]::Clear($bytes,0,$bytes.Length)
        $challenge = 'Nilaza Drive-copy verification owner-v1: ' + [Guid]::NewGuid().ToString('N')
        Write-RestoreNew $restoreChallenge ($restoreEncoding.GetBytes($challenge))
        Assert-RestorePath $restoreProbe
        if (Test-Path -LiteralPath $restoreProbe) { throw 'Prior challenge preserved' }
        & $restoreAge --encrypt --recipient $restoreRecipient --output $restoreProbe $restoreChallenge
        if ($LASTEXITCODE -ne 0) { throw 'Challenge encryption failed' }
        Assert-RestoreAcl $restoreProbe $false
        $meta = @{schemaVersion=1;status='DOWNLOADED_COPY_PREPARED';preparedAt=[DateTime]::UtcNow.ToString('o');driveFileId=$restoreDriveId;keySha256=$digest;keyBytes=371;publicRecipient=$restoreRecipient;helperSha256=(Get-RestoreHash $PSCommandPath);ageSha256=$restoreAgeHash;probeSha256=(Get-RestoreHash $restoreProbe);challengeSha256=(Get-RestoreHash $restoreChallenge);originalLocalKeyAccessed=$false;passwordCaptured=$false;downloadUrlStored=$false;offMachineRecoveryVerified=$false}
        Write-RestoreNew $restorePrepared ($restoreEncoding.GetBytes(($meta | ConvertTo-Json -Depth 4)))
        [Console]::Out.WriteLine(($meta | ConvertTo-Json -Compress))
        exit 0
    }
    $restorePhase='CHECK_PREPARED_FILES'
    $prepared = Read-RestorePrepared
    if ($Action -eq 'Inspect') {
        if (-not (Test-Path -LiteralPath $restoreReceipt)) {
            [Console]::Out.WriteLine((@{status='AWAITING_OWNER_VERIFICATION';keySha256=$restoreExpectedHash;driveFileId=$restoreDriveId;originalLocalKeyAccessed=$false;offMachineRecoveryVerified=$false;managedRecovery='BLOCKED'} | ConvertTo-Json -Compress)); exit 0
        }
        foreach ($file in @($restoreReceipt,$restorePlain)) { Assert-RestoreAcl $file $false }
        $result = [IO.File]::ReadAllText($restoreReceipt) | ConvertFrom-Json
        if ($result.status -ne 'DRIVE_COPY_OWNER_DECRYPT_VERIFIED' -or $result.keySha256 -ne $restoreExpectedHash -or $result.preparedSha256 -ne (Get-RestoreHash $restorePrepared) -or $result.helperSha256 -ne (Get-RestoreHash $PSCommandPath) -or $result.offMachineRecoveryVerified -ne $false -or $result.managedRecovery -ne 'BLOCKED') { throw 'Result mismatch' }
        if ((Get-RestoreHash $restorePlain) -ne $prepared.challengeSha256) { throw 'Recovered challenge mismatch' }
        [Console]::Out.WriteLine(($result | ConvertTo-Json -Compress)); exit 0
    }
    Assert-RestorePath $restoreLock
    if (Test-Path -LiteralPath $restoreLock) { Assert-RestoreAcl $restoreLock $false }
    $restoreLockHandle = [IO.File]::Open($restoreLock,[IO.FileMode]::OpenOrCreate,[IO.FileAccess]::ReadWrite,[IO.FileShare]::None)
    foreach ($file in @($restorePlain,$restoreReceipt)) { Assert-RestorePath $file; if (Test-Path -LiteralPath $file) { throw 'Prior test result preserved' } }
    [Console]::OutputEncoding = [Text.Encoding]::UTF8
    $Host.UI.RawUI.WindowTitle='NILAZA - THU KHOI PHUC TU DRIVE'
    Write-Host 'NILAZA - THU KHOI PHUC BAN KHOA TREN GOOGLE DRIVE'
    Write-Host 'Khong tao mat khau moi. Su dung DUNG mat khau ban da luu rieng.'
    Write-Host 'Khong gui mat khau vao chat; khong chup man hinh mat khau.'
    Write-Host ''
    Write-Host 'BUOC 1/3 - CHUAN BI'
    Write-Host 'Lay mat khau tu noi ban da luu. Chuyen ban phim sang ENG neu can.'
    do { $ready=Read-Host 'Khi san sang, go BAT_DAU roi Enter (KHONG nhap mat khau o day)' } while ($ready -cne 'BAT_DAU')
    $restorePhase='RECHECK_BEFORE_DECRYPT'
    $prepared = Read-RestorePrepared
    foreach ($file in @($restorePlain,$restoreReceipt)) { if (Test-Path -LiteralPath $file) { throw 'Output collision' } }
    Write-Host ''
    Write-Host 'BUOC 2/3 - NHAP MAT KHAU DA LUU'
    Write-Host 'Khi age hoi Enter passphrase, NHAP hoac DAN dung mat khau DA LUU, roi Enter.'
    Write-Host 'Chu va dau * KHONG hien, con tro co the khong di chuyen. Ban phim van nhan.'
    Write-Host 'Khong Enter de trong; day la MO KHOA, khong phai tao mat khau.'
    Write-Host 'Neu dan: chuot phai thanh tieu de > Edit > Paste; chi dan mot lan, roi Enter.'
    Write-Host 'Khong kem dau ngoac kep, khong them khoang trang. Khong dung Ctrl+U.'
    $restorePhase='DECRYPT_PROBE'
    & $restoreAge --decrypt --identity $restoreKey --output $restorePlain $restoreProbe
    if ($LASTEXITCODE -ne 0) { throw 'Owner decrypt failed' }
    Assert-RestoreAcl $restorePlain $false
    if ((Get-RestoreHash $restorePlain) -ne $prepared.challengeSha256) { throw 'Challenge comparison failed' }
    $restorePhase='SAVE_PUBLIC_RESULT'
    $result = @{schemaVersion=1;status='DRIVE_COPY_OWNER_DECRYPT_VERIFIED';verifiedAt=[DateTime]::UtcNow.ToString('o');driveFileId=$restoreDriveId;keySha256=$restoreExpectedHash;keyBytes=371;preparedSha256=(Get-RestoreHash $restorePrepared);helperSha256=(Get-RestoreHash $PSCommandPath);ageSha256=$restoreAgeHash;decryptedChallengeSha256=(Get-RestoreHash $restorePlain);downloadedIdentityUsed=$true;originalLocalKeyAccessed=$false;rawIdentityStored=$false;passwordCaptured=$false;testScope='Same Windows machine; separate downloaded Drive copy';offMachineRecoveryVerified=$false;managedRecovery='BLOCKED'}
    Write-RestoreNew $restoreReceipt ($restoreEncoding.GetBytes(($result | ConvertTo-Json -Depth 4)))
    Write-Host ''
    Write-Host 'BUOC 3/3 - THU KHOI PHUC TU DRIVE THANH CONG'
    Write-Host 'Ban tai tu Drive da mo dung cau kiem tra. Khoa goc duoc giu nguyen.'
    Write-Host 'Chi bao Codex: THU KHOI PHUC THANH CONG. Khong gui mat khau.'
    Write-Host 'Day la bai thu tren may hien tai; chua phai phuc hoi toan du an khi mat may.'
    $null=Read-Host 'Nhan Enter de dong cua so'
} catch {
    [Console]::Out.WriteLine(('RESTORE_TEST_NOT_COMPLETED; MA_BUOC: '+$restorePhase))
    if ($Action -eq 'Run' -and -not [Console]::IsInputRedirected -and -not [Console]::IsOutputRedirected -and -not [Console]::IsErrorRedirected) {
        Write-Host 'Bao Codex ma buoc tren; khong gui mat khau. Khoa goc duoc giu nguyen.'
        $null=Read-Host 'Nhan Enter de dong cua so'
    }
    exit 1
} finally {
    if ($null -ne $restoreLockHandle) { $restoreLockHandle.Dispose() }
}

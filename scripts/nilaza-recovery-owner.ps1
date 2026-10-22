# Owner-only enrollment. Never run Setup with output capture or a transcript.
# No raw identity or passphrase is written to Git, argv, environment or logs.
param([ValidateSet('Plan','Setup','Inspect')][string]$Action = 'Plan')
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
foreach ($recoveryModule in @('Microsoft.PowerShell.Security','Microsoft.PowerShell.Management','Microsoft.PowerShell.Utility')) {
    Import-Module ([IO.Path]::Combine($PSHOME,'Modules',$recoveryModule,$recoveryModule+'.psd1')) -ErrorAction Stop
}
$recoveryRepo = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$recoveryVendorPath = Join-Path $recoveryRepo 'artifacts\drive-recovery-setup-2026-10-13\vendor-tool.json'
$recoveryVendor = Get-Content -LiteralPath $recoveryVendorPath -Raw | ConvertFrom-Json
$recoveryProfile = [Environment]::GetFolderPath('LocalApplicationData')
if ($recoveryProfile -ne 'C:\Users\Admin\AppData\Local') { throw 'Unexpected Windows profile; stop for reviewed mapping' }
$recoveryRoot = Join-Path $recoveryProfile 'NilazaRecovery'
$recoveryKeys = Join-Path $recoveryRoot 'Keys'
$recoveryReceipts = Join-Path $recoveryRoot 'Receipts'
$recoveryVersion = 'owner-v1'
$recoveryKeyFile = Join-Path $recoveryKeys ($recoveryVersion + '.age')
$recoveryPartial = Join-Path $recoveryKeys ($recoveryVersion + '.age.partial')
$recoveryReceipt = Join-Path $recoveryReceipts ($recoveryVersion + '.json')
$recoveryProbe = Join-Path $recoveryRoot 'owner-probe.age'
$recoveryProbePlain = Join-Path $recoveryRoot 'owner-probe-confirmed.txt'
$recoverySid = [Security.Principal.WindowsIdentity]::GetCurrent().User
$recoverySystemSid = [Security.Principal.SecurityIdentifier]::new('S-1-5-18')

function Assert-LocalPath([string]$Target) {
    $resolved = [IO.Path]::GetFullPath($Target)
    if ($resolved -ne $recoveryRoot -and -not $resolved.StartsWith($recoveryRoot + '\',[StringComparison]::OrdinalIgnoreCase)) { throw 'Recovery path outside reviewed root' }
    $cursor = $resolved
    while ($cursor) {
        if (Test-Path -LiteralPath $cursor) {
            if (((Get-Item -LiteralPath $cursor -Force).Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0) { throw 'Reparse path refused' }
        }
        $parent = [IO.Directory]::GetParent($cursor)
        if ($null -eq $parent) { break }
        $cursor = $parent.FullName
    }
    return $resolved
}
function Assert-PrivateAcl([string]$Target,[bool]$Directory) {
    $null = Assert-LocalPath $Target
    $acl = Get-Acl -LiteralPath $Target
    if ($acl.GetOwner([Security.Principal.SecurityIdentifier]).Value -ne $recoverySid.Value) { throw 'Recovery owner mismatch' }
    if ($Directory -and -not $acl.AreAccessRulesProtected) { throw 'Inherited directory ACL refused' }
    $rules = @($acl.GetAccessRules($true,$true,[Security.Principal.SecurityIdentifier]))
    if ($rules.Count -ne 2) { throw 'Unexpected recovery ACL rule count' }
    foreach ($rule in $rules) {
        if ($rule.IdentityReference.Value -notin @($recoverySid.Value,$recoverySystemSid.Value) -or $rule.AccessControlType -ne 'Allow' -or $rule.FileSystemRights -ne 'FullControl') { throw 'Unexpected recovery ACL' }
    }
    if (@($rules | ForEach-Object {$_.IdentityReference.Value} | Sort-Object -Unique).Count -ne 2) { throw 'Missing recovery principal' }
}
function New-PrivateDirectory([string]$Target) {
    $null = Assert-LocalPath $Target
    if (Test-Path -LiteralPath $Target) { Assert-PrivateAcl $Target $true; return }
    $null = [IO.Directory]::CreateDirectory($Target)
    $acl = [Security.AccessControl.DirectorySecurity]::new()
    $acl.SetOwner($recoverySid); $acl.SetAccessRuleProtection($true,$false)
    foreach ($sid in @($recoverySid,$recoverySystemSid)) { $acl.AddAccessRule([Security.AccessControl.FileSystemAccessRule]::new($sid,'FullControl','ContainerInherit, ObjectInherit','None','Allow')) }
    Set-Acl -LiteralPath $Target -AclObject $acl
    Assert-PrivateAcl $Target $true
}
function Assert-Vendor([object]$Binary) {
    $file = [IO.Path]::GetFullPath((Join-Path $recoveryRepo $Binary.path))
    if (-not $file.StartsWith((Join-Path $recoveryRepo '.brand-work\drive-recovery-tools-2026-10-13\'),[StringComparison]::OrdinalIgnoreCase)) { throw 'Vendor path refused' }
    if ((Get-FileHash -LiteralPath $file -Algorithm SHA256).Hash.ToLowerInvariant() -ne $Binary.sha256) { throw 'Vendor binary checksum mismatch' }
    return $file
}
$recoveryAge = Assert-Vendor $recoveryVendor.age
$recoveryKeygen = Assert-Vendor $recoveryVendor.keygen
if ($Action -eq 'Plan') {
    [Console]::Out.WriteLine((@{status='READY_FOR_PRIVATE_OWNER_ENROLLMENT';toolVersion=$recoveryVendor.version;root=$recoveryRoot;keyFile=$recoveryKeyFile;receipt=$recoveryReceipt;writesPerformed=$false;passwordCaptureAllowed=$false} | ConvertTo-Json -Compress))
    exit 0
}
if ($Action -eq 'Inspect') {
    foreach ($dir in @($recoveryRoot,$recoveryKeys,$recoveryReceipts)) { Assert-PrivateAcl $dir $true }
    Assert-PrivateAcl $recoveryKeyFile $false; Assert-PrivateAcl $recoveryReceipt $false
    $meta = Get-Content -LiteralPath $recoveryReceipt -Raw | ConvertFrom-Json
    if ($meta.status -ne 'OWNER_KEY_CREATED_LOCAL_PROBE_VERIFIED' -or $meta.keyFile -ne $recoveryKeyFile -or $meta.version -ne $recoveryVersion -or $meta.recipient -notmatch '^age1[0-9a-z]{58}$') { throw 'Owner enrollment metadata mismatch' }
    if ((Get-FileHash -LiteralPath $recoveryKeyFile -Algorithm SHA256).Hash.ToLowerInvariant() -ne $meta.keySha256) { throw 'Encrypted identity checksum mismatch' }
    $head = [IO.File]::ReadAllBytes($recoveryKeyFile)
    $header = [Text.Encoding]::ASCII.GetString($head,0,[Math]::Min(256,$head.Length))
    if (-not $header.StartsWith('age-encryption.org/v1') -or $header -notmatch '-> scrypt ') { throw 'Passphrase encrypted identity expected' }
    [Console]::Out.WriteLine(($meta | ConvertTo-Json -Compress))
    exit 0
}
if ([Console]::IsInputRedirected -or [Console]::IsOutputRedirected -or [Console]::IsErrorRedirected) { throw 'Setup requires a private local console without agent capture' }
foreach ($transcriptionPolicy in @('HKCU:\Software\Policies\Microsoft\Windows\PowerShell\Transcription','HKLM:\Software\Policies\Microsoft\Windows\PowerShell\Transcription')) {
    if (Test-Path -LiteralPath $transcriptionPolicy) {
        $transcriptionSetting = Get-ItemProperty -LiteralPath $transcriptionPolicy
        if ($transcriptionSetting.PSObject.Properties.Name -contains 'EnableTranscripting' -and $transcriptionSetting.EnableTranscripting -eq 1) { throw 'Automatic transcript capture refused' }
    }
}
foreach ($dir in @($recoveryRoot,$recoveryKeys,$recoveryReceipts)) { New-PrivateDirectory $dir }
foreach ($file in @($recoveryKeyFile,$recoveryPartial,$recoveryReceipt,$recoveryProbe,$recoveryProbePlain)) { $null=Assert-LocalPath $file; if (Test-Path -LiteralPath $file) { throw 'Existing owner enrollment file preserved; enrollment will not overwrite it' } }
[Console]::OutputEncoding = [Text.Encoding]::UTF8
$Host.UI.RawUI.WindowTitle='NILAZA - KHOA THAT - GIU RIENG MAT KHAU'
Write-Host 'NILAZA - THIET LAP KHOA KHOI PHUC RIENG'
Write-Host 'Khong gui mat khau vao Codex/chat. Khong chup man hinh khi mat khau da hien.'
Write-Host 'Chuan bi noi luu mat khau doc lap voi Drive va may tinh nay.'
Write-Host 'Cua so nay khong ghi transcript. Agent chi doc public key va receipt, khong doc mat khau/raw key.'
$gen=$null; $enc=$null; $probeEnc=$null
$recoveryStep='KEYBOARD_CHECK'
try {
    Write-Host ''
    Write-Host 'BUOC 1/5 - BAT DAU KHI SAN SANG, KHONG NHAP MAT KHAU'
    Write-Host 'Buoc nay khong tinh gio. Chi go NILAZA sau khi da chuan bi noi luu mat khau rieng.'
    do {
        $keyboardCheck=Read-Host 'Go chu NILAZA (chu se hien tren man hinh), roi nhan Enter'
        if ($keyboardCheck -ne 'NILAZA') { Write-Host 'Chua nhan dung chu NILAZA. Thu lai bang ban phim English (ENG); khong nhap mat khau o buoc nay.' }
    } while ($keyboardCheck -ne 'NILAZA')
    $keyboardCheck=$null
    Write-Host 'Da nhan ban phim.'
    Write-Host ''
    Write-Host 'BUOC 2/5 - TAO MAT KHAU NGAU NHIEN'
    Write-Host 'Khi age hien Enter passphrase, CHI NHAN ENTER de age tu tao mat khau manh.'
    Write-Host 'KHONG go thu hoac dan gi o dong dau tien nay. Chi nhan Enter khi dong con trong.'
    Write-Host 'age se hien mat khau trong dau ngoac kep. Luu dung cum tu do o noi rieng.'
    Write-Host 'O mat khau van nhan phim du khong hien chu hay dau *. Neu da go, age se hoi nhap lai dung mat khau do.'
    Write-Host 'Khong dung Ctrl+U: tren Windows phim nay KHONG xoa dong mat khau.'
    $recoveryStep='ENCRYPT_IDENTITY'
    $encInfo=[Diagnostics.ProcessStartInfo]::new();$encInfo.FileName=$recoveryAge;$encInfo.Arguments='--passphrase --output "' + $recoveryPartial + '"';$encInfo.UseShellExecute=$false;$encInfo.RedirectStandardInput=$true
    $enc=[Diagnostics.Process]::Start($encInfo)
    $genInfo=[Diagnostics.ProcessStartInfo]::new();$genInfo.FileName=$recoveryKeygen;$genInfo.UseShellExecute=$false;$genInfo.CreateNoWindow=$true;$genInfo.RedirectStandardOutput=$true;$genInfo.RedirectStandardError=$true
    $gen=[Diagnostics.Process]::Start($genInfo)
    # Only this owner-controlled process handles the private bytes, via anonymous pipes.
    $gen.StandardOutput.BaseStream.CopyTo($enc.StandardInput.BaseStream)
    $enc.StandardInput.Close();$publicInfo=$gen.StandardError.ReadToEnd();$gen.WaitForExit()
    if ($gen.ExitCode -ne 0) { throw 'Private key generation failed' }
    if (-not $enc.WaitForExit(900000)) { $enc.Kill();throw 'Owner enrollment timed out' }
    if ($enc.ExitCode -ne 0) { throw 'Owner identity encryption incomplete' }
    $recoveryStep='VERIFY_PUBLIC_RECIPIENT'
    if ($publicInfo -notmatch 'Public key: (age1[0-9a-z]{58})') { throw 'Public recipient missing' }
    $recipient=$Matches[1];Assert-PrivateAcl $recoveryPartial $false
    $probe=$recoveryProbe;$probePlain=$recoveryProbePlain
    foreach ($file in @($probe,$probePlain)) { $null=Assert-LocalPath $file; if (Test-Path -LiteralPath $file) { throw 'Prior enrollment probe preserved' } }
    $recoveryStep='CREATE_PROBE'
    $probeInfo=[Diagnostics.ProcessStartInfo]::new();$probeInfo.FileName=$recoveryAge;$probeInfo.Arguments='--recipient ' + $recipient + ' --output "' + $probe + '"';$probeInfo.UseShellExecute=$false;$probeInfo.RedirectStandardInput=$true;$probeInfo.CreateNoWindow=$true
    $probeEnc=[Diagnostics.Process]::Start($probeInfo);$probeEnc.StandardInput.Write('Nilaza owner recovery enrollment verification');$probeEnc.StandardInput.Close();$probeEnc.WaitForExit()
    if ($probeEnc.ExitCode -ne 0) { throw 'Owner verification encryption failed' }
    Write-Host ''
    Write-Host 'BUOC 3/5 - KIEM TRA MO KHOA'
    Write-Host 'Dung DUNG mat khau age vua tao (khong kem dau ngoac kep), hoac mat khau ban da chon.'
    Write-Host 'Console Host: nhan chuot phai thanh tieu de > Edit > Mark, chon DUNG cum tu, roi Edit > Copy.'
    Write-Host 'Tai loi hoi mat khau: nhan chuot phai thanh tieu de > Edit > Paste, roi nhan Enter.'
    Write-Host 'Chi copy mat khau moi vua tao, khong kem dau ngoac kep/khoang trang; khong dung cum tu cua bai thu.'
    Write-Host 'Ky tu khi dan/nhap se khong hien, ke ca dau *, nhung van duoc nhan. Dan dung mot lan roi nhan Enter. Khong dung Ctrl+U.'
    Write-Host 'Chi giai ma mot cau kiem tra, khong co du lieu that.'
    $recoveryStep='VERIFY_DECRYPTION'
    & $recoveryAge --decrypt --identity $recoveryPartial --output $probePlain $probe
    if ($LASTEXITCODE -ne 0 -or [IO.File]::ReadAllText($probePlain) -ne 'Nilaza owner recovery enrollment verification') { throw 'Owner verification failed; encrypted key not finalized' }
    Write-Host ''
    Write-Host 'BUOC 4/5 - XAC NHAN DA GIU MAT KHAU RIENG'
    Write-Host 'Chi tiep tuc sau khi da luu mat khau ngoai Drive, van lay lai duoc neu mat may.'
    $recoveryStep='CONFIRM_CUSTODY'
    $attestation=Read-Host 'Sau khi luu mat khau ngoai Drive, go DA_LUU_RIENG de hoan tat'
    if ($attestation -ne 'DA_LUU_RIENG') { throw 'Owner independent custody not confirmed; encrypted candidate preserved' }
    $recoveryStep='FINALIZE_IDENTITY'
    Move-Item -LiteralPath $recoveryPartial -Destination $recoveryKeyFile
    Assert-PrivateAcl $recoveryKeyFile $false
    $meta=@{schemaVersion=1;status='OWNER_KEY_CREATED_LOCAL_PROBE_VERIFIED';version=$recoveryVersion;recipient=$recipient;keyFile=$recoveryKeyFile;keySha256=(Get-FileHash -LiteralPath $recoveryKeyFile -Algorithm SHA256).Hash.ToLowerInvariant();keyBytes=(Get-Item -LiteralPath $recoveryKeyFile).Length;createdAt=[DateTime]::UtcNow.ToString('o');independentPassphraseCustody='owner-attested';rawIdentityStored=$false;agentCapturedPassword=$false;offMachineRecoveryVerified=$false;managedRecovery='BLOCKED'}
    [IO.File]::WriteAllText($recoveryReceipt,($meta | ConvertTo-Json -Depth 4),[Text.UTF8Encoding]::new($false));Assert-PrivateAcl $recoveryReceipt $false
    Write-Host ''
    Write-Host 'BUOC 5/5 - DA XONG TREN MAY. Khoa rieng da ma hoa va thu mo khoa thanh cong.'
    Write-Host 'Chua upload Drive. Codex se chi kiem checksum/public key va tai file ma hoa len Drive.'
    Write-Host 'Sau khi da luu mat khau an toan, copy mot doan chu khong bi mat de thay noi dung clipboard.'
    $null=Read-Host 'Nhan Enter de dong cua so, sau do bao Codex Da thiet lap khoa'
} catch {
    Write-Host 'THIET LAP CHUA HOAN TAT. Khong ghi de khoa cu va khong upload file partial. Bao Codex de kiem receipt an toan.'
    Write-Host ('MA_BUOC: ' + $recoveryStep)
    Write-Host 'Chi bao ma buoc nay cho Codex; khong gui mat khau hoac anh man hinh co mat khau.'
    $null=Read-Host 'Nhan Enter de dong cua so'
    exit 1
} finally {
    foreach ($process in @($gen,$enc,$probeEnc)) { if ($null -ne $process -and -not $process.HasExited) { $process.Kill() } }
}

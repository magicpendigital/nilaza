param([ValidateSet('Plan','Prepare','Check','Backup','StageDownload','Restore','Inspect')][string]$Action='Plan',[string]$DownloadUrl='')
$ErrorActionPreference='Stop'
Set-StrictMode -Version Latest
foreach($m in @('Microsoft.PowerShell.Security','Microsoft.PowerShell.Management','Microsoft.PowerShell.Utility')) { Import-Module ([IO.Path]::Combine($PSHOME,'Modules',$m,$m+'.psd1')) -ErrorAction Stop }
$repo=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$root='C:\Users\Admin\AppData\Local\NilazaRecovery'
$parent=Join-Path $root 'AndroidBackups'
$work=Join-Path $parent 'eas-default-20261018'
$node='C:\Program Files\nodejs\node.exe'
$helper=Join-Path $repo 'scripts\nilaza-android-key-backup.mjs'
$pinsPath=Join-Path $repo 'artifacts\android-key-backup-2026-10-18\toolchain.json'
$backup=Join-Path $work 'nilaza-android-eas-default-20261018.age'
$downloaded=Join-Path $work 'downloaded-android-backup.age'
$backupReceipt=Join-Path $work 'backup.json'
$downloadReceipt=Join-Path $work 'download.json'
$restoreReceipt=Join-Path $work 'restore.json'
$identity=Join-Path $root 'RestoreTests\drive-owner-v1-20261018\downloaded-owner-v1.age'
$sid=[Security.Principal.WindowsIdentity]::GetCurrent().User
$systemSid=[Security.Principal.SecurityIdentifier]::new('S-1-5-18')
$phase='CONTEXT';$lock=$null
function Assert-Path([string]$p){
    $full=[IO.Path]::GetFullPath($p)
    if($full -ne $root -and -not $full.StartsWith($root+'\',[StringComparison]::OrdinalIgnoreCase)){throw 'Path refused'}
    $cursor=$full
    while($cursor){
        if((Test-Path -LiteralPath $cursor) -and ((Get-Item -LiteralPath $cursor -Force).Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0){throw 'Reparse refused'}
        $up=[IO.Directory]::GetParent($cursor);if($null -eq $up){break};$cursor=$up.FullName
    }
}
function Assert-Acl([string]$p,[bool]$directory){
    Assert-Path $p;$acl=Get-Acl -LiteralPath $p
    if($acl.GetOwner([Security.Principal.SecurityIdentifier]).Value -ne $sid.Value -or ($directory -and -not $acl.AreAccessRulesProtected)){throw 'ACL owner/inheritance mismatch'}
    $rules=@($acl.GetAccessRules($true,$true,[Security.Principal.SecurityIdentifier]))
    if($rules.Count -ne 2){throw 'Unexpected ACL count'}
    foreach($r in $rules){if($r.IdentityReference.Value -notin @($sid.Value,$systemSid.Value) -or $r.AccessControlType -ne 'Allow' -or $r.FileSystemRights -ne 'FullControl'){throw 'Unexpected ACL'}}
    if(@($rules|ForEach-Object{$_.IdentityReference.Value}|Sort-Object -Unique).Count -ne 2){throw 'Missing principal'}
}
function New-Private([string]$p){
    Assert-Path $p;if(Test-Path -LiteralPath $p){Assert-Acl $p $true;return}
    $null=[IO.Directory]::CreateDirectory($p);$acl=[Security.AccessControl.DirectorySecurity]::new();$acl.SetOwner($sid);$acl.SetAccessRuleProtection($true,$false)
    foreach($s in @($sid,$systemSid)){$acl.AddAccessRule([Security.AccessControl.FileSystemAccessRule]::new($s,'FullControl','ContainerInherit, ObjectInherit','None','Allow'))}
    Set-Acl -LiteralPath $p -AclObject $acl;Assert-Acl $p $true
}
function Hash([string]$p){return (Get-FileHash -LiteralPath $p -Algorithm SHA256).Hash.ToLowerInvariant()}
function Write-New([string]$p,[byte[]]$bytes){Assert-Path $p;$f=[IO.File]::Open($p,'CreateNew','Write','None');try{$f.Write($bytes,0,$bytes.Length)}finally{$f.Dispose()};Assert-Acl $p $false}
function Assert-Console{
    if([Console]::IsInputRedirected -or [Console]::IsOutputRedirected -or [Console]::IsErrorRedirected){throw 'Private console required'}
    foreach($p in @('HKCU:\Software\Policies\Microsoft\Windows\PowerShell\Transcription','HKLM:\Software\Policies\Microsoft\Windows\PowerShell\Transcription')){
        if(Test-Path -LiteralPath $p){$v=Get-ItemProperty -LiteralPath $p;if($v.PSObject.Properties.Name -contains 'EnableTranscripting' -and $v.EnableTranscripting -eq 1){throw 'Transcript refused'}}
    }
}
try{
    if($Action -eq 'Restore'){$phase='PRIVATE_CONSOLE_REQUIRED';Assert-Console}
    $phase='VERIFY_TOOLCHAIN'
    if([Environment]::GetFolderPath('LocalApplicationData') -ne 'C:\Users\Admin\AppData\Local'){throw 'Profile mismatch'}
    $pins=Get-Content -LiteralPath $pinsPath -Raw|ConvertFrom-Json
    foreach($p in $pins.files){if((Hash $p.path) -ne $p.sha256){throw 'Tool changed'}}
    if($Action -ne 'StageDownload' -and $DownloadUrl){throw 'Unexpected URL'}
    if($Action -eq 'Plan'){@{status='ANDROID_BACKUP_PLAN';workDirectory=$work;ciphertext=$backup;writesPerformed=$false;secretOutputAllowed=$false}|ConvertTo-Json -Compress;exit 0}
    Assert-Acl $root $true
    if($Action -eq 'Prepare'){
        if(Test-Path -LiteralPath $work){throw 'Prior backup preserved'}
        New-Private $parent;New-Private $work
        @{status='ANDROID_PRIVATE_DIRECTORY_READY';plaintextStored=$false}|ConvertTo-Json -Compress;exit 0
    }
    foreach($d in @($parent,$work)){Assert-Acl $d $true}
    foreach($p in @($backup,($backup+'.partial'),$downloaded,$backupReceipt,$downloadReceipt,$restoreReceipt,(Join-Path $work 'operation.lock'))){Assert-Path $p;if(Test-Path -LiteralPath $p){Assert-Acl $p $false}}
    if($Action -eq 'Check'){@{status='PRIVATE_ACL_CHECK_PASS'}|ConvertTo-Json -Compress;exit 0}
    if($Action -eq 'Inspect'){& $node $helper inspect;if($LASTEXITCODE -ne 0){throw 'Inspect failed'};exit 0}
    $lock=[IO.File]::Open((Join-Path $work 'operation.lock'),'OpenOrCreate','ReadWrite','None')
    if($Action -eq 'Backup'){
        $phase='ENCRYPT_EXISTING_EAS_KEY'; & $node $helper backup
        if($LASTEXITCODE -ne 0){throw 'Backup failed'}
        foreach($p in @($backup,$backupReceipt)){Assert-Acl $p $false};exit 0
    }
    if($Action -eq 'StageDownload'){
        $phase='STAGE_DRIVE_DOWNLOAD'
        $meta=Get-Content -LiteralPath $backupReceipt -Raw|ConvertFrom-Json
        if($meta.status -ne 'ANDROID_CREDENTIAL_ENCRYPTED_SIGN_VERIFIED' -or (Hash $backup) -ne $meta.ciphertextSha256 -or $meta.ciphertextBytes -lt 1 -or $meta.ciphertextBytes -gt 2097152){throw 'Backup mismatch'}
        if((Test-Path -LiteralPath $downloaded) -or (Test-Path -LiteralPath $downloadReceipt)){throw 'Prior download preserved'}
        $uri=[Uri]$DownloadUrl
        if(-not $uri.IsAbsoluteUri -or $uri.Scheme -ne 'https' -or -not $uri.Host.EndsWith('.oaiusercontent.com',[StringComparison]::OrdinalIgnoreCase) -or $uri.UserInfo -or -not $uri.IsDefaultPort){throw 'URL refused'}
        $client=[Net.WebClient]::new();try{$bytes=$client.DownloadData($uri)}finally{$client.Dispose();$DownloadUrl='';$uri=$null}
        $sha=[Security.Cryptography.SHA256]::Create();try{$digest=([BitConverter]::ToString($sha.ComputeHash($bytes))).Replace('-','').ToLowerInvariant()}finally{$sha.Dispose()}
        if($bytes.Length -ne $meta.ciphertextBytes -or $digest -ne $meta.ciphertextSha256){throw 'Downloaded ciphertext mismatch'}
        Write-New $downloaded $bytes;[Array]::Clear($bytes,0,$bytes.Length)
        $m=@{schemaVersion=1;status='ANDROID_DOWNLOAD_VERIFIED';sha256=$digest;bytes=$meta.ciphertextBytes;downloadedAt=[DateTime]::UtcNow.ToString('o');plaintextStored=$false}
        Write-New $downloadReceipt ([Text.UTF8Encoding]::new($false).GetBytes(($m|ConvertTo-Json)))
        $m|ConvertTo-Json -Compress;exit 0
    }
    $phase='OWNER_RESTORE'
    Assert-Acl $identity $false
    if((Hash $identity) -ne '4bb2563f9627d223ac9116e442a13bef5046aa4d6cbb87082a70581714d5718a'){throw 'Recovery identity mismatch'}
    if(Test-Path -LiteralPath $restoreReceipt){throw 'Prior restore preserved'}
    [Console]::OutputEncoding=[Text.Encoding]::UTF8
    $Host.UI.RawUI.WindowTitle='NILAZA - THU KHOI PHUC KHOA ANDROID'
    Write-Host 'NILAZA - KIEM TRA BAN SAO KHOA ANDROID TU DRIVE'
    Write-Host 'Nhap mat khau RECOVERY da luu; khong can biet mat khau keystore Android.'
    Write-Host 'Khong tao mat khau moi. Khong gui mat khau vao chat.'
    do{$ready=Read-Host 'Khi san sang, go BAT_DAU roi Enter (khong nhap mat khau o day)'}while($ready -cne 'BAT_DAU')
    Assert-Console
    Write-Host 'Khi age hoi Enter passphrase: nhap/dan mat khau RECOVERY da luu, roi Enter mot lan.'
    Write-Host 'Khong hien chu/dau * nhung van nhan phim. Khong Enter de trong. Khong dung Ctrl+U.'
    Write-Host 'Dan trong Console Host: chuot phai thanh tieu de > Edit > Paste. Chi dan mot lan.'
    & $node $helper restore
    if($LASTEXITCODE -ne 0){throw 'Private restore failed'}
    Assert-Acl $restoreReceipt $false
    Write-Host ''
    Write-Host 'KHOI PHUC KHOA ANDROID THANH CONG'
    Write-Host 'Da mo ban tai tu Drive, kiem keystore/mat khau va thu ky/xac minh chu ky.'
    Write-Host 'Chua build, chua upload Google Play, khong thay khoa dang dung.'
    $null=Read-Host 'Nhan Enter de dong, roi bao Codex: Khoi phuc khoa Android thanh cong'
}catch{
    [Console]::Out.WriteLine(('ANDROID_STEP_NOT_COMPLETED; MA_BUOC: '+$phase))
    if($Action -eq 'Restore' -and -not [Console]::IsInputRedirected -and -not [Console]::IsOutputRedirected -and -not [Console]::IsErrorRedirected){Write-Host 'Chi bao ma buoc, khong gui mat khau.';$null=Read-Host 'Nhan Enter de dong cua so'}
    exit 1
}finally{if($null -ne $lock){$lock.Dispose()}}

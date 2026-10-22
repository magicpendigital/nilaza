param(
 [ValidateSet('Inspect','Rehearse')][string]$Action='Inspect',
 [string]$PacketPath='artifacts/release-preparation-2026-10-18/operator.packet.json'
)
$ErrorActionPreference='Stop'
Set-StrictMode -Version Latest
foreach($module in @('Microsoft.PowerShell.Management','Microsoft.PowerShell.Utility')){
 Import-Module ([IO.Path]::Combine($PSHOME,'Modules',$module,$module+'.psd1')) -ErrorAction Stop
}
$script:Repo=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$script:ArtifactRelative='artifacts/release-preparation-2026-10-18'
$script:ArtifactRoot=Join-Path $script:Repo $script:ArtifactRelative
$script:Target=[ordered]@{id='nilaza-singapore-prelaunch-qa';kind='staging';organizationId='drxbmvimiekeoeesgssp';projectRef='etfajmrwyywokgafzxsb'}
$script:PolicyPaths=@('docs/release/release-profile.json','docs/release/RELEASE_RUNBOOK.md','supabase/migration-ledger.json')
$script:ToolPaths=@('scripts/nilaza-release-preparation.ps1','scripts/nilaza-release-candidate.mjs','scripts/release-evidence.mjs','scripts/database-target-gate.mjs')

function Assert-Keys($Value,[string[]]$Keys){
 if($null -eq $Value -or $Value -isnot [pscustomobject]){throw 'OBJECT_REQUIRED'}
 $actual=@($Value.PSObject.Properties.Name)
 if($actual.Count -ne $Keys.Count){throw 'UNEXPECTED_PACKET_FIELDS'}
 foreach($key in $actual){if($key -cnotin $Keys){throw 'UNEXPECTED_PACKET_FIELDS'}}
}
function Assert-Target($Value){
 Assert-Keys $Value @('id','kind','organizationId','projectRef')
 foreach($key in $script:Target.Keys){if($Value.$key -cne $script:Target[$key]){throw 'TARGET_MISMATCH'}}
}
function Get-SafePath([string]$Relative,[switch]$AllowMissing){
 if(-not $Relative -or $Relative -match '[\\:\x00-\x1f\x7f]' -or $Relative.StartsWith('/') -or @($Relative.Split('/')|Where-Object{$_ -in @('','.','..')}).Count){throw 'PATH_REFUSED'}
 if($Relative -match '(?i)(^|/)(\.env(?:\.[^/]*)?|\.git|node_modules|\.cache|\.codex[^/]*|\.ci[^/]*|\.gradle[^/]*|\.agents|credentials?|secrets?|browser[-_]?profiles?)(/|$)' -or $Relative -match '(?i)\.(pem|p12|pfx|jks|keystore|age|db|sqlite3?|log|zip|7z|tar|gz|bak|partial)$'){throw 'SENSITIVE_PATH_REFUSED'}
 $full=[IO.Path]::GetFullPath((Join-Path $script:Repo $Relative))
 if(-not $full.StartsWith($script:Repo+[IO.Path]::DirectorySeparatorChar,[StringComparison]::OrdinalIgnoreCase)){throw 'PATH_REFUSED'}
 $cursor=$script:Repo
 foreach($part in $Relative.Split('/')){
  $cursor=Join-Path $cursor $part
  if(Test-Path -LiteralPath $cursor){if(((Get-Item -LiteralPath $cursor -Force).Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0){throw 'REPARSE_REFUSED'}}
 }
 if(-not $AllowMissing -and (-not [IO.File]::Exists($full))){throw 'INPUT_MISSING'}
 return $full
}
function Hash-File([string]$Full){return (Get-FileHash -LiteralPath $Full -Algorithm SHA256).Hash.ToLowerInvariant()}
function Read-SafeJson([string]$Relative){
 $full=Get-SafePath $Relative
 if((Get-Item -LiteralPath $full).Length -gt 16777216){throw 'JSON_TOO_LARGE'}
 try{return ([IO.File]::ReadAllText($full,[Text.Encoding]::UTF8)|ConvertFrom-Json)}catch{throw 'JSON_REFUSED'}
}
function Assert-FileRecord($Record,[switch]$WithBytes){
 $keys=@('path','sha256');if($WithBytes){$keys+=@('bytes')}
 Assert-Keys $Record $keys
 if($Record.path -isnot [string] -or $Record.sha256 -isnot [string] -or $Record.sha256 -cnotmatch '^[a-f0-9]{64}$'){throw 'FILE_RECORD_REFUSED'}
 $full=Get-SafePath $Record.path
 if($WithBytes){
  if($Record.bytes -isnot [int] -and $Record.bytes -isnot [long]){throw 'FILE_LENGTH_REFUSED'}
  if($Record.bytes -lt 0 -or (Get-Item -LiteralPath $full).Length -ne $Record.bytes){throw 'FILE_LENGTH_MISMATCH'}
 }
 if((Hash-File $full) -cne $Record.sha256){throw 'INPUT_HASH_MISMATCH'}
}
function Assert-Records($Records,[string[]]$Required=@(),[switch]$WithBytes){
 if($Records -isnot [array] -or $Records.Count -lt 1){throw 'FILE_RECORDS_REQUIRED'}
 $seen=[Collections.Generic.HashSet[string]]::new([StringComparer]::OrdinalIgnoreCase)
 foreach($record in $Records){Assert-FileRecord $record -WithBytes:$WithBytes;if(-not $seen.Add($record.path)){throw 'DUPLICATE_INPUT'}}
 foreach($requiredPath in $Required){if(-not $seen.Contains($requiredPath)){throw 'MANDATORY_PIN_MISSING'}}
}
function Get-FileArrayDigest($Records){
 # Match the generator's JSON.stringify(files) without invoking Node or any
 # executable from the packet. Safe paths cannot contain control characters.
 $items=@(foreach($record in $Records){
  $escaped=$record.path.Replace('\','\\').Replace('"','\"')
  '{"path":"'+$escaped+'","sha256":"'+$record.sha256+'","bytes":'+$record.bytes.ToString([Globalization.CultureInfo]::InvariantCulture)+'}'
 })
 $bytes=[Text.UTF8Encoding]::new($false).GetBytes(('['+($items -join ',')+']'))
 $algorithm=[Security.Cryptography.SHA256]::Create()
 try{return ([BitConverter]::ToString($algorithm.ComputeHash($bytes))).Replace('-','').ToLowerInvariant()}finally{$algorithm.Dispose()}
}
function Get-VerifiedContext([string]$Relative){
 if(-not $Relative.StartsWith($script:ArtifactRelative+'/',[StringComparison]::Ordinal) -or $Relative.Substring($script:ArtifactRelative.Length+1).Contains('/')){throw 'PACKET_DIRECTORY_REFUSED'}
 $packetFull=Get-SafePath $Relative
 $packetHash=Hash-File $packetFull
 $packet=Read-SafeJson $Relative
 Assert-Keys $packet @('schemaVersion','kind','rehearsalId','target','candidate','candidateDigestSha256','policy','tools','releaseAuthorized','cloudMutation')
 if($packet.schemaVersion -ne 1 -or $packet.kind -cne 'nilaza-local-release-preparation' -or $packet.rehearsalId -isnot [string] -or $packet.rehearsalId -cnotmatch '^[a-z0-9][a-z0-9._-]{0,95}$'){throw 'PACKET_IDENTITY_REFUSED'}
 if($packet.releaseAuthorized -isnot [bool] -or $packet.releaseAuthorized -ne $false -or $packet.cloudMutation -isnot [bool] -or $packet.cloudMutation -ne $false){throw 'EXECUTION_AUTHORITY_REFUSED'}
 Assert-Target $packet.target
 if($packet.candidateDigestSha256 -isnot [string] -or $packet.candidateDigestSha256 -cnotmatch '^[a-f0-9]{64}$'){throw 'CANDIDATE_DIGEST_REFUSED'}
 Assert-FileRecord $packet.candidate
 if(-not $packet.candidate.path.StartsWith($script:ArtifactRelative+'/',[StringComparison]::Ordinal)){throw 'CANDIDATE_DIRECTORY_REFUSED'}
 Assert-Records $packet.policy $script:PolicyPaths
 Assert-Records $packet.tools $script:ToolPaths
 $inventory=Read-SafeJson $packet.candidate.path
 Assert-Keys $inventory @('schemaVersion','kind','target','inputDigestSha256','files','policy','source','releaseAuthorized','missingRoots','exclusions','cloudMutation','status','nativeSigning','remoteCI')
 if($inventory.schemaVersion -ne 1 -or $inventory.kind -cne 'nilaza-source-candidate-inventory' -or $inventory.releaseAuthorized -isnot [bool] -or $inventory.releaseAuthorized -ne $false -or $inventory.cloudMutation -isnot [bool] -or $inventory.cloudMutation -ne $false -or $inventory.status -cne 'PREPARATION_ONLY' -or $inventory.nativeSigning -cne 'BLOCKED_RELEASE_USES_DEBUG_SIGNING' -or $inventory.remoteCI -cne 'NOT_RUN_FOR_THIS_CANDIDATE'){throw 'CANDIDATE_IDENTITY_REFUSED'}
 foreach($key in @('missingRoots','exclusions')){
  if($inventory.$key -isnot [array]){throw 'CANDIDATE_METADATA_REFUSED'}
  foreach($entry in $inventory.$key){if($entry -isnot [string]){throw 'CANDIDATE_METADATA_REFUSED'}}
 }
 Assert-Target $inventory.target
 if($inventory.inputDigestSha256 -cne $packet.candidateDigestSha256){throw 'CANDIDATE_DIGEST_MISMATCH'}
 Assert-Keys $inventory.source @('commit','branch','trackedDirty')
 if($inventory.source.commit -isnot [string] -or $inventory.source.commit -cnotmatch '^[a-f0-9]{40}$' -or $inventory.source.trackedDirty -isnot [bool] -or ($null -ne $inventory.source.branch -and $inventory.source.branch -isnot [string])){throw 'SOURCE_IDENTITY_REFUSED'}
 Assert-Records $inventory.files -WithBytes
 if((Get-FileArrayDigest $inventory.files) -cne $inventory.inputDigestSha256){throw 'FILE_ARRAY_DIGEST_MISMATCH'}
 Assert-Records $inventory.policy $script:PolicyPaths
 # Recheck the JSON containers after validating their referenced bytes.
 if((Hash-File $packetFull) -cne $packetHash){throw 'PACKET_CHANGED_DURING_CHECK'}
 Assert-FileRecord $packet.candidate
 return [pscustomobject]@{Packet=$packet;Inventory=$inventory;PacketSha256=$packetHash;PacketPath=$Relative}
}
function Assert-SameContext($Before,$After){
 if($Before.PacketSha256 -cne $After.PacketSha256 -or $Before.Packet.candidate.sha256 -cne $After.Packet.candidate.sha256 -or $Before.Packet.candidateDigestSha256 -cne $After.Packet.candidateDigestSha256){throw 'INPUT_DRIFT_AFTER_LOCK'}
}
function Get-SanitizedResult($Context,[string]$Status){
 $profile=Read-SafeJson 'docs/release/release-profile.json'
 $ledger=Read-SafeJson 'supabase/migration-ledger.json'
 $allowlisted=$false
 if($profile.PSObject.Properties.Name -contains 'targets'){
  foreach($entry in @($profile.targets)){
   if($null -eq $entry){continue};$same=$true
   foreach($key in $script:Target.Keys){if($entry.PSObject.Properties.Name -cnotcontains $key -or $entry.$key -cne $script:Target[$key]){$same=$false}}
   if($same){$allowlisted=$true}
  }
 }
 $ledgerStatus='UNKNOWN'
 if($ledger.PSObject.Properties.Name -contains 'status' -and $ledger.status -in @('blocked_pending_reconciliation','reconciled')){$ledgerStatus=$ledger.status}
 return [ordered]@{
  schemaVersion=1;kind='nilaza-local-release-preparation-result';status=$Status;rehearsalId=$Context.Packet.rehearsalId
  target=$script:Target;packetSha256=$Context.PacketSha256;candidateSha256=$Context.Packet.candidate.sha256
  candidateDigestSha256=$Context.Packet.candidateDigestSha256;verifiedFileCount=$Context.Inventory.files.Count
  sourceCommit=$Context.Inventory.source.commit;sourceTrackedDirty=$Context.Inventory.source.trackedDirty
  profileTargetAllowlisted=$allowlisted;migrationLedgerStatus=$ledgerStatus
  releaseReadiness='BLOCKED';releaseGateExecuted=$false;releaseAuthorized=$false;cloudMutation=$false;sourceEnumerationVerified=$false
  secretsLoaded=$false;ownerApprovalRecorded=$false;operatorCredentialIsolation='UNVERIFIED'
  limits=@(
   'Local preparation only; no cloud execution or release authorization.'
   'The lock coordinates this checkout only, not other checkouts or hosts.'
   'Only listed files are verified; source enumeration requires separate candidate verification.'
   'Same-user credential isolation is unverified; this runner does not authenticate Owner identity or handle secrets.'
  )
 }
}
function Invoke-LocalPreparation([string]$Mode,[string]$Relative){
 if($Mode -cnotin @('Inspect','Rehearse')){throw 'ACTION_REFUSED'}
 if($Mode -ceq 'Inspect'){
  $context=Get-VerifiedContext $Relative
  return (Get-SanitizedResult $context 'LOCAL_INPUTS_VERIFIED')
 }
 $lock=$null
 try{
  # One OS-held lock for this exact target, shared by every candidate.
  $lockPath=Get-SafePath ($script:ArtifactRelative+'/singapore-prelaunch.operation.lock') -AllowMissing
  try{$lock=[IO.File]::Open($lockPath,'OpenOrCreate','ReadWrite','None')}catch{throw 'TARGET_LOCK_UNAVAILABLE'}
  $before=Get-VerifiedContext $Relative
  $receiptRelative=$script:ArtifactRelative+'/'+$before.Packet.rehearsalId+'.receipt.json'
  $receiptFull=Get-SafePath $receiptRelative -AllowMissing
  if(Test-Path -LiteralPath $receiptFull){throw 'PRIOR_RECEIPT_PRESERVED'}
  $result=Get-SanitizedResult $before 'LOCAL_PREPARATION_REHEARSED'
  # No commands are dispatched. Rehearsal only verifies local metadata and bytes.
  $after=Get-VerifiedContext $Relative
  Assert-SameContext $before $after
  $result.executedAt=[DateTime]::UtcNow.ToString('o')
  $result.lockScope='checkout-organization-project';$result.receiptPath=$receiptRelative
  $bytes=[Text.UTF8Encoding]::new($false).GetBytes(($result|ConvertTo-Json -Depth 10))
  $stream=[IO.File]::Open($receiptFull,'CreateNew','Write','None')
  try{$stream.Write($bytes,0,$bytes.Length)}finally{$stream.Dispose()}
  return $result
 }finally{if($null -ne $lock){$lock.Dispose()}}
}

# Dot-sourcing exposes the same validation functions to isolated tests; it does not
# add a test flag, alternate target, executor or permission bypass to the CLI.
if($MyInvocation.InvocationName -eq '.'){return}
try{
 $result=Invoke-LocalPreparation $Action $PacketPath
 $result|ConvertTo-Json -Depth 10
 exit 0
}catch{
 $reason=$_.Exception.Message
 if($reason -cnotmatch '^[A-Z_]+$'){$reason='LOCAL_CONTROL_FAILED'}
 [ordered]@{schemaVersion=1;status='LOCAL_PREPARATION_REFUSED';reason=$reason;releaseAuthorized=$false;cloudMutation=$false;secretsLoaded=$false;operatorCredentialIsolation='UNVERIFIED'}|ConvertTo-Json -Compress
 exit 1
}

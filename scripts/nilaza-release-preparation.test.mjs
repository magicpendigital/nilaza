import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { spawn, spawnSync } from 'node:child_process';

const sourceScript = fileURLToPath(new URL('./nilaza-release-preparation.ps1', import.meta.url));
const powershell = process.platform === 'win32'
  ? path.join(process.env.SystemRoot || 'C:\\Windows', 'System32/WindowsPowerShell/v1.0/powershell.exe')
  : null;
const windows = { skip: !powershell };
const artifact = 'artifacts/release-preparation-2026-10-18';
const packetRelative = `${artifact}/operator.packet.json`;
const target = { id: 'nilaza-singapore-prelaunch-qa', kind: 'staging', organizationId: 'drxbmvimiekeoeesgssp', projectRef: 'etfajmrwyywokgafzxsb' };
const policyPaths = ['docs/release/release-profile.json', 'docs/release/RELEASE_RUNBOOK.md', 'supabase/migration-ledger.json'];
const toolPaths = ['scripts/nilaza-release-preparation.ps1', 'scripts/nilaza-release-candidate.mjs', 'scripts/release-evidence.mjs', 'scripts/database-target-gate.mjs'];
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const literal = value => `'${value.replaceAll("'", "''")}'`;

function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'nilaza-local-preparation-'));
  t.after(() => {
    assert.ok(path.resolve(root).startsWith(path.resolve(os.tmpdir()) + path.sep));
    assert.ok(path.basename(root).startsWith('nilaza-local-preparation-'));
    fs.rmSync(root, { recursive: true, force: true });
  });
  const write = (relative, bytes) => {
    const full = path.join(root, relative);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, bytes);
  };
  write('scripts/nilaza-release-preparation.ps1', fs.readFileSync(sourceScript));
  for (const relative of toolPaths.slice(1)) write(relative, '// Inert fixture; never executed.\n');
  write(policyPaths[0], JSON.stringify({ targets: [] }));
  write(policyPaths[1], 'Synthetic preparation fixture only.');
  write(policyPaths[2], JSON.stringify({ status: 'blocked_pending_reconciliation' }));
  write('src/input.txt', 'fictional input\n');
  const record = (relative, withBytes = false) => {
    const bytes = fs.readFileSync(path.join(root, relative));
    return { path: relative, sha256: sha(bytes), ...(withBytes ? { bytes: bytes.length } : {}) };
  };
  const files = [record('src/input.txt', true)];
  const inventory = {
    schemaVersion: 1, kind: 'nilaza-source-candidate-inventory', target,
    inputDigestSha256: sha(Buffer.from(JSON.stringify(files))), files,
    policy: policyPaths.map(relative => record(relative)),
    source: { commit: 'a'.repeat(40), branch: 'synthetic-fixture', trackedDirty: true },
    releaseAuthorized: false, cloudMutation: false, missingRoots: [],
    exclusions: ['Synthetic fixtures contain no secrets or historical objects.'],
    status: 'PREPARATION_ONLY', nativeSigning: 'BLOCKED_RELEASE_USES_DEBUG_SIGNING', remoteCI: 'NOT_RUN_FOR_THIS_CANDIDATE',
  };
  const candidateRelative = `${artifact}/candidate.inventory.json`;
  write(candidateRelative, JSON.stringify(inventory));
  const packet = {
    schemaVersion: 1, kind: 'nilaza-local-release-preparation', rehearsalId: 'synthetic-rehearsal', target,
    candidate: record(candidateRelative), candidateDigestSha256: inventory.inputDigestSha256,
    policy: policyPaths.map(relative => record(relative)), tools: toolPaths.map(relative => record(relative)),
    releaseAuthorized: false, cloudMutation: false,
  };
  const save = () => write(packetRelative, JSON.stringify(packet));
  save();
  return { root, write, record, inventory, candidateRelative, packet, save,
    script: path.join(root, 'scripts/nilaza-release-preparation.ps1'),
    receipt: path.join(root, artifact, 'synthetic-rehearsal.receipt.json'),
    lock: path.join(root, artifact, 'singapore-prelaunch.operation.lock') };
}

function run(f, action = 'Inspect', relative = packetRelative) {
  const result = spawnSync(powershell, ['-NoLogo', '-NoProfile', '-NonInteractive', '-File', f.script, '-Action', action, '-PacketPath', relative], { encoding: 'utf8', timeout: 30000, windowsHide: true });
  let output;
  try { output = JSON.parse(result.stdout); } catch {}
  return { ...result, output };
}

function code(f, body) {
  const script = `. ${literal(f.script)}\n${body}`;
  return spawnSync(powershell, ['-NoLogo', '-NoProfile', '-NonInteractive', '-EncodedCommand', Buffer.from(script, 'utf16le').toString('base64')], { encoding: 'utf8', timeout: 30000, windowsHide: true });
}

test('inspect verifies actual bytes and cannot grant release authority or create a lock', windows, t => {
  const f = fixture(t), result = run(f);
  assert.equal(result.status, 0, result.stderr + result.stdout);
  assert.equal(result.output.status, 'LOCAL_INPUTS_VERIFIED');
  for (const key of ['releaseAuthorized', 'cloudMutation', 'secretsLoaded', 'ownerApprovalRecorded', 'releaseGateExecuted', 'sourceEnumerationVerified']) assert.equal(result.output[key], false);
  assert.equal(result.output.releaseReadiness, 'BLOCKED');
  assert.equal(result.output.operatorCredentialIsolation, 'UNVERIFIED');
  assert.equal(result.output.profileTargetAllowlisted, false);
  assert.equal(result.output.migrationLedgerStatus, 'blocked_pending_reconciliation');
  assert.match(result.output.limits.join(' '), /this checkout only/);
  assert.match(result.output.limits.join(' '), /Same-user credential isolation is unverified/);
  assert.equal(fs.existsSync(f.receipt), false);
  assert.equal(fs.existsSync(f.lock), false);
});

test('rehearse writes one sanitized receipt and preserves it on a second attempt', windows, t => {
  const f = fixture(t), first = run(f, 'Rehearse');
  assert.equal(first.status, 0, first.stderr + first.stdout);
  assert.equal(first.output.status, 'LOCAL_PREPARATION_REHEARSED');
  assert.equal(first.output.releaseReadiness, 'BLOCKED');
  assert.equal(first.output.lockScope, 'checkout-organization-project');
  assert.equal(first.output.sourceEnumerationVerified, false);
  const receipt = fs.readFileSync(f.receipt);
  assert.equal(JSON.parse(receipt).cloudMutation, false);
  const second = run(f, 'Rehearse');
  assert.equal(second.status, 1);
  assert.equal(second.output.reason, 'PRIOR_RECEIPT_PRESERVED');
  assert.deepEqual(fs.readFileSync(f.receipt), receipt);
});

test('all target identity fields are exact and production is refused', windows, t => {
  const f = fixture(t);
  for (const [key, wrong] of Object.entries({ id: 'another', kind: 'production', organizationId: 'x'.repeat(20), projectRef: 'y'.repeat(20) })) {
    f.packet.target = { ...target, [key]: wrong }; f.save();
    const result = run(f, 'Rehearse');
    assert.equal(result.status, 1, key);
    assert.equal(result.output.reason, 'TARGET_MISMATCH', key);
  }
  assert.equal(fs.existsSync(f.receipt), false);
});

test('packets cannot supply commands, environment, approval or executor instructions', windows, t => {
  const f = fixture(t), marker = path.join(f.root, 'attacker-marker');
  for (const key of ['command', 'args', 'env', 'sql', 'script', 'url', 'approval']) {
    f.packet[key] = `Write-Output forbidden; New-Item ${marker}`; f.save();
    const result = run(f, 'Rehearse');
    assert.equal(result.status, 1, key);
    assert.equal(result.output.reason, 'UNEXPECTED_PACKET_FIELDS', key);
    assert.equal(fs.existsSync(marker), false);
    delete f.packet[key];
  }
  assert.equal(fs.existsSync(f.receipt), false);
});

test('APPROVE, execute and deploy are not CLI actions', windows, t => {
  const f = fixture(t);
  for (const action of ['APPROVE', 'Execute', 'Deploy']) assert.notEqual(run(f, action).status, 0);
  assert.equal(fs.existsSync(f.receipt), false);
});

test('boolean authority fields cannot be enabled or expressed as strings', windows, t => {
  const f = fixture(t);
  for (const value of [true, 'false']) {
    f.packet.releaseAuthorized = value; f.save();
    const result = run(f);
    assert.equal(result.status, 1);
    assert.equal(result.output.reason, 'EXECUTION_AUTHORITY_REFUSED');
  }
});

test('candidate, policy and tool byte tampering is rejected', windows, t => {
  for (const relative of ['src/input.txt', policyPaths[1], toolPaths[2]]) {
    const f = fixture(t);
    const original = fs.readFileSync(path.join(f.root, relative));
    const changed = Buffer.from(original); changed[0] ^= 1;
    f.write(relative, changed);
    const result = run(f, 'Rehearse');
    assert.equal(result.status, 1, relative);
    assert.equal(result.output.reason, 'INPUT_HASH_MISMATCH', relative);
    assert.equal(fs.existsSync(f.receipt), false);
  }
});

test('missing mandatory pins and candidate length mismatches fail closed', windows, t => {
  const f = fixture(t);
  f.packet.tools = f.packet.tools.slice(1); f.save();
  assert.equal(run(f).output.reason, 'MANDATORY_PIN_MISSING');
  f.packet.tools = toolPaths.map(relative => f.record(relative));
  f.inventory.files[0].bytes += 1;
  f.write(f.candidateRelative, JSON.stringify(f.inventory));
  f.packet.candidate = f.record(f.candidateRelative); f.save();
  assert.equal(run(f).output.reason, 'FILE_LENGTH_MISMATCH');
});

test('packet traversal and sensitive source references are refused', windows, t => {
  const f = fixture(t);
  assert.equal(run(f, 'Inspect', `${artifact}/../operator.packet.json`).status, 1);
  assert.equal(run(f, 'Inspect', 'docs/operator.packet.json').output.reason, 'PACKET_DIRECTORY_REFUSED');
  f.inventory.files[0].path = '.env.local';
  f.write(f.candidateRelative, JSON.stringify(f.inventory));
  f.packet.candidate = f.record(f.candidateRelative); f.save();
  assert.equal(run(f).output.reason, 'SENSITIVE_PATH_REFUSED');
});

test('OS target lock excludes a second candidate and releases when holder exits', windows, async t => {
  const f = fixture(t);
  const hold = `$lock=[IO.File]::Open(${literal(f.lock)},'OpenOrCreate','ReadWrite','None');try{[Console]::Out.WriteLine('READY');$null=[Console]::ReadLine()}finally{$lock.Dispose()}`;
  const holder = spawn(powershell, ['-NoLogo', '-NoProfile', '-NonInteractive', '-EncodedCommand', Buffer.from(hold, 'utf16le').toString('base64')], { windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] });
  t.after(() => { if (holder.exitCode === null) holder.kill(); });
  await new Promise((resolve, reject) => {
    let stdout = '';
    const timer = setTimeout(() => reject(new Error('fixture lock holder timeout')), 15000);
    holder.stdout.on('data', bytes => { stdout += bytes; if (stdout.includes('READY')) { clearTimeout(timer); resolve(); } });
    holder.once('error', error => { clearTimeout(timer); reject(error); });
    holder.once('exit', exit => { if (!stdout.includes('READY')) { clearTimeout(timer); reject(new Error(`holder exit ${exit}`)); } });
  });
  const blocked = run(f, 'Rehearse');
  assert.equal(blocked.status, 1);
  assert.equal(blocked.output.reason, 'TARGET_LOCK_UNAVAILABLE');
  assert.equal(fs.existsSync(f.receipt), false);
  const exited = new Promise(resolve => holder.once('exit', resolve));
  holder.stdin.end('\n');
  await exited;
  assert.equal(run(f, 'Rehearse').status, 0);
});

test('input mutation between the two real validation passes prevents a receipt', windows, t => {
  const f = fixture(t);
  const body = `
$script:Original=(Get-Item Function:\\Get-VerifiedContext).ScriptBlock
$script:Mutated=$false
function Get-VerifiedContext([string]$Relative){
 $context=& $script:Original $Relative
 if(-not $script:Mutated){[IO.File]::WriteAllText(${literal(path.join(f.root, 'src/input.txt'))},'changed input!!');$script:Mutated=$true}
 return $context
}
try{$null=Invoke-LocalPreparation 'Rehearse' ${literal(packetRelative)};exit 3}catch{[Console]::Out.WriteLine($_.Exception.Message);exit 0}
`;
  const result = code(f, body);
  assert.equal(result.status, 0, result.stderr + result.stdout);
  assert.match(result.stdout, /FILE_LENGTH_MISMATCH|INPUT_HASH_MISMATCH/);
  assert.equal(fs.existsSync(f.receipt), false);
  // The failure must release the OS handle so the next valid attempt can run.
  f.write('src/input.txt', 'fictional input\n');
  assert.equal(run(f, 'Rehearse').status, 0);
});

test('valid packet replacement after the first pass is still detected', windows, t => {
  const f = fixture(t);
  const alternate = JSON.stringify({ ...f.packet, rehearsalId: 'changed-rehearsal' });
  f.write(`${artifact}/alternate.json`, alternate);
  const body = `
$script:Original=(Get-Item Function:\\Get-VerifiedContext).ScriptBlock
$script:Mutated=$false
function Get-VerifiedContext([string]$Relative){
 $context=& $script:Original $Relative
 if(-not $script:Mutated){[IO.File]::Copy(${literal(path.join(f.root, artifact, 'alternate.json'))},${literal(path.join(f.root, packetRelative))},$true);$script:Mutated=$true}
 return $context
}
try{$null=Invoke-LocalPreparation 'Rehearse' ${literal(packetRelative)};exit 3}catch{[Console]::Out.WriteLine($_.Exception.Message);exit 0}
`;
  const result = code(f, body);
  assert.equal(result.status, 0, result.stderr + result.stdout);
  assert.match(result.stdout, /INPUT_DRIFT_AFTER_LOCK/);
  assert.equal(fs.existsSync(f.receipt), false);
  assert.equal(fs.existsSync(path.join(f.root, artifact, 'changed-rehearsal.receipt.json')), false);
});

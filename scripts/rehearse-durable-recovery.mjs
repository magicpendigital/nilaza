// Local synthetic custody trial; never use for live/project backups.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { NativePostgres, nativeImage } from './native-postgres-rehearsal.mjs';
import { evidenceSha256 } from './database-target-gate.mjs';

process.chdir(fileURLToPath(new URL('..', import.meta.url)));
assert.equal(process.platform, 'win32', 'Windows DPAPI fixture only');
const worker = process.argv[2];
assert.ok(!worker || ['backup', 'restore'].includes(worker));
assert.equal(process.argv.length, worker ? 4 : 2, 'Only internal synthetic worker mode/run ID accepted');
const runId = worker ? process.argv[3] : new Date().toISOString().replace(/[:.]/g, '-') + '-' + crypto.randomBytes(3).toString('hex');
assert.match(runId, /^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z-[a-f0-9]{6}$/);
const output = 'artifacts/recovery-custody-2026-10-11/' + runId;
const vaultRoot = 'C:/Users/Admin/AppData/Local/NilazaQARecovery';
const archivePath = path.join(vaultRoot, 'Backups', runId + '.aesgcm');
const keyPath = path.join(vaultRoot, 'Keys', runId + '.dpapi');
const historical = 'artifacts/singapore-migration-rehearsal-2026-10-05';
const sourcePath = historical + '/native-synthetic.dump';
const read = p => JSON.parse(fs.readFileSync(p, 'utf8'));
const sha = b => crypto.createHash('sha256').update(b).digest('hex');
const source = read(historical + '/native-rehearsal.json');
const original = fs.readFileSync(sourcePath);
assert.equal(source.syntheticOnly, true);
assert.equal(source.remoteSqlWrites, false);
assert.equal(source.status, 'PASS');
assert.equal(sha(original), 'ba4b6344020709e267fca591d89fbf9dd8d4ff5de71c072118fbd16b6bdb6918');
assert.equal(source.restore.sha256, sha(original));
assert.equal(source.migrations.length, 28);
for (const item of source.migrations) assert.equal(evidenceSha256(fs.readFileSync(item.path)), item.sha256);
const expected = read(historical + '/native-restore-invariants.json');
assert.equal(sha(Buffer.from(JSON.stringify(expected))), source.restore.invariantsSha256);
const write = (name, value) => fs.writeFileSync(output + '/' + name, JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
const scope = Buffer.from(JSON.stringify({ kind: 'durable-local-synthetic-only', runId, archiveSha256: sha(original), migrationSetSha256: source.migrationSetSha256 }));
const magic = Buffer.from('NILAZA_SYNTHETIC_GCM_V2\0');
const vault = (action, id = runId, input) => {
  const r = spawnSync('C:/Windows/System32/WindowsPowerShell/v1.0/powershell.exe', ['-NoProfile', '-NonInteractive', '-File', path.resolve('scripts/local-qa-key-vault.ps1'), '-Action', action, '-RunId', id], { input, windowsHide: true, maxBuffer: 128 * 1024, timeout: 30000 });
  r.stderr?.fill(0);
  if (r.error || r.status !== 0) { r.stdout?.fill(0); throw new Error('Local QA key vault refused ' + action); }
  return r.stdout;
};
const decrypt = (bytes, key, aad = scope) => {
  assert.ok(bytes.length > magic.length + 28, 'Truncated archive');
  assert.ok(bytes.subarray(0, magic.length).equals(magic), 'Unknown fixture format');
  const cipher = crypto.createDecipheriv('aes-256-gcm', key, bytes.subarray(magic.length, magic.length + 12));
  cipher.setAAD(aad);
  cipher.setAuthTag(bytes.subarray(magic.length + 12, magic.length + 28));
  let staged;
  try {
    staged = cipher.update(bytes.subarray(magic.length + 28));
    const authenticated = Buffer.concat([staged, cipher.final()]);
    return authenticated;
  } finally { staged?.fill(0); }
};
const roleQuery = (db, id, sql, args = [], role = 'authenticated') => db.transaction(async tx => {
  assert.ok(['authenticated', 'anon'].includes(role));
  await tx.exec(`set local role ${role}`);
  await tx.query("select set_config('request.jwt.claims',$1,true)", [JSON.stringify({ sub: id, role })]);
  return tx.query(sql, args);
});
const invariants = async db => {
  const tables = (await db.query("select table_schema,table_name from information_schema.tables where table_schema in ('public','nilaza_private') and table_type='BASE TABLE' order by table_schema,table_name")).rows;
  const counts = [];
  for (const { table_schema: schema, table_name: table } of tables) {
    assert.match(schema, /^[a-z_]+$/); assert.match(table, /^[a-z_]+$/);
    const row = (await db.query(`select count(*)::int as n,md5(coalesce(string_agg(row_to_json(t)::text,'|' order by row_to_json(t)::text),'')) as rows_digest from "${schema}"."${table}" t`)).rows[0];
    counts.push({ schema, table, ...row });
  }
  const queries = {
    policies: "select schemaname,tablename,policyname,roles,cmd,qual,with_check from pg_policies where schemaname in ('public','nilaza_private') order by schemaname,tablename,policyname",
    schema: "select table_schema,table_name,column_name,data_type,is_nullable,column_default from information_schema.columns where table_schema in ('public','nilaza_private') order by table_schema,table_name,ordinal_position",
    indexes: "select schemaname,tablename,indexname,indexdef from pg_indexes where schemaname in ('public','nilaza_private') order by schemaname,tablename,indexname",
    tableGrants: "select n.nspname,c.relname,c.relrowsecurity,pg_get_userbyid(c.relowner) as owner,c.relacl::text as acl from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname in ('public','nilaza_private') and c.relkind in ('r','v','S','p') order by n.nspname,c.relname",
    functions: "select n.nspname,p.proname,pg_get_function_identity_arguments(p.oid) as args,p.prosecdef,p.proconfig,p.proacl::text as acl,pg_get_userbyid(p.proowner) as owner,md5(pg_get_functiondef(p.oid)) as definition_digest from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in ('public','nilaza_private','auth') and p.prokind in ('f','p') order by n.nspname,p.proname,args",
    defaultGrants: "select pg_get_userbyid(d.defaclrole) as owner,coalesce(n.nspname,'*') as schema,d.defaclobjtype,d.defaclacl::text as acl from pg_default_acl d left join pg_namespace n on n.oid=d.defaclnamespace order by owner,schema,d.defaclobjtype",
  };
  const result = { counts };
  for (const [name, sql] of Object.entries(queries)) result[name] = (await db.query(sql)).rows;
  return result;
};

if (!worker) {
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.mkdirSync(output, { recursive: false });
  const startedAt = new Date().toISOString();
  const result = {
    schemaVersion: 1, kind: 'DurableSyntheticLocalRecovery', runId, startedAt,
    status: 'RUNNING', syntheticOnly: true, cloudMutation: false, releaseAuthorized: false,
    ownerDecision: 'Private repository for scripts/checksums; encrypted backup outside repository',
    custody: null, managedRecovery: 'BLOCKED', offsiteRecovery: 'BLOCKED',
    runtime: { node: process.version, image: nativeImage, managedPostgresParity: 'BLOCKED: local PG17.6, candidate previously PG17.11' },
    source: { archivePath: sourcePath, archiveSha256: sha(original), migrationSetSha256: source.migrationSetSha256, syntheticOnly: true },
    code: Object.fromEntries(['scripts/rehearse-durable-recovery.mjs', 'scripts/local-qa-key-vault.ps1', 'scripts/native-postgres-rehearsal.mjs'].map(p => [p, evidenceSha256(fs.readFileSync(p))])),
    limitations: ['Two separate Node processes, not a full Windows reboot or new-machine recovery.', 'No live cloud backup, managed Auth/Storage/API/client acceptance, offsite copy or portable key escrow.', 'Existing archive encrypted directly; not a fresh SQL replay or cloud pg_dump.', 'No cadence/retention automation; no GitHub creation/upload.'],
  };
  try {
    result.custody = JSON.parse(vault('init').toString('utf8'));
    assert.equal(path.resolve(result.custody.root), path.resolve(vaultRoot));
    assert.equal(result.custody.status, 'PASS');
    for (const mode of ['backup', 'restore']) {
      const child = spawnSync(process.execPath, [fileURLToPath(import.meta.url), mode, runId], { windowsHide: true, timeout: 120000, maxBuffer: 1024 * 1024 });
      assert.equal(child.status, 0, `Synthetic ${mode} worker failed; inspect sanitized worker receipt`);
      result[mode] = read(`${output}/${mode}.json`);
      assert.equal(result[mode].status, 'PASS');
    }
    assert.notEqual(result.backup.pid, result.restore.pid);
    assert.ok(Date.parse(result.restore.startedAt) >= Date.parse(result.backup.finishedAt));
    result.separateProcesses = true;
    result.checks = [...result.backup.checks, ...result.restore.checks, { name: 'restore started after backup process exit with a different PID', status: 'PASS' }];
    result.status = 'PASS_LOCAL_ONLY';
  } catch {
    result.status = 'FAIL'; result.failure = 'Local synthetic custody trial failed; no secrets output'; process.exitCode = 1;
  } finally {
    original.fill(0);
    result.finishedAt = new Date().toISOString();
    write('recovery.json', result);
    console.log(JSON.stringify({ status: result.status, output: path.resolve(output), checks: result.checks?.length, separateProcesses: result.separateProcesses, managedRecovery: 'BLOCKED', offsiteRecovery: 'BLOCKED' }));
  }
} else {
  assert.ok(fs.existsSync(output), 'Parent-created receipt directory required');
  assert.ok(!fs.existsSync(`${output}/${worker}.json`), 'Never overwrite an earlier worker receipt');
  const receipt = { mode: worker, pid: process.pid, runId, startedAt: new Date().toISOString(), status: 'RUNNING', syntheticOnly: true, checks: [], containers: [] };
  const check = async (name, fn) => {
    const start = performance.now();
    try { await fn(); receipt.checks.push({ name, status: 'PASS', elapsedMs: Math.round(performance.now() - start) }); }
    catch (error) { receipt.checks.push({ name, status: 'FAIL' }); throw error; }
  };
  let key, plaintext;
  try {
    const acl = JSON.parse(vault('inspect').toString('utf8'));
    await check('fixed external directories restricted to Windows owner and SYSTEM', async () => {
      assert.equal(acl.status, 'PASS'); assert.equal(acl.allowedSids.length, 2);
      assert.equal(acl.directoriesAclProtected, true); assert.equal(acl.protection, 'DPAPI CurrentUser');
      assert.ok(!path.resolve(archivePath).startsWith(process.cwd() + path.sep));
      assert.ok(!path.resolve(keyPath).startsWith(process.cwd() + path.sep));
    });
    await check('source archive and all 28 SQL hashes pinned and synthetic only', async () => assert.equal(source.migrations.length, 28));
    if (worker === 'backup') {
      const backupStart = performance.now();
      key = crypto.randomBytes(32);
      const iv = crypto.randomBytes(12);
      const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
      cipher.setAAD(scope);
      const encrypted = Buffer.concat([cipher.update(original), cipher.final()]);
      const archive = Buffer.concat([magic, iv, cipher.getAuthTag(), encrypted]);
      await check('key persisted as DPAPI blob without raw key file', async () => {
        const wrappedStatus = vault('protect', runId, key);
        assert.equal(JSON.parse(wrappedStatus.toString('utf8')).status, 'PASS');
        assert.ok(fs.statSync(keyPath).size > 32);
      });
      fs.writeFileSync(archivePath, archive, { flag: 'wx' });
      await check('ciphertext retained outside repo and differs from pinned plaintext', async () => {
        assert.equal(sha(fs.readFileSync(archivePath)), sha(archive)); assert.notEqual(sha(archive), sha(original));
      });
      receipt.backup = { archivePath, archiveSha256: sha(archive), keyPath, wrappedKeySha256: sha(fs.readFileSync(keyPath)), plaintextSha256: sha(original), encryptedBytes: archive.length, plaintextBytes: original.length, elapsedMs: Math.round(performance.now() - backupStart), format: 'AES-256-GCM V2, 12-byte IV, 16-byte tag, AAD binds run/source/migration set' };
    } else {
      const recoveryStart = performance.now();
      const saved = read(`${output}/backup.json`);
      assert.equal(saved.status, 'PASS'); assert.equal(saved.syntheticOnly, true); assert.equal(saved.runId, runId);
      assert.equal(saved.backup.archivePath, archivePath); assert.equal(saved.backup.keyPath, keyPath);
      assert.equal(saved.backup.plaintextSha256, sha(original));
      const archive = fs.readFileSync(archivePath);
      await check('persisted archive/wrapped-key checksums match completed backup receipt', async () => {
        assert.equal(sha(archive), saved.backup.archiveSha256); assert.equal(sha(fs.readFileSync(keyPath)), saved.backup.wrappedKeySha256);
      });
      await check('missing key fails closed before database creation', async () => {
        const missingId = runId.slice(0, -6) + crypto.randomBytes(3).toString('hex');
        assert.ok(!fs.existsSync(path.join(vaultRoot, 'Keys', missingId + '.dpapi')));
        assert.throws(() => vault('unprotect', missingId)); assert.equal(NativePostgres.created.length, 0);
      });
      await check('new process retrieves DPAPI key into private pipe only', async () => { key = vault('unprotect'); assert.equal(key.length, 32); });
      for (const name of ['wrong key', 'changed ciphertext', 'changed tag', 'truncated file', 'wrong scope']) {
        await check(`reject ${name} before database creation`, async () => {
          const corrupt = Buffer.from(archive);
          if (name === 'changed ciphertext') corrupt[corrupt.length - 1] ^= 1;
          if (name === 'changed tag') corrupt[magic.length + 12] ^= 1;
          const badKey = crypto.randomBytes(32);
          try { assert.throws(() => decrypt(name === 'truncated file' ? corrupt.subarray(0, 20) : corrupt, name === 'wrong key' ? badKey : key, name === 'wrong scope' ? Buffer.from('wrong-fixture-scope') : scope)); }
          finally { badKey.fill(0); }
          assert.equal(NativePostgres.created.length, 0);
        });
      }
      plaintext = decrypt(archive, key);
      await check('authenticated plaintext exactly matches original pg_dump checksum', async () => assert.equal(sha(plaintext), sha(original)));
      const db = await NativePostgres.create({ loadDataDir: new Blob([plaintext]), artifactDirectory: output });
      receipt.postgres = (await db.query('select version() as version')).rows[0].version;
      await check('restore preserves all 51 tables/85 RLS policies/194 functions and ACLs', async () => assert.deepEqual(await invariants(db), expected));
      await check('78 Tarot cards and journal/chat fixtures preserved', async () => {
        const counts = (await db.query('select (select count(*) from tarot_cards)::int as cards,(select count(*) from journal_entries)::int as journals,(select count(*) from chat_messages)::int as messages')).rows[0];
        assert.deepEqual(counts, { cards: 78, journals: 2, messages: 2 }); receipt.fixtureCounts = counts;
      });
      await check('ordinary A/B read own data only and cannot TRUNCATE', async () => {
        const users = (await db.query('select user_id from journal_entries order by user_id')).rows;
        assert.equal(users.length, 2);
        for (const { user_id: id } of users) {
          assert.deepEqual((await roleQuery(db, id, 'select rolsuper,rolbypassrls from pg_roles where rolname=current_user')).rows[0], { rolsuper: false, rolbypassrls: false });
          for (const table of ['journal_entries', 'chat_messages']) {
            const rows = (await roleQuery(db, id, `select user_id from ${table}`)).rows;
            assert.equal(rows.length, 1); assert.equal(rows[0].user_id, id);
          }
          await assert.rejects(roleQuery(db, id, 'truncate public.journal_entries'), e => e.code === '42501');
        }
      });
      await check('revoked staff and anon remain denied raw source access', async () => {
        const revoked = (await db.query("select user_id from admin_role_assignments where status='revoked'")).rows;
        assert.equal(revoked.length, 1);
        assert.equal((await roleQuery(db, revoked[0].user_id, "select has_admin_capability('content.read') as allowed")).rows[0].allowed, false);
        assert.equal((await roleQuery(db, revoked[0].user_id, 'select id from source_chunks')).rows.length, 0);
        await assert.rejects(roleQuery(db, null, 'select id from source_chunks', [], 'anon'), e => e.code === '42501');
      });
      await check('outbound job extensions absent and campaign disabled', async () => {
        assert.ok(!(await db.query('select extname from pg_extension')).rows.some(x => ['pg_cron', 'pg_net'].includes(x.extname)));
        assert.ok((await db.query('select status from nilaza_private.ai_budget_campaigns')).rows.every(x => x.status === 'disabled'));
      });
      receipt.restore = { elapsedMsIncludingChecks: Math.round(performance.now() - recoveryStart), matchedTables: expected.counts.length, matchedPolicies: expected.policies.length, matchedFunctions: expected.functions.length, managedRpoRto: 'BLOCKED: synthetic local measurement only' };
    }
    receipt.status = 'PASS';
  } catch {
    receipt.status = 'FAIL'; receipt.failure = 'Synthetic worker failed; no secret output'; process.exitCode = 1;
  } finally {
    key?.fill(0); plaintext?.fill(0); original.fill(0);
    for (const db of NativePostgres.created) {
      try { await db.close(); } catch { receipt.cleanupFailed = true; receipt.status = 'FAIL'; process.exitCode = 1; }
      receipt.containers.push({ ...db.isolation, stopped: db.stopped });
    }
    receipt.finishedAt = new Date().toISOString();
    write(`${worker}.json`, receipt);
    console.log(JSON.stringify({ status: receipt.status, mode: worker, checks: receipt.checks.length }));
  }
}


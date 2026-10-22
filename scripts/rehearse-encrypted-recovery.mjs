// Synthetic-only local recovery experiment. No cloud connection or retained key.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { NativePostgres, nativeImage } from './native-postgres-rehearsal.mjs';
import { evidenceSha256 } from './database-target-gate.mjs';

process.chdir(fileURLToPath(new URL('..', import.meta.url)));
assert.equal(process.argv.length, 2, 'No remote target, input URL or arguments accepted');
const historical = 'artifacts/singapore-migration-rehearsal-2026-10-05';
const sourceReceiptPath = `${historical}/native-rehearsal.json`;
const sourcePath = `${historical}/native-synthetic.dump`;
const expectedPath = `${historical}/native-restore-invariants.json`;
const read = p => JSON.parse(fs.readFileSync(p, 'utf8'));
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const source = read(sourceReceiptPath);
const original = fs.readFileSync(sourcePath);
assert.equal(source.syntheticOnly, true);
assert.equal(source.remoteSqlWrites, false);
assert.equal(source.status, 'PASS');
assert.equal(sha(original), 'ba4b6344020709e267fca591d89fbf9dd8d4ff5de71c072118fbd16b6bdb6918');
assert.equal(source.restore.sha256, sha(original));
assert.equal(source.migrations.length, 28);
for (const item of source.migrations) assert.equal(evidenceSha256(fs.readFileSync(item.path)), item.sha256);
const expected = read(expectedPath);
assert.equal(sha(Buffer.from(JSON.stringify(expected))), source.restore.invariantsSha256);
const runId = `${new Date().toISOString().replace(/[:.]/g, '-')}-${crypto.randomBytes(3).toString('hex')}`;
const output = `artifacts/recovery-rehearsal-2026-10-11/${runId}`;
fs.mkdirSync(output, { recursive: true });
const write = (name, value) => fs.writeFileSync(`${output}/${name}`, JSON.stringify(value, null, 2) + '\n');
const receipt = {
  schemaVersion: 1, kind: 'SyntheticEncryptedRecovery', runId, startedAt: new Date().toISOString(),
  status: 'RUNNING', syntheticOnly: true, cloudMutation: false, managedRecovery: 'BLOCKED', releaseAuthorized: false,
  runtime: { node: process.version, image: nativeImage, managedPostgresParity: 'BLOCKED: local PG17.6, candidate last observed PG17.11' },
  source: { archivePath: sourcePath, archiveSha256: sha(original), receiptPath: sourceReceiptPath, receiptSha256: sha(fs.readFileSync(sourceReceiptPath)), originalCreatedAt: source.finishedAt, migrationSetSha256: source.migrationSetSha256 },
  harnessSha256: evidenceSha256(fs.readFileSync(fileURLToPath(import.meta.url))),
  adapterSha256: evidenceSha256(fs.readFileSync('scripts/native-postgres-rehearsal.mjs')),
  checks: [], containers: [], keyCustody: 'EPHEMERAL_TEST_ONLY: no persisted key; retained trial ciphertext cannot be recovered after this run',
  limitations: ['No live project backup, Auth server, Storage bytes, API, mobile client, offsite custody, retention schedule or managed RPO/RTO acceptance.', 'Not a fresh migration replay. Original synthetic archive is restored and exported again; prior receipt times stay unchanged.'],
};
const check = async (name, fn) => {
  const start = performance.now();
  try { await fn(); receipt.checks.push({ name, status: 'PASS', elapsedMs: Math.round(performance.now() - start) }); }
  catch (error) { receipt.checks.push({ name, status: 'FAIL' }); throw error; }
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
const magic = Buffer.from('NILAZA_SYNTHETIC_GCM_V1\0');
const scope = Buffer.from(JSON.stringify({ kind: 'local-synthetic-only', runId, migrationSetSha256: source.migrationSetSha256 }));
const key = crypto.randomBytes(32);
let first, restored, freshDump, plaintext;
try {
  first = await NativePostgres.create({ loadDataDir: new Blob([original]), artifactDirectory: output });
  receipt.runtime.postgres = (await first.query('select version() as version')).rows[0].version;
  await check('original archive restores exact historical fixture invariants', async () => assert.deepEqual(await invariants(first), expected));
  await check('outbound extensions absent and AI campaign disabled', async () => {
    const extensions = (await first.query('select extname from pg_extension')).rows;
    assert.ok(!extensions.some(x => ['pg_cron', 'pg_net'].includes(x.extname)));
    assert.ok((await first.query('select status from nilaza_private.ai_budget_campaigns')).rows.every(x => x.status === 'disabled'));
  });
  const backupStart = performance.now();
  freshDump = Buffer.from(await (await first.dumpDataDir()).arrayBuffer());
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  cipher.setAAD(scope);
  const encrypted = Buffer.concat([cipher.update(freshDump), cipher.final()]);
  const archive = Buffer.concat([magic, iv, cipher.getAuthTag(), encrypted]);
  const archivePath = `${output}/synthetic-only.aesgcm`;
  fs.writeFileSync(archivePath, archive, { flag: 'wx' });
  receipt.backup = { format: 'AES-256-GCM, 12-byte IV, 16-byte tag, scope authenticated as AAD', archivePath, archiveSha256: sha(archive), plaintextSha256: sha(freshDump), plaintextBytes: freshDump.length, encryptedBytes: archive.length, elapsedMs: Math.round(performance.now() - backupStart) };
  const decrypt = (bytes, candidateKey = key, aad = scope) => {
    assert.ok(bytes.length > magic.length + 28, 'Truncated archive');
    assert.ok(bytes.subarray(0, magic.length).equals(magic), 'Unknown archive format');
    const decipher = crypto.createDecipheriv('aes-256-gcm', candidateKey, bytes.subarray(magic.length, magic.length + 12));
    decipher.setAAD(aad); decipher.setAuthTag(bytes.subarray(magic.length + 12, magic.length + 28));
    // No decoded bytes leave this function until final() authenticates the archive.
    return Buffer.concat([decipher.update(bytes.subarray(magic.length + 28)), decipher.final()]);
  };
  for (const name of ['wrong key', 'changed ciphertext', 'changed authentication tag', 'truncated file', 'wrong scope']) {
    await check(`reject ${name} before target restore`, async () => {
      const corrupt = Buffer.from(archive);
      if (name === 'changed ciphertext') corrupt[corrupt.length - 1] ^= 1;
      if (name === 'changed authentication tag') corrupt[magic.length + 12] ^= 1;
      const badKey = crypto.randomBytes(32);
      try { assert.throws(() => decrypt(name === 'truncated file' ? corrupt.subarray(0, 20) : corrupt, name === 'wrong key' ? badKey : key, name === 'wrong scope' ? Buffer.from('different-synthetic-run') : scope)); }
      finally { badKey.fill(0); }
    });
  }
  const recoveryStart = performance.now();
  plaintext = decrypt(fs.readFileSync(archivePath));
  await check('authenticated archive reproduces fresh pg_dump bytes', async () => assert.equal(sha(plaintext), sha(freshDump)));
  restored = await NativePostgres.create({ loadDataDir: new Blob([plaintext]), artifactDirectory: output });
  await check('second independent restore preserves rows/schema/indexes/RLS/grants/RPCs', async () => assert.deepEqual(await invariants(restored), expected));
  await check('78 Tarot cards and two journal/chat fixtures survive', async () => {
    const counts = (await restored.query('select (select count(*) from tarot_cards)::int as cards,(select count(*) from journal_entries)::int as journals,(select count(*) from chat_messages)::int as messages')).rows[0];
    assert.deepEqual(counts, { cards: 78, journals: 2, messages: 2 }); receipt.fixtureCounts = counts;
  });
  await check('ordinary A/B ownership survives restore', async () => {
    const users = (await restored.query('select user_id from journal_entries order by user_id')).rows;
    assert.equal(users.length, 2);
    for (const user of users) {
      const actor = (await roleQuery(restored, user.user_id, 'select rolsuper,rolbypassrls from pg_roles where rolname=current_user')).rows[0];
      assert.deepEqual(actor, { rolsuper: false, rolbypassrls: false });
      for (const table of ['journal_entries', 'chat_messages']) {
        const rows = (await roleQuery(restored, user.user_id, `select user_id from ${table}`)).rows;
        assert.equal(rows.length, 1); assert.equal(rows[0].user_id, user.user_id);
      }
      await assert.rejects(roleQuery(restored, user.user_id, 'truncate public.journal_entries'), e => e.code === '42501');
    }
  });
  await check('revoked staff and anon cannot regain source access', async () => {
    const revoked = (await restored.query("select user_id from admin_role_assignments where status='revoked'")).rows;
    assert.equal(revoked.length, 1);
    assert.equal((await roleQuery(restored, revoked[0].user_id, "select has_admin_capability('content.read') as allowed")).rows[0].allowed, false);
    assert.equal((await roleQuery(restored, revoked[0].user_id, 'select id from source_chunks')).rows.length, 0);
    await assert.rejects(roleQuery(restored, null, 'select id from source_chunks', [], 'anon'), e => e.code === '42501');
  });
  receipt.restore = { elapsedMsIncludingChecks: Math.round(performance.now() - recoveryStart), plaintextLossBytes: 0, matchedTables: expected.counts.length, matchedPolicies: expected.policies.length, matchedFunctions: expected.functions.length, managedRpoRto: 'BLOCKED: fixture duration only' };
  receipt.status = 'PASS';
} catch (error) {
  receipt.status = 'FAIL'; receipt.failure = { name: error.name, message: String(error.message).slice(0, 500) };
  process.exitCode = 1;
} finally {
  key.fill(0); freshDump?.fill(0); plaintext?.fill(0);
  const cleanupErrors = [];
  for (const db of NativePostgres.created) {
    try { await db.close(); } catch { cleanupErrors.push(db.name); }
    receipt.containers.push({ ...db.isolation, stopped: db.stopped });
  }
  if (cleanupErrors.length) { receipt.cleanupErrors = cleanupErrors; receipt.status = 'FAIL'; process.exitCode = 1; }
  receipt.finishedAt = new Date().toISOString();
  write('recovery.json', receipt);
  console.log(JSON.stringify({ status: receipt.status, checks: receipt.checks.length, output: path.resolve(output), backup: receipt.backup?.elapsedMs, restore: receipt.restore?.elapsedMsIncludingChecks, managedRecovery: receipt.managedRecovery }));
}

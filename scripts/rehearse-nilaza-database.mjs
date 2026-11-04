// Local embedded or native Docker rehearsal. Never connects to a cloud database.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { evidenceSha256, migrationSetSha256 } from './database-target-gate.mjs';
import { NativePostgres, nativeImage } from './native-postgres-rehearsal.mjs';

const root = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
process.chdir(root);
const args = process.argv.slice(2);
const pgliteIndex = args.indexOf('--pglite');
const pgliteRoot = pgliteIndex >= 0 ? args.splice(pgliteIndex, 2)[1] : '.brand-work/singapore-migration-rehearsal-2026-10-05';
assert.ok(pgliteRoot && !pgliteRoot.startsWith('--'), '--pglite needs a directory');
// --manifest selects a later Owner-reviewed packet version; the default stays the 2026-10-25 packet.
const manifestIndex = args.indexOf('--manifest');
const manifestOption = manifestIndex >= 0 ? args.splice(manifestIndex, 2)[1] : null;
assert.ok(manifestIndex < 0 || (manifestOption && manifestOption.startsWith('docs/release/') && manifestOption.endsWith('/packet-manifest.json')), '--manifest needs docs/release/<packet>/packet-manifest.json');
assert.ok(args.every(arg => ['--with-privilege-fix','--native','--packet'].includes(arg)), 'unsupported argument');
const runForward = args.includes('--with-privilege-fix');
const nativeMode = args.includes('--native');
// --packet replays the exact Owner-approved Singapore packet instead of the 2026-10-01 candidate.
const packetMode = args.includes('--packet');
assert.ok(!(packetMode && runForward), '--packet already contains the privilege-boundary migration');
assert.ok(!manifestOption || packetMode, '--manifest needs --packet');
const output = packetMode
  ? (manifestOption ? `artifacts/singapore-bootstrap-rehearsal-${path.basename(path.dirname(manifestOption))}` : 'artifacts/singapore-bootstrap-rehearsal-2026-10-27')
  : 'artifacts/singapore-migration-rehearsal-2026-10-05';
const bytes = p => fs.readFileSync(p);
const rawHash = b => crypto.createHash('sha256').update(b).digest('hex');
const readJson = p => JSON.parse(bytes(p));
const write = (name, value) => fs.writeFileSync(`${output}/${name}`, JSON.stringify(value, null, 2) + '\n');
const packetPath = manifestOption || 'docs/release/singapore-backend-readiness-2026-10-25/packet-manifest.json';
const candidate = packetMode ? null : readJson('docs/mvp-remediation/2026-10-01/R02-clean-qa-bootstrap.json');
const packet = packetMode ? readJson(packetPath) : null;
// Packet hashes use the LF basis (Git blob); candidate hashes use raw bytes of the original checkout.
const sources = packetMode
  ? packet.migrations.map(m => ({ order: m.order, file: `supabase/migrations/${m.file}`, lfSha256: m.sha256 }))
  : [...candidate.baseMigrations, ...candidate.preparedForward];
const seed = packetMode
  ? { path: packet.seed.file, matches: b => evidenceSha256(b) === packet.seed.sha256, sha256: packet.seed.sha256 }
  : { path: candidate.seed.payload, matches: b => rawHash(b) === candidate.seed.payloadRawSha256, sha256: candidate.seed.payloadRawSha256 };
const forwardPath = 'supabase/migrations/20261004183447_client_table_privilege_boundary.sql';
// The packet is the full approved set, so its native files are not labelled as a pre-fix baseline.
const nativeFull = runForward || packetMode;
const receiptName = nativeMode ? (nativeFull ? 'native-rehearsal.json' : 'native-baseline-rehearsal.json') : 'embedded-rehearsal.json';
const archiveName = nativeMode ? (nativeFull ? 'native-synthetic.dump' : 'native-baseline-synthetic.dump') : 'synthetic-pglite-database.tar.gz';
const auditName = nativeMode ? (nativeFull ? 'native-privilege-audit.json' : 'native-baseline-privilege-audit.json') : 'privilege-audit.json';
let PGlite, pgcrypto, vector;
const pgliteModule = file => pathToFileURL(path.resolve(root, pgliteRoot, 'node_modules/@electric-sql/pglite/dist', file)).href;
if (!nativeMode) {
  ({ PGlite } = await import(pgliteModule('index.js')));
  ({ pgcrypto } = await import(pgliteModule('contrib/pgcrypto.js')));
  ({ vector } = await import(pgliteModule('vector/index.js')));
}
const createDatabase = options => nativeMode ? NativePostgres.create({ artifactDirectory: output, ...options }) : PGlite.create({ extensions: { pgcrypto, vector }, ...options });
const packages = [
  ['@electric-sql/pglite', '0.3.15', 'sha512-Cj++n1Mekf9ETfdc16TlDi+cDDQF0W7EcbyRHYOAeZdsAe8M/FJg18itDTSwyHfar2WIezawM9o0EKaRGVKygQ=='],
];
for (const [name, version, integrity] of nativeMode ? [] : packages) {
  const lock = JSON.parse(fs.readFileSync(path.resolve(root, pgliteRoot, 'package-lock.json')));
  assert.equal(lock.packages[`node_modules/${name}`].version, version);
  assert.equal(lock.packages[`node_modules/${name}`].integrity, integrity);
}
for (const s of sources) {
  if (packetMode) assert.equal(evidenceSha256(bytes(s.file)), s.lfSha256, `stale packet: ${s.file}`);
  else assert.equal(rawHash(bytes(s.file)), s.rawSha256, `stale candidate: ${s.file}`);
}
assert.ok(seed.matches(bytes(seed.path)), `stale seed: ${seed.path}`);
const migrations = sources.map(s => ({ path: s.file, sha256: evidenceSha256(bytes(s.file)) }));
if (runForward) migrations.push({ path: forwardPath, sha256: evidenceSha256(bytes(forwardPath)) });
const receipt = {
  schemaVersion: 1, status: 'BLOCKED', startedAt: new Date().toISOString(), runtime: nativeMode ? 'Native PostgreSQL in isolated Docker, not managed Supabase' : 'PGlite embedded WASM, not Docker or managed Supabase',
  syntheticOnly: true, sideEffectsDisabled: true, remoteSqlWrites: false,
  migrationSetSha256: migrationSetSha256(migrations), migrations, packageIntegrity: nativeMode ? [] : packages,
  ...(packetMode ? { source: { packetPath, packetSha256: evidenceSha256(bytes(packetPath)), packetMigrationSetSha256: packet.migrationSetSha256 } } : {}),
  ...(nativeMode ? { image: nativeImage } : {}),
  fixtureBoundary: 'Minimal auth.users(id) and observed auth.uid/jwt/role SQL; observed postgres public default grants; empty Realtime publication. No Auth server, Storage bytes, API or provider.',
  replay: [], checks: [], grantsRlsAcceptance: 'BLOCKED', restoreAcceptance: 'BLOCKED',
  nativeReplay: 'BLOCKED', managedAcceptance: 'BLOCKED',
};
fs.mkdirSync(output, { recursive: true });
let db, restored;
const safeError = e => ({ code: e.code ?? null, message: String(e.message).slice(0, 400) });
const runCase = async (name, fn) => {
  try { await fn(); receipt.checks.push({ name, status: 'PASS' }); console.log(`PASS ${name}`); }
  catch (e) { receipt.checks.push({ name, status: 'FAIL', ...safeError(e) }); console.log(`FAIL ${name}: ${e.message}`); }
};
const roleQuery = (connection, id, sql, values = [], role = 'authenticated') => connection.transaction(async tx => {
  assert.ok(['authenticated', 'anon'].includes(role));
  await tx.exec(`set local role ${role}`);
  await tx.query("select set_config('request.jwt.claims',$1,true)", [JSON.stringify({ sub: id, role, app_metadata: { role: 'owner' } })]);
  return tx.query(sql, values);
});
const expectDenied = async fn => {
  let error;
  try { await fn(); } catch (e) { error = e; }
  assert.equal(error?.code, '42501', 'expected insufficient privilege / RLS violation');
};

try {
  db = await createDatabase();
  const runtime = (await db.query('select version() as version, current_user as user, current_setting(\'server_version_num\') as version_num')).rows[0];
  receipt.postgres = runtime; receipt.postgresMajor = Math.floor(Number(runtime.version_num) / 10000);
  assert.equal(receipt.postgresMajor, 17, 'rehearsal must use PostgreSQL major 17');
  await db.exec(`
    create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth; create table auth.users(id uuid primary key);
    grant usage on schema public, auth to anon, authenticated, service_role;
    create function auth.jwt() returns jsonb language sql stable as $$
      select coalesce(nullif(current_setting('request.jwt.claim',true),''), nullif(current_setting('request.jwt.claims',true),''))::jsonb $$;
    create function auth.role() returns text language sql stable as $$
      select coalesce(nullif(current_setting('request.jwt.claim.role',true),''), nullif(current_setting('request.jwt.claims',true),'')::jsonb ->> 'role')::text $$;
    create function auth.uid() returns uuid language sql stable as $$
      select coalesce(nullif(current_setting('request.jwt.claim.sub',true),''), nullif(current_setting('request.jwt.claims',true),'')::jsonb ->> 'sub')::uuid $$;
    -- Observed Singapore defaults for objects created by postgres. No post-hoc blanket grants.
    alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
    alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
    alter default privileges in schema public revoke execute on functions from public;
    alter default privileges in schema public grant execute on functions to anon, authenticated, service_role;
    create publication supabase_realtime;
    set app.enable_weekly_reflection_cron = 'off';
  `);
  for (const s of sources) {
    try {
      await db.exec(bytes(s.file).toString('utf8'));
      receipt.replay.push({ path: s.file, status: 'PASS' });
      console.log(`PASS migration ${s.order}: ${path.basename(s.file)}`);
    } catch (e) {
      receipt.replay.push({ path: s.file, status: 'FAIL', ...safeError(e) });
      throw e; // Do not continue after a migration failure or mask it with fixture repair.
    }
  }
  receipt.sqlReplay = 'PASS';
  receipt.extensions = (await db.query('select extname,extversion from pg_extension order by extname')).rows;
  if (runForward) {
    await db.exec(bytes(forwardPath).toString('utf8'));
    receipt.replay.push({ path: forwardPath, status: 'PASS' });
    console.log('PASS migration 28: client_table_privilege_boundary');
    // Upgrade an independent copy of the previously failed synthetic baseline.
    const baseline = readJson(`${output}/${nativeMode ? 'native-baseline-rehearsal.json' : 'baseline-rehearsal.json'}`);
    const archiveBytes = bytes(`${output}/${nativeMode ? 'native-baseline-synthetic.dump' : 'baseline-synthetic-pglite-database.tar.gz'}`);
    assert.equal(rawHash(archiveBytes), baseline.restore.sha256);
    const upgrade = await createDatabase({ loadDataDir: new Blob([archiveBytes]) });
    try {
      const before = (await upgrade.query("select (select count(*) from journal_entries)::int as journals,(select count(*) from tarot_cards)::int as cards,(select count(*) from admin_role_assignments where status='active' and role='owner')::int as owners")).rows[0];
      await upgrade.exec(bytes(forwardPath).toString('utf8'));
      const after = (await upgrade.query("select (select count(*) from journal_entries)::int as journals,(select count(*) from tarot_cards)::int as cards,(select count(*) from admin_role_assignments where status='active' and role='owner')::int as owners")).rows[0];
      assert.deepEqual(after,before);
      await expectDenied(() => roleQuery(upgrade,null,'truncate public.journal_entries'));
      await expectDenied(() => roleQuery(upgrade,null,'truncate public.journal_entries',[],'anon'));
      receipt.forwardUpgrade = { status: 'PASS', sourceArchiveSha256: rawHash(archiveBytes), invariants: after, deniedClientTruncate: true };
      console.log('PASS forward upgrade preserves synthetic fixture rows and denies both client TRUNCATE roles');
    } finally { await upgrade.close(); }
  }
  await db.exec(bytes(seed.path).toString('utf8'));
  receipt.seed = { status: 'PASS', path: seed.path, [packetMode ? 'sha256' : 'rawSha256']: seed.sha256 };
  await runCase('seed has 78 bilingual canonical cards', async () => {
    const r = (await db.query("select count(*)::int as total, count(*) filter (where name ? 'vi' and name ? 'en' and upright_meaning ? 'vi' and upright_meaning ? 'en')::int as bilingual from tarot_cards")).rows[0];
    assert.deepEqual(r, { total: 78, bilingual: 78 });
  });
  await runCase('AI campaign remains disabled and optional cron/net unavailable', async () => {
    const r = (await db.query('select status, starts_at, ends_at from nilaza_private.ai_budget_campaigns')).rows;
    assert.ok(r.length); assert.ok(r.every(x => x.status === 'disabled' && x.starts_at === null && x.ends_at === null));
    const extensions = receipt.extensions.map(x => x.extname);
    assert.ok(!extensions.includes('pg_cron') && !extensions.includes('pg_net'));
  });
  const ids = Array.from({ length: 4 }, () => crypto.randomUUID());
  const [a, b, owner, editor] = ids;
  for (const id of ids) await db.query('insert into auth.users values($1)', [id]);
  await db.query("insert into admin_role_assignments(user_id,role) values($1,'owner'),($2,'editor')", [owner, editor]);
  for (const [id, name] of [[a, 'QA A'], [b, 'QA B']]) {
    await roleQuery(db, id, 'insert into user_profiles(user_id,display_name) values($1,$2)', [id, name]);
    await roleQuery(db, id, "insert into journal_entries(user_id,source_type,title,summary,local_id) values($1,'manual','Synthetic','Fixture','qa-journal')", [id]);
    await roleQuery(db, id, "insert into tarot_readings(user_id,topic,spread,selected_cards,interpretation) values($1,'general','daily-one','[]','{}')", [id]);
  }
  const sessions = [];
  for (const id of [a, b]) {
    const session = (await roleQuery(db, id, "insert into chat_sessions(user_id,title) values($1,'Fixture') returning id", [id])).rows[0].id;
    sessions.push(session);
    await roleQuery(db, id, "insert into chat_messages(session_id,user_id,role,content) values($1,$2,'user','Synthetic')", [session, id]);
  }
  await runCase('actors are ordinary roles without superuser or RLS bypass', async () => {
    const r = (await roleQuery(db, a, 'select rolsuper,rolbypassrls from pg_roles where rolname=current_user')).rows[0];
    assert.deepEqual(r, { rolsuper: false, rolbypassrls: false });
  });
  for (const table of ['user_profiles', 'journal_entries', 'tarot_readings', 'chat_sessions', 'chat_messages']) {
    await runCase(`A/B/staff SELECT isolation: ${table}`, async () => {
      for (const id of [a, b]) {
        const rows = (await roleQuery(db, id, `select user_id from public.${table}`)).rows;
        assert.ok(rows.length); assert.ok(rows.every(r => r.user_id === id));
      }
      for (const id of [owner, editor]) assert.equal((await roleQuery(db, id, `select user_id from public.${table}`)).rows.length, 0);
    });
  }
  await runCase('cross-account insert, update, delete and forged chat parent denied', async () => {
    await expectDenied(() => roleQuery(db, a, "insert into journal_entries(user_id,source_type,title,summary) values($1,'manual','Synthetic','Fixture')", [b]));
    assert.equal((await roleQuery(db, a, "update journal_entries set title='Blocked' where user_id=$1 returning id", [b])).rows.length, 0);
    assert.equal((await roleQuery(db, a, 'delete from journal_entries where user_id=$1 returning id', [b])).rows.length, 0);
    await expectDenied(() => roleQuery(db, a, "insert into chat_messages(session_id,user_id,role,content) values($1,$2,'user','Synthetic')", [sessions[1], a]));
  });
  await runCase('JWT owner claim cannot grant a customer live capabilities', async () => {
    assert.equal((await roleQuery(db, a, "select has_admin_capability('roles.manage') as allowed")).rows[0].allowed, false);
    await expectDenied(() => roleQuery(db, a, "insert into admin_role_assignments(user_id,role) values($1,'owner')", [a]));
  });
  await runCase('editor revocation blocks reuse of identical JWT claims', async () => {
    assert.equal((await roleQuery(db, editor, "select has_admin_capability('content.read') as allowed")).rows[0].allowed, true);
    await roleQuery(db, owner, "update admin_role_assignments set status='revoked' where user_id=$1", [editor]);
    assert.equal((await roleQuery(db, editor, "select has_admin_capability('content.read') as allowed")).rows[0].allowed, false);
  });
  await runCase('last active owner cannot be revoked', async () => {
    await assert.rejects(roleQuery(db, owner, "update admin_role_assignments set status='revoked' where user_id=$1", [owner]), e => e.code === '23514');
  });
  const persona = (await db.query('select id from personas limit 1')).rows[0].id;
  const source = (await db.query("insert into persona_sources(persona_id,source_type,title) values($1,'internal_notes','Synthetic source') returning id", [persona])).rows[0].id;
  await db.query("insert into source_chunks(source_id,content) values($1,'Synthetic licensed fixture')", [source]);
  await runCase('raw sources hidden from customer/revoked staff; readable by owner', async () => {
    for (const id of [a, b, editor]) assert.equal((await roleQuery(db, id, 'select id from source_chunks')).rows.length, 0);
    assert.ok((await roleQuery(db, owner, 'select id from source_chunks')).rows.length);
    await expectDenied(() => roleQuery(db, null, 'select id from source_chunks', [], 'anon'));
  });
  await runCase('quota RPC restricted to service_role', async () => {
    const r = (await db.query("select p.oid::regprocedure::text as name,has_function_privilege('authenticated',p.oid,'EXECUTE') as customer,has_function_privilege('anon',p.oid,'EXECUTE') as anon,has_function_privilege('service_role',p.oid,'EXECUTE') as worker from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname like 'nilaza_ai_usage_%'")).rows;
    assert.ok(r.length >= 4); assert.ok(r.every(x => !x.customer && !x.anon && x.worker));
  });
  const privilegeAudit = (await db.query(`select c.relname, c.relrowsecurity,
    has_table_privilege('anon',c.oid,'TRUNCATE') as anon_truncate,
    has_table_privilege('authenticated',c.oid,'TRUNCATE') as customer_truncate,
    has_table_privilege('authenticated',c.oid,'TRIGGER') as customer_trigger,
    has_table_privilege('authenticated',c.oid,'REFERENCES') as customer_references,
    has_table_privilege('authenticated',c.oid,'MAINTAIN') as customer_maintain
    from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r' order by c.relname`)).rows;
  write(auditName, privilegeAudit);
  await runCase('no client TRUNCATE bypass on public tables', async () => {
    assert.deepEqual(privilegeAudit.filter(x => x.anon_truncate || x.customer_truncate).map(x => x.relname), []);
  });
  if (runForward) await runCase('future postgres tables and existing tables deny unsafe client privileges', async () => {
    assert.ok(privilegeAudit.every(x => !x.customer_trigger && !x.customer_references && !x.customer_maintain));
    await db.transaction(async tx => {
      await tx.exec('create table public.qa_default_acl_probe(id uuid)');
      for (const role of ['anon','authenticated']) {
        for (const privilege of ['TRUNCATE','TRIGGER','REFERENCES','MAINTAIN']) {
          assert.equal((await tx.query("select has_table_privilege($1,'public.qa_default_acl_probe',$2) as allowed",[role,privilege])).rows[0].allowed,false);
        }
      }
      await tx.exec('drop table public.qa_default_acl_probe');
    });
  });
  await runCase('ordinary customer cannot TRUNCATE another account journal', async () => {
    // Roll back whether permitted or denied, so the synthetic recovery fixture stays intact.
    let error;
    try { await db.transaction(async tx => {
      await tx.exec('set local role authenticated');
      await tx.query("select set_config('request.jwt.claims',$1,true)", [JSON.stringify({ sub: a, role: 'authenticated' })]);
      await tx.exec('truncate public.journal_entries');
      throw Object.assign(new Error('TRUNCATE allowed despite tenant RLS'), { code: 'UNSAFE_TRUNCATE' });
    }); } catch(e) { error = e; }
    assert.equal(error?.code, '42501', 'TRUNCATE must be denied');
  });
  receipt.grantsRlsAcceptance = receipt.checks.some(x => x.status === 'FAIL') ? 'FAIL' : 'PASS';
  const invariants = async connection => {
    const tables = (await connection.query("select table_schema,table_name from information_schema.tables where table_schema in ('public','nilaza_private') and table_type='BASE TABLE' order by table_schema,table_name")).rows;
    const counts = [];
    for (const { table_schema: schema, table_name } of tables) {
      const value = (await connection.query(`select count(*)::int as n,md5(coalesce(string_agg(row_to_json(t)::text,'|' order by row_to_json(t)::text),'')) as rows_digest from "${schema}"."${table_name}" t`)).rows[0];
      counts.push({ schema, table: table_name, ...value });
    }
    const policies = (await connection.query("select schemaname,tablename,policyname,roles,cmd,qual,with_check from pg_policies where schemaname in ('public','nilaza_private') order by schemaname,tablename,policyname")).rows;
    const schema = (await connection.query("select table_schema,table_name,column_name,data_type,is_nullable,column_default from information_schema.columns where table_schema in ('public','nilaza_private') order by table_schema,table_name,ordinal_position")).rows;
    const indexes = (await connection.query("select schemaname,tablename,indexname,indexdef from pg_indexes where schemaname in ('public','nilaza_private') order by schemaname,tablename,indexname")).rows;
    const tableGrants = (await connection.query("select n.nspname,c.relname,c.relrowsecurity,pg_get_userbyid(c.relowner) as owner,c.relacl::text as acl from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname in ('public','nilaza_private') and c.relkind in ('r','v','S','p') order by n.nspname,c.relname")).rows;
    const functions = (await connection.query("select n.nspname,p.proname,pg_get_function_identity_arguments(p.oid) as args,p.prosecdef,p.proconfig,p.proacl::text as acl,pg_get_userbyid(p.proowner) as owner,md5(pg_get_functiondef(p.oid)) as definition_digest from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in ('public','nilaza_private','auth') and p.prokind in ('f','p') order by n.nspname,p.proname,args")).rows;
    const defaultGrants = (await connection.query("select pg_get_userbyid(d.defaclrole) as owner,coalesce(n.nspname,'*') as schema,d.defaclobjtype,d.defaclacl::text as acl from pg_default_acl d left join pg_namespace n on n.oid=d.defaclnamespace order by owner,schema,d.defaclobjtype")).rows;
    return { counts, policies, schema, indexes, tableGrants, functions, defaultGrants };
  };
  await runCase(`${nativeMode ? 'pg_dump/pg_restore' : 'embedded archive'} restores rows, schema, indexes, grants, RPCs and A/B isolation`, async () => {
    const before = await invariants(db); const start = performance.now();
    const archive = await db.dumpDataDir(); const archiveBytes = Buffer.from(await archive.arrayBuffer());
    fs.writeFileSync(`${output}/${archiveName}`, archiveBytes);
    restored = await createDatabase({ loadDataDir: new Blob([archiveBytes]) });
    assert.deepEqual(await invariants(restored), before);
    for (const id of [a,b]) {
      const rows = (await roleQuery(restored, id, 'select user_id from journal_entries')).rows;
      assert.equal(rows.length,1); assert.equal(rows[0].user_id,id);
    }
    assert.equal((await roleQuery(restored, editor, "select has_admin_capability('content.read') as allowed")).rows[0].allowed,false);
    receipt.restore = { status: 'PASS', format: nativeMode ? 'pg_dump custom archive + explicit synthetic role bootstrap; pg_restore into independent network-none cluster with ACLs/owners' : 'PGlite physical data-directory archive, not pg_dump or Supabase backup', bytes: archiveBytes.length, sha256: rawHash(archiveBytes), elapsedMs: Math.round(performance.now()-start), invariantsSha256: rawHash(Buffer.from(JSON.stringify(before))) };
    receipt.restoreAcceptance = 'PASS';
    write(nativeMode ? (nativeFull ? 'native-restore-invariants.json' : 'native-baseline-restore-invariants.json') : 'restore-invariants.json', before);
  });
  receipt.status = receipt.checks.some(x => x.status === 'FAIL') ? 'FAIL' : 'PASS';
  if (nativeMode) receipt.nativeReplay = receipt.sqlReplay;
} catch(e) {
  receipt.status = 'FAIL'; receipt.error = safeError(e); console.error(`Rehearsal failed: ${e.code ?? ''} ${e.message}`);
} finally {
  if (restored) await restored.close(); if (db) await db.close();
  if (nativeMode) {
    for (const instance of NativePostgres.created) await instance.close();
    receipt.containers = NativePostgres.created.map(x => ({ ...x.isolation, stopped: x.stopped }));
    receipt.dockerEngineVersion = NativePostgres.serverVersion;
    receipt.adapterSha256 = evidenceSha256(bytes('scripts/native-postgres-rehearsal.mjs'));
  }
  receipt.finishedAt = new Date().toISOString();
  receipt.harnessSha256 = evidenceSha256(bytes('scripts/rehearse-nilaza-database.mjs'));
  write(receiptName, receipt);
  console.log(JSON.stringify({ status: receipt.status, migrations: receipt.replay.length, checks: receipt.checks.length, artifact: `${output}/${receiptName}` }));
  process.exitCode = receipt.status === 'PASS' ? 0 : 1;
}

#!/usr/bin/env node
// Local-only replay of the Singapore SQL packet on an embedded PostgreSQL 17 (PGlite).
// It never connects to a cloud database. It replays every migration in supabase/migrations in
// apply order on a Supabase-like synthetic fixture, loads the seed, and runs the account-deletion
// checks. Usage:
//   node scripts/singapore-packet-replay.mjs --pglite <dir-with-node_modules> [--receipt out.json] [--manifest out.json]
// <dir-with-node_modules> must contain @electric-sql/pglite (0.3.x, PostgreSQL 17). It is not a
// dependency of this repository on purpose.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import { pathToFileURL, fileURLToPath } from 'node:url';

const root = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const args = process.argv.slice(2);
const option = name => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined; };
const pgliteDir = option('--pglite') ?? process.env.PGLITE_DIR;
const receiptPath = option('--receipt');
const manifestPath = option('--manifest');
assert.ok(pgliteDir, 'pass --pglite <dir containing node_modules/@electric-sql/pglite> or set PGLITE_DIR');
for (let i = 0; i < args.length; i += 2) assert.ok(['--pglite', '--receipt', '--manifest', '--describe'].includes(args[i]), `unsupported argument ${args[i]}`);

const migrationsDir = path.join(root, 'supabase', 'migrations');
const rawHash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
// Hash basis: UTF-8 content with CRLF normalized to LF. This equals the git blob on every platform,
// so the approved hash does not change between a Windows checkout (autocrlf) and a Linux one.
const normalized = bytes => Buffer.from(bytes.toString('utf8').replace(/\r\n/g, '\n'), 'utf8');
const migrations = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort().map(file => {
  const bytes = normalized(fs.readFileSync(path.join(migrationsDir, file)));
  return { file, order: 0, sizeBytes: bytes.length, sha256: rawHash(bytes), text: bytes.toString('utf8') };
});
migrations.forEach((m, i) => { m.order = i + 1; });
const seedFile = 'supabase/seed.generated.sql';
const seedBytes = normalized(fs.readFileSync(path.join(root, seedFile)));

const notable = text => {
  const found = [];
  for (const [label, re] of [
    ['create extension', /create extension/i], ['cron schedule', /cron\.schedule/i], ['pg_net', /pg_net|net\.http/i],
    ['grant on auth schema', /grant[^;]*auth\./i], ['security definer', /security definer/i],
    ['drop table/column', /drop (table|column)/i], ['truncate', /\btruncate\b/i], ['realtime publication', /supabase_realtime/i]
  ]) if (re.test(text)) found.push(label);
  return found;
};

if (manifestPath) {
  fs.writeFileSync(manifestPath, JSON.stringify({
    schemaVersion: 1, kind: 'nilaza-singapore-sql-packet-manifest', applied: false, cloudMutation: false,
    hashBasis: 'sha256 of UTF-8 content with CRLF normalized to LF (equals the git blob)',
    migrationCount: migrations.length,
    migrations: migrations.map(({ order, file, sizeBytes, sha256, text }) => ({ order, file, sizeBytes, sha256, notable: notable(text) })),
    seed: { file: seedFile, sizeBytes: seedBytes.length, sha256: rawHash(seedBytes) },
    migrationSetSha256: rawHash(Buffer.from(migrations.map(m => `${m.file}:${m.sha256}`).join('\n')))
  }, null, 2) + '\n');
}

const lib = p => import(pathToFileURL(path.join(pgliteDir, 'node_modules', '@electric-sql', 'pglite', p)).href);
const { PGlite } = await lib('dist/index.js');
const { pgcrypto } = await lib('dist/contrib/pgcrypto.js');
const { vector } = await lib('dist/vector/index.js');

const receipt = {
  schemaVersion: 1, kind: 'nilaza-singapore-sql-replay', startedAt: new Date().toISOString(),
  runtime: 'PGlite embedded WASM, not managed Supabase', syntheticOnly: true, cloudMutation: false,
  fixtureBoundary: 'Minimal auth.users(id), observed auth.uid/jwt/role SQL, roles anon/authenticated/service_role, public default grants as observed, empty Realtime publication. No Auth server, Storage bytes, API or provider.',
  migrationSetSha256: null, replay: [], checks: []
};
const safeError = e => ({ code: e.code ?? null, message: String(e.message).slice(0, 300) });
const db = await PGlite.create({ extensions: { pgcrypto, vector } });
const v = (await db.query("select version() as version, current_setting('server_version_num') as num")).rows[0];
receipt.postgres = v.version; receipt.postgresMajor = Math.floor(Number(v.num) / 10000);
assert.equal(receipt.postgresMajor, 17, 'replay must use PostgreSQL major 17');

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
  alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
  alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
  alter default privileges in schema public revoke execute on functions from public;
  alter default privileges in schema public grant execute on functions to anon, authenticated, service_role;
  create publication supabase_realtime;
  set app.enable_weekly_reflection_cron = 'off';
`);

let failed = false;
for (const m of migrations) {
  try { await db.exec(m.text); receipt.replay.push({ order: m.order, file: m.file, sha256: m.sha256, status: 'PASS' }); console.log(`PASS migration ${m.order}: ${m.file}`); }
  catch (e) { receipt.replay.push({ order: m.order, file: m.file, sha256: m.sha256, status: 'FAIL', ...safeError(e) }); console.log(`FAIL migration ${m.order}: ${m.file}: ${e.message}`); failed = true; break; }
}
receipt.migrationSetSha256 = rawHash(Buffer.from(migrations.map(m => `${m.file}:${m.sha256}`).join('\n')));
receipt.sqlReplay = failed ? 'FAIL' : 'PASS';

if (option('--describe')) {
  // Maintainer aid: print columns of the named tables after replay, then stop.
  for (const table of option('--describe').split(',')) {
    const cols = (await db.query(`select column_name, data_type, is_nullable, column_default is not null as has_default
      from information_schema.columns where table_name=$1 order by ordinal_position`, [table])).rows;
    console.log(`## ${table}\n` + cols.map(c => `  ${c.column_name} ${c.data_type}${c.is_nullable === 'NO' && !c.has_default ? ' NOT NULL (no default)' : ''}`).join('\n'));
  }
  await db.close(); process.exit(0);
}
const runCase = async (name, fn) => {
  try { await fn(); receipt.checks.push({ name, status: 'PASS' }); console.log(`PASS ${name}`); }
  catch (e) { receipt.checks.push({ name, status: 'FAIL', ...safeError(e) }); console.log(`FAIL ${name}: ${e.message}`); failed = true; }
};
const asRole = (role, sql, values = []) => db.transaction(async tx => {
  await tx.exec(`set local role ${role}`);
  return tx.query(sql, values);
});
const denied = async fn => { let err; try { await fn(); } catch (e) { err = e; } assert.equal(err?.code, '42501', 'expected insufficient privilege'); };

if (!failed) {
  await runCase('seed loads', async () => {
    await db.exec(seedBytes.toString('utf8'));
    assert.equal((await db.query('select count(*)::int as n from tarot_cards')).rows[0].n, 78);
  });

  const U = '11111111-1111-4111-8111-111111111111', V = '22222222-2222-4222-8222-222222222222', S = '33333333-3333-4333-8333-333333333333';
  const subject = c => c.repeat(64);
  const EMAIL_U = 'a'.repeat(64), EMAIL_V = 'b'.repeat(64);
  const MU = 'MARKER_DELETED_USER', MV = 'MARKER_OTHER_USER';
  const seedUser = async (id, marker, emailHash) => {
    await db.query('insert into auth.users(id) values ($1)', [id]);
    await db.query('insert into user_profiles(user_id, display_name) values ($1,$2)', [id, marker]);
    await db.query("insert into journal_entries(user_id, source_type, title, summary, user_note, local_id) values ($1,'manual',$2,$2,$2,$3)", [id, marker, `local-${marker}`]);
    await db.query("insert into generation_jobs(user_id, feature, input_summary) values ($1,'chat',$2::jsonb)", [id, JSON.stringify({ note: marker })]);
    await db.query("insert into usage_events(user_id, event_name, metadata) values ($1,'test',$2::jsonb)", [id, JSON.stringify({ note: marker })]);
    await db.query("insert into safety_events(user_id, feature, reason, summary) values ($1,'chat','user_report',$2)", [id, `user said ${marker}`]);
    await db.query("insert into marketing_waitlist(email, email_hash, locale, interest, consent_version) values ($1,$2,'vi','tarot','test')", [`${marker.toLowerCase()}@example.test`, emailHash]);
    const wl = (await db.query('select id from marketing_waitlist where email_hash=$1', [emailHash])).rows[0].id;
    await db.query("insert into marketing_consent_events(waitlist_id, event_type, consent_version, source, metadata) values ($1,'signup_requested','test','test',$2::jsonb)", [wl, JSON.stringify({ note: marker })]);
  };

  await runCase('fixture: two ordinary users with data and one active staff account', async () => {
    await db.exec('begin');
    try {
      await seedUser(U, MU, EMAIL_U); await seedUser(V, MV, EMAIL_V);
      await db.query('insert into auth.users(id) values ($1)', [S]);
      await db.query("insert into admin_role_assignments(user_id, role, status) values ($1,'owner','active')", [S]);
      await db.exec('commit');
    } catch (e) { await db.exec('rollback'); throw e; }
  });

  await runCase('client roles cannot call the deletion functions or read the request table', async () => {
    for (const role of ['anon', 'authenticated']) {
      await denied(() => asRole(role, 'select public.nilaza_account_delete_begin($1,$2)', [U, subject('c')]));
      await denied(() => asRole(role, 'select public.nilaza_account_delete_purge($1,$2,$3)', [U, subject('c'), EMAIL_U]));
      await denied(() => asRole(role, 'select public.nilaza_account_delete_finish($1,true,null)', [subject('c')]));
      await denied(() => asRole(role, 'select * from nilaza_private.account_deletion_requests'));
    }
  });

  await runCase('begin: malformed input, staff block and unknown user', async () => {
    await assert.rejects(() => asRole('service_role', 'select public.nilaza_account_delete_begin($1,$2)', [U, 'not-a-hash']), e => e.code === '22023');
    assert.equal((await asRole('service_role', 'select public.nilaza_account_delete_begin($1,$2) as r', [S, subject('d')])).rows[0].r.status, 'staff_blocked');
    assert.equal((await asRole('service_role', 'select public.nilaza_account_delete_begin($1,$2) as r', ['99999999-9999-4999-8999-999999999999', subject('e')])).rows[0].r.status, 'not_found');
    assert.equal((await db.query("select count(*)::int as n from nilaza_private.account_deletion_requests where subject_hash in ($1,$2)", [subject('d'), subject('e')])).rows[0].n, 0, 'refused requests are not recorded');
    await assert.rejects(() => asRole('service_role', 'select public.nilaza_account_delete_purge($1,$2,$3)', [S, subject('d'), null]), e => e.code === '42501');
  });

  await runCase('begin is idempotent and counts attempts', async () => {
    const h = subject('f');
    for (let i = 1; i <= 2; i++) {
      assert.equal((await asRole('service_role', 'select public.nilaza_account_delete_begin($1,$2) as r', [V, h])).rows[0].r.status, 'requested');
      assert.equal((await db.query('select attempts from nilaza_private.account_deletion_requests where subject_hash=$1', [h])).rows[0].attempts, i);
    }
    await db.query('delete from nilaza_private.account_deletion_requests where subject_hash=$1', [h]);
  });

  let counts;
  await runCase('purge removes surviving rows, scrubs safety text and returns counts only', async () => {
    const h = subject('1');
    assert.equal((await asRole('service_role', 'select public.nilaza_account_delete_begin($1,$2) as r', [U, h])).rows[0].r.status, 'requested');
    counts = (await asRole('service_role', 'select public.nilaza_account_delete_purge($1,$2,$3) as r', [U, h, EMAIL_U])).rows[0].r;
    assert.deepEqual(counts, { generation_jobs: 1, usage_events: 1, safety_events: 1, marketing_waitlist: 1 });
    assert.equal((await db.query('select status from nilaza_private.account_deletion_requests where subject_hash=$1', [h])).rows[0].status, 'data_removed');
  });

  // Every row of every table, as text, must stop mentioning a marker or user id after deletion.
  const scan = async needles => {
    const tables = (await db.query(`select table_schema, table_name from information_schema.tables
      where table_schema in ('public','nilaza_private','auth') and table_type='BASE TABLE' order by 1,2`)).rows;
    const hits = {};
    for (const needle of needles) {
      hits[needle] = [];
      for (const t of tables) {
        const q = `select count(*)::int as n from ${t.table_schema}."${t.table_name}" x where to_jsonb(x)::text ilike $1`;
        if ((await db.query(q, [`%${needle}%`])).rows[0].n) hits[needle].push(`${t.table_schema}.${t.table_name}`);
      }
    }
    return { tables: tables.length, hits };
  };
  await runCase('after the auth user is removed no row anywhere still carries the deleted user data', async () => {
    await db.query('delete from auth.users where id=$1', [U]);
    const { tables, hits } = await scan([MU, U, MV]);
    const leaks = [...hits[MU], ...hits[U]];
    assert.deepEqual(leaks, [], `surviving data for deleted user in: ${leaks.join(', ')}`);
    assert.ok(hits[MV].length >= 5, `other user's data must remain untouched (found in ${hits[MV].length} tables)`);
    receipt.scan = { tablesScanned: tables, controlTablesWithOtherUserData: hits[MV].length };
  });

  await runCase('negative control: without the purge step the same scan does find survivors', async () => {
    const W = '55555555-5555-4555-8555-555555555555', MW = 'MARKER_SKIPPED_PURGE';
    await seedUser(W, MW, 'c'.repeat(64));
    await db.query('delete from auth.users where id=$1', [W]);
    const { hits } = await scan([MW]);
    for (const table of ['public.generation_jobs', 'public.usage_events', 'public.safety_events', 'public.marketing_waitlist']) {
      assert.ok(hits[MW].includes(table), `scan should detect survivor in ${table}`);
    }
    receipt.negativeControlSurvivorTables = hits[MW];
    await db.query('delete from generation_jobs where input_summary::text like $1', [`%${MW}%`]);
    await db.query('delete from usage_events where metadata::text like $1', [`%${MW}%`]);
    await db.query('delete from safety_events where summary like $1', [`%${MW}%`]);
    await db.query('delete from marketing_waitlist where email_hash=$1', ['c'.repeat(64)]);
  });

  await runCase('finish records completion, retry after failure works, and cost ledger stays de-identified', async () => {
    const h = subject('1');
    assert.equal((await asRole('service_role', 'select public.nilaza_account_delete_finish($1,true,null) as r', [h])).rows[0].r, 'completed');
    assert.equal((await asRole('service_role', 'select public.nilaza_account_delete_begin($1,$2) as r', [U, h])).rows[0].r.status, 'completed');
    const f = subject('2');
    await db.query('insert into auth.users(id) values ($1)', ['44444444-4444-4444-8444-444444444444']);
    await asRole('service_role', 'select public.nilaza_account_delete_begin($1,$2)', ['44444444-4444-4444-8444-444444444444', f]);
    assert.equal((await asRole('service_role', 'select public.nilaza_account_delete_finish($1,false,$2) as r', [f, 'auth_delete_failed'])).rows[0].r, 'failed');
    assert.equal((await db.query('select last_error_code from nilaza_private.account_deletion_requests where subject_hash=$1', [f])).rows[0].last_error_code, 'auth_delete_failed');
    assert.equal((await asRole('service_role', 'select public.nilaza_account_delete_begin($1,$2) as r', ['44444444-4444-4444-8444-444444444444', f])).rows[0].r.status, 'requested');
    assert.equal((await asRole('service_role', 'select public.nilaza_account_delete_finish($1,false,$2) as r', [f, 'Bad Code With Spaces!'])).rows[0].r, 'failed');
    assert.equal((await db.query('select last_error_code from nilaza_private.account_deletion_requests where subject_hash=$1', [f])).rows[0].last_error_code, 'deletion_failed');
    const row = (await db.query("select count(*)::int as n from nilaza_private.account_deletion_requests where subject_hash ~ '[^a-f0-9]'")).rows[0].n;
    assert.equal(row, 0);
  });

  await runCase('the request table holds no email, name or user id', async () => {
    const cols = (await db.query("select column_name from information_schema.columns where table_schema='nilaza_private' and table_name='account_deletion_requests' order by 1")).rows.map(r => r.column_name);
    assert.deepEqual(cols, ['attempts', 'completed_at', 'id', 'last_error_code', 'requested_at', 'status', 'subject_hash', 'updated_at']);
  });
}

receipt.finishedAt = new Date().toISOString();
receipt.status = failed ? 'FAIL' : 'PASS';
receipt.managedAcceptance = 'NOT_RUN: managed Supabase Auth, Storage, role grants and extensions are not exercised by this replay';
if (receiptPath) fs.writeFileSync(receiptPath, JSON.stringify(receipt, null, 2) + '\n');
console.log(`${receipt.status}: ${receipt.replay.length} migrations replayed, ${receipt.checks.filter(c => c.status === 'PASS').length}/${receipt.checks.length} checks passed`);
await db.close();
process.exit(failed ? 1 : 0);

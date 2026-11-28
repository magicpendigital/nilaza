// Nil P1-B (15/11/2026): PGlite checks for supabase/migrations/20261115110000_astrology_lock.sql.
// Runs the real 20260627 astrology migration on small auth/birth_profiles/usage_events stubs, then the lock migration
// twice (re-run must be clean), and checks: one live row per key, immutability trigger, RLS for anon / authenticated /
// service_role, claim outcomes (claimed, in_progress, replay, limit_reached), failed rows freeing the key, soft delete
// still counting toward the key and the daily limit, and account deletion still cascading.
// Skipped unless @electric-sql/pglite resolves or NILAZA_PGLITE_MODULE names its dist/index.js.
import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import fs from "node:fs";
import { pathToFileURL } from "node:url";
import test from "node:test";

const read = (file) => fs.readFileSync(file, "utf8").replaceAll("\r\n", "\n");
const sha = (value) => createHash("sha256").update(value).digest("hex");
const CONTRACT = "nilaza.astrology.ai-insight";

async function loadPglite() {
  const target = process.env.NILAZA_PGLITE_MODULE;
  try { return (await import(target ? pathToFileURL(target).href : "@electric-sql/pglite")).PGlite; } catch { return null; }
}

test("lock migration text keeps the agreed shape", () => {
  const sql = read("supabase/migrations/20261115110000_astrology_lock.sql");
  assert.match(sql, /^begin;$/m);
  assert.match(sql, /^commit;$/m);
  assert.match(sql, /create unique index if not exists astrology_reports_user_lock_key_uidx/);
  assert.match(sql, /where lock_key is not null and status <> 'failed'/);
  assert.match(sql, /pg_advisory_xact_lock/);
  assert.match(sql, /grant execute on function public\.astrology_claim_report\([^)]*\) to service_role;/);
  assert.match(sql, /revoke all on function public\.astrology_claim_report\([^)]*\) from public, anon, authenticated;/);
  assert.doesNotMatch(sql, /grant[^;]*(insert|update|delete)[^;]*astrology_reports to authenticated/i);
  assert.doesNotMatch(sql, /before delete/i, "account deletion must keep cascading");
});

test("PGlite: astrology lock — unique key, immutability, RLS for three roles, claim, soft delete, re-run", async (t) => {
  const PGlite = await loadPglite();
  if (!PGlite) { t.skip("PGlite not installed; set NILAZA_PGLITE_MODULE to @electric-sql/pglite/dist/index.js"); return; }
  const db = await PGlite.create();
  try {
    const [alice, bob] = [randomUUID(), randomUUID()];
    await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
      create schema auth;
      create table auth.users(id uuid primary key, email text);
      create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
      grant usage on schema auth to authenticated, anon, service_role;
      grant execute on function auth.uid() to authenticated, anon, service_role;
      create schema nilaza_private;
      create function public.is_admin() returns boolean language sql stable as $$ select false $$;
      create table public.birth_profiles(id uuid primary key default gen_random_uuid(), user_id uuid references auth.users(id) on delete cascade);
      create table public.usage_events(id uuid primary key default gen_random_uuid(), user_id uuid references auth.users(id) on delete set null,
        event_name text not null, feature text, metadata jsonb not null default '{}'::jsonb, created_at timestamptz not null default now());
      grant select, insert on public.usage_events to service_role;`);
    await db.query("insert into auth.users(id, email) values ($1, 'a@example.test'), ($2, 'b@example.test')", [alice, bob]);
    await db.exec(read("supabase/migrations/20260627000000_astrology_backend_contract.sql"));
    const lock = read("supabase/migrations/20261115110000_astrology_lock.sql");
    await db.exec(lock);
    await db.exec(lock); // re-run is clean

    const policies = (await db.query("select policyname, cmd from pg_policies where tablename = 'astrology_reports' order by 1")).rows;
    assert.deepEqual(policies, [{ policyname: "users read own astrology reports", cmd: "SELECT" }]);
    assert.equal((await db.query("select count(*)::int as n from pg_trigger where tgname = 'astrology_reports_guard'")).rows[0].n, 1);

    const as = (role, actor, sql, params = []) => db.transaction(async (tx) => {
      await tx.exec(`set local role ${role}`);
      await tx.query("select set_config('request.jwt.claim.sub',$1,true)", [actor ?? ""]);
      return (await tx.query(sql, params)).rows;
    });
    const fails = async (promise, code, label) => {
      await assert.rejects(promise, (error) => { assert.equal(error.code, code, `${label}: ${error.message}`); return true; }, label);
    };
    const dayStart = () => new Date(Date.now() - 3600_000).toISOString();
    const report = (chartId = "chart-1") => ({
      focus: "personality",
      input_summary: { contractId: CONTRACT, clientChartId: chartId },
      chart_data: { placements: [] },
      caveats: []
    });
    const claim = (user, key, { limit = 1, allowance = 2, chartId, topic = "general", role = "service_role" } = {}) =>
      as(role, null, `select public.astrology_claim_report($1,$2,$3,$4,'vi','prompt-v1','route-v1','calc-v1',$5,$6,$7,$8::jsonb,'{}'::jsonb) as r`,
        [user, sha(`key:${key}`), sha("chart"), topic, limit, allowance, dayStart(), JSON.stringify(report(chartId))]).then((rows) => rows[0].r);
    const complete = (id) => as("service_role", null,
      "update public.astrology_reports set status='completed', interpretation='{\"answer\":\"ok\"}'::jsonb, input_summary = input_summary || '{\"answerProvenance\":{\"traceId\":\"t\"}}'::jsonb, updated_at=now() where id=$1 returning completed_at", [id]);
    const fail = (id) => as("service_role", null, "update public.astrology_reports set status='failed', updated_at=now() where id=$1", [id]);

    // Invalid input is refused before any write.
    assert.equal((await as("service_role", null, "select public.astrology_claim_report($1,'bad',$2,'general','vi','p','r','c',1,2,now(),'{\"chart_data\":{}}'::jsonb) as r", [alice, sha("x")]))[0].r.outcome, "invalid");
    assert.equal((await claim(alice, "a1", { topic: "astrology" }).catch(() => ({ outcome: "error" }))).outcome, "invalid");

    // Claim, in progress, complete, replay.
    const first = await claim(alice, "a1");
    assert.equal(first.outcome, "claimed");
    assert.equal(first.attempts, 1);
    assert.equal((await claim(alice, "a1")).outcome, "in_progress", "same key while generating: no second row, no second model call");
    assert.equal((await db.query("select count(*)::int as n from public.astrology_reports where user_id=$1", [alice])).rows[0].n, 1);
    assert.equal((await db.query("select count(*)::int as n from public.usage_events where user_id=$1", [alice])).rows[0].n, 1);
    assert.ok((await complete(first.report_id))[0].completed_at, "completed_at set by the trigger");
    const replay = await claim(alice, "a1");
    assert.deepEqual([replay.outcome, replay.report_id], ["replay", first.report_id]);
    assert.equal((await db.query("select count(*)::int as n from public.usage_events where user_id=$1", [alice])).rows[0].n, 1, "replay uses no turn");

    // A different topic (key) is a new reading under the daily limit.
    assert.equal((await claim(alice, "a2")).outcome, "limit_reached", "daily limit 1 already delivered");
    const second = await claim(alice, "a2", { limit: 2 });
    assert.equal(second.outcome, "claimed");

    // AI failure frees the key and the turn (within the failed-attempt allowance).
    await fail(second.report_id);
    const retry = await claim(alice, "a2", { limit: 2 });
    assert.equal(retry.outcome, "claimed");
    assert.notEqual(retry.report_id, second.report_id);
    await fail(retry.report_id);
    // attempts now 3; limit 2 + allowance 2 = 4 → one more try allowed, then stop.
    const third = await claim(alice, "a2", { limit: 2 });
    assert.equal(third.outcome, "claimed");
    await fail(third.report_id);
    assert.equal((await claim(alice, "a2", { limit: 2 })).outcome, "limit_reached", "failed attempts are capped");

    // A stale queued row (Edge request died) is released.
    const stale = await claim(bob, "b1");
    assert.equal(stale.outcome, "claimed");
    await db.query("update public.astrology_reports set updated_at = now() - interval '10 minutes' where id=$1", [stale.report_id]);
    const fresh = await claim(bob, "b1");
    assert.equal(fresh.outcome, "claimed");
    assert.equal((await db.query("select status from public.astrology_reports where id=$1", [stale.report_id])).rows[0].status, "failed");
    await complete(fresh.report_id);

    // Unique key: a second live row for one key is refused even for service_role.
    await fails(as("service_role", null, `insert into public.astrology_reports(user_id, focus, language, provider, calculation_version, input_hash, chart_data, interpretation, status, lock_key)
      values ($1,'personality','vi','model_router','calc-v1',$2,'{}','{}','queued',$3)`, [alice, sha("chart"), sha("key:a1")]), "23505", "duplicate key");
    await as("service_role", null, `insert into public.astrology_reports(user_id, focus, language, provider, calculation_version, input_hash, chart_data, interpretation, status, lock_key)
      values ($1,'personality','vi','model_router','calc-v1',$2,'{}','{}','failed',$3)`, [alice, sha("chart"), sha("key:a1")]);
    await fails(as("service_role", null, "update public.astrology_reports set lock_key=$2 where id=$1", [first.report_id, "f".repeat(64)]), "42501", "lock_key immutable");
    await fails(db.query("update public.astrology_reports set lock_key='bad' where id=$1", [first.report_id]), "42501", "guard runs for superuser too");

    // Immutability.
    await fails(as("service_role", null, "update public.astrology_reports set interpretation='{\"answer\":\"changed\"}' where id=$1", [first.report_id]), "42501", "content");
    await fails(as("service_role", null, "update public.astrology_reports set status='queued' where id=$1", [first.report_id]), "42501", "back to queued");
    await fails(as("service_role", null, "update public.astrology_reports set prompt_version='prompt-v2' where id=$1", [first.report_id]), "42501", "prompt_version");
    await fails(as("service_role", null, "update public.astrology_reports set status='completed' where id=$1", [second.report_id]), "42501", "failed is final");
    await fails(as("service_role", null, "update public.astrology_reports set input_summary = input_summary || '{\"x\":1}' where id=$1", [first.report_id]), "42501", "summary change");
    await as("service_role", null, "update public.astrology_reports set input_summary = jsonb_set(input_summary, '{answerProvenance,answerReceiptId}', '\"rcpt-1\"') where id=$1", [first.report_id]);
    await fails(as("service_role", null, "update public.astrology_reports set input_summary = jsonb_set(input_summary, '{answerProvenance,answerReceiptId}', '\"rcpt-2\"') where id=$1", [first.report_id]), "42501", "receipt once");

    // RLS: authenticated reads own visible rows only and cannot write; anon has nothing; service_role sees all.
    const aliceVisible = await as("authenticated", alice, "select id, user_id from public.astrology_reports");
    assert.ok(aliceVisible.length >= 1);
    assert.ok(aliceVisible.every((row) => row.user_id === alice));
    assert.equal((await as("authenticated", bob, "select id from public.astrology_reports where user_id=$1", [alice])).length, 0);
    await fails(as("authenticated", alice, `insert into public.astrology_reports(user_id, focus, language, calculation_version, input_hash, chart_data, interpretation)
      values ($1,'personality','vi','c','h','{}','{}')`, [alice]), "42501", "client insert");
    await fails(as("authenticated", alice, "update public.astrology_reports set status='deleted' where id=$1", [first.report_id]), "42501", "client update");
    await fails(as("authenticated", alice, "delete from public.astrology_reports where id=$1", [first.report_id]), "42501", "client delete");
    await fails(as("anon", null, "select id from public.astrology_reports"), "42501", "anon select");
    await fails(as("authenticated", alice, `select public.astrology_claim_report($1,$2,$3,'general','vi','p','r','c',9,9,now(),'{"chart_data":{}}'::jsonb)`, [alice, sha("k"), sha("c")]), "42501", "client claim");
    await fails(as("anon", null, "select public.astrology_soft_delete_reports(null)"), "42501", "anon soft delete");
    assert.ok((await as("service_role", null, "select count(*)::int as n from public.astrology_reports"))[0].n >= 6);

    // Soft delete: hidden from the app, still replays, still counts toward the daily limit.
    await fails(as("authenticated", null, "select public.astrology_soft_delete_reports(null)"), "42501", "soft delete needs sign-in");
    assert.equal((await as("authenticated", bob, "select public.astrology_soft_delete_reports('chart-1') as n"))[0].n, 1);
    assert.equal((await as("authenticated", alice, "select public.astrology_soft_delete_reports('other-chart') as n"))[0].n, 0);
    assert.equal((await as("authenticated", alice, "select public.astrology_soft_delete_reports(null) as n"))[0].n, 1);
    const deleted = (await db.query("select status, deleted_at, interpretation from public.astrology_reports where id=$1", [first.report_id])).rows[0];
    assert.equal(deleted.status, "deleted");
    assert.ok(deleted.deleted_at);
    assert.deepEqual(deleted.interpretation, { answer: "ok" });
    assert.equal((await as("authenticated", alice, "select id from public.astrology_reports where id=$1", [first.report_id])).length, 0, "hidden from app");
    assert.deepEqual([(await claim(alice, "a1")).outcome], ["replay"], "deleted reading still holds its key");
    assert.equal((await claim(alice, "a9")).outcome, "limit_reached", "deleted reading still counts today");
    await fails(as("service_role", null, "update public.astrology_reports set status='completed', deleted_at=null where id=$1", [first.report_id]), "42501", "no undelete");
    await fails(as("service_role", null, "update public.astrology_reports set deleted_at=now() + interval '1 day' where id=$1", [first.report_id]), "42501", "deleted_at fixed");

    // Account deletion still removes every row.
    await db.query("delete from auth.users where id=$1", [bob]);
    assert.equal((await db.query("select count(*)::int as n from public.astrology_reports where user_id=$1", [bob])).rows[0].n, 0);

    // The rollback SQL in the handoff runs cleanly and restores own-row writes for the app.
    const handoff = read("docs/release/nil-p1-astrology-lock-2026-11-15/HANDOFF.vi.md");
    const rollback = handoff.match(/```sql\n([\s\S]*?)```/)?.[1];
    assert.ok(rollback, "handoff carries rollback SQL");
    await db.exec(rollback);
    assert.equal((await db.query("select count(*)::int as n from pg_proc where proname in ('astrology_claim_report','astrology_soft_delete_reports','astrology_reports_guard')")).rows[0].n, 0);
    assert.deepEqual((await db.query("select policyname from pg_policies where tablename='astrology_reports'")).rows.map((r) => r.policyname), ["users manage own astrology reports"]);
    const ownRows = await as("authenticated", alice, "update public.astrology_reports set status='failed' where user_id=$1 returning id", [alice]);
    assert.ok(ownRows.length >= 1, "after rollback the app can write its own rows again");
    assert.equal((await as("authenticated", alice, "update public.astrology_reports set status='failed' where user_id<>$1 returning id", [alice])).length, 0);
  } finally {
    await db.close();
  }
});

// Minimum app version + app start bootstrap (supabase/migrations/20261128090000_app_release_policy.sql). The text checks
// always run; the PGlite replay runs when @electric-sql/pglite resolves or NILAZA_PGLITE_MODULE names its dist/index.js,
// and is skipped otherwise. The bootstrap reuses get_feature_access_config(), so 20261127090000 is replayed first.
// Nothing here touches a remote database.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import { pathToFileURL } from "node:url";
import test from "node:test";

const read = (file) => fs.readFileSync(file, "utf8").replace(/\r\n/g, "\n");
const migration = read("supabase/migrations/20261128090000_app_release_policy.sql");
const featureAccessMigration = read("supabase/migrations/20261127090000_feature_access_configs.sql");
const featureAccessSpec = JSON.parse(read("packages/agent-config/feature-access.json"));

async function loadPglite() {
  const target = process.env.NILAZA_PGLITE_MODULE;
  try { return (await import(target ? pathToFileURL(target).href : "@electric-sql/pglite")).PGlite; } catch { return null; }
}

test("migration text: RLS on, no policies, Owner-only setter, anon reads only the bootstrap", () => {
  assert.match(migration, /alter table public\.app_release_policies enable row level security;/);
  assert.ok(!/create policy/i.test(migration));
  assert.match(migration, /revoke all on table public\.app_release_policies from public, anon, authenticated, service_role;/);
  assert.match(migration, /^-- Rollback \(Owner-approved/m);
  assert.match(migration, /needs Owner approval to run/);
  const setter = migration.slice(migration.indexOf("create function public.set_app_release_policy"));
  assert.match(setter.slice(0, 1500), /has_capability\('ai\.manage'\)/);
  assert.match(setter.slice(0, 1500), /not between 10 and 500/);
  assert.match(setter.slice(0, 1500), /not between 0 and 30/);
  for (const body of migration.split("create function ").slice(1)) {
    assert.match(body.slice(0, 400), /set search_path = ''/, body.slice(0, 60));
  }
  const anonGrants = migration.match(/grant execute on function [^;]*to anon[^;]*;/g) ?? [];
  assert.deepEqual(anonGrants, ["grant execute on function public.get_app_bootstrap() to anon, authenticated;"]);
  assert.match(migration, /'featureAccess', public\.get_feature_access_config\(\)/);
  assert.ok(!/delete from/i.test(migration));
});

const baseSchema = `
create role anon; create role authenticated; create role service_role bypassrls;
create schema auth; create schema nilaza_private;
create table auth.users(id uuid primary key, email text);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
create table nilaza_private.test_capabilities(user_id uuid, capability text);
create function nilaza_private.has_capability(capability_input text) returns boolean language sql stable as $$
  select exists (select 1 from nilaza_private.test_capabilities c where c.user_id = auth.uid() and c.capability = capability_input) $$;
create table public.admin_audit_logs(id uuid default gen_random_uuid(), admin_user_id uuid, action text, target_table text, target_id uuid, metadata jsonb);
create table public.subscriptions(id uuid primary key default gen_random_uuid(), user_id uuid not null, provider text not null default 'revenuecat',
  entitlement text not null default 'free', status text not null default 'free', current_period_end timestamptz);
grant usage on schema nilaza_private, auth to authenticated;
grant execute on function auth.uid() to authenticated;
`;

test("PGlite: Owner sets and clears, others refused, strict version, anon bootstrap, audit", async (t) => {
  const PGlite = await loadPglite();
  if (!PGlite) { t.skip("PGlite not installed; set NILAZA_PGLITE_MODULE to @electric-sql/pglite/dist/index.js"); return; }
  const owner = randomUUID(), editor = randomUUID(), viewer = randomUUID();
  const db = await PGlite.create();
  try {
    await db.exec(baseSchema);
    await db.query("insert into auth.users values ($1,'owner@example.test'),($2,'editor@example.test'),($3,'viewer@example.test')", [owner, editor, viewer]);
    await db.query("insert into nilaza_private.test_capabilities values ($1,'ai.manage'),($1,'ai.read'),($2,'ai.read'),($2,'content.draft')", [owner, editor]);
    await db.exec(featureAccessMigration);
    await db.exec(migration);

    const asUser = (actor, sql, params = []) => db.transaction(async (tx) => {
      await tx.exec("set local role authenticated");
      await tx.query("select set_config('request.jwt.claim.sub', $1, true)", [actor]);
      return (await tx.query(sql, params)).rows;
    });
    const asAnon = (sql, params = []) => db.transaction(async (tx) => {
      await tx.exec("set local role anon");
      return (await tx.query(sql, params)).rows;
    });
    const bootstrap = async () => (await asAnon("select public.get_app_bootstrap() as b"))[0].b;

    // Nothing set or published: server time only.
    const empty = await bootstrap();
    assert.deepEqual(Object.keys(empty).sort(), ["featureAccess", "releasePolicy", "serverTime"]);
    assert.equal(empty.releasePolicy, null);
    assert.equal(empty.featureAccess, null);
    assert.ok(!Number.isNaN(Date.parse(empty.serverTime)));
    assert.equal((await asUser(viewer, "select public.get_app_bootstrap() as b"))[0].b.releasePolicy, null);

    // Non-Owner and anon cannot set; anon and viewers cannot read the Admin view.
    const setSql = "select public.set_app_release_policy($1, $2, $3) as r";
    await assert.rejects(asUser(editor, setSql, ["0.1.4", 3, "Need the new build"]), (error) => error.code === "42501");
    await assert.rejects(asUser(viewer, setSql, ["0.1.4", 3, "Need the new build"]), (error) => error.code === "42501");
    await assert.rejects(asAnon(setSql, ["0.1.4", 3, "Need the new build"]), (error) => error.code === "42501");
    await assert.rejects(asAnon("select public.get_app_release_policies()"), (error) => error.code === "42501");
    await assert.rejects(asUser(viewer, "select public.get_app_release_policies()"), (error) => error.code === "42501");

    // Strict version, grace days and reason checks.
    for (const bad of ["0.1", "0.1.3.1", "v0.1.3", "0.1.3-beta", "01.1.3", "0.1.x", " . . ", "1234567.0.0"]) {
      await assert.rejects(asUser(owner, setSql, [bad, 3, "Need the new build"]),
        (error) => error.code === "22023" && error.detail === "min_version", bad);
    }
    for (const days of [-1, 31, null]) {
      await assert.rejects(asUser(owner, setSql, ["0.1.4", days, "Need the new build"]),
        (error) => error.code === "22023" && error.detail === "grace_days", String(days));
    }
    await assert.rejects(asUser(owner, setSql, ["0.1.4", 3, "short"]), (error) => error.code === "22023" && error.detail === "reason");
    await assert.rejects(asUser(owner, setSql, ["0.1.4", 3, "x".repeat(501)]), (error) => error.code === "22023");
    assert.equal((await db.query("select count(*)::int as n from public.app_release_policies")).rows[0].n, 0);

    // Owner sets 0.1.4 with 3 days.
    const v1 = (await asUser(owner, setSql, [" 0.1.4 ", 3, "Need the new build"]))[0].r;
    assert.equal(v1.version, 1);
    assert.equal(v1.status, "active");
    assert.equal(v1.minVersion, "0.1.4");
    assert.equal(v1.graceDays, 3);
    assert.equal(v1.reason, "Need the new build");
    assert.equal(v1.createdByEmail, "owner@example.test");
    const withPolicy = await bootstrap();
    assert.deepEqual(Object.keys(withPolicy.releasePolicy).sort(), ["effectiveAt", "graceDays", "minVersion"]);
    assert.equal(withPolicy.releasePolicy.minVersion, "0.1.4");
    assert.equal(withPolicy.releasePolicy.graceDays, 3);

    // Feature access published elsewhere shows up unchanged in the bootstrap.
    await asUser(owner, "select public.save_feature_access_draft($1::jsonb)", [JSON.stringify(featureAccessSpec.defaults)]);
    await asUser(owner, "select public.publish_feature_access_config(1, null, 'Owner approved defaults')");
    const both = await bootstrap();
    const direct = (await asAnon("select public.get_feature_access_config() as c"))[0].c;
    assert.deepEqual(both.featureAccess, direct);
    assert.equal(both.featureAccess.version, 1);

    // A second version archives the first; clearing (null) removes the policy from the bootstrap.
    const v2 = (await asUser(owner, setSql, ["0.2.0", 0, "Security fix must ship now"]))[0].r;
    assert.equal(v2.version, 2);
    const v3 = (await asUser(owner, setSql, [null, 0, "Clear the minimum version"]))[0].r;
    assert.equal(v3.minVersion, null);
    assert.equal((await bootstrap()).releasePolicy, null);
    const rows = (await db.query("select version, status from public.app_release_policies order by version")).rows;
    assert.deepEqual(rows, [{ version: 1, status: "archived" }, { version: 2, status: "archived" }, { version: 3, status: "active" }]);

    // Admin view for ai.read: current + history newest first.
    const view = (await asUser(editor, "select public.get_app_release_policies() as r"))[0].r;
    assert.equal(view.current.version, 3);
    assert.deepEqual(view.history.map((row) => row.version), [3, 2, 1]);

    // Audit: one row per set with previous and new values and the reason.
    const audit = (await db.query("select admin_user_id, action, metadata from public.admin_audit_logs where action = 'app_release_policy.set' order by (metadata->>'version')::int")).rows;
    assert.equal(audit.length, 3);
    assert.equal(audit[0].admin_user_id, owner);
    assert.equal(audit[0].metadata.minVersion, "0.1.4");
    assert.equal(audit[0].metadata.previousVersion, null);
    assert.equal(audit[1].metadata.previousMinVersion, "0.1.4");
    assert.equal(audit[1].metadata.reason, "Security fix must ship now");
    assert.equal(audit[2].metadata.minVersion, null);
    assert.equal(audit[2].metadata.previousMinVersion, "0.2.0");

    // Direct table access stays closed to app roles.
    await assert.rejects(asUser(owner, "select * from public.app_release_policies"));
    await assert.rejects(asAnon("select * from public.app_release_policies"));
  } finally {
    await db.close();
  }
});

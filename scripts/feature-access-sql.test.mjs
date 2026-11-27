// Free / Premium feature access (supabase/migrations/20261127090000_feature_access_configs.sql). The text checks always
// run; the PGlite replay runs when @electric-sql/pglite resolves or NILAZA_PGLITE_MODULE names its dist/index.js, and is
// skipped otherwise. Nothing here touches a remote database.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import { pathToFileURL } from "node:url";
import test from "node:test";

const read = (file) => fs.readFileSync(file, "utf8").replace(/\r\n/g, "\n");
const migration = read("supabase/migrations/20261127090000_feature_access_configs.sql");
const spec = JSON.parse(read("packages/agent-config/feature-access.json"));

async function loadPglite() {
  const target = process.env.NILAZA_PGLITE_MODULE;
  try { return (await import(target ? pathToFileURL(target).href : "@electric-sql/pglite")).PGlite; } catch { return null; }
}

test("migration text: SQL spec equals packages/agent-config/feature-access.json", () => {
  const literal = migration.match(/\$spec\$([\s\S]*?)\$spec\$/);
  assert.ok(literal, "spec literal");
  const sqlSpec = JSON.parse(literal[1]);
  assert.deepEqual(sqlSpec, {
    tiers: spec.tiers, limitKinds: spec.limitKinds, bounds: spec.bounds,
    editableFeatures: spec.editableFeatures, allowedKinds: spec.allowedKinds
  });
});

test("migration text: RLS on, no policies, owner-only publish and rollback, only signed-in accounts read the published config", () => {
  assert.match(migration, /alter table public\.feature_access_configs enable row level security;/);
  assert.ok(!/create policy/i.test(migration));
  assert.match(migration, /revoke all on table public\.feature_access_configs from public, anon, authenticated, service_role;/);
  assert.match(migration, /^-- Rollback \(Owner-approved/m);
  assert.match(migration, /needs Owner approval to run/);
  for (const name of ["publish_feature_access_config", "rollback_feature_access_config"]) {
    const body = migration.slice(migration.indexOf(`create function public.${name}`));
    assert.match(body.slice(0, 1200), /has_capability\('ai\.manage'\)/, name);
    assert.match(body.slice(0, 1200), /not between 10 and 500/, name);
  }
  // Owner decision 27/11/2026: guests (anon) do not read the config; they keep the app's built-in defaults.
  assert.match(migration, /grant execute on function public\.get_feature_access_config\(\) to authenticated;/);
  const anonGrants = migration.match(/grant [^;]*to [^;]*anon[^;]*;/g) ?? [];
  assert.equal(anonGrants.length, 0);
  assert.ok(!/delete from/i.test(migration));
  assert.ok(!/ai_feature_switches/.test(migration.replace(/^--.*$/gm, "")), "does not touch the existing on/off switches");
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

const clone = (value) => JSON.parse(JSON.stringify(value));

test("PGlite: validation, draft, owner publish with reason, conflict, rollback, audience, signed-in read, anon refused", async (t) => {
  const PGlite = await loadPglite();
  if (!PGlite) { t.skip("PGlite not installed; set NILAZA_PGLITE_MODULE to @electric-sql/pglite/dist/index.js"); return; }
  const owner = randomUUID(), editor = randomUUID(), viewer = randomUUID(), payer = randomUUID(), lapsed = randomUUID();
  const db = await PGlite.create();
  try {
    await db.exec(baseSchema);
    await db.query("insert into auth.users values ($1,'owner@example.test'),($2,'editor@example.test'),($3,'viewer@example.test'),($4,null),($5,null)",
      [owner, editor, viewer, payer, lapsed]);
    await db.query("insert into nilaza_private.test_capabilities values ($1,'ai.manage'),($1,'ai.read'),($2,'ai.read'),($2,'content.draft')", [owner, editor]);
    await db.query("insert into public.subscriptions(user_id, entitlement, status, current_period_end) values ($1,'premium','active', now() + interval '20 days'), ($2,'premium','canceled', now() - interval '1 day'), ($1,'premium_astrology_ai','trialing', null)",
      [payer, lapsed]);
    await db.exec(migration);

    const asUser = (actor, sql, params = []) => db.transaction(async (tx) => {
      await tx.exec("set local role authenticated");
      await tx.query("select set_config('request.jwt.claim.sub', $1, true)", [actor]);
      return (await tx.query(sql, params)).rows;
    });
    const asAnon = (sql) => db.transaction(async (tx) => {
      await tx.exec("set local role anon");
      return (await tx.query(sql)).rows;
    });
    const errors = async (config) => (await db.query("select nilaza_private.feature_access_errors($1::jsonb) as e", [JSON.stringify(config)])).rows[0].e;

    // Validator: the shipped defaults are valid; every kind of mistake gets a code.
    const defaults = spec.defaults;
    assert.deepEqual(await errors(defaults), []);
    assert.deepEqual(await errors([]), ["config_not_object"]);
    assert.deepEqual(await errors({ features: [] }), ["features_not_object"]);
    const missing = clone(defaults); delete missing.features.rune_draw; missing.extra = 1;
    assert.deepEqual((await errors(missing)).sort(), ["feature_missing:rune_draw", "unknown_key:extra"]);
    const bad = clone(defaults);
    bad.features.tarot_reading = { tier: "free" };
    bad.features.book_quote.tier = "gold";
    bad.features.book_quote.colour = "red";
    bad.features.boi_kieu.free = { kind: "per_day", count: 0 };
    bad.features.boi_kieu.premium = { kind: "per_day", count: 1.5 };
    bad.features.rune_draw.free = { kind: "retake_after_days", days: 30 };
    bad.features.big_five.free = { kind: "retake_after_days", days: 366 };
    bad.features.big_five.premium = { kind: "unlimited", count: 3 };
    bad.features.enneagram.free = { kind: "forever" };
    bad.features.enneagram.premium = "unlimited";
    assert.deepEqual((await errors(bad)).sort(), [
      "big_five:free:days", "big_five:premium:unknown_key:count", "boi_kieu:free:count", "boi_kieu:premium:count",
      "book_quote:tier", "book_quote:unknown_key:colour", "enneagram:free:kind", "enneagram:premium:not_object",
      "rune_draw:free:kind_not_allowed", "unknown_feature:tarot_reading"
    ]);

    // Nothing published yet: the app gets null and keeps its built-in defaults.
    assert.equal((await asUser(viewer, "select public.get_feature_access_config() as c"))[0].c, null);
    await assert.rejects(asAnon("select public.get_feature_access_config()"), (error) => error.code === "42501");

    // Viewers cannot read the Admin list or save; editors can save a draft but never publish.
    await assert.rejects(asUser(viewer, "select public.get_feature_access_configs()"), (error) => error.code === "42501");
    await assert.rejects(asUser(viewer, "select public.save_feature_access_draft($1::jsonb)", [JSON.stringify(defaults)]), (error) => error.code === "42501");
    await assert.rejects(asAnon("select public.get_feature_access_configs()"), (error) => error.code === "42501");
    await assert.rejects(asAnon("select public.get_feature_access_audience()"), (error) => error.code === "42501");
    await assert.rejects(asUser(editor, "select public.save_feature_access_draft($1::jsonb)", [JSON.stringify(bad)]),
      (error) => error.code === "22023" && /rune_draw:free:kind_not_allowed/.test(error.detail));
    const draft1 = (await asUser(editor, "select public.save_feature_access_draft($1::jsonb, 'first draft') as r", [JSON.stringify(defaults)]))[0].r;
    assert.equal(draft1.version, 1);
    assert.equal(draft1.status, "draft");
    assert.equal(draft1.createdByEmail, "editor@example.test");
    await assert.rejects(asUser(editor, "select public.publish_feature_access_config(1, null, 'Owner approved defaults')"), (error) => error.code === "42501");

    // Owner publish: reason 10-500 characters, expected active version must match.
    await assert.rejects(asUser(owner, "select public.publish_feature_access_config(1, null, 'short')"), (error) => error.code === "22023");
    await assert.rejects(asUser(owner, "select public.publish_feature_access_config(1, 7, 'Owner approved defaults')"), (error) => error.code === "40001");
    const v1 = (await asUser(owner, "select public.publish_feature_access_config(1, null, 'Owner approved defaults') as r"))[0].r;
    assert.equal(v1.status, "active");
    assert.equal(v1.note, "Owner approved defaults");
    assert.equal(v1.publishedByEmail, "owner@example.test");
    await assert.rejects(asUser(owner, "select public.publish_feature_access_config(1, 1, 'Publishing again here')"), (error) => error.code === "22023");

    // Rollback needs an earlier version.
    await assert.rejects(asUser(owner, "select public.rollback_feature_access_config(1, 'Back to the earlier one')"), (error) => error.code === "P0002");

    // Second version: Rune becomes Premium with 3 per day for premium.
    const premiumRune = clone(defaults);
    premiumRune.features.rune_draw = { tier: "premium", free: { kind: "per_day", count: 1 }, premium: { kind: "per_day", count: 3 } };
    const draft2 = (await asUser(owner, "select public.save_feature_access_draft($1::jsonb) as r", [JSON.stringify(premiumRune)]))[0].r;
    assert.equal(draft2.version, 2);
    // Saving again replaces the single draft.
    const draft2b = (await asUser(editor, "select public.save_feature_access_draft($1::jsonb, 'edited') as r", [JSON.stringify(premiumRune)]))[0].r;
    assert.equal(draft2b.version, 2);
    assert.equal((await db.query("select count(*)::int as n from public.feature_access_configs where status = 'draft'")).rows[0].n, 1);
    await assert.rejects(asUser(owner, "select public.publish_feature_access_config(2, null, 'Rune goes Premium now')"), (error) => error.code === "40001");
    const v2 = (await asUser(owner, "select public.publish_feature_access_config(2, 1, 'Rune goes Premium now') as r"))[0].r;
    assert.equal(v2.archivedVersion, 1);
    const published = (await asUser(viewer, "select public.get_feature_access_config() as c"))[0].c;
    assert.equal(published.version, 2);
    assert.equal(published.config.features.rune_draw.tier, "premium");
    assert.ok(published.publishedAt);
    assert.deepEqual(Object.keys(published).sort(), ["config", "publishedAt", "version"]);
    assert.equal((await asUser(viewer, "select public.get_feature_access_config() as c"))[0].c.version, 2);

    // A draft in progress is left alone by rollback.
    const draft3 = (await asUser(editor, "select public.save_feature_access_draft($1::jsonb, 'unrelated draft') as r", [JSON.stringify(defaults)]))[0].r;
    assert.equal(draft3.version, 3);
    await assert.rejects(asUser(editor, "select public.rollback_feature_access_config(2, 'Back to the earlier one')"), (error) => error.code === "42501");
    await assert.rejects(asUser(owner, "select public.rollback_feature_access_config(1, 'Back to the earlier one')"), (error) => error.code === "40001");
    await assert.rejects(asUser(owner, "select public.rollback_feature_access_config(2, 'too short')"), (error) => error.code === "22023");
    const v4 = (await asUser(owner, "select public.rollback_feature_access_config(2, 'Back to the earlier one') as r"))[0].r;
    assert.equal(v4.version, 4);
    assert.equal(v4.status, "active");
    assert.equal(v4.restoredFromVersion, 1);
    assert.equal(v4.archivedVersion, 2);
    assert.deepEqual(v4.config, defaults);
    assert.equal((await asUser(viewer, "select public.get_feature_access_config() as c"))[0].c.config.features.rune_draw.tier, "free");
    const rows = (await db.query("select version, status from public.feature_access_configs order by version")).rows;
    assert.deepEqual(rows, [
      { version: 1, status: "archived" }, { version: 2, status: "archived" }, { version: 3, status: "draft" }, { version: 4, status: "active" }
    ]);

    // Change log: newest first for Admin; every write audited with before/after and the reason.
    const list = (await asUser(editor, "select public.get_feature_access_configs() as r"))[0].r;
    assert.deepEqual(list.map((row) => row.version), [4, 3, 2, 1]);
    const audit = (await db.query("select action, metadata from public.admin_audit_logs order by metadata->>'version', action")).rows;
    const publish2 = audit.find((row) => row.action === "feature_access.publish" && row.metadata.version === 2);
    assert.equal(publish2.metadata.reason, "Rune goes Premium now");
    assert.equal(publish2.metadata.previousConfig.features.rune_draw.tier, "free");
    assert.equal(publish2.metadata.config.features.rune_draw.tier, "premium");
    const rollback = audit.find((row) => row.action === "feature_access.rollback");
    assert.equal(rollback.metadata.restoredFromVersion, 1);
    assert.equal(rollback.metadata.reason, "Back to the earlier one");
    assert.equal(audit.filter((row) => row.action === "feature_access.draft").length, 4);

    // Audience: 5 accounts, 1 with a live Premium entitlement (the lapsed one and the duplicate row do not count twice).
    const audience = (await asUser(editor, "select public.get_feature_access_audience() as r"))[0].r;
    assert.equal(audience.totalAccounts, 5);
    assert.equal(audience.premiumAccounts, 1);
    assert.equal(audience.freeAccounts, 4);

    // Direct table access stays closed to app roles.
    await assert.rejects(asUser(owner, "select * from public.feature_access_configs"));
    await assert.rejects(asAnon("select * from public.feature_access_configs"));
  } finally {
    await db.close();
  }
});

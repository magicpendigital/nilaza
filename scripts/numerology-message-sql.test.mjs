// Numerology private message (supabase/migrations/20261125090000_numerology_private_message.sql). The text checks always
// run; the PGlite replay runs when @electric-sql/pglite resolves or NILAZA_PGLITE_MODULE names its dist/index.js, and is
// skipped otherwise. Nothing here touches a remote database.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import { pathToFileURL } from "node:url";
import test from "node:test";

const read = (file) => fs.readFileSync(file, "utf8").replace(/\r\n/g, "\n");
const migrationPath = "supabase/migrations/20261125090000_numerology_private_message.sql";
const migration = read(migrationPath);
const batchC = read("supabase/migrations/20261124090000_tarot_note_reader_router.sql");
const FEATURE = "numerology_private_message";

async function loadPglite() {
  const target = process.env.NILAZA_PGLITE_MODULE;
  try { return (await import(target ? pathToFileURL(target).href : "@electric-sql/pglite")).PGlite; } catch { return null; }
}

test("migration text: switch seeded off, rollback block, no campaign or prompt RPC change, one transaction", () => {
  assert.match(migration, /^-- Rollback \(Owner-approved/m);
  assert.match(migration, /insert into public\.ai_feature_switches\(feature, enabled, reason\)\n  values \('numerology_private_message', false, /);
  assert.match(migration, /on conflict \(feature\) do nothing;/);
  assert.equal((migration.match(/^begin;$/gm) ?? []).length, 1);
  assert.equal((migration.match(/^commit;$/gm) ?? []).length, 1);
  // Not Admin-editable this batch and not part of model campaigns: these definitions are left as they are.
  for (const name of ["save_prompt_draft", "publish_prompt_version", "list_prompt_versions", "prompt_feature_editable", "model_campaign_feature_valid"]) {
    assert.ok(!new RegExp(`create (or replace )?function [a-z_.]*${name}`).test(migration), name);
  }
  // No table stores the message.
  assert.ok(!/create table/i.test(migration));
  assert.ok(!/alter table public\.usage_events/i.test(migration));
});

test("migration text: the publish RPC is the Batch C definition plus the new feature name only", () => {
  const slice = (sql) => sql.slice(sql.indexOf("create or replace function nilaza_private.publish_model_route_config(config_input jsonb)"),
    sql.indexOf("grant execute on function nilaza_private.publish_model_route_config(jsonb) to authenticated;"));
  const previous = slice(batchC), next = slice(migration);
  assert.ok(previous.length > 1000 && next.length > 1000);
  assert.equal(next, previous.replace("'tarot_note','reader_router'), true)", "'tarot_note','reader_router','numerology_private_message'), true)"));
});

test("migration text: the seeded route matches the code default and the routing config", async () => {
  const routing = JSON.parse(read("packages/agent-config/model-routing.json"));
  const routes = Array.isArray(routing) ? routing : routing.routes;
  const route = routes.find((item) => item.feature === FEATURE);
  assert.ok(route, "model-routing.json route");
  assert.ok(migration.includes(`'${route.version}'`));
  assert.ok(migration.includes(`'${route.primaryModel ?? route.primary?.model}'`));
  assert.ok(migration.includes("'numerology_private_message_v1'"));
  const source = read("supabase/functions/_shared/model-router.ts");
  assert.ok(source.includes(`version: "${route.version}"`), "model-router.ts default uses the same version");
});

const baseSchema = (admin) => `
create role anon; create role authenticated; create role service_role bypassrls;
create schema auth; create schema nilaza_private;
create table auth.users(id uuid primary key);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
create function public.is_admin() returns boolean language sql stable as $$ select auth.uid() = '${admin}'::uuid $$;
create function nilaza_private.has_capability(capability text) returns boolean language sql stable as $$ select auth.uid() = '${admin}'::uuid $$;
create table public.admin_audit_logs(id uuid default gen_random_uuid(), admin_user_id uuid, action text, target_table text, target_id uuid, metadata jsonb);
grant usage on schema nilaza_private, auth to authenticated;
grant execute on function auth.uid() to authenticated;
create table public.prompt_versions(id uuid primary key default gen_random_uuid(), feature text not null, owner_type text not null default 'global',
  owner_id uuid, version text not null, status text not null default 'draft', locale text not null default 'vi', prompt_text text,
  published_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
`;

// Only the route pieces Batch C needs before this migration: steps validator and decision check (section 1 of 20261124090000).
const batchCRoutes = batchC.slice(batchC.indexOf("-- 1. Model routes"), batchC.indexOf("-- 2. Feature switches"));

test("PGlite: switch seeded off, route active once, feature accepted by the checks and the publish RPC", async (t) => {
  const PGlite = await loadPglite();
  if (!PGlite) { t.skip("PGlite not installed; set NILAZA_PGLITE_MODULE to @electric-sql/pglite/dist/index.js"); return; }
  const admin = randomUUID(), viewer = randomUUID();
  const db = await PGlite.create();
  try {
    await db.exec(baseSchema(admin));
    await db.query("insert into auth.users values ($1), ($2)", [admin, viewer]);
    for (const file of ["20260630000000_model_route_versions.sql", "20261014074711_model_route_publish_contract_v2.sql",
      "20261113140000_model_route_steps.sql", "20261031100000_ai_feature_switches.sql"]) {
      await db.exec(read(`supabase/migrations/${file}`));
    }
    await db.exec(`begin;\n${batchCRoutes}\ncommit;`);
    await db.exec(migration);
    // Re-running is harmless: one active route, the switch keeps its state.
    await db.exec(migration);

    const switchRow = (await db.query("select enabled, reason from public.ai_feature_switches where feature = $1", [FEATURE])).rows;
    assert.deepEqual(switchRow.map((row) => row.enabled), [false]);
    assert.ok(switchRow[0].reason.length >= 3 && switchRow[0].reason.length <= 200);

    const routes = (await db.query("select version, primary_model, fallback_model, max_output_tokens, steps, total_deadline_ms from public.model_route_versions where feature = $1 and status = 'active'", [FEATURE])).rows;
    assert.equal(routes.length, 1);
    assert.equal(routes[0].version, "2026-11-25-numerology-message-v1");
    assert.equal(routes[0].max_output_tokens, 600);
    assert.equal(routes[0].steps.length, 2);
    assert.equal(routes[0].total_deadline_ms, 40000);

    const asUser = (actor, sql, params = []) => db.transaction(async (tx) => {
      await tx.exec("set local role authenticated");
      await tx.query("select set_config('request.jwt.claim.sub', $1, true)", [actor]);
      return (await tx.query(sql, params)).rows;
    });
    // Only an ai.manage account can turn it on; the name is accepted; an unknown name is refused.
    await assert.rejects(asUser(viewer, "select public.set_ai_feature_switch($1, true, 'Owner turned it on')", [FEATURE]), (error) => error.code === "42501");
    const on = await asUser(admin, "select public.set_ai_feature_switch($1, true, 'Owner turned it on') as r", [FEATURE]);
    assert.equal(on[0].r.enabled, true);
    await assert.rejects(asUser(admin, "select public.set_ai_feature_switch('numerology_other', true, 'Owner turned it on')"), (error) => error.code === "22023");
    // Signed-in readers see the state (the function reads it with the caller's JWT).
    assert.deepEqual((await asUser(viewer, "select enabled from public.ai_feature_switches where feature = $1", [FEATURE])).map((row) => row.enabled), [true]);

    // The prompt check accepts the feature (the seed writes the library guide).
    await db.query("insert into public.prompt_versions(feature, version, status, locale, prompt_text) values ($1, 'v1', 'active', 'vi', 'text')", [FEATURE]);
    await assert.rejects(db.query("insert into public.prompt_versions(feature, version) values ('numerology_other', 'v1')"));

    // The publish RPC accepts a numerology route (Admin Model Router), and still refuses decision steps for it.
    const activeId = (await db.query("select id from public.model_route_versions where feature = $1 and status = 'active'", [FEATURE])).rows[0].id;
    const config = (patch = {}) => ({
      contract_version: "model_route_publish_v2", publish_request_id: randomUUID(), expected_active_id: activeId, feature: FEATURE,
      version: "2026-11-25-numerology-message-v2", status: "draft", primary: { provider: "openrouter", model: "deepseek/deepseek-v4.1-flash" },
      fallback: null, temperature: 0.6, max_output_tokens: 600, response_schema: "numerology_private_message_v1", fallback_when: [],
      safety_policy: { approvedBlocksOnly: true }, ...patch
    });
    const published = await asUser(admin, "select public.publish_model_route_config($1::jsonb) as r", [config()]);
    assert.equal(published[0].r.status, "draft");
    await assert.rejects(asUser(admin, "select public.publish_model_route_config($1::jsonb) as r", [config({
      steps: [{ provider: "openrouter_decisions", model: "typesafe/jev-1.14", timeout_ms: 3000, max_tokens: 64, temperature: 0, json_mode: false, reasoning: null },
        { provider: "openrouter", model: "deepseek/deepseek-v4.1-flash", timeout_ms: 20000, max_tokens: 600, temperature: 0.6, json_mode: true, reasoning: { mode: "off" } }],
      note: "Decision step should be refused"
    })]), (error) => error.code === "22023");
  } finally {
    await db.close();
  }
});

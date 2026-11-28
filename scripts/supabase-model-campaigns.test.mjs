// Static checks of migration 20261124090100_model_campaigns.sql. The SQL is not executed here (no local Postgres);
// these checks pin the access rules that must not regress: definer functions with a fixed search_path, a capability
// check in every admin RPC, an audit row for every write, the service-role-only runtime read, and no client grants.
import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const sql = fs.readFileSync(new URL("../supabase/migrations/20261124090100_model_campaigns.sql", import.meta.url), "utf8").replace(/\r\n/g, "\n");
const functions = [...sql.matchAll(/create or replace function ([a-z_.]+)\(([\s\S]*?)\$\$;/g)].map((match) => ({ name: match[1], body: match[0] }));
const byName = (name) => {
  const found = functions.find((item) => item.name === name);
  assert.ok(found, `missing function ${name}`);
  return found.body;
};

test("every function pins search_path and every public one is security definer", () => {
  assert.ok(functions.length >= 9, `found ${functions.length} functions`);
  for (const { name, body } of functions) {
    assert.match(body, /set search_path = ''/, `${name} pins search_path`);
    if (name.startsWith("public.")) assert.match(body, /security definer/, `${name} is security definer`);
  }
});

test("admin RPCs check the right capability and writes are audited", () => {
  for (const name of ["public.admin_save_model_campaign_draft", "public.admin_set_model_campaign_status", "public.admin_pick_model_campaign_winner"]) {
    const body = byName(name);
    assert.match(body, /auth\.uid\(\) is null or not nilaza_private\.has_capability\('ai\.manage'\)/, `${name} needs ai.manage`);
    assert.match(body, /insert into public\.admin_audit_logs/, `${name} writes an audit row`);
  }
  for (const name of ["public.admin_list_model_campaigns", "public.admin_get_model_campaign_metrics"]) {
    assert.match(byName(name), /has_capability\('ai\.read'\)/, `${name} needs ai.read`);
  }
  for (const action of ["save_draft", "pick_winner"]) assert.ok(sql.includes(`'ai.model_campaign.${action}'`), action);
  assert.ok(sql.includes("'ai.model_campaign.' || action"), "status actions audited");
});

test("pick winner publishes only through the existing route publish function", () => {
  const body = byName("public.admin_pick_model_campaign_winner");
  assert.match(body, /nilaza_private\.publish_model_route_config\(config\)/);
  assert.match(body, /'contract_version', 'model_route_publish_v2'/);
  assert.match(body, /status = 'ended'/);
  assert.doesNotMatch(sql, /insert into public\.model_route_versions|update public\.model_route_versions/, "no direct route writes");
});

test("pick winner: legacy pair from chat steps only and a default schema for features with no active route", () => {
  const body = byName("public.admin_pick_model_campaign_winner");
  assert.match(body, /where e\.step->>'provider' not in \('openrouter_decisions','openai_decisions','gemini_decisions'\)/);
  assert.match(body, /'primary', jsonb_build_object\('provider', chat_steps->0->>'provider', 'model', chat_steps->0->>'model'\)/);
  assert.match(body, /chat_steps->1->>'provider'/);
  assert.match(body, /'max_output_tokens', chat_steps->0->'max_tokens'/);
  assert.doesNotMatch(body, /[^_]steps->0/, "no legacy field reads the raw first step");
  assert.match(body, /when 'tarot_note' then 'tarot_note_output_v1' when 'reader_router' then 'reader_router_choice_v1'/);
  assert.match(body, /The winning route needs a chat step/);
});

test("traffic, variants and the single running campaign are enforced", () => {
  assert.match(sql, /create unique index if not exists model_campaigns_one_running_per_feature\s+on public\.model_campaigns\(feature\) where status = 'running'/);
  assert.match(byName("public.admin_save_model_campaign_draft"), /traffic_total <> 100/);
  assert.match(byName("public.admin_set_model_campaign_status"), /traffic_total <> 100/);
  assert.match(byName("public.admin_set_model_campaign_status"), /errcode = '23505'/);
  assert.match(byName("nilaza_private.model_campaign_route_valid"), /nilaza_private\.model_route_steps_valid/);
  for (const feature of ["oracle_router", "persona_chat", "ai_council", "tarot_reading", "daily_insight", "astrology_report", "tarot_note", "reader_router"]) {
    assert.ok(byName("nilaza_private.model_campaign_feature_valid").includes(`'${feature}'`), feature);
  }
});

test("tables have RLS and no client grants; runtime read is service-role only", () => {
  assert.match(sql, /alter table public\.model_campaigns enable row level security/);
  assert.match(sql, /alter table public\.model_campaign_variants enable row level security/);
  assert.match(sql, /revoke all on public\.model_campaigns from public, anon, authenticated/);
  assert.doesNotMatch(sql, /grant [a-z, ]+ on public\.model_campaign(s|_variants) to (anon|authenticated)/);
  assert.doesNotMatch(sql, /create policy/i, "no policies: tables are reached only through RPCs");
  assert.match(sql, /revoke all on function public\.runtime_model_campaign_for_feature\(text\) from public, anon, authenticated/);
  assert.match(sql, /grant execute on function public\.runtime_model_campaign_for_feature\(text\) to service_role;/);
  assert.match(byName("public.runtime_model_campaign_for_feature"), /'service_role'/);
});

test("metrics return counts only, never user ids or text", () => {
  const body = byName("public.admin_get_model_campaign_metrics");
  assert.doesNotMatch(body, /'userId'|user_id|root_input|root_output|'input'|'output'/);
  assert.match(body, /'enoughData', coalesce\(p\.calls, 0\) >= 100/);
  assert.match(body, /metadata->>'campaignId'/);
  assert.match(body, /e\.feature = 'product_signal'/);
});

test("the migration is one transaction", () => {
  assert.match(sql, /^[\s\S]*?\nbegin;\n/);
  assert.match(sql, /\ncommit;\n?$/);
});

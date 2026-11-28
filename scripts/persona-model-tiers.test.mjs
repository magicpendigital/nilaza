// Persona chat model tiers (Owner 25/11/2026): the code defaults in packages/agent-config/persona-model-tiers.json, the
// SQL validator spec in migration 20261125100000 and the Edge Function lists must agree.
import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const read = (file) => fs.readFileSync(file, "utf8");
const SPEC = JSON.parse(read("packages/agent-config/persona-model-tiers.json"));
const MIGRATION = read("supabase/migrations/20261125100000_persona_model_tiers.sql");
const PROVIDER = read("supabase/functions/_shared/model-provider.ts");

function sqlSpec() {
  const match = /\$spec\$([\s\S]*?)\$spec\$/.exec(MIGRATION);
  assert.ok(match, "migration has a $spec$ block");
  return JSON.parse(match[1]);
}

test("SQL spec mirrors the JSON bounds, tier keys, styles and platform wall clocks", () => {
  const sql = sqlSpec();
  assert.deepEqual(sql.tierKeys, SPEC.tierKeys);
  assert.deepEqual(sql.outputStyles, SPEC.outputStyles);
  assert.deepEqual(sql.bounds, SPEC.bounds);
  assert.deepEqual(sql.wallClockMsAllowed, SPEC.platform.wallClockMsAllowed);
});

test("SQL provider and reasoning lists mirror model-provider.ts", () => {
  const sql = sqlSpec();
  const secretBlock = /PROVIDER_SECRET_NAMES: Record<ModelProviderName, string> = \{([\s\S]*?)\};/.exec(PROVIDER);
  assert.ok(secretBlock, "PROVIDER_SECRET_NAMES found");
  const providers = [...secretBlock[1].matchAll(/^\s*([a-z]+):/gm)].map((m) => m[1]);
  assert.deepEqual([...sql.providers].sort(), [...providers].sort());
  const modes = /REASONING_MODES = \[([^\]]*)\]/.exec(PROVIDER);
  assert.ok(modes, "REASONING_MODES found");
  assert.deepEqual(sql.reasoningModes, JSON.parse(`[${modes[1]}]`));
});

test("code defaults: standard keeps the active route; the five knowledge books use deep_knowledge inside the bounds", () => {
  assert.equal(SPEC.defaultTier, "standard");
  assert.equal(SPEC.tiers.standard.useActiveRoute, true);
  assert.equal(SPEC.tiers.standard.outputStyle, "concise");
  assert.equal(SPEC.tiers.standard.steps, undefined, "standard must not override the active route");
  const deep = SPEC.tiers.deep_knowledge;
  const within = (value, range) => value >= range.min && value <= range.max;
  assert.equal(deep.useActiveRoute, false);
  assert.ok(deep.steps.length >= 1 && deep.steps.length <= SPEC.bounds.maxSteps);
  assert.ok(within(deep.maxOutputTokens, SPEC.bounds.maxOutputTokens));
  assert.ok(within(deep.timeoutMs, SPEC.bounds.timeoutMs));
  assert.ok(within(deep.primaryShare, SPEC.bounds.primaryShare));
  assert.ok(within(deep.costCapMicro, SPEC.bounds.costCapMicro));
  assert.ok(within(deep.temperature, SPEC.bounds.temperature));
  assert.ok(within(deep.reasoning.maxTokens, SPEC.bounds.reasoningMaxTokens));
  assert.notEqual(deep.reasoning.mode, "off", "Owner 25/11: reasoning on for deep_knowledge");
  assert.deepEqual(deep.history, { turns: 12, chars: 2500 });
  assert.equal(deep.outputStyle, "knowledge");
  assert.deepEqual(Object.keys(SPEC.personaTiers).sort(), [
    "book-dhammapada", "book-harmony-guide", "book-i-ching", "book-stoic-journal", "book-strategic-thinker"
  ]);
  for (const tier of Object.values(SPEC.personaTiers)) assert.ok(SPEC.tiers[tier], `persona mapped to missing tier ${tier}`);
  assert.ok(SPEC.platform.wallClockMsAllowed.includes(SPEC.platform.wallClockMs));
  assert.equal(SPEC.platform.wallClockMs, 150000, "the project is on the Supabase Free plan until the Owner changes it");
});

test("migration keeps the table service-read-only, audited, Owner-published and validated twice", () => {
  assert.match(MIGRATION, /enable row level security/);
  assert.match(MIGRATION, /revoke all on table public\.ai_persona_model_tiers from public, anon, authenticated, service_role;/);
  assert.match(MIGRATION, /grant select on table public\.ai_persona_model_tiers to service_role;/);
  assert.doesNotMatch(MIGRATION, /create policy/i, "no client policies");
  assert.match(MIGRATION, /publish_ai_persona_model_tiers[\s\S]*has_capability\('ai\.manage'\)/);
  assert.equal((MIGRATION.match(/ai_persona_model_tiers_errors\(/g) ?? []).length >= 3, true, "validator defined and used on save and publish");
  assert.match(MIGRATION, /'ai\.persona_model_tiers\.draft'/);
  assert.match(MIGRATION, /'ai\.persona_model_tiers\.publish'/);
  assert.match(MIGRATION, /pg_advisory_xact_lock/);
  assert.match(MIGRATION, /where status = 'active'/);
});
